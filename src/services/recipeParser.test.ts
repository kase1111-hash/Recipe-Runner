import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../db', () => ({
  getPreferences: vi.fn().mockReturnValue({
    ollama_config: {
      endpoint: 'http://localhost:11434',
      model: 'llama3',
      temperature: 0.7,
      max_tokens: 500,
      timeout_ms: 30000,
    },
  }),
}));

import {
  extractJSON,
  normalizeIngredients,
  normalizeSteps,
  parseTimeToMinutes,
  stepTimingFromText,
  parseRecipeFromText,
  parseRecipeFromUrl,
  createBlankRecipe,
  isAbortError,
} from './recipeParser';

const mockFetch = vi.fn();
global.fetch = mockFetch;

/** A successful Ollama /api/chat response carrying the given model output */
function ollamaReply(content: string) {
  return { ok: true, status: 200, json: () => Promise.resolve({ message: { content } }) };
}

/** A fetch that never settles until its signal aborts, like a slow Ollama */
function hangUntilAborted(_url: string, init?: RequestInit) {
  return new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => {
      reject(new DOMException('signal is aborted without reason', 'AbortError'));
    });
  });
}

describe('extractJSON', () => {
  it('parses output that has apostrophes and a trailing comma', () => {
    // Previously every ' was rewritten to ", which broke this JSON
    const text = `Here you go:
{
  "name": "Grandma's Apple Pie",
  "notes": "Don't overmix the dough",
  "tags": ["dessert", "baking",],
}`;
    expect(extractJSON(text)).toEqual({
      name: "Grandma's Apple Pie",
      notes: "Don't overmix the dough",
      tags: ['dessert', 'baking'],
    });
  });

  it('parses a bare array', () => {
    expect(extractJSON('["a", "b",]')).toEqual(['a', 'b']);
  });

  it('throws when there is no JSON', () => {
    expect(() => extractJSON('no json here')).toThrow('No valid JSON found');
  });
});

describe('normalizeIngredients', () => {
  it('turns plain strings into ingredient objects', () => {
    expect(normalizeIngredients(['2 cups flour', '  ', 'pinch of salt'])).toEqual([
      { item: '2 cups flour', amount: '', unit: '', prep: null, optional: false, substitutes: [] },
      { item: 'pinch of salt', amount: '', unit: '', prep: null, optional: false, substitutes: [] },
    ]);
  });

  it('keeps structured ingredients and ignores junk entries', () => {
    const result = normalizeIngredients([
      { item: 'butter', amount: 1, unit: 'cup', prep: 'softened' },
      null,
      42.5,
    ]);
    expect(result[0]).toEqual({
      item: 'butter', amount: '1', unit: 'cup', prep: 'softened', optional: false, substitutes: [],
    });
    expect(result).toHaveLength(2);
  });

  it('returns an empty list for non-arrays', () => {
    expect(normalizeIngredients('flour, sugar')).toEqual([]);
    expect(normalizeIngredients(undefined)).toEqual([]);
  });
});

describe('normalizeSteps', () => {
  it('turns plain strings into steps with instructions', () => {
    const steps = normalizeSteps(['Preheat the oven.', '', 'Bake for 20 minutes.']);
    expect(steps).toHaveLength(2);
    expect(steps[0]).toMatchObject({ index: 0, title: 'Step 1', instruction: 'Preheat the oven.' });
    expect(steps[1]).toMatchObject({ index: 1, title: 'Step 2', instruction: 'Bake for 20 minutes.' });
  });

  it('keeps time_minutes and timer_default in sync', () => {
    const [step] = normalizeSteps([{ instruction: 'Simmer', time_display: '45 min' }]);
    expect(step.time_minutes).toBe(45);
    expect(step.time_display).toBe('45 min');
    expect(step.timer_default).toBe(2700);
  });

  it('ignores an unusable explicit timer', () => {
    const [step] = normalizeSteps([{ instruction: 'Rest', time_minutes: 10, timer_default: 'soon' }]);
    expect(step.timer_default).toBe(600);
  });

  it('coerces a non-string visual_prompt to a string', () => {
    const [objectPrompt, numberPrompt] = normalizeSteps([
      { instruction: 'Whisk', visual_prompt: { prompt: 'Frothy eggs in a bowl' } },
      { instruction: 'Fold', visual_prompt: 7 },
    ]);
    expect(objectPrompt.visual_prompt).toBe('Frothy eggs in a bowl');
    expect(numberPrompt.visual_prompt).toBe('');
  });
});

