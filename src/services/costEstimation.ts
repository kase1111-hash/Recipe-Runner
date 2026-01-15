// Cost Estimation Service
// Phase 7 Feature - Track ingredient prices and calculate recipe costs

import type { Recipe } from '../types';

// ============================================
// Types
// ============================================

export interface PriceEntry {
  ingredientName: string;
  pricePerUnit: number;
  unit: string;
  store?: string;
  lastUpdated: string;
  priceHistory: PriceHistoryEntry[];
}

export interface PriceHistoryEntry {
  price: number;
  date: string;
  store?: string;
}

export interface RecipeCost {
  totalCost: number;
  costPerServing: number;
  ingredients: IngredientCost[];
  unknownIngredients: string[];
  confidence: 'high' | 'medium' | 'low';
}

export interface IngredientCost {
  name: string;
  amount: number;
  unit: string;
  unitPrice: number;
  totalCost: number;
  percentOfTotal: number;
}

export interface CostComparison {
  recipeName: string;
  costPerServing: number;
  servings: number;
  totalCost: number;
}

// ============================================
// Storage
// ============================================

const PRICES_KEY = 'recipe_runner_prices';

function loadPrices(): Map<string, PriceEntry> {
  try {
    const stored = localStorage.getItem(PRICES_KEY);
    if (stored) {
      const entries: PriceEntry[] = JSON.parse(stored);
      return new Map(entries.map(e => [normalizeItemName(e.ingredientName), e]));
    }
  } catch {
    // Ignore parse errors
  }
  return initializeDefaultPrices();
}

function savePrices(prices: Map<string, PriceEntry>): void {
  const entries = Array.from(prices.values());
  localStorage.setItem(PRICES_KEY, JSON.stringify(entries));
}

function normalizeItemName(name: string): string {
  return name.toLowerCase().trim();
}

// ============================================
// Default Price Database
// ============================================

