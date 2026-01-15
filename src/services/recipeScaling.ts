// Recipe Scaling Service
// Phase 4 Smart Feature - Automatic ingredient recalculation

import type { Recipe, Ingredient } from '../types';

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
  value: number;
  unit: string;
  original: string;
}

// ============================================
// Ingredients that don't scale linearly
// ============================================

const NON_LINEAR_INGREDIENTS: Record<string, { maxScale: number; note: string }> = {
  'egg': { maxScale: 1.5, note: 'Eggs may need adjustment - consider using 1 less when doubling' },
  'eggs': { maxScale: 1.5, note: 'Eggs may need adjustment - consider using 1 less when doubling' },
  'yeast': { maxScale: 1.5, note: 'Yeast doesn\'t scale linearly - use 75% when doubling' },
  'baking powder': { maxScale: 2, note: 'Reduce slightly when scaling up to avoid metallic taste' },
  'baking soda': { maxScale: 2, note: 'Reduce slightly when scaling up' },
  'salt': { maxScale: 1.75, note: 'Salt intensifies when scaled - taste and adjust' },
  'vanilla extract': { maxScale: 1.5, note: 'Extracts are potent - scale conservatively' },
  'garlic': { maxScale: 1.5, note: 'Garlic flavor intensifies - scale conservatively' },
  'hot sauce': { maxScale: 1.25, note: 'Heat doesn\'t scale linearly - add to taste' },
  'cayenne': { maxScale: 1.25, note: 'Heat doesn\'t scale linearly - add to taste' },
  'chili': { maxScale: 1.25, note: 'Heat doesn\'t scale linearly - add to taste' },
};

// Items that typically don't need scaling
const FIXED_ITEMS = [
  'bay leaf',
  'bay leaves',
  'cinnamon stick',
  'vanilla bean',
];

// ============================================
// Yield Parsing
// ============================================

export function parseYield(yieldStr: string): ParsedYield {
  // Common patterns:
  // "4 servings", "2 loaves", "24 cookies", "8 oz", "1 batch"

  const match = yieldStr.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);

  if (match) {
    return {
      value: parseFloat(match[1]),
      unit: match[2].trim() || 'servings',
      original: yieldStr,
    };
  }

  // Try to find any number in the string
  const numMatch = yieldStr.match(/(\d+(?:\.\d+)?)/);
  if (numMatch) {
    return {
      value: parseFloat(numMatch[1]),
      unit: yieldStr.replace(numMatch[1], '').trim() || 'servings',
      original: yieldStr,
    };
  }

  // Default to 1 serving if we can't parse
  return {
    value: 1,
    unit: 'batch',
    original: yieldStr,
  };
}

// ============================================
// Amount Parsing & Formatting
// ============================================

interface ParsedAmount {
  value: number;
  unit: string;
  original: string;
}

function parseAmount(amount: string): ParsedAmount {
  const original = amount;

  // Handle fractions like "1/2", "3/4"
  let value = 0;
  const parts = amount.trim().split(/\s+/);

  for (const part of parts) {
    if (part.includes('/')) {
      const [num, denom] = part.split('/').map(Number);
      if (denom) value += num / denom;
    } else {
      const num = parseFloat(part);
      if (!isNaN(num)) value += num;
    }
  }

  // Extract unit if present
  const unitMatch = amount.match(/[a-zA-Z]+$/);
  const unit = unitMatch ? unitMatch[0] : '';

  return { value: value || 0, unit, original };
}

function formatAmount(value: number): string {
  // Convert to nice fractions for common values
  const fractions: Record<number, string> = {
    0.125: '1/8',
    0.25: '1/4',
    0.333: '1/3',
    0.375: '3/8',
    0.5: '1/2',
    0.625: '5/8',
    0.666: '2/3',
    0.75: '3/4',
    0.875: '7/8',
  };

  if (value === 0) return '0';

  const whole = Math.floor(value);
  const decimal = value - whole;

  // Find closest fraction
  let closestFraction = '';
  let minDiff = 0.05; // Tolerance

  for (const [key, frac] of Object.entries(fractions)) {
    const diff = Math.abs(decimal - parseFloat(key));
    if (diff < minDiff) {
      minDiff = diff;
      closestFraction = frac;
    }
  }

  if (whole === 0 && closestFraction) {
    return closestFraction;
  } else if (closestFraction) {
    return `${whole} ${closestFraction}`;
  } else if (Number.isInteger(value)) {
    return value.toString();
  } else {
    // Round to reasonable precision
    return value.toFixed(value < 1 ? 2 : 1).replace(/\.?0+$/, '');
  }
}

// ============================================
// Scaling Logic
// ============================================

export function scaleIngredient(
  ingredient: Ingredient,
  scaleFactor: number
): ScaledIngredient {
  const parsed = parseAmount(ingredient.amount);
  let scaledValue = parsed.value * scaleFactor;
  let warning: string | undefined;

  // Check for non-linear scaling
  const itemLower = ingredient.item.toLowerCase();
  for (const [key, config] of Object.entries(NON_LINEAR_INGREDIENTS)) {
    if (itemLower.includes(key)) {
      if (scaleFactor > config.maxScale) {
        // Apply reduced scaling for these items
        const reduction = config.maxScale / scaleFactor;
        scaledValue = parsed.value * scaleFactor * reduction;
        warning = config.note;
      }
      break;
    }
  }

  // Check for fixed items
  if (FIXED_ITEMS.some(fixed => itemLower.includes(fixed))) {
    scaledValue = parsed.value; // Don't scale
    warning = 'This item typically doesn\'t need scaling';
  }

  const scaledAmount = formatAmount(scaledValue);

  return {
    ...ingredient,
    originalAmount: ingredient.amount,
    scaledAmount,
    amount: scaledAmount,
    scalingWarning: warning,
  };
}

export function scaleRecipe(recipe: Recipe, newYieldValue: number): ScaledRecipe {
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

  // Update yield string
  const newYield = `${newYieldValue} ${currentYield.unit}`;

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

export function getScalingPresets(recipe: Recipe): { label: string; value: number }[] {
  const currentYield = parseYield(recipe.yield);
  const base = currentYield.value;

  return [
    { label: `Half (${base / 2} ${currentYield.unit})`, value: base / 2 },
    { label: `Original (${base} ${currentYield.unit})`, value: base },
    { label: `1.5x (${base * 1.5} ${currentYield.unit})`, value: base * 1.5 },
    { label: `Double (${base * 2} ${currentYield.unit})`, value: base * 2 },
    { label: `Triple (${base * 3} ${currentYield.unit})`, value: base * 3 },
  ];
}
