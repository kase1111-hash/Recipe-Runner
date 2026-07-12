// Shopping List Service
// Consolidates ingredients from multiple recipes into a single checkable list

import { parseAmount, formatAmount } from './utils/parseAmount';
import type { Ingredient, Recipe } from '../types';
import type { ShoppingListItem } from '../types';
import {
  addShoppingListItems,
  getShoppingListItems,
  updateShoppingListItem,
  deleteShoppingListItems,
  clearShoppingList as dbClearShoppingList,
} from '../db';

/** A display row: one ingredient, possibly merged from several recipes */
export interface ConsolidatedItem {
  key: string;            // normalized item + unit
  item: string;           // display name (first-seen casing)
  totalAmount: string;    // formatted combined amount, '' if amounts aren't summable
  unit: string;
  checked: boolean;       // true only when every underlying entry is checked
  sources: ShoppingListItem[];  // underlying rows (one per recipe / custom entry)
}

/**
 * Normalize an ingredient name for merging: lowercase, trim, collapse
 * whitespace, and drop a trailing "s" so "onion" and "onions" merge.
 */
export function normalizeItemName(item: string): string {
  const cleaned = item.toLowerCase().trim().replace(/\s+/g, ' ');
  // Only strip a plural "s" on words longer than 3 chars, and leave
  // "ss"/"ses" endings alone ("molasses", "swiss") to avoid mangling
  return cleaned.length > 3 && cleaned.endsWith('s') && !/(?:ss|ses)$/.test(cleaned)
    ? cleaned.slice(0, -1)
    : cleaned;
}

function normalizeUnit(unit: string): string {
  return unit.toLowerCase().trim();
}

/** Build stable row id without relying on crypto (jsdom-safe) */
function makeId(): string {
  return `sli-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Add all of a recipe's ingredients to the shopping list.
 * Optional ingredients are included — the user can uncheck/delete them in the list.
 * Returns the number of items added.
 */
export async function addRecipeToShoppingList(recipe: Recipe): Promise<number> {
  const now = new Date().toISOString();
  const items: ShoppingListItem[] = recipe.ingredients.map((ing: Ingredient) => ({
    id: makeId(),
    item: ing.item,
    amount: ing.amount,
    unit: ing.unit,
    recipe_id: recipe.id,
    recipe_name: recipe.name,
    checked: false,
    custom: false,
    added_at: now,
  }));
  await addShoppingListItems(items);
  return items.length;
}

/** Add a free-form item typed by the user ("paper towels") */
export async function addCustomShoppingItem(text: string): Promise<ShoppingListItem | null> {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const item: ShoppingListItem = {
    id: makeId(),
    item: trimmed,
    amount: '',
    unit: '',
    recipe_id: null,
    recipe_name: null,
    checked: false,
    custom: true,
    added_at: new Date().toISOString(),
  };
  await addShoppingListItems([item]);
  return item;
}

export async function loadShoppingList(): Promise<ShoppingListItem[]> {
  return getShoppingListItems();
}

/** Toggle checked state for every underlying row of a consolidated item */
export async function setConsolidatedItemChecked(item: ConsolidatedItem, checked: boolean): Promise<void> {
  await Promise.all(item.sources.map((source) => updateShoppingListItem(source.id, { checked })));
}

/** Remove a consolidated item (all its underlying rows) */
export async function removeConsolidatedItem(item: ConsolidatedItem): Promise<void> {
  await deleteShoppingListItems(item.sources.map((source) => source.id));
}

/** Remove every row that came from a given recipe */
export async function removeRecipeFromShoppingList(recipeId: string): Promise<void> {
  const items = await getShoppingListItems();
  const ids = items.filter((i) => i.recipe_id === recipeId).map((i) => i.id);
  await deleteShoppingListItems(ids);
}

export async function clearCheckedItems(): Promise<void> {
  const items = await getShoppingListItems();
  const ids = items.filter((i) => i.checked).map((i) => i.id);
  await deleteShoppingListItems(ids);
}

export async function clearShoppingList(): Promise<void> {
  await dbClearShoppingList();
}

/**
 * Merge raw rows into display rows: same item name + same unit are combined
 * and their amounts summed. Amounts that can't be parsed (e.g. "to taste")
 * keep the row separate from summation but still merge visually — the
 * unparseable portion is appended as text.
 */
export function consolidateItems(items: ShoppingListItem[]): ConsolidatedItem[] {
  const groups = new Map<string, ConsolidatedItem & { numericTotal: number; unparsed: string[] }>();

  for (const row of items) {
    const key = `${normalizeItemName(row.item)}|${normalizeUnit(row.unit)}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        item: row.item,
        totalAmount: '',
        unit: row.unit,
        checked: true,
        sources: [],
        numericTotal: 0,
        unparsed: [],
      };
      groups.set(key, group);
    }
    group.sources.push(row);
    group.checked = group.checked && row.checked;

    const amount = row.amount.trim();
    if (amount) {
      const parsed = parseAmount(amount, 0);
      if (parsed > 0) {
        group.numericTotal += parsed;
      } else {
        group.unparsed.push(amount);
      }
    }
  }

  const result: ConsolidatedItem[] = [];
  for (const group of groups.values()) {
    const parts: string[] = [];
    if (group.numericTotal > 0) parts.push(formatAmount(group.numericTotal));
    parts.push(...group.unparsed);
    result.push({
      key: group.key,
      item: group.item,
      totalAmount: parts.join(' + '),
      unit: group.unit,
      checked: group.checked,
      sources: group.sources,
    });
  }

  // Unchecked first, then alphabetical
  result.sort((a, b) => Number(a.checked) - Number(b.checked) || a.item.localeCompare(b.item));
  return result;
}

/** Plain-text export for clipboard / share sheet */
export function formatShoppingListText(consolidated: ConsolidatedItem[]): string {
  const lines: string[] = ['Shopping List', ''];
  for (const item of consolidated) {
    const qty = [item.totalAmount, item.unit].filter(Boolean).join(' ');
    const recipes = [...new Set(item.sources.map((s) => s.recipe_name).filter(Boolean))];
    const suffix = recipes.length > 0 ? `  (${recipes.join(', ')})` : '';
    lines.push(`${item.checked ? '[x]' : '[ ]'} ${qty ? `${qty} ` : ''}${item.item}${suffix}`);
  }
  return lines.join('\n');
}