const DEFAULT_PRICES: Array<{ name: string; price: number; unit: string }> = [
  // Proteins (per lb unless specified)
  { name: 'chicken breast', price: 4.99, unit: 'lb' },
  { name: 'chicken', price: 3.99, unit: 'lb' },
  { name: 'ground beef', price: 5.99, unit: 'lb' },
  { name: 'beef', price: 7.99, unit: 'lb' },
  { name: 'pork', price: 4.49, unit: 'lb' },
  { name: 'salmon', price: 12.99, unit: 'lb' },
  { name: 'shrimp', price: 9.99, unit: 'lb' },
  { name: 'tofu', price: 2.49, unit: 'block' },
  { name: 'eggs', price: 0.25, unit: 'large' },
  { name: 'egg', price: 0.25, unit: 'large' },

  // Dairy
  { name: 'milk', price: 4.29, unit: 'gallon' },
  { name: 'butter', price: 4.99, unit: 'lb' },
  { name: 'heavy cream', price: 5.49, unit: 'pint' },
  { name: 'cream', price: 5.49, unit: 'pint' },
  { name: 'sour cream', price: 2.99, unit: 'container' },
  { name: 'cheese', price: 4.99, unit: 'lb' },
  { name: 'parmesan', price: 8.99, unit: 'lb' },
  { name: 'yogurt', price: 1.29, unit: 'container' },

  // Grains & Baking
  { name: 'flour', price: 0.50, unit: 'cup' },
  { name: 'sugar', price: 0.40, unit: 'cup' },
  { name: 'brown sugar', price: 0.45, unit: 'cup' },
  { name: 'rice', price: 0.30, unit: 'cup' },
  { name: 'pasta', price: 1.49, unit: 'lb' },
  { name: 'bread', price: 0.25, unit: 'slice' },
  { name: 'oats', price: 0.20, unit: 'cup' },

  // Produce
  { name: 'onion', price: 0.75, unit: 'medium' },
  { name: 'garlic', price: 0.10, unit: 'clove' },
  { name: 'tomato', price: 0.50, unit: 'medium' },
  { name: 'potato', price: 0.40, unit: 'medium' },
  { name: 'carrot', price: 0.25, unit: 'medium' },
  { name: 'celery', price: 0.20, unit: 'stalk' },
  { name: 'broccoli', price: 2.49, unit: 'bunch' },
  { name: 'spinach', price: 3.99, unit: 'bunch' },
  { name: 'lettuce', price: 1.99, unit: 'head' },
  { name: 'bell pepper', price: 1.29, unit: 'medium' },
  { name: 'mushroom', price: 3.49, unit: 'lb' },
  { name: 'lemon', price: 0.50, unit: 'medium' },
  { name: 'lime', price: 0.35, unit: 'medium' },
  { name: 'apple', price: 0.75, unit: 'medium' },
  { name: 'banana', price: 0.25, unit: 'medium' },
  { name: 'ginger', price: 0.50, unit: 'inch' },

  // Oils & Fats
  { name: 'olive oil', price: 0.15, unit: 'tablespoon' },
  { name: 'vegetable oil', price: 0.08, unit: 'tablespoon' },
  { name: 'oil', price: 0.10, unit: 'tablespoon' },

  // Condiments & Sauces
  { name: 'soy sauce', price: 0.10, unit: 'tablespoon' },
  { name: 'vinegar', price: 0.05, unit: 'tablespoon' },
  { name: 'honey', price: 0.30, unit: 'tablespoon' },
  { name: 'maple syrup', price: 0.50, unit: 'tablespoon' },
  { name: 'tomato sauce', price: 1.49, unit: 'can' },
  { name: 'chicken broth', price: 2.49, unit: 'can' },
  { name: 'broth', price: 2.49, unit: 'can' },

  // Spices (per teaspoon)
  { name: 'salt', price: 0.01, unit: 'teaspoon' },
  { name: 'pepper', price: 0.05, unit: 'teaspoon' },
  { name: 'black pepper', price: 0.05, unit: 'teaspoon' },
  { name: 'paprika', price: 0.10, unit: 'teaspoon' },
  { name: 'cumin', price: 0.10, unit: 'teaspoon' },
  { name: 'cinnamon', price: 0.08, unit: 'teaspoon' },
  { name: 'oregano', price: 0.08, unit: 'teaspoon' },
  { name: 'thyme', price: 0.10, unit: 'teaspoon' },
  { name: 'basil', price: 0.10, unit: 'teaspoon' },
  { name: 'garlic powder', price: 0.08, unit: 'teaspoon' },
  { name: 'onion powder', price: 0.08, unit: 'teaspoon' },

  // Nuts
  { name: 'almonds', price: 0.75, unit: 'ounce' },
  { name: 'walnuts', price: 0.85, unit: 'ounce' },
  { name: 'peanuts', price: 0.40, unit: 'ounce' },

  // Canned goods
  { name: 'canned tomatoes', price: 1.79, unit: 'can' },
  { name: 'beans', price: 1.29, unit: 'can' },
];

function initializeDefaultPrices(): Map<string, PriceEntry> {
  const prices = new Map<string, PriceEntry>();
  const now = new Date().toISOString();

  for (const item of DEFAULT_PRICES) {
    const key = normalizeItemName(item.name);
    prices.set(key, {
      ingredientName: item.name,
      pricePerUnit: item.price,
      unit: item.unit,
      lastUpdated: now,
      priceHistory: [{ price: item.price, date: now }],
    });
  }

  savePrices(prices);
  return prices;
}

// ============================================
// Unit Conversion for Pricing
// ============================================

// Volume conversions between different units
const VOLUME_CONVERSIONS: Record<string, Record<string, number>> = {
  'cup': { 'tablespoon': 16, 'teaspoon': 48, 'cup': 1, 'pint': 0.5, 'gallon': 0.0625 },
  'tablespoon': { 'cup': 0.0625, 'teaspoon': 3, 'tablespoon': 1 },
  'teaspoon': { 'cup': 0.0208, 'tablespoon': 0.333, 'teaspoon': 1 },
  'pint': { 'cup': 2, 'tablespoon': 32, 'teaspoon': 96, 'pint': 1, 'gallon': 0.125 },
  'gallon': { 'cup': 16, 'pint': 8, 'gallon': 1 },
};

// Weight conversions
const WEIGHT_CONVERSIONS: Record<string, Record<string, number>> = {
  'lb': { 'oz': 16, 'lb': 1 },
  'oz': { 'lb': 0.0625, 'oz': 1 },
};

function normalizeUnit(unit: string): string {
  return unit.toLowerCase().trim();
}

