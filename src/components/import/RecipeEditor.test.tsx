import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { Cookbook, Recipe } from '../../types';
import { createBlankRecipe, type ParsedRecipe } from '../../services/recipeParser';

const createRecipeMock = vi.fn((recipe: Recipe) => Promise.resolve(recipe.id));

vi.mock('../../db', () => ({
  createRecipe: (recipe: Recipe) => createRecipeMock(recipe),
  getPreferences: vi.fn(),
}));

import { RecipeEditor } from './RecipeEditor';

const cookbook: Cookbook = {
  id: 'cb-1',
  title: 'Family Recipes',
  author: 'Test',
  description: '',
  category: 'cooking',
  created_at: new Date().toISOString(),
  modified_at: new Date().toISOString(),
};

function parsedRecipe(overrides: Partial<ParsedRecipe> = {}): ParsedRecipe {
  return {
    name: 'Tomato Soup',
    description: '',
    total_time: '30 min',
    active_time: '10 min',
    yield: '4 servings',
    safe_temp: null,
    equipment: [],
    tags: [],
    ingredients: [
      { item: 'tomatoes', amount: '6', unit: '', prep: null, optional: false, substitutes: [] },
    ],
    steps: [
      {
        index: 0,
        title: 'Simmer',
        instruction: 'Simmer the tomatoes.',
        time_minutes: 5,
        time_display: '5 min',
        type: 'passive',
        tip: null,
        visual_prompt: '',
        temperature: null,
        timer_default: 300,
      },
    ],
    notes: '',
    source: { type: 'original' },
    confidence: 0.8,
    ...overrides,
  };
}

function renderEditor(recipe: ParsedRecipe = parsedRecipe()) {
  const onSave = vi.fn();
  const onCancel = vi.fn();
  render(<RecipeEditor parsedRecipe={recipe} cookbook={cookbook} onSave={onSave} onCancel={onCancel} />);
  return { onSave, onCancel };
}

function savedRecipe(): Recipe {
  expect(createRecipeMock).toHaveBeenCalledTimes(1);
  return createRecipeMock.mock.calls[0][0];
}

