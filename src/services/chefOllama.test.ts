import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Recipe } from '../types';

// Mock the db module
vi.mock('../db', () => ({
  getPreferences: vi.fn().mockReturnValue({
    ollama_config: {
      endpoint: 'http://localhost:11434',
      model: 'llama3',
      enabled: true,
      temperature: 0.7,
      max_tokens: 500,
      timeout_ms: 30000,
    },
    skill_level: 'intermediate',
  }),
}));

// Mock the sanitize utility to pass through responses unchanged
vi.mock('./utils', () => ({
  sanitizeAiResponse: vi.fn((text: string) => text),
}));

import {
  chatWithChef,
  executeQuickAction,
  testOllamaConnection,
} from './chefOllama';

// Set up global fetch mock
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockRecipe: Recipe = {
  id: 'test-1',
  cookbook_id: 'cb-1',
  name: 'Test Pasta',
  description: 'A test recipe',
  total_time: '30 min',
  active_time: '15 min',
  yield: '4 servings',
  difficulty: { overall: 2, technique: 2, timing: 2, ingredients: 2, equipment: 2 },
  safe_temp: null,
  equipment: [],
  tags: [],
  source: { type: 'original' as const },
  ingredients: [
    { item: 'butter', amount: '2', unit: 'tbsp', prep: null, optional: false, substitutes: [] },
    { item: 'garlic', amount: '3', unit: 'cloves', prep: 'minced', optional: false, substitutes: [] },
  ],
  steps: [
    {
      index: 0,
      title: 'Melt butter',
      instruction: 'Melt butter in a pan over medium heat.',
      time_minutes: 2,
      time_display: '2 min',
      type: 'active' as const,
      tip: null,
      visual_prompt: '',
      temperature: null,
      timer_default: null,
    },
    {
      index: 1,
      title: 'Add garlic',
      instruction: 'Add minced garlic and sauté until fragrant.',
      time_minutes: 3,
      time_display: '3 min',
      type: 'active' as const,
      tip: "Don't burn the garlic",
      visual_prompt: '',
      temperature: null,
      timer_default: 180,
    },
  ],
  notes: '',
  created_at: new Date().toISOString(),
  modified_at: new Date().toISOString(),
  cook_history: [],
};

beforeEach(() => {
  mockFetch.mockReset();
});

// ============================================
// testOllamaConnection
// ============================================

describe('testOllamaConnection', () => {
  it('returns connected:true when API responds with models', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ models: [{ name: 'llama3' }, { name: 'mistral' }] }),
    });

    const result = await testOllamaConnection();

    expect(result.connected).toBe(true);
    expect(result.models).toEqual(['llama3', 'mistral']);
    expect(result.error).toBeUndefined();
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:11434/api/tags', {
      method: 'GET',
    });
  });

  it('returns connected:false when fetch fails', async () => {
    mockFetch.mockRejectedValue(new Error('Connection refused'));

    const result = await testOllamaConnection();

    expect(result.connected).toBe(false);
    expect(result.error).toBe('Connection refused');
    expect(result.models).toBeUndefined();
  });
});

// ============================================
// chatWithChef
// ============================================

describe('chatWithChef', () => {
  it('sends message to Ollama API with correct payload structure', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ message: { content: 'AI response' } }),
    });

    await chatWithChef('How long should I melt the butter?', mockRecipe, 0, ['butter']);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('http://localhost:11434/api/chat');
    expect(options.method).toBe('POST');
    expect(options.headers).toEqual({ 'Content-Type': 'application/json' });

    const body = JSON.parse(options.body);
    expect(body.model).toBe('llama3');
    expect(body.stream).toBe(false);
    expect(body.options.temperature).toBe(0.7);
    expect(body.options.num_predict).toBe(500);

    // Should contain system message, then user message
    expect(body.messages.length).toBe(2);
    expect(body.messages[0].role).toBe('system');
    expect(body.messages[0].content).toContain('Test Pasta');
    expect(body.messages[0].content).toContain('Melt butter');
    expect(body.messages[1].role).toBe('user');
    expect(body.messages[1].content).toBe('How long should I melt the butter?');
  });

  it('returns response from Ollama', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ message: { content: 'Melt the butter for about 2 minutes over medium heat.' } }),
    });

    const result = await chatWithChef('How long should I melt the butter?', mockRecipe, 0, []);

    expect(result.response).toBe('Melt the butter for about 2 minutes over medium heat.');
  });

  it('falls back to offline substitution when Ollama unreachable and message mentions ingredient substitution', async () => {
    mockFetch.mockRejectedValue(new Error('Connection refused'));

    const result = await chatWithChef(
      "I don't have butter, what can I substitute?",
      mockRecipe,
      0,
      []
    );

    // Should return an offline substitution for butter
    expect(result.response).toContain('butter');
    expect(result.response).toContain('coconut oil');
    expect(result.suggestedActions).toBeUndefined();
  });

  it('returns error message when Ollama unreachable and not a substitution query', async () => {
    mockFetch.mockRejectedValue(new Error('Connection refused'));

    const result = await chatWithChef(
      'What temperature should the pan be?',
      mockRecipe,
      0,
      []
    );

    expect(result.response).toContain('trouble connecting');
    expect(result.suggestedActions).toBeUndefined();
  });
});

// ============================================
// executeQuickAction
// ============================================

describe('executeQuickAction', () => {
  it('sends correct quick action prompt', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ message: { content: 'AI response' } }),
    });

    await executeQuickAction('substitution', 'I need a dairy-free option', mockRecipe, 0, []);

    const [, options] = mockFetch.mock.calls[0];
    const body = JSON.parse(options.body);

    // The user message should contain the quick action prompt
    const userMessage = body.messages.find((m: { role: string }) => m.role === 'user');
    expect(userMessage.content).toContain("I don't have an ingredient");
    expect(userMessage.content).toContain('suggest a substitute');
  });

  it('includes additional context in message', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ message: { content: 'AI response' } }),
    });

    await executeQuickAction(
      'i_messed_up',
      'I burned the garlic',
      mockRecipe,
      1,
      ['butter', 'garlic']
    );

    const [, options] = mockFetch.mock.calls[0];
    const body = JSON.parse(options.body);

    const userMessage = body.messages.find((m: { role: string }) => m.role === 'user');
    expect(userMessage.content).toContain('Something went wrong');
    expect(userMessage.content).toContain('I burned the garlic');
  });
});

// ============================================
// Offline substitution fallback
// ============================================

describe('offline substitution fallback', () => {
  beforeEach(() => {
    mockFetch.mockRejectedValue(new Error('Connection refused'));
  });

  it('returns result for known ingredient (butter)', async () => {
    const result = await chatWithChef(
      "I don't have butter, what can I use instead?",
      mockRecipe,
      0,
      []
    );

    expect(result.response).toContain('butter');
    expect(result.response).toContain('coconut oil');
    expect(result.response).toContain('olive oil');
    expect(result.response).toContain('applesauce');
  });

  it('returns generic message for unknown ingredient', async () => {
    const recipeWithUnknown: Recipe = {
      ...mockRecipe,
      ingredients: [
        { item: 'saffron', amount: '1', unit: 'pinch', prep: null, optional: false, substitutes: [] },
      ],
    };

    const result = await chatWithChef(
      "I don't have saffron, what can I substitute?",
      recipeWithUnknown,
      0,
      []
    );

    expect(result.response).toContain("don't have an offline substitution");
    expect(result.response).toContain('Ollama');
  });
});
