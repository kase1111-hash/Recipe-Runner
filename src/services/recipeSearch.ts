// Global Recipe Search
// Searches across all cookbooks by name, description, ingredient, and tag

import { getAllCookbooks, getAllRecipes } from '../db';
import type { Cookbook, Recipe } from '../types';

export type SearchMatchField = 'name' | 'description' | 'ingredient' | 'tag';

export interface RecipeSearchResult {
  recipe: Recipe;
  cookbook: Cookbook;
  /** Which fields the query matched on, in priority order */
  matchedOn: SearchMatchField[];
  /** The specific ingredient/tag text that matched (for display) */
  matchedText?: string;
}

/**
 * Score a recipe against a query. Returns null if no match.
 * Exported for testing.
 */
export function matchRecipe(recipe: Recipe, query: string): { matchedOn: SearchMatchField[]; matchedText?: string; score: number } | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;

  const matchedOn: SearchMatchField[] = [];
  let matchedText: string | undefined;
  let score = 0;

  const name = recipe.name.toLowerCase();
  if (name.includes(q)) {
    matchedOn.push('name');
    // Prefix and whole-name matches rank highest
    score += name === q ? 100 : name.startsWith(q) ? 80 : 60;
  }

  if (recipe.description.toLowerCase().includes(q)) {
    matchedOn.push('description');
    score += 20;
  }

  const matchedIngredient = recipe.ingredients.find((ing) => ing.item.toLowerCase().includes(q));
  if (matchedIngredient) {
    matchedOn.push('ingredient');
    matchedText = matchedText ?? matchedIngredient.item;
    score += 40;
  }

  const matchedTag = recipe.tags.find((tag) => tag.toLowerCase().includes(q));
  if (matchedTag) {
    matchedOn.push('tag');
    matchedText = matchedText ?? matchedTag;
    score += 30;
  }

  return matchedOn.length > 0 ? { matchedOn, matchedText, score } : null;
}

/**
 * Search all recipes across every cookbook.
 * Results are ranked: name matches first, then ingredient, tag, description.
 */
export async function searchAllRecipes(query: string, limit: number = 25): Promise<RecipeSearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  const [recipes, cookbooks] = await Promise.all([
    getAllRecipes(),
    getAllCookbooks(),
  ]);

  const cookbookById = new Map(cookbooks.map((cb) => [cb.id, cb]));

  const results: Array<RecipeSearchResult & { score: number }> = [];
  for (const recipe of recipes) {
    const cookbook = cookbookById.get(recipe.cookbook_id);
    if (!cookbook) continue; // orphaned recipe — skip rather than crash the UI
    const match = matchRecipe(recipe, q);
    if (match) {
      results.push({ recipe, cookbook, matchedOn: match.matchedOn, matchedText: match.matchedText, score: match.score });
    }
  }

  results.sort((a, b) => b.score - a.score || a.recipe.name.localeCompare(b.recipe.name));
  return results.slice(0, limit).map((r) => ({
    recipe: r.recipe,
    cookbook: r.cookbook,
    matchedOn: r.matchedOn,
    matchedText: r.matchedText,
  }));
}