describe('parseTimeToMinutes', () => {
  it.each([
    ['45 min', 45],
    ['5 minutes', 5],
    ['1 hr 30 min', 90],
    ['1.5 hours', 90],
    ['2h', 120],
    ['90 sec', 2],
    ['30 seconds', 1],
    ['20', 20],
    ['', 0],
    ['overnight', 0],
  ])('parses %j as %i minutes', (input, expected) => {
    expect(parseTimeToMinutes(input)).toBe(expected);
  });

  it('handles numbers and rejects invalid ones', () => {
    expect(parseTimeToMinutes(12)).toBe(12);
    expect(parseTimeToMinutes(-5)).toBe(0);
    expect(parseTimeToMinutes(NaN)).toBe(0);
    expect(parseTimeToMinutes(null)).toBe(0);
  });
});

describe('stepTimingFromText', () => {
  it('derives minutes and the timer (seconds) from the display text', () => {
    expect(stepTimingFromText('45 min')).toEqual({ time_minutes: 45, timer_default: 2700 });
    expect(stepTimingFromText('1 hr')).toEqual({ time_minutes: 60, timer_default: 3600 });
  });

  it('clears the timer when the time is removed', () => {
    expect(stepTimingFromText('')).toEqual({ time_minutes: 0, timer_default: null });
  });
});

describe('createBlankRecipe', () => {
  it('starts with one empty ingredient and one empty step', () => {
    const blank = createBlankRecipe();
    expect(blank.manual).toBe(true);
    expect(blank.name).toBe('');
    expect(blank.ingredients).toHaveLength(1);
    expect(blank.ingredients[0].item).toBe('');
    expect(blank.steps).toHaveLength(1);
    expect(blank.steps[0]).toMatchObject({ index: 0, instruction: '', timer_default: null });
  });
});

describe('parseRecipeFromText', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('parses apostrophes, trailing commas and string arrays from the model', async () => {
    mockFetch
      .mockResolvedValueOnce(ollamaReply(`{
        "name": "Grandma's Apple Pie",
        "ingredients": ["6 apples", "1 cup sugar",],
        "steps": ["Peel the apples.", "Bake at 375°F for 45 min.",],
      }`))
      .mockResolvedValueOnce(ollamaReply('[{"visual_prompt": "Peeled apples"}, 42]'));

    const recipe = await parseRecipeFromText('Grandma\'s apple pie recipe text that is long enough');

    expect(recipe.name).toBe("Grandma's Apple Pie");
    expect(recipe.ingredients.map((i) => i.item)).toEqual(['6 apples', '1 cup sugar']);
    expect(recipe.steps.map((s) => s.instruction)).toEqual(['Peel the apples.', 'Bake at 375°F for 45 min.']);
    expect(recipe.steps[0].visual_prompt).toBe('Peeled apples');
    // A non-string prompt falls back to the generated default
    expect(typeof recipe.steps[1].visual_prompt).toBe('string');
    expect(recipe.steps[1].visual_prompt).toContain('Bake at 375°F');
  });

  it('names the endpoint when Ollama is unreachable', async () => {
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(parseRecipeFromText('some recipe text')).rejects.toThrow(
      "Couldn't reach Ollama at http://localhost:11434 — is it running? You can also enter the recipe manually."
    );
  });

  it('includes Ollama\'s own error text for HTTP errors', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: 'model "llama3" not found, try pulling it first' }),
    });

    await expect(parseRecipeFromText('some recipe text')).rejects.toThrow(
      /HTTP 404\): model "llama3" not found.*Check the model name/
    );
  });

  it('reports a timeout instead of "signal is aborted without reason"', async () => {
    vi.useFakeTimers();
    mockFetch.mockImplementation(hangUntilAborted);

    const result = parseRecipeFromText('some recipe text');
    const assertion = expect(result).rejects.toThrow(
      /Ollama at http:\/\/localhost:11434 didn't respond within 60 seconds/
    );
    await vi.advanceTimersByTimeAsync(60_000);
    await assertion;
  });

  it('rejects with an abort error when the caller cancels', async () => {
    mockFetch.mockImplementation(hangUntilAborted);
    const controller = new AbortController();

    const result = parseRecipeFromText('some recipe text', undefined, controller.signal);
    controller.abort();

    const error = await result.catch((e: unknown) => e);
    expect(isAbortError(error)).toBe(true);
  });

  it('does not call Ollama when already cancelled', async () => {
    const controller = new AbortController();
    controller.abort();

    const error = await parseRecipeFromText('text', undefined, controller.signal).catch((e: unknown) => e);
    expect(isAbortError(error)).toBe(true);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe('parseRecipeFromUrl', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('explains that the page cannot be downloaded and suggests Paste Text', async () => {
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(parseRecipeFromUrl('https://example.com/recipe')).rejects.toThrow(
      /can't download recipe pages directly.*Paste Text tab/
    );
  });
});
