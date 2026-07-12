import { describe, it, expect } from 'vitest';
import { matchRecipe } from './recipeSearch';
import type { Recipe } from '../types';

function makeRecipe(overrides: Partial<Recipe>): Recipe {
  return {
    id: 'r1',
    cookbook_id: 'cb1',
    name: 'Roast Chicken',
    description: 'A classic Sunday roast',
    total_time: '90 min',
    active_time: '20 min',
    yield: '4 servings',
    difficulty: { overall: 2, technique: 2, timing: 2, ingredients: 1, equipment: 1 },
    equipment: [],
    tags: ['dinner', 'poultry'],
    source: { type: 'original' },
    ingredients: [
      { item: 'whole chicken', amount: '4', unit: 'lb', optional: false, substitutes: [] },
      { item: 'garlic', amount: '4', unit: 'cloves', optional: false, substitutes: [] },
    ],
    steps: [],
    notes: '',
    created_at: '2026-01-01T00:00:00Z',
    modified_at: '2026-01-01T00:00:00Z',
    cook_history: [],
    ...overrides,
  };
}

describe('matchRecipe', () => {
  it('matches on recipe name, case-insensitively', () => {
    const result = matchRecipe(makeRecipe({}), 'roast chi');
    expect(result).not.toBeNull();
    expect(result!.matchedOn).toContain('name');
  });

  it('ranks exact name match above prefix above substring', () => {
    // Isolate the name field — other fields also add to the score
    const nameOnly = makeRecipe({ description: '', ingredients: [], tags: [] });
    const exact = matchRecipe(nameOnly, 'roast chicken')!.score;
    const prefix = matchRecipe(nameOnly, 'roast')!.score;
    const substring = matchRecipe(nameOnly, 'chicken')!.score;
    expect(exact).toBeGreaterThan(prefix);
    expect(prefix).toBeGreaterThan(substring);
  });

  it('matches on ingredient and reports which one', () => {
    const result = matchRecipe(makeRecipe({}), 'garlic');
    expect(result).not.toBeNull();
    expect(result!.matchedOn).toContain('ingredient');
    expect(result!.matchedText).toBe('garlic');
  });

  it('matches on tag', () => {
    const result = matchRecipe(makeRecipe({}), 'poultry');
    expect(result).not.toBeNull();
    expect(result!.matchedOn).toContain('tag');
  });

  it('matches on description', () => {
    const result = matchRecipe(makeRecipe({}), 'sunday');
    expect(result).not.toBeNull();
    expect(result!.matchedOn).toContain('description');
  });

  it('returns null when nothing matches', () => {
    expect(matchRecipe(makeRecipe({}), 'sushi')).toBeNull();
  });

  it('returns null for empty or whitespace query', () => {
    expect(matchRecipe(makeRecipe({}), '')).toBeNull();
    expect(matchRecipe(makeRecipe({}), '   ')).toBeNull();
  });

  it('a name match outranks an ingredient-only match', () => {
    const nameMatch = matchRecipe(makeRecipe({ name: 'Garlic Bread', ingredients: [] }), 'garlic')!.score;
    const ingredientMatch = matchRecipe(makeRecipe({}), 'garlic')!.score;
    expect(nameMatch).toBeGreaterThan(ingredientMatch);
  });
});
