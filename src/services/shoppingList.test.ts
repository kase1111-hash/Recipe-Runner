import { describe, it, expect } from 'vitest';
import { consolidateItems, normalizeItemName, formatShoppingListText } from './shoppingList';
import type { ShoppingListItem } from '../types';

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
