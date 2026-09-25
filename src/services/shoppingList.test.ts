import { describe, it, expect, beforeEach } from 'vitest';
import {
  consolidateItems,
  normalizeItemName,
  normalizeUnit,
  formatShoppingListText,
  addRecipeToShoppingList,
  addCustomShoppingItem,
  loadShoppingList,
  removeRecipeFromShoppingList,
} from './shoppingList';
import { db, updateShoppingListItem } from '../db';
import type { Recipe, ShoppingListItem } from '../types';

function makeItem(overrides: Partial<ShoppingListItem>): ShoppingListItem {
  return {
    id: `id-${Math.random()}`,
    item: 'flour',
    amount: '1',
    unit: 'cup',
    recipe_id: 'r1',
    recipe_name: 'Bread',
    checked: false,
    custom: false,
    added_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('normalizeItemName', () => {
  it('lowercases and trims', () => {
    expect(normalizeItemName('  Yellow Onion ')).toBe('yellow onion');
  });

  it('strips trailing plural s on longer words', () => {
    expect(normalizeItemName('onions')).toBe('onion');
    expect(normalizeItemName('eggs')).toBe('egg');
  });

  it('does not strip s from short words or double-s words', () => {
    expect(normalizeItemName('gas')).toBe('gas');
    expect(normalizeItemName('molasses')).toBe('molasses');
  });

  it('collapses internal whitespace', () => {
    expect(normalizeItemName('olive   oil')).toBe('olive oil');
  });

  it('merges "oes", "ies", "es" and irregular plurals with their singulars', () => {
    const pairs: [string, string][] = [
      ['tomatoes', 'tomato'],
      ['potatoes', 'potato'],
      ['berries', 'berry'],
      ['cherries', 'cherry'],
      ['cookies', 'cookie'],
      ['peaches', 'peach'],
      ['radishes', 'radish'],
      ['bay leaves', 'bay leaf'],
      ['cheeses', 'cheese'],
      ['cloves', 'clove'],
    ];
    for (const [plural, singular] of pairs) {
      expect(normalizeItemName(plural)).toBe(normalizeItemName(singular));
    }
    expect(normalizeItemName('tomatoes')).toBe('tomato');
    expect(normalizeItemName('berries')).toBe('berry');
  });

  it('leaves words that only look plural alone', () => {
    for (const word of ['molasses', 'hummus', 'asparagus', 'couscous', 'swiss', 'lemongrass']) {
      expect(normalizeItemName(word)).toBe(word);
    }
    expect(normalizeItemName('Swiss')).toBe('swiss');
  });

  it('only singularizes the last word', () => {
    expect(normalizeItemName('peas and carrots')).toBe('peas and carrot');
  });
});

describe('normalizeUnit', () => {
  it('maps spellings of the same unit together', () => {
    const groups = [
      ['cup', 'cups', 'Cups', 'c'],
      ['tbsp', 'Tbsp.', 'tablespoon', 'tablespoons', 'T', 'tbs'],
      ['tsp', 'tsp.', 'teaspoon', 'teaspoons', 't'],
      ['lb', 'lbs', 'pound', 'pounds'],
      ['oz', 'ounce', 'ounces', 'oz.'],
      ['g', 'gram', 'grams'],
      ['ml', 'milliliters', 'mL'],
      ['clove', 'cloves'],
      ['can', 'cans'],
    ];
    for (const group of groups) {
      const canonical = normalizeUnit(group[0]);
      for (const spelling of group) {
        expect(normalizeUnit(spelling)).toBe(canonical);
      }
    }
  });

  it('keeps different units apart', () => {
    expect(normalizeUnit('tbsp')).not.toBe(normalizeUnit('tsp'));
    expect(normalizeUnit('T')).not.toBe(normalizeUnit('t'));
    expect(normalizeUnit('cup')).not.toBe(normalizeUnit('g'));
    expect(normalizeUnit('oz')).not.toBe(normalizeUnit('fl oz'));
  });

  it('returns empty string for no unit', () => {
    expect(normalizeUnit('')).toBe('');
    expect(normalizeUnit('  ')).toBe('');
  });
});

describe('consolidateItems', () => {
  it('merges same item + unit and sums amounts', () => {
    const rows = [
      makeItem({ item: 'flour', amount: '2', unit: 'cups', recipe_name: 'Bread' }),
      makeItem({ item: 'Flour', amount: '1 1/2', unit: 'cups', recipe_name: 'Cake' }),
    ];
    const result = consolidateItems(rows);
    expect(result).toHaveLength(1);
    expect(result[0].totalAmount).toBe('3 1/2');
    expect(result[0].sources).toHaveLength(2);
  });

  it('merges singular and plural forms', () => {
    const rows = [
      makeItem({ item: 'onion', amount: '1', unit: '' }),
      makeItem({ item: 'onions', amount: '2', unit: '' }),
    ];
    const result = consolidateItems(rows);
    expect(result).toHaveLength(1);
    expect(result[0].totalAmount).toBe('3');
  });

  it('keeps different units separate', () => {
    const rows = [
      makeItem({ item: 'milk', amount: '1', unit: 'cup' }),
      makeItem({ item: 'milk', amount: '2', unit: 'tbsp' }),
    ];
    const result = consolidateItems(rows);
    expect(result).toHaveLength(2);
  });

  it('handles unicode fraction amounts', () => {
    const rows = [
      makeItem({ item: 'butter', amount: '½', unit: 'cup' }),
      makeItem({ item: 'butter', amount: '¼', unit: 'cup' }),
    ];
    const result = consolidateItems(rows);
    expect(result).toHaveLength(1);
    expect(result[0].totalAmount).toBe('3/4');
  });

  it('appends unparseable amounts as text instead of dropping them', () => {
    const rows = [
      makeItem({ item: 'salt', amount: '1', unit: 'tsp' }),
      makeItem({ item: 'salt', amount: 'to taste', unit: 'tsp' }),
    ];
    const result = consolidateItems(rows);
    expect(result).toHaveLength(1);
    expect(result[0].totalAmount).toBe('1 + to taste');
  });

  it('is checked only when every source row is checked', () => {
    const rows = [
      makeItem({ item: 'eggs', checked: true }),
      makeItem({ item: 'eggs', checked: false }),
    ];
    expect(consolidateItems(rows)[0].checked).toBe(false);

    const allChecked = [
      makeItem({ item: 'eggs', checked: true }),
      makeItem({ item: 'eggs', checked: true }),
    ];
    expect(consolidateItems(allChecked)[0].checked).toBe(true);
  });

  it('sorts unchecked before checked, then alphabetically', () => {
    const rows = [
      makeItem({ item: 'zucchini', checked: false }),
      makeItem({ item: 'apples', checked: true }),
      makeItem({ item: 'butter', checked: false }),
    ];
    const result = consolidateItems(rows);
    expect(result.map((r) => r.item)).toEqual(['butter', 'zucchini', 'apples']);
  });

  it('returns empty array for empty input', () => {
    expect(consolidateItems([])).toEqual([]);
  });

  it('does not sum the two ends of a range', () => {
    const result = consolidateItems([makeItem({ item: 'olive oil', amount: '1 to 2', unit: 'tbsp' })]);
    expect(result).toHaveLength(1);
    expect(result[0].totalAmount).toBe('1 to 2');
  });

  it('keeps ranges as written next to summed numbers', () => {
    const rows = [
      makeItem({ item: 'olive oil', amount: '1', unit: 'tbsp' }),
      makeItem({ item: 'olive oil', amount: '2-3', unit: 'tbsp' }),
      makeItem({ item: 'olive oil', amount: '1/2', unit: 'tbsp' }),
    ];
    expect(consolidateItems(rows)[0].totalAmount).toBe('1 1/2 + 2-3');
  });

  it('does not sum amounts with trailing words', () => {
    const rows = [
      makeItem({ item: 'eggs', amount: '2 large', unit: '' }),
      makeItem({ item: 'eggs', amount: '1', unit: '' }),
    ];
    expect(consolidateItems(rows)[0].totalAmount).toBe('1 + 2 large');
  });

  it('merges different spellings of the same unit and shows a sensible unit', () => {
    const rows = [
      makeItem({ item: 'flour', amount: '1', unit: 'cup' }),
      makeItem({ item: 'flour', amount: '2', unit: 'cups' }),
    ];
    const result = consolidateItems(rows);
    expect(result).toHaveLength(1);
    expect(result[0].totalAmount).toBe('3');
    expect(result[0].unit).toBe('cups');

    const spoons = consolidateItems([
      makeItem({ item: 'sugar', amount: '1', unit: 'tablespoon' }),
      makeItem({ item: 'sugar', amount: '2', unit: 'Tbsp' }),
    ]);
    expect(spoons).toHaveLength(1);
    expect(spoons[0].totalAmount).toBe('3');
    expect(spoons[0].unit).toBe('tbsp');

    const garlic = consolidateItems([
      makeItem({ item: 'garlic', amount: '1', unit: 'clove' }),
      makeItem({ item: 'garlic', amount: '3', unit: 'cloves' }),
    ]);
    expect(garlic).toHaveLength(1);
    expect(garlic[0].unit).toBe('cloves');
  });

  it('merges plural item names like tomatoes/tomato', () => {
    const rows = [
      makeItem({ item: 'tomato', amount: '1', unit: '' }),
      makeItem({ item: 'tomatoes', amount: '2', unit: '' }),
    ];
    const result = consolidateItems(rows);
    expect(result).toHaveLength(1);
    expect(result[0].totalAmount).toBe('3');
  });

  it('never merges incompatible units', () => {
    const rows = [
      makeItem({ item: 'flour', amount: '1', unit: 'cup' }),
      makeItem({ item: 'flour', amount: '200', unit: 'g' }),
      makeItem({ item: 'butter', amount: '1', unit: 'tbsp' }),
      makeItem({ item: 'butter', amount: '1', unit: 'tsp' }),
    ];
    expect(consolidateItems(rows)).toHaveLength(4);
  });
});

describe('addRecipeToShoppingList', () => {
  function makeRecipe(overrides: Partial<Recipe> = {}): Recipe {
    return {
      id: 'recipe-1',
      cookbook_id: 'cb1',
      name: 'Pancakes',
      description: '',
      total_time: '20 min',
      active_time: '20 min',
      yield: '4 servings',
      difficulty: { overall: 1, technique: 1, timing: 1, ingredients: 1, equipment: 1 },
      equipment: [],
      tags: [],
      source: { type: 'original' },
      ingredients: [
        { item: 'flour', amount: '2', unit: 'cups', optional: false, substitutes: [] },
        { item: 'eggs', amount: '2', unit: '', optional: false, substitutes: [] },
        { item: 'salt', amount: 'a pinch', unit: '', optional: false, substitutes: [] },
      ],
      steps: [],
      notes: '',
      created_at: '2026-01-01T00:00:00Z',
      modified_at: '2026-01-01T00:00:00Z',
      cook_history: [],
      ...overrides,
    };
  }

  beforeEach(async () => {
    await db.shoppingList.clear();
  });

  it('adds every ingredient and reports a fresh add', async () => {
    const result = await addRecipeToShoppingList(makeRecipe());
    expect(result).toEqual({ count: 3, updated: false });
    expect(await loadShoppingList()).toHaveLength(3);
  });

  it('replaces the recipe instead of doubling it when added again', async () => {
    await addRecipeToShoppingList(makeRecipe());
    const result = await addRecipeToShoppingList(makeRecipe());
    expect(result).toEqual({ count: 3, updated: true });

    const rows = await loadShoppingList();
    expect(rows).toHaveLength(3);
    const flour = consolidateItems(rows).find((c) => c.item === 'flour');
    expect(flour?.totalAmount).toBe('2');
  });

  it('picks up changed amounts (e.g. after scaling) when re-added', async () => {
    await addRecipeToShoppingList(makeRecipe());
    await addRecipeToShoppingList(makeRecipe({
      ingredients: [{ item: 'flour', amount: '4', unit: 'cups', optional: false, substitutes: [] }],
    }));
    const consolidated = consolidateItems(await loadShoppingList());
    expect(consolidated).toHaveLength(1);
    expect(consolidated[0].totalAmount).toBe('4');
  });

  it('keeps checked state for unchanged items and resets it for changed ones', async () => {
    await addRecipeToShoppingList(makeRecipe());
    for (const row of await loadShoppingList()) {
      await updateShoppingListItem(row.id, { checked: true });
    }
    await addRecipeToShoppingList(makeRecipe({
      ingredients: [
        { item: 'flour', amount: '4', unit: 'cups', optional: false, substitutes: [] },
        { item: 'eggs', amount: '2', unit: '', optional: false, substitutes: [] },
      ],
    }));
    const rows = await loadShoppingList();
    expect(rows.find((r) => r.item === 'eggs')?.checked).toBe(true);
    expect(rows.find((r) => r.item === 'flour')?.checked).toBe(false);
  });

  it('leaves other recipes and custom items alone', async () => {
    await addRecipeToShoppingList(makeRecipe());
    await addRecipeToShoppingList(makeRecipe({ id: 'recipe-2', name: 'Bread' }));
    await addCustomShoppingItem('paper towels');
    await addRecipeToShoppingList(makeRecipe());

    const rows = await loadShoppingList();
    expect(rows).toHaveLength(7);
    expect(rows.filter((r) => r.recipe_id === 'recipe-2')).toHaveLength(3);
    expect(rows.filter((r) => r.custom)).toHaveLength(1);
    const flour = consolidateItems(rows).find((c) => c.item === 'flour');
    expect(flour?.totalAmount).toBe('4');
  });

  it('can remove one recipe from the list', async () => {
    await addRecipeToShoppingList(makeRecipe());
    await addRecipeToShoppingList(makeRecipe({ id: 'recipe-2', name: 'Bread' }));
    await removeRecipeFromShoppingList('recipe-1');
    const rows = await loadShoppingList();
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.recipe_id === 'recipe-2')).toBe(true);
  });
});

describe('formatShoppingListText', () => {
  it('formats items with quantity, unit, and source recipes', () => {
    const rows = [
      makeItem({ item: 'flour', amount: '2', unit: 'cups', recipe_name: 'Bread' }),
      makeItem({ item: 'flour', amount: '1', unit: 'cups', recipe_name: 'Cake' }),
    ];
    const text = formatShoppingListText(consolidateItems(rows));
    expect(text).toContain('[ ] 3 cups flour  (Bread, Cake)');
  });

  it('omits quantity for custom items without amounts', () => {
    const rows = [makeItem({ item: 'paper towels', amount: '', unit: '', recipe_name: null, custom: true })];
    const text = formatShoppingListText(consolidateItems(rows));
    expect(text).toContain('[ ] paper towels');
  });

  it('marks checked items', () => {
    const rows = [makeItem({ item: 'milk', amount: '1', unit: 'cup', checked: true })];
    const text = formatShoppingListText(consolidateItems(rows));
    expect(text).toContain('[x] 1 cup milk');
  });
});
