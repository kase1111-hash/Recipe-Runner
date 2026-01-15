// Nutritional Calculation Service
// Phase 6 Feature - Estimate nutritional information

import type { Ingredient, Recipe } from '../types';

// ============================================
// Types
// ============================================

export interface NutritionInfo {
  calories: number;
  protein: number;      // grams
  carbohydrates: number; // grams
  fat: number;          // grams
  fiber: number;        // grams
  sugar: number;        // grams
  sodium: number;       // milligrams
}

export interface NutritionPerServing extends NutritionInfo {
  servings: number;
}

export interface IngredientNutrition {
  ingredient: string;
  nutrition: NutritionInfo;
  confidence: 'high' | 'medium' | 'low';
}

// ============================================
// Nutrition Database (per 100g)
// ============================================

interface NutritionEntry {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  servingSize: number;  // grams per typical serving
  servingUnit: string;
}

const NUTRITION_DB: Record<string, NutritionEntry> = {
  // Proteins
  'chicken breast': { calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, sugar: 0, sodium: 74, servingSize: 140, servingUnit: 'piece' },
  'chicken': { calories: 239, protein: 27, carbs: 0, fat: 14, fiber: 0, sugar: 0, sodium: 82, servingSize: 140, servingUnit: 'piece' },
  'beef': { calories: 250, protein: 26, carbs: 0, fat: 15, fiber: 0, sugar: 0, sodium: 72, servingSize: 115, servingUnit: 'serving' },
  'ground beef': { calories: 332, protein: 14, carbs: 0, fat: 30, fiber: 0, sugar: 0, sodium: 76, servingSize: 115, servingUnit: 'serving' },
  'pork': { calories: 242, protein: 27, carbs: 0, fat: 14, fiber: 0, sugar: 0, sodium: 62, servingSize: 115, servingUnit: 'serving' },
  'salmon': { calories: 208, protein: 20, carbs: 0, fat: 13, fiber: 0, sugar: 0, sodium: 59, servingSize: 115, servingUnit: 'fillet' },
  'shrimp': { calories: 99, protein: 24, carbs: 0.2, fat: 0.3, fiber: 0, sugar: 0, sodium: 111, servingSize: 85, servingUnit: 'serving' },
  'tofu': { calories: 76, protein: 8, carbs: 1.9, fat: 4.8, fiber: 0.3, sugar: 0.6, sodium: 7, servingSize: 125, servingUnit: 'block' },
  'egg': { calories: 155, protein: 13, carbs: 1.1, fat: 11, fiber: 0, sugar: 1.1, sodium: 124, servingSize: 50, servingUnit: 'large' },
  'eggs': { calories: 155, protein: 13, carbs: 1.1, fat: 11, fiber: 0, sugar: 1.1, sodium: 124, servingSize: 50, servingUnit: 'large' },

  // Dairy
  'butter': { calories: 717, protein: 0.9, carbs: 0.1, fat: 81, fiber: 0, sugar: 0.1, sodium: 11, servingSize: 14, servingUnit: 'tablespoon' },
  'milk': { calories: 42, protein: 3.4, carbs: 5, fat: 1, fiber: 0, sugar: 5, sodium: 44, servingSize: 244, servingUnit: 'cup' },
  'heavy cream': { calories: 340, protein: 2.1, carbs: 2.8, fat: 36, fiber: 0, sugar: 2.9, sodium: 27, servingSize: 15, servingUnit: 'tablespoon' },
  'cream': { calories: 340, protein: 2.1, carbs: 2.8, fat: 36, fiber: 0, sugar: 2.9, sodium: 27, servingSize: 15, servingUnit: 'tablespoon' },
  'cheese': { calories: 402, protein: 25, carbs: 1.3, fat: 33, fiber: 0, sugar: 0.5, sodium: 621, servingSize: 28, servingUnit: 'slice' },
  'parmesan': { calories: 431, protein: 38, carbs: 4.1, fat: 29, fiber: 0, sugar: 0.9, sodium: 1529, servingSize: 5, servingUnit: 'tablespoon' },
  'yogurt': { calories: 59, protein: 10, carbs: 3.6, fat: 0.7, fiber: 0, sugar: 3.2, sodium: 36, servingSize: 170, servingUnit: 'container' },
  'sour cream': { calories: 198, protein: 2.4, carbs: 4.6, fat: 19, fiber: 0, sugar: 3.4, sodium: 80, servingSize: 30, servingUnit: 'tablespoon' },

  // Grains
  'flour': { calories: 364, protein: 10, carbs: 76, fat: 1, fiber: 2.7, sugar: 0.3, sodium: 2, servingSize: 125, servingUnit: 'cup' },
  'bread': { calories: 265, protein: 9, carbs: 49, fat: 3.2, fiber: 2.7, sugar: 5, sodium: 491, servingSize: 30, servingUnit: 'slice' },
  'rice': { calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4, sugar: 0, sodium: 1, servingSize: 158, servingUnit: 'cup cooked' },
  'pasta': { calories: 131, protein: 5, carbs: 25, fat: 1.1, fiber: 1.8, sugar: 0.6, sodium: 1, servingSize: 140, servingUnit: 'cup cooked' },
  'oats': { calories: 389, protein: 17, carbs: 66, fat: 7, fiber: 11, sugar: 1, sodium: 2, servingSize: 40, servingUnit: 'cup dry' },

  // Vegetables
  'onion': { calories: 40, protein: 1.1, carbs: 9.3, fat: 0.1, fiber: 1.7, sugar: 4.2, sodium: 4, servingSize: 110, servingUnit: 'medium' },
  'garlic': { calories: 149, protein: 6.4, carbs: 33, fat: 0.5, fiber: 2.1, sugar: 1, sodium: 17, servingSize: 3, servingUnit: 'clove' },
  'tomato': { calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, fiber: 1.2, sugar: 2.6, sodium: 5, servingSize: 123, servingUnit: 'medium' },
  'potato': { calories: 77, protein: 2, carbs: 17, fat: 0.1, fiber: 2.2, sugar: 0.8, sodium: 6, servingSize: 150, servingUnit: 'medium' },
  'carrot': { calories: 41, protein: 0.9, carbs: 10, fat: 0.2, fiber: 2.8, sugar: 4.7, sodium: 69, servingSize: 61, servingUnit: 'medium' },
  'celery': { calories: 16, protein: 0.7, carbs: 3, fat: 0.2, fiber: 1.6, sugar: 1.3, sodium: 80, servingSize: 40, servingUnit: 'stalk' },
  'broccoli': { calories: 34, protein: 2.8, carbs: 7, fat: 0.4, fiber: 2.6, sugar: 1.7, sodium: 33, servingSize: 91, servingUnit: 'cup' },
  'spinach': { calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2, sugar: 0.4, sodium: 79, servingSize: 30, servingUnit: 'cup' },
  'lettuce': { calories: 15, protein: 1.4, carbs: 2.9, fat: 0.2, fiber: 1.3, sugar: 0.8, sodium: 28, servingSize: 36, servingUnit: 'cup' },
  'mushroom': { calories: 22, protein: 3.1, carbs: 3.3, fat: 0.3, fiber: 1, sugar: 2, sodium: 5, servingSize: 70, servingUnit: 'cup' },
  'bell pepper': { calories: 31, protein: 1, carbs: 6, fat: 0.3, fiber: 2.1, sugar: 4.2, sodium: 4, servingSize: 119, servingUnit: 'medium' },

  // Fruits
  'apple': { calories: 52, protein: 0.3, carbs: 14, fat: 0.2, fiber: 2.4, sugar: 10, sodium: 1, servingSize: 182, servingUnit: 'medium' },
  'banana': { calories: 89, protein: 1.1, carbs: 23, fat: 0.3, fiber: 2.6, sugar: 12, sodium: 1, servingSize: 118, servingUnit: 'medium' },
  'lemon': { calories: 29, protein: 1.1, carbs: 9, fat: 0.3, fiber: 2.8, sugar: 2.5, sodium: 2, servingSize: 58, servingUnit: 'medium' },
  'lime': { calories: 30, protein: 0.7, carbs: 11, fat: 0.2, fiber: 2.8, sugar: 1.7, sodium: 2, servingSize: 67, servingUnit: 'medium' },

  // Fats & Oils
  'olive oil': { calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, sugar: 0, sodium: 2, servingSize: 14, servingUnit: 'tablespoon' },
  'vegetable oil': { calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, sugar: 0, sodium: 0, servingSize: 14, servingUnit: 'tablespoon' },
  'oil': { calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, sugar: 0, sodium: 0, servingSize: 14, servingUnit: 'tablespoon' },

  // Sweeteners
  'sugar': { calories: 387, protein: 0, carbs: 100, fat: 0, fiber: 0, sugar: 100, sodium: 1, servingSize: 4, servingUnit: 'teaspoon' },
  'brown sugar': { calories: 380, protein: 0, carbs: 98, fat: 0, fiber: 0, sugar: 97, sodium: 28, servingSize: 4.5, servingUnit: 'teaspoon' },
  'honey': { calories: 304, protein: 0.3, carbs: 82, fat: 0, fiber: 0.2, sugar: 82, sodium: 4, servingSize: 21, servingUnit: 'tablespoon' },
  'maple syrup': { calories: 260, protein: 0, carbs: 67, fat: 0.1, fiber: 0, sugar: 60, sodium: 12, servingSize: 20, servingUnit: 'tablespoon' },

  // Seasonings
  'salt': { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 38758, servingSize: 1, servingUnit: 'teaspoon' },
  'black pepper': { calories: 251, protein: 10, carbs: 64, fat: 3.3, fiber: 25, sugar: 0.6, sodium: 20, servingSize: 0.3, servingUnit: 'teaspoon' },
  'pepper': { calories: 251, protein: 10, carbs: 64, fat: 3.3, fiber: 25, sugar: 0.6, sodium: 20, servingSize: 0.3, servingUnit: 'teaspoon' },
  'soy sauce': { calories: 53, protein: 8.1, carbs: 4.9, fat: 0, fiber: 0.8, sugar: 0.4, sodium: 5493, servingSize: 16, servingUnit: 'tablespoon' },

  // Nuts & Seeds
  'almonds': { calories: 579, protein: 21, carbs: 22, fat: 50, fiber: 12, sugar: 4.4, sodium: 1, servingSize: 28, servingUnit: 'ounce' },
  'walnuts': { calories: 654, protein: 15, carbs: 14, fat: 65, fiber: 6.7, sugar: 2.6, sodium: 2, servingSize: 28, servingUnit: 'ounce' },
  'peanuts': { calories: 567, protein: 26, carbs: 16, fat: 49, fiber: 8.5, sugar: 4, sodium: 18, servingSize: 28, servingUnit: 'ounce' },

  // Canned/Processed
  'chicken broth': { calories: 5, protein: 1, carbs: 0.3, fat: 0, fiber: 0, sugar: 0.3, sodium: 343, servingSize: 240, servingUnit: 'cup' },
  'broth': { calories: 5, protein: 1, carbs: 0.3, fat: 0, fiber: 0, sugar: 0.3, sodium: 343, servingSize: 240, servingUnit: 'cup' },
  'stock': { calories: 5, protein: 1, carbs: 0.3, fat: 0, fiber: 0, sugar: 0.3, sodium: 343, servingSize: 240, servingUnit: 'cup' },
  'tomato sauce': { calories: 29, protein: 1.3, carbs: 6.5, fat: 0.2, fiber: 1.5, sugar: 4.8, sodium: 577, servingSize: 122, servingUnit: 'cup' },
  'canned tomatoes': { calories: 32, protein: 1.6, carbs: 7.3, fat: 0.3, fiber: 2.4, sugar: 4.7, sodium: 220, servingSize: 240, servingUnit: 'cup' },
};

