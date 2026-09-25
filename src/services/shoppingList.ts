// Shopping List Service
// Consolidates ingredients from multiple recipes into a single checkable list

import { parseQuantity, formatAmount } from './utils/parseAmount';
import type { Ingredient, Recipe } from '../types';
import type { ShoppingListItem } from '../types';
import {
  db,
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

/** Result of adding a recipe to the list */
export interface AddRecipeResult {
  count: number;          // ingredient rows now on the list for this recipe
  updated: boolean;       // true if the recipe was already on the list and was replaced
}

// ============================================
// Name & unit normalization
// ============================================

// Plurals that don't follow the simple suffix rules
const IRREGULAR_PLURALS: Record<string, string> = {
  leaves: 'leaf',
  loaves: 'loaf',
  halves: 'half',
  knives: 'knife',
};

// Words that end in "s" but aren't plurals (beyond the "ss"/"us" endings)
const NOT_PLURAL = new Set(['molasses']);

/**
 * Reduce one word to a merge key for its singular form. The result only has
 * to be the same for "onion"/"onions", "tomato"/"tomatoes",
 * "berry"/"berries", "cookie"/"cookies" - it isn't always a real word.
 */
function singularizeWord(word: string): string {
  if (IRREGULAR_PLURALS[word]) return IRREGULAR_PLURALS[word];
  if (NOT_PLURAL.has(word)) return word;
  // "ies" plurals come from both "y" (berry) and "ie" (cookie) singulars
  if (word.length > 3 && word.endsWith('ies')) return `${word.slice(0, -3)}y`;
  if (word.endsWith('ie')) return `${word.slice(0, -2)}y`;
  if (word.length <= 3) return word;
  // "swiss", "lemongrass", "hummus", "asparagus", "couscous" aren't plurals
  if (/(?:ss|us)$/.test(word)) return word;
  if (word.endsWith('oes')) return word.slice(0, -2);                // tomatoes → tomato
  if (/(?:ch|sh|x|z|ss)es$/.test(word)) return word.slice(0, -2);    // peaches → peach, glasses → glass
  // "quiche"/"quiches" → "quich" to line up with the rule above
  if (/(?:ch|sh)e$/.test(word)) return word.slice(0, -1);
  if (word.endsWith('s')) return word.slice(0, -1);
  return word;
}

/**
 * Normalize an ingredient name for merging: lowercase, trim, collapse
 * whitespace, and singularize the last word so "onion" and "onions" merge.
 */
export function normalizeItemName(item: string): string {
  const words = String(item ?? '').toLowerCase().trim().replace(/\s+/g, ' ').split(' ');
  words[words.length - 1] = singularizeWord(words[words.length - 1]);
  return words.join(' ');
}

// Spellings of the same unit → one canonical unit
const UNIT_ALIASES: Record<string, string> = {
  c: 'cup', cup: 'cup', cups: 'cup',
  tbsp: 'tbsp', tbsps: 'tbsp', tbs: 'tbsp', tbl: 'tbsp', tbls: 'tbsp', tablespoon: 'tbsp', tablespoons: 'tbsp',
  tsp: 'tsp', tsps: 'tsp', teaspoon: 'tsp', teaspoons: 'tsp',
  lb: 'lb', lbs: 'lb', pound: 'lb', pounds: 'lb',
  oz: 'oz', ozs: 'oz', ounce: 'oz', ounces: 'oz',
  'fl oz': 'fl oz', 'fluid ounce': 'fl oz', 'fluid ounces': 'fl oz',
  g: 'g', gr: 'g', gram: 'g', grams: 'g', gramme: 'g', grammes: 'g',
  kg: 'kg', kgs: 'kg', kilo: 'kg', kilos: 'kg', kilogram: 'kg', kilograms: 'kg',
  mg: 'mg', milligram: 'mg', milligrams: 'mg',
  ml: 'ml', milliliter: 'ml', milliliters: 'ml', millilitre: 'ml', millilitres: 'ml',
  l: 'l', liter: 'l', liters: 'l', litre: 'l', litres: 'l',
  pt: 'pint', pint: 'pint', pints: 'pint',
  qt: 'quart', quart: 'quart', quarts: 'quart',
  gal: 'gallon', gallon: 'gallon', gallons: 'gallon',
  pkg: 'package', pkgs: 'package',
};

// How to show a canonical unit when rows spelled it differently: [singular, plural]
const UNIT_DISPLAY: Record<string, [string, string]> = {
  cup: ['cup', 'cups'],
  tbsp: ['tbsp', 'tbsp'],
  tsp: ['tsp', 'tsp'],
  lb: ['lb', 'lb'],
  oz: ['oz', 'oz'],
  'fl oz': ['fl oz', 'fl oz'],
  g: ['g', 'g'],
  kg: ['kg', 'kg'],
  mg: ['mg', 'mg'],
  ml: ['ml', 'ml'],
  l: ['L', 'L'],
  pint: ['pint', 'pints'],
  quart: ['quart', 'quarts'],
  gallon: ['gallon', 'gallons'],
};

/**
 * Canonical unit for merging: "cups"/"cup"/"c" → "cup", "tablespoons"/"tbsp" →
 * "tbsp", "cloves"/"clove" → "clove". Different canonical units never merge.
 */
export function normalizeUnit(unit: string): string {
  const raw = String(unit ?? '').trim();
  // Case matters for the one-letter spoon abbreviations
  if (raw === 'T') return 'tbsp';
  if (raw === 't') return 'tsp';
  const cleaned = raw.toLowerCase().replace(/\./g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  return UNIT_ALIASES[cleaned] ?? normalizeItemName(cleaned);
}

/** Merge key for a row: same key ⇒ same shopping list line */
function consolidationKey(row: Pick<ShoppingListItem, 'item' | 'unit'>): string {
  return `${normalizeItemName(row.item)}|${normalizeUnit(row.unit)}`;
}

/** Pick the unit label for a merged line whose rows may spell the unit differently */
function displayUnit(canonical: string, rawUnits: string[], total: number): string {
  const distinct = [...new Set(rawUnits.map((u) => u.trim()))];
  if (distinct.length <= 1) return rawUnits[0] ?? '';
  const known = UNIT_DISPLAY[canonical];
  if (known) return total > 1 ? known[1] : known[0];
  // Unlisted unit ("clove"/"cloves"): use whichever spelling fits the total
  const singular = distinct.find((u) => u.toLowerCase() === canonical);
  const plural = distinct.find((u) => u.toLowerCase() !== canonical);
  return (total > 1 ? plural ?? singular : singular ?? plural) ?? distinct[0];
}

/** Build stable row id without relying on crypto (jsdom-safe) */
function makeId(): string {
  return `sli-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// ============================================
// List operations
// ============================================

/**
 * Add all of a recipe's ingredients to the shopping list.
 * Optional ingredients are included — the user can uncheck/delete them in the list.
 *
 * If the recipe is already on the list its previous rows are replaced (not
 * added to), so adding twice never doubles quantities. Items the user already
 * checked off stay checked when the recipe still needs the same amount.
 */
export async function addRecipeToShoppingList(recipe: Recipe): Promise<AddRecipeResult> {
  const now = new Date().toISOString();
  const signature = (row: Pick<ShoppingListItem, 'item' | 'unit' | 'amount'>) =>
    `${consolidationKey(row)}|${row.amount.trim()}`;

  return db.transaction('rw', db.shoppingList, async () => {
    const previous = (await getShoppingListItems()).filter((i) => i.recipe_id === recipe.id);
    const checkedBefore = new Set(previous.filter((i) => i.checked).map(signature));

    const items: ShoppingListItem[] = recipe.ingredients.map((ing: Ingredient) => {
      const row = {
        id: makeId(),
        item: ing.item,
        amount: ing.amount ?? '',
        unit: ing.unit ?? '',
        recipe_id: recipe.id,
        recipe_name: recipe.name,
        checked: false,
        custom: false,
        added_at: now,
      };
      return { ...row, checked: checkedBefore.has(signature(row)) };
    });

    if (previous.length > 0) {
      await deleteShoppingListItems(previous.map((i) => i.id));
    }
    await addShoppingListItems(items);
    return { count: items.length, updated: previous.length > 0 };
  });
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
 * Merge raw rows into display rows: same item name + same unit (after
 * normalizing spellings like "cups"/"cup") are combined. Only plain numbers
 * are summed; ranges ("1 to 2") and text ("to taste") are appended as
 * written. Rows with incompatible units (cups vs grams) stay separate.
 */
export function consolidateItems(items: ShoppingListItem[]): ConsolidatedItem[] {
  const groups = new Map<string, ConsolidatedItem & { canonicalUnit: string; numericTotal: number; unparsed: string[] }>();

  for (const row of items) {
    const key = consolidationKey(row);
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        item: row.item,
        totalAmount: '',
        unit: row.unit,
        canonicalUnit: normalizeUnit(row.unit),
        checked: true,
        sources: [],
        numericTotal: 0,
        unparsed: [],
      };
      groups.set(key, group);
    }
    group.sources.push(row);
    group.checked = group.checked && row.checked;

    const amount = (row.amount ?? '').trim();
    if (amount) {
      const quantity = parseQuantity(amount);
      if (quantity && quantity.low === quantity.high && quantity.low > 0) {
        group.numericTotal += quantity.low;
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
      unit: displayUnit(group.canonicalUnit, group.sources.map((s) => s.unit ?? ''), group.numericTotal),
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
