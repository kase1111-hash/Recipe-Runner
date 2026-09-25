// Recipe Scaling Service
// Phase 4 Smart Feature - Automatic ingredient recalculation

import type { Recipe, Ingredient } from '../types';
import { parseQuantity, parseLeadingQuantity, findQuantity, formatQuantity } from './utils';

// ============================================
// Types
// ============================================

export interface ScaledRecipe extends Recipe {
  originalYield: string;
  scaleFactor: number;
  scaledIngredients: ScaledIngredient[];
  scalingNotes: string[];
}

export interface ScaledIngredient extends Ingredient {
  originalAmount: string;
  scaledAmount: string;
  scalingWarning?: string;
}

export interface ParsedYield {
  /** Base value used for scaling (the low end of a range like "4-6 servings") */
  value: number;
  /** Top of a range yield ("4-6 servings" → 6); absent for a single number */
  high?: number;
  unit: string;
  original: string;
}

// ============================================
// Ingredients that don't scale linearly
// ============================================

// Amounts are still scaled linearly - silently changing a quantity is worse
// than a heads-up - but once the scale factor passes `warnAbove` the note is
// attached as a warning so the cook can decide.
const NON_LINEAR_INGREDIENTS: Record<string, { warnAbove: number; note: string }> = {
  'egg': { warnAbove: 1.5, note: 'Eggs may need adjustment - consider using 1 less when doubling' },
  'yeast': { warnAbove: 1.5, note: 'Yeast doesn\'t scale linearly - use 75% when doubling' },
  'baking powder': { warnAbove: 2, note: 'Reduce slightly when scaling up to avoid metallic taste' },
  'baking soda': { warnAbove: 2, note: 'Reduce slightly when scaling up' },
  'salt': { warnAbove: 1.75, note: 'Salt intensifies when scaled - taste and adjust' },
  'vanilla extract': { warnAbove: 1.5, note: 'Extracts are potent - scale conservatively' },
  'garlic': { warnAbove: 1.5, note: 'Garlic flavor intensifies - scale conservatively' },
  'hot sauce': { warnAbove: 1.25, note: 'Heat doesn\'t scale linearly - add to taste' },
  'cayenne': { warnAbove: 1.25, note: 'Heat doesn\'t scale linearly - add to taste' },
  'chili': { warnAbove: 1.25, note: 'Heat doesn\'t scale linearly - add to taste' },
};

// Items that typically don't need scaling
const FIXED_ITEMS = [
  'bay leaf',
  'bay leaves',
  'cinnamon stick',
  'vanilla bean',
];

/**
 * Whole-word, case-insensitive matcher for an ingredient term, allowing a
 * plural "s"/"es" ending. "salt" matches "kosher salt" but not "unsalted
 * butter"; "egg" matches "eggs" but not "eggplant".
 */
function termPattern(term: string): RegExp {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  return new RegExp(`\\b${escaped}(?:s|es)?\\b`, 'i');
}

const NON_LINEAR_PATTERNS = Object.entries(NON_LINEAR_INGREDIENTS).map(([term, config]) => ({
  pattern: termPattern(term),
  ...config,
}));
const FIXED_PATTERNS = FIXED_ITEMS.map(termPattern);

// ============================================
// Yield Parsing
// ============================================

/** Words before the number that mean the yield counts servings ("Serves 4") */
const SERVINGS_LEAD = /\b(?:serves|feeds)\b/i;

// Singular/plural pairs for the units this module supplies itself
const OWN_UNIT_FORMS: Record<string, [string, string]> = {
  batch: ['batch', 'batches'],
  batches: ['batch', 'batches'],
  serving: ['serving', 'servings'],
  servings: ['serving', 'servings'],
};

/** Clean the text after a yield number down to a unit: "servings (about 2 cups)" → "servings" */
function cleanYieldUnit(rest: string): string {
  return rest
    .replace(/\([^)]*\)/g, ' ')          // drop parentheticals: "12 (2-inch) cookies"
    .split(/[,;(]/)[0]                   // drop trailing notes: "4 servings, about 2 cups"
    .replace(/^[\s:.\-–—]+|[\s:.]+$/g, '')
    .replace(/\s+/g, ' ');
}

export function parseYield(yieldStr: string): ParsedYield {
  // Common patterns:
  // "4 servings", "2 loaves", "24 cookies", "8 oz", "1 batch",
  // "4-6 servings", "Serves 4", "Makes 12 cookies", "1 1/2 cups"
  const original = typeof yieldStr === 'string' ? yieldStr : '';
  const found = findQuantity(original);

  // No number, or a zero yield we can't scale from: treat as one batch
  if (!found || !(found.low > 0)) {
    return { value: 1, unit: 'batch', original };
  }

  const unit = SERVINGS_LEAD.test(found.before)
    ? 'servings'
    : cleanYieldUnit(found.rest) || 'servings';

  return found.high > found.low
    ? { value: found.low, high: found.high, unit, original }
    : { value: found.low, unit, original };
}

/**
 * Describe a parsed yield scaled so its base becomes `newValue`, e.g.
 * parseYield("4-6 servings") at 8 → "8-12 servings". Uses kitchen fractions
 * ("1 1/2 cups", not "1.5 cups").
 */
