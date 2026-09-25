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
  /** Which field matchedText came from */
  matchedTextField?: 'ingredient' | 'tag';
}

/**
 * How well the recipe NAME matches, which dominates ranking:
 * 3 = exact, 2 = name or a word in it starts with the query,
 * 1 = contains the query, 0 = no name match.
 */
export type NameMatchTier = 0 | 1 | 2 | 3;

export interface RecipeMatch {
  matchedOn: SearchMatchField[];
  matchedText?: string;
  matchedTextField?: 'ingredient' | 'tag';
  nameTier: NameMatchTier;
  /** Sum of per-field weights; breaks ties within a name tier */
  score: number;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Score a recipe against a query. Returns null if no match.
 * Exported for testing.
 */
export function matchRecipe(recipe: Recipe, query: string): RecipeMatch | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;

  const matchedOn: SearchMatchField[] = [];
  let matchedText: string | undefined;
  let matchedTextField: 'ingredient' | 'tag' | undefined;
  let nameTier: NameMatchTier = 0;
  let score = 0;

  const name = (recipe.name ?? '').toLowerCase();
  if (name.includes(q)) {
    matchedOn.push('name');
    if (name === q) {
      nameTier = 3;
      score += 100;
    } else if (name.startsWith(q)) {
      nameTier = 2;
      score += 80;
    } else if (new RegExp(`(?:^|[^\\p{L}\\p{N}])${escapeRegExp(q)}`, 'u').test(name)) {
      // Start of a later word: "chick" in "Roast Chicken"
      nameTier = 2;
      score += 70;
    } else {
      nameTier = 1;
      score += 60;
    }
  }

  if ((recipe.description ?? '').toLowerCase().includes(q)) {
    matchedOn.push('description');
    score += 20;
  }

  const matchedIngredient = (recipe.ingredients ?? []).find((ing) => (ing.item ?? '').toLowerCase().includes(q));
  if (matchedIngredient) {
    matchedOn.push('ingredient');
    matchedText = matchedIngredient.item;
    matchedTextField = 'ingredient';
    score += 40;
  }

  const matchedTag = (recipe.tags ?? []).find((tag) => tag.toLowerCase().includes(q));
  if (matchedTag) {
    matchedOn.push('tag');
    if (!matchedText) {
      matchedText = matchedTag;
      matchedTextField = 'tag';
    }
    score += 30;
  }

  return matchedOn.length > 0 ? { matchedOn, matchedText, matchedTextField, nameTier, score } : null;
}

/**
 * Ranking order: name-match tier first (exact > prefix/word-start >
 * contains > none), then the combined field score, then name A-Z.
 * Exported for testing.
 */
export function compareMatches(
  a: { nameTier: NameMatchTier; score: number; name: string },
  b: { nameTier: NameMatchTier; score: number; name: string }
): number {
  return b.nameTier - a.nameTier || b.score - a.score || a.name.localeCompare(b.name);
}

/**
 * Search all recipes across every cookbook.
 * Results are ranked by how well the name matches, then by how many
 * other fields (ingredient, tag, description) also match.
 */
export async function searchAllRecipes(query: string, limit: number = 25): Promise<RecipeSearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  const [recipes, cookbooks] = await Promise.all([
    getAllRecipes(),
    getAllCookbooks(),
  ]);

  const cookbookById = new Map(cookbooks.map((cb) => [cb.id, cb]));

  const results: Array<RecipeSearchResult & { nameTier: NameMatchTier; score: number; name: string }> = [];
  for (const recipe of recipes) {
    const cookbook = cookbookById.get(recipe.cookbook_id);
    if (!cookbook) continue; // orphaned recipe — skip rather than crash the UI
    const match = matchRecipe(recipe, q);
    if (match) {
      results.push({
        recipe,
        cookbook,
        matchedOn: match.matchedOn,
        matchedText: match.matchedText,
        matchedTextField: match.matchedTextField,
        nameTier: match.nameTier,
        score: match.score,
        name: recipe.name ?? '',
      });
    }
  }

  results.sort(compareMatches);
  return results.slice(0, limit).map((r) => ({
    recipe: r.recipe,
    cookbook: r.cookbook,
    matchedOn: r.matchedOn,
    matchedText: r.matchedText,
    matchedTextField: r.matchedTextField,
  }));
}
