// Side Dish Suggestion Service
// Provides intelligent pairing suggestions for main courses

import { getAllRecipes, getSideDishRecipes } from '../db';
import type { Recipe, CourseType } from '../types';

// ============================================
// Types
// ============================================

export interface SideDishSuggestion {
  recipe: Recipe;
  score: number;
  reasons: string[];
}

export interface PairingCriteria {
  cuisineMatch: boolean;
  timeCompatible: boolean;
  difficultyBalance: boolean;
  flavorComplement: boolean;
  tagOverlap: string[];
}

// ============================================
// Cuisine Pairing Rules
// ============================================

const CuisinePairings: Record<string, string[]> = {
  italian: ['italian', 'mediterranean', 'french'],
  french: ['french', 'mediterranean', 'italian'],
  mexican: ['mexican', 'latin', 'southwestern', 'spanish'],
  asian: ['asian', 'chinese', 'japanese', 'korean', 'thai', 'vietnamese'],
  chinese: ['chinese', 'asian'],
  japanese: ['japanese', 'asian'],
  korean: ['korean', 'asian'],
  thai: ['thai', 'asian', 'vietnamese'],
  vietnamese: ['vietnamese', 'asian', 'thai'],
  indian: ['indian', 'south asian'],
  mediterranean: ['mediterranean', 'greek', 'middle eastern', 'italian', 'french'],
  greek: ['greek', 'mediterranean', 'middle eastern'],
  american: ['american', 'southern', 'southwestern'],
  southern: ['southern', 'american', 'bbq'],
  bbq: ['bbq', 'american', 'southern', 'southwestern'],
  default: [], // Matches with anything
};

// ============================================
// Complementary Course Types
// ============================================

const ComplementaryCourseTypes: Record<CourseType, CourseType[]> = {
  main_course: ['side_dish', 'salad', 'soup', 'bread', 'sauce'],
  side_dish: ['main_course'],
  appetizer: ['main_course', 'beverage'],
  soup: ['main_course', 'salad', 'bread'],
  salad: ['main_course', 'soup', 'bread'],
  dessert: ['beverage'],
  breakfast: ['beverage', 'side_dish'],
  beverage: ['main_course', 'appetizer', 'dessert'],
  snack: ['beverage'],
  sauce: ['main_course', 'side_dish'],
  bread: ['main_course', 'soup', 'salad'],
  base: ['main_course'],
};

// ============================================
// Protein-Side Pairing Hints
// ============================================

const ProteinSidePairings: Record<string, string[]> = {
  beef: ['potato', 'vegetable', 'rice', 'mushroom', 'onion'],
  chicken: ['rice', 'vegetable', 'potato', 'grain', 'salad'],
  pork: ['apple', 'cabbage', 'potato', 'rice', 'beans'],
  fish: ['rice', 'vegetable', 'lemon', 'salad', 'grain'],
  seafood: ['rice', 'pasta', 'salad', 'vegetable', 'garlic'],
  lamb: ['potato', 'mint', 'vegetable', 'grain', 'yogurt'],
  tofu: ['rice', 'vegetable', 'noodle', 'grain', 'edamame'],
  vegetarian: ['grain', 'legume', 'vegetable', 'salad'],
};

// ============================================
// Core Suggestion Logic
// ============================================

function normalizeCuisine(cuisine: string | null | undefined): string {
  if (!cuisine) return 'default';
  return cuisine.toLowerCase().trim();
}

function getCuisineCompatibility(cuisine1: string, cuisine2: string): number {
  const norm1 = normalizeCuisine(cuisine1);
  const norm2 = normalizeCuisine(cuisine2);

  if (norm1 === norm2) return 1;
  if (norm1 === 'default' || norm2 === 'default') return 0.5;

  const pairings1 = CuisinePairings[norm1] || [];
  const pairings2 = CuisinePairings[norm2] || [];

  if (pairings1.includes(norm2) || pairings2.includes(norm1)) return 0.8;

  return 0.2;
}

function parseTimeMinutes(timeStr: string): number {
  const hours = timeStr.match(/(\d+)\s*h/)?.[1] || '0';
  const mins = timeStr.match(/(\d+)\s*m/)?.[1] || '0';
  return parseInt(hours) * 60 + parseInt(mins);
}

function getTimeCompatibility(mainTime: number, sideTime: number): number {
  // Side dish should ideally be ready around the same time or earlier
  if (sideTime <= mainTime) return 1;
  if (sideTime <= mainTime * 1.2) return 0.8;
  if (sideTime <= mainTime * 1.5) return 0.5;
  return 0.2;
}