function getConversionFactor(fromUnit: string, toUnit: string): number | null {
  const from = normalizeUnit(fromUnit);
  const to = normalizeUnit(toUnit);

  if (from === to) return 1;

  // Check volume conversions
  if (VOLUME_CONVERSIONS[from]?.[to]) {
    return VOLUME_CONVERSIONS[from][to];
  }

  // Check weight conversions
  if (WEIGHT_CONVERSIONS[from]?.[to]) {
    return WEIGHT_CONVERSIONS[from][to];
  }

  return null;
}

// ============================================
// Price Management
// ============================================

export function setPrice(ingredientName: string, pricePerUnit: number, unit: string, store?: string): PriceEntry {
  const prices = loadPrices();
  const key = normalizeItemName(ingredientName);
  const now = new Date().toISOString();

  const existing = prices.get(key);
  const historyEntry: PriceHistoryEntry = { price: pricePerUnit, date: now, store };

  if (existing) {
    existing.pricePerUnit = pricePerUnit;
    existing.unit = unit;
    existing.store = store;
    existing.lastUpdated = now;
    existing.priceHistory.push(historyEntry);
    // Keep only last 10 history entries
    if (existing.priceHistory.length > 10) {
      existing.priceHistory = existing.priceHistory.slice(-10);
    }
    prices.set(key, existing);
  } else {
    prices.set(key, {
      ingredientName,
      pricePerUnit,
      unit,
      store,
      lastUpdated: now,
      priceHistory: [historyEntry],
    });
  }

  savePrices(prices);
  return prices.get(key)!;
}

export function getPrice(ingredientName: string): PriceEntry | undefined {
  const prices = loadPrices();
  return prices.get(normalizeItemName(ingredientName));
}

export function getAllPrices(): PriceEntry[] {
  const prices = loadPrices();
  return Array.from(prices.values()).sort((a, b) => a.ingredientName.localeCompare(b.ingredientName));
}

export function removePrice(ingredientName: string): boolean {
  const prices = loadPrices();
  const key = normalizeItemName(ingredientName);
  const deleted = prices.delete(key);
  if (deleted) {
    savePrices(prices);
  }
  return deleted;
}

// ============================================
// Recipe Cost Calculation
// ============================================

function parseAmount(amount: string): number {
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

  return value || 1;
}

export function calculateRecipeCost(recipe: Recipe): RecipeCost {
  const prices = loadPrices();
  const ingredientCosts: IngredientCost[] = [];
  const unknownIngredients: string[] = [];
  let totalCost = 0;

  for (const ingredient of recipe.ingredients) {
    const key = normalizeItemName(ingredient.item);
    const priceEntry = prices.get(key);
    const amount = parseAmount(ingredient.amount);
    const ingredientUnit = normalizeUnit(ingredient.unit);

    if (priceEntry) {
      let unitPrice = priceEntry.pricePerUnit;
      let effectiveAmount = amount;

      // Try to convert units if they don't match
      const priceUnit = normalizeUnit(priceEntry.unit);
      if (ingredientUnit !== priceUnit) {
        const conversionFactor = getConversionFactor(ingredientUnit, priceUnit);
        if (conversionFactor !== null) {
          effectiveAmount = amount * conversionFactor;
        }
      }

      const cost = effectiveAmount * unitPrice;
      totalCost += cost;

      ingredientCosts.push({
        name: ingredient.item,
        amount,
        unit: ingredient.unit,
        unitPrice,
        totalCost: cost,
        percentOfTotal: 0, // Will calculate after totaling
      });
    } else {
      unknownIngredients.push(ingredient.item);
    }
  }

  // Calculate percentages
  for (const ic of ingredientCosts) {
    ic.percentOfTotal = totalCost > 0 ? (ic.totalCost / totalCost) * 100 : 0;
  }

  // Sort by cost descending
  ingredientCosts.sort((a, b) => b.totalCost - a.totalCost);

  // Determine confidence
  const knownRatio = ingredientCosts.length / (ingredientCosts.length + unknownIngredients.length);
  let confidence: 'high' | 'medium' | 'low';
  if (knownRatio >= 0.9) {
    confidence = 'high';
  } else if (knownRatio >= 0.7) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  const servings = parseServings(recipe.yield) || 4;

  return {
    totalCost,
    costPerServing: totalCost / servings,
    ingredients: ingredientCosts,
    unknownIngredients,
    confidence,
  };
}

