import { describe, it, expect } from 'vitest';
import {
  parseYield,
  scaleIngredient,
  scaleRecipe,
  getScalingPresets,
  formatScaledYield,
  resolveAppliedYieldValue,
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

  it('uses the low end of a range and keeps the unit clean', () => {
    const result = parseYield('4-6 servings');
    expect(result.value).toBe(4);
    expect(result.high).toBe(6);
    expect(result.unit).toBe('servings');

    const words = parseYield('4 to 6 servings');
    expect(words.value).toBe(4);
    expect(words.high).toBe(6);
    expect(words.unit).toBe('servings');
  });

  it('handles leading words', () => {
    expect(parseYield('Serves 4')).toMatchObject({ value: 4, unit: 'servings' });
    expect(parseYield('Serves 4-6')).toMatchObject({ value: 4, high: 6, unit: 'servings' });
    expect(parseYield('Makes 12 cookies')).toMatchObject({ value: 12, unit: 'cookies' });
    expect(parseYield('Yield: 2 loaves')).toMatchObject({ value: 2, unit: 'loaves' });
  });

  it('handles fractions and mixed numbers', () => {
    expect(parseYield('1 1/2 cups')).toMatchObject({ value: 1.5, unit: 'cups' });
    expect(parseYield('½ gallon')).toMatchObject({ value: 0.5, unit: 'gallon' });
  });

  it('drops parenthetical and trailing notes from the unit', () => {
    expect(parseYield('4 servings (about 2 cups)').unit).toBe('servings');
    expect(parseYield('12 (2-inch) cookies').unit).toBe('cookies');
    expect(parseYield('6 servings, as a side').unit).toBe('servings');
  });

  it('falls back to 1 batch for zero, empty, or missing yields', () => {
    expect(parseYield('0 servings')).toMatchObject({ value: 1, unit: 'batch' });
    expect(parseYield('')).toMatchObject({ value: 1, unit: 'batch' });
    expect(parseYield(undefined as unknown as string)).toMatchObject({ value: 1, unit: 'batch' });
  });
});

describe('resolveAppliedYieldValue', () => {
  const recipe = { yield: '4-6 servings' } as Recipe;

  it('returns the base value when nothing has been applied', () => {
    expect(resolveAppliedYieldValue(recipe)).toBe(4);
    expect(resolveAppliedYieldValue(recipe, '4-6 servings')).toBe(4);
  });

  it('reads the value of a previously applied yield', () => {
    expect(resolveAppliedYieldValue(recipe, '8-12 servings')).toBe(8);
    expect(resolveAppliedYieldValue(recipe, '2 1/2 servings')).toBe(2.5);
  });

  it('falls back to the base value for an unusable applied yield', () => {
    expect(resolveAppliedYieldValue(recipe, 'lots')).toBe(4);
    expect(resolveAppliedYieldValue(recipe, '0 servings')).toBe(4);
  });
});