function getDifficultyBalance(mainDifficulty: number, sideDifficulty: number): number {
  // Prefer side dishes that are same or easier difficulty
  const diff = sideDifficulty - mainDifficulty;
  if (diff <= 0) return 1;
  if (diff === 1) return 0.7;
  return 0.4;
}

function getTagOverlap(tags1: string[], tags2: string[]): string[] {
  const set1 = new Set(tags1.map(t => t.toLowerCase()));
  return tags2.filter(t => set1.has(t.toLowerCase()));
}

function detectProtein(recipe: Recipe): string | null {
  const name = recipe.name.toLowerCase();
  const ingredients = recipe.ingredients.map(i => i.item.toLowerCase()).join(' ');
  const combined = name + ' ' + ingredients;

  for (const protein of Object.keys(ProteinSidePairings)) {
    if (combined.includes(protein)) {
      return protein;
    }
  }

  // Check for common protein indicators
  if (combined.includes('steak') || combined.includes('ribeye') || combined.includes('sirloin')) {
    return 'beef';
  }
  if (combined.includes('salmon') || combined.includes('cod') || combined.includes('tilapia')) {
    return 'fish';
  }
  if (combined.includes('shrimp') || combined.includes('crab') || combined.includes('lobster')) {
    return 'seafood';
  }

  return null;
}

function getProteinPairingScore(mainRecipe: Recipe, sideRecipe: Recipe): number {
  const protein = detectProtein(mainRecipe);
  if (!protein) return 0.5;

  const pairings = ProteinSidePairings[protein] || [];
  const sideName = sideRecipe.name.toLowerCase();
  const sideIngredients = sideRecipe.ingredients.map(i => i.item.toLowerCase());
  const sideTags = sideRecipe.tags.map(t => t.toLowerCase());

  const combined = [sideName, ...sideIngredients, ...sideTags].join(' ');

  let matches = 0;
  for (const pairing of pairings) {
    if (combined.includes(pairing)) {
      matches++;
    }
  }

  if (matches >= 2) return 1;
  if (matches === 1) return 0.7;
  return 0.3;
}

// ============================================
// Main Suggestion Function
// ============================================

export async function getSideDishSuggestions(
  mainCourseRecipe: Recipe,
  options: {
    limit?: number;
    includeSameBookOnly?: boolean;
    excludeRecipeIds?: string[];
  } = {}
): Promise<SideDishSuggestion[]> {
  const { limit = 5, includeSameBookOnly = false, excludeRecipeIds = [] } = options;

  // Get candidate recipes
  let candidates: Recipe[];
  if (includeSameBookOnly) {
    const allRecipes = await getAllRecipes();
    candidates = allRecipes.filter(r =>
      r.cookbook_id === mainCourseRecipe.cookbook_id &&
      r.id !== mainCourseRecipe.id &&
      !excludeRecipeIds.includes(r.id)
    );
  } else {
    candidates = await getAllRecipes();
    candidates = candidates.filter(r =>
      r.id !== mainCourseRecipe.id &&
      !excludeRecipeIds.includes(r.id)
    );
  }

  // Filter to complementary course types
  const complementaryTypes = ComplementaryCourseTypes[mainCourseRecipe.course_type || 'main_course'] || ['side_dish'];
  candidates = candidates.filter(r =>
    r.course_type && complementaryTypes.includes(r.course_type)
  );

  // If no candidates with course types, fall back to side dishes or any recipe
  if (candidates.length === 0) {
    candidates = await getSideDishRecipes();
    candidates = candidates.filter(r =>
      r.id !== mainCourseRecipe.id &&
      !excludeRecipeIds.includes(r.id)
    );
  }

  // Score each candidate
  const mainTime = parseTimeMinutes(mainCourseRecipe.total_time);
  const mainDifficulty = mainCourseRecipe.difficulty.overall;

  const scored: SideDishSuggestion[] = candidates.map(candidate => {
    const reasons: string[] = [];
    let totalScore = 0;
    let weights = 0;

    // Cuisine compatibility (weight: 3)
    const cuisineScore = getCuisineCompatibility(
      mainCourseRecipe.cuisine || '',
      candidate.cuisine || ''
    );
    totalScore += cuisineScore * 3;
    weights += 3;
    if (cuisineScore >= 0.8) {
      reasons.push(`Matches ${candidate.cuisine || 'cuisine'} pairing`);
    }

    // Time compatibility (weight: 2)
    const sideTime = parseTimeMinutes(candidate.total_time);
    const timeScore = getTimeCompatibility(mainTime, sideTime);
    totalScore += timeScore * 2;
    weights += 2;
    if (timeScore >= 0.8) {
      reasons.push('Ready around the same time');
    }

    // Difficulty balance (weight: 1)
    const diffScore = getDifficultyBalance(mainDifficulty, candidate.difficulty.overall);
    totalScore += diffScore * 1;
    weights += 1;
    if (diffScore >= 0.8) {
      reasons.push('Balanced difficulty');
    }

    // Protein pairing (weight: 2)
    const proteinScore = getProteinPairingScore(mainCourseRecipe, candidate);
    totalScore += proteinScore * 2;
    weights += 2;
    if (proteinScore >= 0.7) {
      reasons.push('Complements main protein');
    }

    // Tag overlap (weight: 1)
    const tagOverlap = getTagOverlap(mainCourseRecipe.tags, candidate.tags);
    const tagScore = Math.min(tagOverlap.length / 2, 1);
    totalScore += tagScore * 1;
    weights += 1;
    if (tagOverlap.length > 0) {
      reasons.push(`Shared: ${tagOverlap.slice(0, 2).join(', ')}`);
    }

    // Bonus for same cookbook (weight: 0.5)
    if (candidate.cookbook_id === mainCourseRecipe.cookbook_id) {
      totalScore += 0.5;
      weights += 0.5;
      reasons.push('From same cookbook');
    }

    const finalScore = totalScore / weights;

    // Add default reason if no specific reasons
    if (reasons.length === 0) {
      reasons.push('General side dish pairing');
    }

    return {
      recipe: candidate,
      score: finalScore,
      reasons,
    };
  });

  // Sort by score descending and limit
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit);
}