function parseServings(yieldStr: string): number {
  // Try to extract a number from yield string like "4 servings" or "Makes 6"
  const match = yieldStr.match(/(\d+)/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return 4; // Default
}

// ============================================
// Cost Comparisons
// ============================================

export function compareRecipeCosts(recipes: Recipe[]): CostComparison[] {
  return recipes
    .map(recipe => {
      const cost = calculateRecipeCost(recipe);
      const servings = parseServings(recipe.yield) || 4;
      return {
        recipeName: recipe.name,
        costPerServing: cost.costPerServing,
        servings,
        totalCost: cost.totalCost,
      };
    })
    .sort((a, b) => a.costPerServing - b.costPerServing);
}

export function getCheapestRecipes(recipes: Recipe[], limit: number = 5): CostComparison[] {
  return compareRecipeCosts(recipes).slice(0, limit);
}

// ============================================
// Cost Analysis
// ============================================

export interface CostBreakdown {
  byCategory: Record<string, { total: number; percent: number }>;
  mostExpensive: IngredientCost[];
  averageCostPerServing: number;
}

export function analyzeCosts(recipes: Recipe[]): CostBreakdown {
  const categoryTotals: Record<string, number> = {};
  const allIngredientCosts: IngredientCost[] = [];
  let totalCost = 0;
  let totalServings = 0;

  for (const recipe of recipes) {
    const cost = calculateRecipeCost(recipe);
    totalCost += cost.totalCost;
    totalServings += parseServings(recipe.yield) || 4;
    allIngredientCosts.push(...cost.ingredients);

    for (const ic of cost.ingredients) {
      const category = guessCategory(ic.name);
      categoryTotals[category] = (categoryTotals[category] || 0) + ic.totalCost;
    }
  }

  const byCategory: Record<string, { total: number; percent: number }> = {};
  for (const [category, total] of Object.entries(categoryTotals)) {
    byCategory[category] = {
      total,
      percent: totalCost > 0 ? (total / totalCost) * 100 : 0,
    };
  }

  // Get unique most expensive ingredients
  const ingredientMap = new Map<string, IngredientCost>();
  for (const ic of allIngredientCosts) {
    const key = normalizeItemName(ic.name);
    const existing = ingredientMap.get(key);
    if (!existing || ic.totalCost > existing.totalCost) {
      ingredientMap.set(key, ic);
    }
  }

  const mostExpensive = Array.from(ingredientMap.values())
    .sort((a, b) => b.totalCost - a.totalCost)
    .slice(0, 10);

  return {
    byCategory,
    mostExpensive,
    averageCostPerServing: totalServings > 0 ? totalCost / totalServings : 0,
  };
}

function guessCategory(ingredientName: string): string {
  const name = ingredientName.toLowerCase();

  if (/chicken|beef|pork|fish|shrimp|salmon|tofu|egg/.test(name)) return 'Proteins';
  if (/milk|cream|cheese|butter|yogurt/.test(name)) return 'Dairy';
  if (/flour|sugar|rice|pasta|bread|oat/.test(name)) return 'Grains & Baking';
  if (/onion|garlic|tomato|potato|carrot|pepper|broccoli|spinach|lettuce/.test(name)) return 'Produce';
  if (/oil|butter/.test(name)) return 'Fats & Oils';
  if (/salt|pepper|cumin|paprika|oregano|thyme|basil|cinnamon/.test(name)) return 'Spices';
  if (/broth|sauce|canned/.test(name)) return 'Canned & Sauces';

  return 'Other';
}

// ============================================
// Price Utilities
// ============================================

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function getPriceHistory(ingredientName: string): PriceHistoryEntry[] {
  const entry = getPrice(ingredientName);
  return entry?.priceHistory || [];
}

export function getAveragePrice(ingredientName: string): number | undefined {
  const entry = getPrice(ingredientName);
  if (!entry || entry.priceHistory.length === 0) return undefined;

  const sum = entry.priceHistory.reduce((acc, h) => acc + h.price, 0);
  return sum / entry.priceHistory.length;
}

export function clearPrices(): void {
  localStorage.removeItem(PRICES_KEY);
}

export function resetToDefaultPrices(): void {
  clearPrices();
  initializeDefaultPrices();
}