describe('RecipeEditor', () => {
  beforeEach(() => {
    createRecipeMock.mockClear();
  });

  it('keeps the cooking timer in sync when a step time is edited', async () => {
    const { onSave } = renderEditor();

    fireEvent.click(screen.getByRole('button', { name: /Steps/ }));
    const timeInput = screen.getByLabelText('Step 1 time');
    fireEvent.change(timeInput, { target: { value: '45 min' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Recipe' }));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    const step = savedRecipe().steps[0];
    expect(step.time_display).toBe('45 min');
    expect(step.time_minutes).toBe(45);
    expect(step.timer_default).toBe(2700);
  });

  it('tidies shorthand times on blur', () => {
    renderEditor();

    fireEvent.click(screen.getByRole('button', { name: /Steps/ }));
    const timeInput = screen.getByLabelText('Step 1 time') as HTMLInputElement;
    fireEvent.change(timeInput, { target: { value: '90' } });
    fireEvent.blur(timeInput);

    expect(timeInput.value).toBe('1 hr 30 min');
  });

  it('gives added steps a timer and renumbers after reordering', async () => {
    const { onSave } = renderEditor();

    fireEvent.click(screen.getByRole('button', { name: /Steps/ }));
    fireEvent.click(screen.getByRole('button', { name: '+ Add Step' }));
    const instructions = screen.getAllByPlaceholderText('Step instructions...');
    fireEvent.change(instructions[1], { target: { value: 'Blend until smooth.' } });
    fireEvent.change(screen.getByLabelText('Step 2 time'), { target: { value: '10 min' } });
    fireEvent.click(screen.getByRole('button', { name: 'Move step 2 up' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save Recipe' }));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    const steps = savedRecipe().steps;
    expect(steps.map((s) => s.index)).toEqual([0, 1]);
    expect(steps[0]).toMatchObject({ instruction: 'Blend until smooth.', time_minutes: 10, timer_default: 600 });
    // An untitled step gets a default title from its position
    expect(steps[0].title).toBe('Step 1');
    expect(steps[1]).toMatchObject({ title: 'Simmer', timer_default: 300 });
  });

  it('lets equipment and tags be typed with spaces and commas', async () => {
    const { onSave } = renderEditor();

    const equipment = screen.getByPlaceholderText('Mixing bowl, whisk, baking sheet...') as HTMLInputElement;
    fireEvent.change(equipment, { target: { value: 'Mixing bowl, ' } });
    expect(equipment.value).toBe('Mixing bowl, ');
    fireEvent.change(equipment, { target: { value: 'Mixing bowl, Dutch oven' } });
    fireEvent.blur(equipment);
    expect(equipment.value).toBe('Mixing bowl, Dutch oven');

    const tags = screen.getByPlaceholderText('dinner, comfort food, quick...') as HTMLInputElement;
    fireEvent.change(tags, { target: { value: 'Comfort Food, soup' } });
    expect(tags.value).toBe('Comfort Food, soup');

    fireEvent.click(screen.getByRole('button', { name: 'Save Recipe' }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(savedRecipe().equipment).toEqual(['Mixing bowl', 'Dutch oven']);
    expect(savedRecipe().tags).toEqual(['comfort food', 'soup']);
  });

  it('opens a blank recipe with one ingredient row and one step for manual entry', () => {
    renderEditor(createBlankRecipe());

    expect(screen.getByRole('heading', { name: 'New Recipe' })).toBeInTheDocument();
    expect(screen.queryByText(/AI Parsing Confidence/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ingredients (1)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Steps (1)' })).toBeInTheDocument();
  });

  it('explains what is missing instead of saving an empty recipe', () => {
    renderEditor(createBlankRecipe());

    fireEvent.click(screen.getByRole('button', { name: 'Save Recipe' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Give the recipe a name.');
    expect(screen.getByRole('alert')).toHaveTextContent('Add at least one ingredient.');
    expect(screen.getByRole('alert')).toHaveTextContent('Add at least one step with instructions.');
    expect(createRecipeMock).not.toHaveBeenCalled();

    // Messages clear as the problems are fixed
    fireEvent.change(screen.getByLabelText('Recipe Name'), { target: { value: 'Toast' } });
    expect(screen.getByRole('alert')).not.toHaveTextContent('Give the recipe a name.');
  });

  it('saves a manually entered recipe and fills in total time from the steps', async () => {
    const { onSave } = renderEditor(createBlankRecipe());

    fireEvent.change(screen.getByLabelText('Recipe Name'), { target: { value: "Grandma's Toast" } });
    fireEvent.click(screen.getByRole('button', { name: /Ingredients/ }));
    fireEvent.change(screen.getByPlaceholderText('Ingredient'), { target: { value: 'bread' } });
    fireEvent.click(screen.getByRole('button', { name: /Steps/ }));
    fireEvent.change(screen.getByPlaceholderText('Step instructions...'), { target: { value: 'Toast the bread.' } });
    fireEvent.change(screen.getByLabelText('Step 1 time'), { target: { value: '3 min' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Recipe' }));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    const recipe = savedRecipe();
    expect(recipe.name).toBe("Grandma's Toast");
    expect(recipe.ingredients).toHaveLength(1);
    expect(recipe.steps).toHaveLength(1);
    expect(recipe.total_time).toBe('3 min');
    expect(recipe.steps[0].timer_default).toBe(180);
  });

  it('asks before discarding changes on Cancel', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { onCancel } = renderEditor();

    fireEvent.change(screen.getByLabelText('Recipe Name'), { target: { value: 'Better Soup' } });
    fireEvent.click(screen.getByRole('button', { name: '← Cancel' }));
    expect(confirmSpy).toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();

    confirmSpy.mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: '← Cancel' }));
    expect(onCancel).toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('cancels without asking when nothing was changed', () => {
    const confirmSpy = vi.spyOn(window, 'confirm');
    const { onCancel } = renderEditor();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalled();
    confirmSpy.mockRestore();
  });
});