// ============================================
// Unit Conversions
// ============================================

const UNIT_TO_GRAMS: Record<string, number> = {
  'cup': 240,
  'cups': 240,
  'tablespoon': 15,
  'tablespoons': 15,
  'tbsp': 15,
  'teaspoon': 5,
  'teaspoons': 5,
  'tsp': 5,
  'ounce': 28,
  'ounces': 28,
  'oz': 28,
  'pound': 454,
  'pounds': 454,
  'lb': 454,
  'lbs': 454,
  'gram': 1,
  'grams': 1,
  'g': 1,
  'kilogram': 1000,
  'kg': 1000,
  'milliliter': 1,
  'ml': 1,
  'liter': 1000,
  'l': 1000,
  'piece': 100,
  'pieces': 100,
  'clove': 3,
  'cloves': 3,
  'slice': 30,
  'slices': 30,
  'medium': 150,
  'large': 200,
  'small': 100,
};

function convertToGrams(amount: number, unit: string): number {
  const lower = unit.toLowerCase().trim();
  const multiplier = UNIT_TO_GRAMS[lower] || 100;
  return amount * multiplier;
}

function parseAmount(amountStr: string): number {
  let value = 0;
  const parts = amountStr.trim().split(/\s+/);

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

// ============================================
// Nutrition Calculation
// ============================================

function findNutritionEntry(ingredientName: string): { entry: NutritionEntry; confidence: 'high' | 'medium' | 'low' } | null {
  const lower = ingredientName.toLowerCase().trim();

  // Direct match
  if (NUTRITION_DB[lower]) {
    return { entry: NUTRITION_DB[lower], confidence: 'high' };
  }

  // Partial match
  for (const [key, entry] of Object.entries(NUTRITION_DB)) {
    if (lower.includes(key) || key.includes(lower)) {
      return { entry, confidence: 'medium' };
    }
  }

  // Word match
  const words = lower.split(/\s+/);
  for (const word of words) {
    if (word.length < 3) continue;
    for (const [key, entry] of Object.entries(NUTRITION_DB)) {
      if (key.includes(word)) {
        return { entry, confidence: 'low' };
      }
    }
  }

  return null;
}

export function calculateIngredientNutrition(ingredient: Ingredient): IngredientNutrition | null {
  const match = findNutritionEntry(ingredient.item);
  if (!match) return null;

  const amount = parseAmount(ingredient.amount);
  const grams = convertToGrams(amount, ingredient.unit);
  const factor = grams / 100;  // Nutrition is per 100g

  return {
    ingredient: ingredient.item,
    nutrition: {
      calories: Math.round(match.entry.calories * factor),
      protein: Math.round(match.entry.protein * factor * 10) / 10,
      carbohydrates: Math.round(match.entry.carbs * factor * 10) / 10,
      fat: Math.round(match.entry.fat * factor * 10) / 10,
      fiber: Math.round(match.entry.fiber * factor * 10) / 10,
      sugar: Math.round(match.entry.sugar * factor * 10) / 10,
      sodium: Math.round(match.entry.sodium * factor),
    },
    confidence: match.confidence,
  };
}

export function calculateRecipeNutrition(recipe: Recipe): NutritionPerServing {
  const totals: NutritionInfo = {
    calories: 0,
    protein: 0,
    carbohydrates: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0,
  };

  for (const ingredient of recipe.ingredients) {
    const nutrition = calculateIngredientNutrition(ingredient);
    if (nutrition) {
      totals.calories += nutrition.nutrition.calories;
      totals.protein += nutrition.nutrition.protein;
      totals.carbohydrates += nutrition.nutrition.carbohydrates;
      totals.fat += nutrition.nutrition.fat;
      totals.fiber += nutrition.nutrition.fiber;
      totals.sugar += nutrition.nutrition.sugar;
      totals.sodium += nutrition.nutrition.sodium;
    }
  }

  // Parse servings from yield
  const yieldMatch = recipe.yield.match(/(\d+)/);
  const servings = yieldMatch ? parseInt(yieldMatch[1]) : 1;

  return {
    calories: Math.round(totals.calories / servings),
    protein: Math.round(totals.protein / servings * 10) / 10,
    carbohydrates: Math.round(totals.carbohydrates / servings * 10) / 10,
    fat: Math.round(totals.fat / servings * 10) / 10,
    fiber: Math.round(totals.fiber / servings * 10) / 10,
    sugar: Math.round(totals.sugar / servings * 10) / 10,
    sodium: Math.round(totals.sodium / servings),
    servings,
  };
}

export function getDetailedNutrition(recipe: Recipe): {
  perServing: NutritionPerServing;
  total: NutritionInfo;
  breakdown: IngredientNutrition[];
  coveragePercent: number;
} {
  const breakdown: IngredientNutrition[] = [];
  const total: NutritionInfo = {
    calories: 0,
    protein: 0,
    carbohydrates: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0,
  };

  let matchedCount = 0;

  for (const ingredient of recipe.ingredients) {
    const nutrition = calculateIngredientNutrition(ingredient);
    if (nutrition) {
      breakdown.push(nutrition);
      total.calories += nutrition.nutrition.calories;
      total.protein += nutrition.nutrition.protein;
      total.carbohydrates += nutrition.nutrition.carbohydrates;
      total.fat += nutrition.nutrition.fat;
      total.fiber += nutrition.nutrition.fiber;
      total.sugar += nutrition.nutrition.sugar;
      total.sodium += nutrition.nutrition.sodium;
      matchedCount++;
    }
  }

  const yieldMatch = recipe.yield.match(/(\d+)/);
  const servings = yieldMatch ? parseInt(yieldMatch[1]) : 1;

  const perServing: NutritionPerServing = {
    calories: Math.round(total.calories / servings),
    protein: Math.round(total.protein / servings * 10) / 10,
    carbohydrates: Math.round(total.carbohydrates / servings * 10) / 10,
    fat: Math.round(total.fat / servings * 10) / 10,
    fiber: Math.round(total.fiber / servings * 10) / 10,
    sugar: Math.round(total.sugar / servings * 10) / 10,
    sodium: Math.round(total.sodium / servings),
    servings,
  };

  const coveragePercent = Math.round((matchedCount / recipe.ingredients.length) * 100);

  return { perServing, total, breakdown, coveragePercent };
}

// ============================================
// Daily Value Percentages
// ============================================

const DAILY_VALUES = {
  calories: 2000,
  protein: 50,
  carbohydrates: 275,
  fat: 78,
  fiber: 28,
  sugar: 50,
  sodium: 2300,
};

export function getDailyValuePercent(nutrition: NutritionInfo): Record<keyof NutritionInfo, number> {
  return {
    calories: Math.round((nutrition.calories / DAILY_VALUES.calories) * 100),
    protein: Math.round((nutrition.protein / DAILY_VALUES.protein) * 100),
    carbohydrates: Math.round((nutrition.carbohydrates / DAILY_VALUES.carbohydrates) * 100),
    fat: Math.round((nutrition.fat / DAILY_VALUES.fat) * 100),
    fiber: Math.round((nutrition.fiber / DAILY_VALUES.fiber) * 100),
    sugar: Math.round((nutrition.sugar / DAILY_VALUES.sugar) * 100),
    sodium: Math.round((nutrition.sodium / DAILY_VALUES.sodium) * 100),
  };
}
