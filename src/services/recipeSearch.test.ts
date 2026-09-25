import { describe, it, expect } from 'vitest';
import { matchRecipe, compareMatches } from './recipeSearch';
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

  it('assigns name tiers: exact > prefix/word-start > contains > none', () => {
    const recipe = makeRecipe({ name: 'Roast Chicken' });
    expect(matchRecipe(recipe, 'roast chicken')!.nameTier).toBe(3);
    expect(matchRecipe(recipe, 'roast')!.nameTier).toBe(2);
    expect(matchRecipe(recipe, 'chick')!.nameTier).toBe(2);
    expect(matchRecipe(recipe, 'hicken')!.nameTier).toBe(1);
    expect(matchRecipe(recipe, 'garlic')!.nameTier).toBe(0);
  });

  it('reports which field matchedText came from', () => {
    const ingredient = matchRecipe(makeRecipe({}), 'garlic')!;
    expect(ingredient.matchedText).toBe('garlic');
    expect(ingredient.matchedTextField).toBe('ingredient');

    const tag = matchRecipe(makeRecipe({}), 'poultry')!;
    expect(tag.matchedText).toBe('poultry');
    expect(tag.matchedTextField).toBe('tag');

    const description = matchRecipe(makeRecipe({}), 'sunday')!;
    expect(description.matchedText).toBeUndefined();
    expect(description.matchedTextField).toBeUndefined();
  });

  it('prefers the ingredient over the tag for matchedText when both match', () => {
    const result = matchRecipe(makeRecipe({ tags: ['garlicky'] }), 'garlic')!;
    expect(result.matchedOn).toEqual(['ingredient', 'tag']);
    expect(result.matchedText).toBe('garlic');
    expect(result.matchedTextField).toBe('ingredient');
  });
});

describe('ranking (compareMatches)', () => {
  function rank(recipes: Recipe[], query: string): string[] {
    return recipes
      .map((recipe) => ({ recipe, match: matchRecipe(recipe, query) }))
      .filter((r) => r.match)
      .map((r) => ({ ...r.match!, name: r.recipe.name }))
      .sort(compareMatches)
      .map((r) => r.name);
  }

  it('puts an exact name match above a longer name that also matches other fields', () => {
    const bread = makeRecipe({
      name: 'Bread',
      description: 'A simple loaf',
      ingredients: [{ item: 'flour', amount: '3', unit: 'cups', optional: false, substitutes: [] }],
      tags: ['baking'],
    });
    const pudding = makeRecipe({
      name: 'Bread Pudding',
      description: 'Uses up stale bread',
      ingredients: [{ item: 'day-old bread', amount: '4', unit: 'cups', optional: false, substitutes: [] }],
      tags: ['dessert', 'bread'],
    });
    // Bread Pudding scores higher overall...
    expect(matchRecipe(pudding, 'bread')!.score).toBeGreaterThan(matchRecipe(bread, 'bread')!.score);
    // ...but the exact name match still ranks first
    expect(rank([pudding, bread], 'bread')).toEqual(['Bread', 'Bread Pudding']);
  });

  it('puts a name-contains match above an ingredient + tag + description match', () => {
    const nameContains = makeRecipe({
      name: 'Shortbread Cookies',
      description: 'Buttery',
      ingredients: [{ item: 'butter', amount: '1', unit: 'cup', optional: false, substitutes: [] }],
      tags: ['cookies'],
    });
    const otherFields = makeRecipe({
      name: 'French Toast',
      description: 'Thick slices of bread soaked in custard',
      ingredients: [{ item: 'brioche bread', amount: '6', unit: 'slices', optional: false, substitutes: [] }],
      tags: ['breakfast', 'bread'],
    });
    expect(matchRecipe(otherFields, 'bread')!.score).toBeGreaterThan(matchRecipe(nameContains, 'bread')!.score);
    expect(rank([otherFields, nameContains], 'bread')).toEqual(['Shortbread Cookies', 'French Toast']);
  });

  it('within the same name tier, more matching fields rank higher', () => {
    const plain = makeRecipe({ name: 'Garlic Knots', description: 'Soft rolls', ingredients: [], tags: [] });
    const richer = makeRecipe({
      name: 'Garlic Soup',
      description: 'Roasted garlic, blended',
      ingredients: [{ item: 'garlic', amount: '2', unit: 'heads', optional: false, substitutes: [] }],
      tags: ['soup'],
    });
    expect(rank([plain, richer], 'garlic')).toEqual(['Garlic Soup', 'Garlic Knots']);
  });

  it('breaks full ties alphabetically', () => {
    const b = makeRecipe({ name: 'Beta Stew', description: '', tags: ['stew'] });
    const a = makeRecipe({ name: 'Alpha Stew', description: '', tags: ['stew'] });
    expect(rank([b, a], 'stew')).toEqual(['Alpha Stew', 'Beta Stew']);
  });
});