export function formatScaledYield(parsed: ParsedYield, newValue: number): string {
  const factor = newValue / parsed.value;
  const high = parsed.high !== undefined ? parsed.high * factor : newValue;
  // "servings"/"batch" are safe to re-pluralize ("1 serving", "2 batches")
  const forms = OWN_UNIT_FORMS[parsed.unit.toLowerCase()];
  const unit = forms ? forms[high > 1 ? 1 : 0] : parsed.unit;
  return `${formatQuantity({ low: newValue, high })} ${unit}`.trim();
}

/**
 * The target yield value that a previously applied yield string corresponds
 * to (e.g. "8-12 servings" → 8), for pre-selecting the current scale.
 * Falls back to the recipe's own base yield when there's nothing usable.
 */
export function resolveAppliedYieldValue(recipe: Recipe, appliedYield?: string): number {
  const base = parseYield(recipe.yield).value;
  if (!appliedYield || appliedYield === recipe.yield) return base;
  const found = findQuantity(appliedYield);
  return found && found.low > 0 ? found.low : base;
}

// ============================================
// Amount Scaling
// ============================================

/**
 * Scale the quantity in an amount string, keeping it a range if it was one
 * ("2-3" ×2 → "4-6") and keeping any trailing words ("2 large" → "4 large").
 * Returns null when the amount has no leading quantity ("to taste", "").
 */
function scaleAmountText(amount: string, factor: number): string | null {
  const whole = parseQuantity(amount);
  if (whole) {
    return formatQuantity({ low: whole.low * factor, high: whole.high * factor });
  }
  const leading = parseLeadingQuantity(amount);
  if (leading) {
    return formatQuantity({ low: leading.low * factor, high: leading.high * factor }) + leading.rest;
  }
  return null;
}

// ============================================
// Scaling Logic
// ============================================

export function scaleIngredient(
  ingredient: Ingredient,
  scaleFactor: number
): ScaledIngredient {
  const originalAmount = ingredient.amount == null ? '' : String(ingredient.amount);
  const itemName = typeof ingredient.item === 'string' ? ingredient.item : '';
  let scaledAmount = originalAmount;
  let warning: string | undefined;

  // At 1x leave every amount exactly as written
  if (scaleFactor !== 1) {
    if (FIXED_PATTERNS.some((pattern) => pattern.test(itemName))) {
      warning = 'This item typically doesn\'t need scaling';
    } else {
      const scaled = scaleAmountText(originalAmount, scaleFactor);
      // Amounts without a quantity ("to taste", "a pinch") stay unchanged
      if (scaled !== null) {
        scaledAmount = scaled;
        const nonLinear = NON_LINEAR_PATTERNS.find(({ pattern }) => pattern.test(itemName));
        if (nonLinear && scaleFactor > nonLinear.warnAbove) {
          warning = nonLinear.note;
        }
      }
    }
  }

  return {
    ...ingredient,
    originalAmount,
    scaledAmount,
    amount: scaledAmount,
    scalingWarning: warning,
  };
}

/**
 * Scale a recipe so it yields `newYieldValue` of its yield unit.
 * Throws a RangeError for a target that isn't a positive, finite number.
 */
export function scaleRecipe(recipe: Recipe, newYieldValue: number): ScaledRecipe {
  if (!Number.isFinite(newYieldValue) || newYieldValue <= 0) {
    throw new RangeError(`Target yield must be a positive number (got ${newYieldValue})`);
  }

  const currentYield = parseYield(recipe.yield);
  const scaleFactor = newYieldValue / currentYield.value;

  const scaledIngredients = recipe.ingredients.map(ing =>
    scaleIngredient(ing, scaleFactor)
  );

  // Collect scaling notes
  const scalingNotes: string[] = [];

  if (scaleFactor > 2) {
    scalingNotes.push('Large scale-up: Consider batch cooking and increased cook times');
  } else if (scaleFactor < 0.5) {
    scalingNotes.push('Significant reduction: Watch cooking times closely');
  }

  // Add unique warnings from ingredients
  const warnings = new Set(
    scaledIngredients
      .filter(i => i.scalingWarning)
      .map(i => i.scalingWarning!)
  );
  scalingNotes.push(...warnings);

  // Update yield string (unchanged at 1x so "Serves 4" isn't rewritten)
  const newYield = scaleFactor === 1
    ? recipe.yield
    : formatScaledYield(currentYield, newYieldValue);

  return {
    ...recipe,
    yield: newYield,
    originalYield: recipe.yield,
    scaleFactor,
    scaledIngredients,
    ingredients: scaledIngredients,
    scalingNotes,
  };
}

// ============================================
// Common Scaling Presets
// ============================================

const PRESET_MULTIPLIERS: [string, number][] = [
  ['Half', 0.5],
  ['Original', 1],
  ['1.5x', 1.5],
  ['Double', 2],
  ['Triple', 3],
];

export function getScalingPresets(recipe: Recipe): { label: string; value: number }[] {
  const currentYield = parseYield(recipe.yield);
  const base = currentYield.value;

  return PRESET_MULTIPLIERS.map(([name, multiplier]) => ({
    label: `${name} (${formatScaledYield(currentYield, base * multiplier)})`,
    value: base * multiplier,
  }));
}
