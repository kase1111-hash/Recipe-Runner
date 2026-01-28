import { describe, it, expect } from 'vitest';
import {
  parseYield,
  scaleIngredient,
  scaleRecipe,
  getScalingPresets,
} from './recipeScaling';
import type { Recipe, Ingredient } from '../types';

describe('parseYield', () => {
  it('parses servings', () => {
    const result = parseYield('4 servings');
    expect(result.value).toBe(4);
    expect(result.unit).toBe('servings');
  });

  it('parses different units', () => {
    expect(parseYield('2 loaves').value).toBe(2);
    expect(parseYield('24 cookies').value).toBe(24);
    expect(parseYield('8 oz').value).toBe(8);
    expect(parseYield('1 batch').value).toBe(1);
  });

  it('handles numbers without units', () => {
    const result = parseYield('6');
    expect(result.value).toBe(6);
    expect(result.unit).toBe('servings');
  });

  it('defaults to 1 batch for unparseable input', () => {
    const result = parseYield('a family-sized portion');
    expect(result.value).toBe(1);
    expect(result.unit).toBe('batch');
  });

  it('handles decimal yields', () => {
    const result = parseYield('1.5 liters');
    expect(result.value).toBe(1.5);
    expect(result.unit).toBe('liters');
  });
});

describe('scaleIngredient', () => {
  const baseIngredient: Ingredient = {
    item: 'flour',
    amount: '2',
    unit: 'cups',
    prep: null,
    optional: false,
    substitutes: [],
  };

  it('scales linear ingredients correctly', () => {
    const scaled = scaleIngredient(baseIngredient, 2);
    expect(scaled.scaledAmount).toBe('4');
    expect(scaled.originalAmount).toBe('2');
    expect(scaled.scalingWarning).toBeUndefined();
  });

  it('handles fractional scaling', () => {
    const scaled = scaleIngredient(baseIngredient, 0.5);
    expect(scaled.scaledAmount).toBe('1');
  });

  it('applies non-linear scaling for eggs', () => {
    const eggIngredient: Ingredient = {
      item: 'eggs',
      amount: '2',
      unit: '',
      prep: null,
      optional: false,
      substitutes: [],
    };
    const scaled = scaleIngredient(eggIngredient, 3);
    expect(scaled.scalingWarning).toBeDefined();
    expect(scaled.scalingWarning).toContain('Eggs');
  });

  it('applies non-linear scaling for yeast', () => {
    const yeastIngredient: Ingredient = {
      item: 'active dry yeast',
      amount: '1',
      unit: 'tsp',
      prep: null,
      optional: false,
      substitutes: [],
    };
    const scaled = scaleIngredient(yeastIngredient, 4);
    expect(scaled.scalingWarning).toBeDefined();
    expect(scaled.scalingWarning).toContain('Yeast');
  });

  it('does not scale fixed items', () => {
    const bayLeafIngredient: Ingredient = {
      item: 'bay leaves',
      amount: '2',
      unit: '',
      prep: null,
      optional: false,
      substitutes: [],
    };
    const scaled = scaleIngredient(bayLeafIngredient, 3);
    expect(scaled.scaledAmount).toBe('2');
    expect(scaled.scalingWarning).toContain("doesn't need scaling");
  });

  it('handles fraction amounts', () => {
    const halfCupIngredient: Ingredient = {
      item: 'sugar',
      amount: '1/2',
      unit: 'cup',
      prep: null,
      optional: false,
      substitutes: [],
    };
    const scaled = scaleIngredient(halfCupIngredient, 2);
    expect(scaled.scaledAmount).toBe('1');
  });
});

describe('scaleRecipe', () => {
  const mockRecipe: Recipe = {
    id: 'test-recipe',
    cookbook_id: 'test-cookbook',
    name: 'Test Recipe',
    description: 'A test recipe',
    total_time: '30 min',
    active_time: '15 min',
    yield: '4 servings',
    difficulty: { overall: 3, technique: 3, timing: 3, ingredients: 3, equipment: 3 },
    safe_temp: null,
    equipment: [],
    tags: [],
    source: { type: 'original' },
    ingredients: [
      { item: 'flour', amount: '2', unit: 'cups', prep: null, optional: false, substitutes: [] },
      { item: 'sugar', amount: '1', unit: 'cup', prep: null, optional: false, substitutes: [] },
      { item: 'eggs', amount: '2', unit: '', prep: null, optional: false, substitutes: [] },
    ],
    steps: [],
    notes: '',
    created_at: new Date().toISOString(),
    modified_at: new Date().toISOString(),
    cook_history: [],
  };

  it('doubles recipe correctly', () => {
    const scaled = scaleRecipe(mockRecipe, 8);
    expect(scaled.yield).toBe('8 servings');
    expect(scaled.scaleFactor).toBe(2);
    expect(scaled.originalYield).toBe('4 servings');

    const flour = scaled.scaledIngredients.find(i => i.item === 'flour');
    expect(flour?.scaledAmount).toBe('4');

    const sugar = scaled.scaledIngredients.find(i => i.item === 'sugar');
    expect(sugar?.scaledAmount).toBe('2');
  });

  it('halves recipe correctly', () => {
    const scaled = scaleRecipe(mockRecipe, 2);
    expect(scaled.yield).toBe('2 servings');
    expect(scaled.scaleFactor).toBe(0.5);

    const flour = scaled.scaledIngredients.find(i => i.item === 'flour');
    expect(flour?.scaledAmount).toBe('1');
  });

  it('adds scaling notes for large scale-ups', () => {
    const scaled = scaleRecipe(mockRecipe, 12);
    expect(scaled.scalingNotes.length).toBeGreaterThan(0);
    expect(scaled.scalingNotes.some(n => n.includes('Large scale-up'))).toBe(true);
  });

  it('adds scaling notes for significant reductions', () => {
    const scaled = scaleRecipe(mockRecipe, 1);
    expect(scaled.scalingNotes.length).toBeGreaterThan(0);
    expect(scaled.scalingNotes.some(n => n.includes('reduction'))).toBe(true);
  });
});

describe('getScalingPresets', () => {
  const mockRecipe: Recipe = {
    id: 'test-recipe',
    cookbook_id: 'test-cookbook',
    name: 'Test Recipe',
    description: 'A test recipe',
    total_time: '30 min',
    active_time: '15 min',
    yield: '4 servings',
    difficulty: { overall: 3, technique: 3, timing: 3, ingredients: 3, equipment: 3 },
    safe_temp: null,
    equipment: [],
    tags: [],
    source: { type: 'original' },
    ingredients: [],
    steps: [],
    notes: '',
    created_at: new Date().toISOString(),
    modified_at: new Date().toISOString(),
    cook_history: [],
  };

  it('returns correct presets for a 4-serving recipe', () => {
    const presets = getScalingPresets(mockRecipe);

    expect(presets.length).toBe(5);
    expect(presets[0].value).toBe(2); // Half
    expect(presets[1].value).toBe(4); // Original
    expect(presets[2].value).toBe(6); // 1.5x
    expect(presets[3].value).toBe(8); // Double
    expect(presets[4].value).toBe(12); // Triple
  });

  it('includes labels with unit', () => {
    const presets = getScalingPresets(mockRecipe);

    expect(presets[0].label).toContain('Half');
    expect(presets[0].label).toContain('servings');
    expect(presets[1].label).toContain('Original');
    expect(presets[3].label).toContain('Double');
  });
});