describe('formatScaledYield', () => {
  it('scales both ends of a range yield', () => {
    expect(formatScaledYield(parseYield('4-6 servings'), 8)).toBe('8-12 servings');
  });

  it('uses kitchen fractions', () => {
    expect(formatScaledYield(parseYield('1 1/2 cups'), 0.75)).toBe('3/4 cups');
  });

  it('pluralizes the fallback batch unit', () => {
    expect(formatScaledYield(parseYield('a family-sized portion'), 2)).toBe('2 batches');
    expect(formatScaledYield(parseYield('a family-sized portion'), 0.5)).toBe('1/2 batch');
  });

  it('uses "serving" for one or fewer servings', () => {
    expect(formatScaledYield(parseYield('4 servings'), 1)).toBe('1 serving');
    expect(formatScaledYield(parseYield('1 serving'), 2)).toBe('2 servings');
  });

  it('does not treat "for" as a servings lead-in', () => {
    expect(parseYield('Makes enough for 2 dozen cookies').unit).toBe('dozen cookies');
    expect(parseYield('Enough for 6').unit).toBe('servings');
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

  function ing(item: string, amount: string, unit = ''): Ingredient {
    return { item, amount, unit, prep: null, optional: false, substitutes: [] };
  }

  it('leaves amounts without a quantity unchanged', () => {
    for (const amount of ['to taste', 'a pinch', '']) {
      for (const factor of [1, 2, 0.5]) {
        const scaled = scaleIngredient(ing('black pepper', amount), factor);
        expect(scaled.scaledAmount).toBe(amount);
        expect(scaled.amount).toBe(amount);
      }
    }
  });

  it('does not reformat or warn at 1x', () => {
    expect(scaleIngredient(ing('flour', '1.5', 'cups'), 1).scaledAmount).toBe('1.5');
    expect(scaleIngredient(ing('eggs', '2'), 1).scalingWarning).toBeUndefined();
    expect(scaleIngredient(ing('bay leaves', '2'), 1).scalingWarning).toBeUndefined();
  });

  it('scales both ends of a range and keeps it a range', () => {
    expect(scaleIngredient(ing('onions', '2-3'), 2).scaledAmount).toBe('4-6');
    expect(scaleIngredient(ing('onions', '2 to 3'), 2).scaledAmount).toBe('4-6');
    expect(scaleIngredient(ing('milk', '1/2 to 3/4', 'cup'), 2).scaledAmount).toBe('1 to 1 1/2');
    expect(scaleIngredient(ing('onions', '2 or 3'), 0.5).scaledAmount).toBe('1 to 1 1/2');
  });

  it('reads hyphenated mixed numbers as one number', () => {
    expect(scaleIngredient(ing('flour', '1-1/2', 'cups'), 2).scaledAmount).toBe('3');
  });

  it('scales a leading quantity and keeps the trailing words', () => {
    expect(scaleIngredient(ing('eggs', '2 large'), 2).scaledAmount).toBe('4 large');
    expect(scaleIngredient(ing('tomatoes', '1 (14 oz) can'), 3).scaledAmount).toBe('3 (14 oz) can');
  });

  it('matches non-linear ingredients on whole words only', () => {
    // "unsalted" must not match "salt"
    const butter = scaleIngredient(ing('unsalted butter', '1', 'cup'), 2);
    expect(butter.scaledAmount).toBe('2');
    expect(butter.scalingWarning).toBeUndefined();

    // "eggplant" must not match "egg"
    const eggplant = scaleIngredient(ing('eggplant', '1'), 3);
    expect(eggplant.scaledAmount).toBe('3');
    expect(eggplant.scalingWarning).toBeUndefined();

    const salt = scaleIngredient(ing('kosher salt', '1', 'tsp'), 2);
    expect(salt.scalingWarning).toContain('Salt');
  });

  it('scales non-linear ingredients linearly and only warns', () => {
    const eggs = scaleIngredient(ing('eggs', '2'), 2);
    expect(eggs.scaledAmount).toBe('4');
    expect(eggs.scalingWarning).toContain('Eggs');

    const yeast = scaleIngredient(ing('active dry yeast', '2 1/4', 'tsp'), 2);
    expect(yeast.scaledAmount).toBe('4 1/2');
    expect(yeast.scalingWarning).toContain('Yeast');
  });

  it('does not warn below the non-linear threshold', () => {
    expect(scaleIngredient(ing('eggs', '2'), 1.5).scalingWarning).toBeUndefined();
    expect(scaleIngredient(ing('eggs', '2'), 0.5).scalingWarning).toBeUndefined();
  });

  it('does not warn about a non-linear ingredient whose amount was not scaled', () => {
    expect(scaleIngredient(ing('salt', 'to taste'), 3).scalingWarning).toBeUndefined();
  });

  it('keeps fixed items unscaled, including plural forms', () => {
    const sticks = scaleIngredient(ing('cinnamon sticks', '2'), 2);
    expect(sticks.scaledAmount).toBe('2');
    expect(sticks.scalingWarning).toContain("doesn't need scaling");

    const leaf = scaleIngredient(ing('Bay Leaf', '1'), 3);
    expect(leaf.scaledAmount).toBe('1');
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

  it('doubles eggs linearly with a warning note', () => {
    const scaled = scaleRecipe(mockRecipe, 8);
    const eggs = scaled.scaledIngredients.find(i => i.item === 'eggs');
    expect(eggs?.scaledAmount).toBe('4');
    expect(scaled.scalingNotes.some(n => n.includes('Eggs'))).toBe(true);
  });

  it('leaves the recipe untouched at 1x', () => {
    const recipe = {
      ...mockRecipe,
      yield: 'Serves 4',
      ingredients: [
        ...mockRecipe.ingredients,
        { item: 'salt', amount: 'to taste', unit: '', prep: null, optional: false, substitutes: [] },
      ],
    };
    const scaled = scaleRecipe(recipe, 4);
    expect(scaled.scaleFactor).toBe(1);
    expect(scaled.yield).toBe('Serves 4');
    expect(scaled.ingredients.map(i => i.amount)).toEqual(['2', '1', '2', 'to taste']);
    expect(scaled.scalingNotes).toEqual([]);
  });

  it('scales a range yield from its low end and keeps the range', () => {
    const scaled = scaleRecipe({ ...mockRecipe, yield: '4-6 servings' }, 8);
    expect(scaled.scaleFactor).toBe(2);
    expect(scaled.yield).toBe('8-12 servings');
  });

  it('rewrites a leading-word yield cleanly', () => {
    expect(scaleRecipe({ ...mockRecipe, yield: 'Serves 4' }, 8).yield).toBe('8 servings');
    expect(scaleRecipe({ ...mockRecipe, yield: 'Makes 12 cookies' }, 24).yield).toBe('24 cookies');
  });

  it('scales from a mixed-number yield', () => {
    const scaled = scaleRecipe({ ...mockRecipe, yield: '1 1/2 cups' }, 3);
    expect(scaled.scaleFactor).toBe(2);
    expect(scaled.yield).toBe('3 cups');
  });

  it('produces finite amounts for a zero yield', () => {
    const scaled = scaleRecipe({ ...mockRecipe, yield: '0 servings' }, 2);
    expect(scaled.scaleFactor).toBe(2);
    expect(scaled.scaledIngredients.find(i => i.item === 'flour')?.scaledAmount).toBe('4');
  });

  it('rejects a target yield that is not a positive number', () => {
    expect(() => scaleRecipe(mockRecipe, 0)).toThrow(RangeError);
    expect(() => scaleRecipe(mockRecipe, -2)).toThrow(RangeError);
    expect(() => scaleRecipe(mockRecipe, NaN)).toThrow(RangeError);
    expect(() => scaleRecipe(mockRecipe, Infinity)).toThrow(RangeError);
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

  it('labels fractional bases with kitchen fractions', () => {
    const presets = getScalingPresets({ ...mockRecipe, yield: '1 1/2 cups' });
    expect(presets[0].label).toBe('Half (3/4 cups)');
    expect(presets[2].label).toBe('1.5x (2 1/4 cups)');
    expect(presets.some(p => /\d\.\d/.test(p.label.replace('1.5x', '')))).toBe(false);
  });

  it('labels range yields as ranges', () => {
    const presets = getScalingPresets({ ...mockRecipe, yield: '4-6 servings' });
    expect(presets[1]).toEqual({ label: 'Original (4-6 servings)', value: 4 });
    expect(presets[3]).toEqual({ label: 'Double (8-12 servings)', value: 8 });
  });
});