// ============================================
// Course Type Recommendations
// ============================================

export function getRecommendedCourseTypes(recipe: Recipe): CourseType[] {
  const name = recipe.name.toLowerCase();
  const description = recipe.description.toLowerCase();
  const tags = recipe.tags.map(t => t.toLowerCase());
  const combined = [name, description, ...tags].join(' ');

  const recommendations: CourseType[] = [];

  // Check for specific indicators
  if (combined.includes('main') || combined.includes('entree') || combined.includes('dinner')) {
    recommendations.push('main_course');
  }
  if (combined.includes('side') || combined.includes('accompaniment')) {
    recommendations.push('side_dish');
  }
  if (combined.includes('appetizer') || combined.includes('starter') || combined.includes('hors')) {
    recommendations.push('appetizer');
  }
  if (combined.includes('soup') || combined.includes('stew') || combined.includes('chowder')) {
    recommendations.push('soup');
  }
  if (combined.includes('salad') || (combined.includes('greens') && !combined.includes('braised'))) {
    recommendations.push('salad');
  }
  if (combined.includes('dessert') || combined.includes('cake') || combined.includes('pie') ||
      combined.includes('cookie') || combined.includes('sweet')) {
    recommendations.push('dessert');
  }
  if (combined.includes('breakfast') || combined.includes('brunch') || combined.includes('morning')) {
    recommendations.push('breakfast');
  }
  if (combined.includes('drink') || combined.includes('beverage') || combined.includes('cocktail') ||
      combined.includes('smoothie') || combined.includes('juice')) {
    recommendations.push('beverage');
  }
  if (combined.includes('snack') || combined.includes('bite') || combined.includes('finger food')) {
    recommendations.push('snack');
  }
  if (combined.includes('sauce') || combined.includes('dressing') || combined.includes('condiment') ||
      combined.includes('dip') || combined.includes('gravy')) {
    recommendations.push('sauce');
  }
  if (combined.includes('bread') || combined.includes('roll') || combined.includes('biscuit') ||
      combined.includes('bun') || combined.includes('loaf')) {
    recommendations.push('bread');
  }
  if (combined.includes('stock') || combined.includes('broth') || combined.includes('base') ||
      combined.includes('foundation')) {
    recommendations.push('base');
  }

  // If no specific indicators, try to infer from ingredients and recipe type
  if (recommendations.length === 0) {
    const hasProtein = recipe.ingredients.some(i => {
      const item = i.item.toLowerCase();
      return item.includes('chicken') || item.includes('beef') || item.includes('pork') ||
             item.includes('fish') || item.includes('shrimp') || item.includes('tofu') ||
             item.includes('lamb') || item.includes('turkey');
    });

    if (hasProtein) {
      recommendations.push('main_course');
    } else {
      recommendations.push('side_dish');
    }
  }

  return recommendations;
}
