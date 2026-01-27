// Recipe Runner Database
// IndexedDB with Dexie.js

import Dexie, { type Table } from 'dexie';
import type {
  Cookbook,
  Recipe,
  CookingSession,
  UserPreferences,
  CookHistory,
  Bookshelf,
  CourseType,
} from '../types';

// ============================================
// Database Schema
// ============================================

export class RecipeRunnerDB extends Dexie {
  cookbooks!: Table<Cookbook>;
  recipes!: Table<Recipe>;
  cookingSessions!: Table<CookingSession>;
  cookHistory!: Table<CookHistory & { id: string; recipe_id: string }>;
  imageCache!: Table<{ id: string; recipe_id: string; step_index: number; image_data: string; version: number; created_at: string }>;
  bookshelves!: Table<Bookshelf>;

  constructor() {
    super('RecipeRunnerDB');

    this.version(1).stores({
      cookbooks: 'id, title, category, created_at, modified_at',
      recipes: 'id, cookbook_id, name, [cookbook_id+name], created_at, modified_at',
      cookingSessions: 'recipeId, cookbookId, startedAt',
      cookHistory: 'id, recipe_id, date',
      imageCache: 'id, [recipe_id+step_index], created_at',
    });

    // Version 2: Add bookshelves, course_type indexing, and optimized indexes for large datasets
    this.version(2).stores({
      cookbooks: 'id, title, category, bookshelf_id, created_at, modified_at',
      recipes: 'id, cookbook_id, name, course_type, cuisine, [cookbook_id+name], [cookbook_id+course_type], [course_type+cuisine], created_at, modified_at, favorite',
      cookingSessions: 'recipeId, cookbookId, startedAt',
      cookHistory: 'id, recipe_id, date',
      imageCache: 'id, [recipe_id+step_index], created_at',
      bookshelves: 'id, name, sort_order, created_at, modified_at',
    });
  }
}

export const db = new RecipeRunnerDB();

// ============================================
// Cookbook Operations
// ============================================

export async function createCookbook(cookbook: Cookbook): Promise<string> {
  return await db.cookbooks.add(cookbook);
}

export async function getCookbook(id: string): Promise<Cookbook | undefined> {
  return await db.cookbooks.get(id);
}

export async function getAllCookbooks(): Promise<Cookbook[]> {
  return await db.cookbooks.orderBy('modified_at').reverse().toArray();
}

export async function updateCookbook(id: string, updates: Partial<Cookbook>): Promise<number> {
  return await db.cookbooks.update(id, {
    ...updates,
    modified_at: new Date().toISOString(),
  });
}

export async function deleteCookbook(id: string): Promise<void> {
  await db.transaction('rw', [db.cookbooks, db.recipes], async () => {
    await db.recipes.where('cookbook_id').equals(id).delete();
    await db.cookbooks.delete(id);
  });
}

export async function getCookbooksByBookshelf(bookshelfId: string): Promise<Cookbook[]> {
  return await db.cookbooks.where('bookshelf_id').equals(bookshelfId).toArray();
}

export async function getUnshelvedCookbooks(): Promise<Cookbook[]> {
  return await db.cookbooks.filter((cb) => !cb.bookshelf_id).toArray();
}

// ============================================
// Bookshelf Operations
// ============================================

export async function createBookshelf(bookshelf: Bookshelf): Promise<string> {
  return await db.bookshelves.add(bookshelf);
}

export async function getBookshelf(id: string): Promise<Bookshelf | undefined> {
  return await db.bookshelves.get(id);
}

export async function getAllBookshelves(): Promise<Bookshelf[]> {
  return await db.bookshelves.orderBy('sort_order').toArray();
}

export async function updateBookshelf(id: string, updates: Partial<Bookshelf>): Promise<number> {
  return await db.bookshelves.update(id, {
    ...updates,
    modified_at: new Date().toISOString(),
  });
}

export async function deleteBookshelf(id: string): Promise<void> {
  // Remove bookshelf_id from all associated cookbooks
  await db.transaction('rw', [db.bookshelves, db.cookbooks], async () => {
    const cookbooks = await db.cookbooks.where('bookshelf_id').equals(id).toArray();
    for (const cookbook of cookbooks) {
      await db.cookbooks.update(cookbook.id, { bookshelf_id: null });
    }
    await db.bookshelves.delete(id);
  });
}

export async function reorderBookshelves(orderedIds: string[]): Promise<void> {
  await db.transaction('rw', db.bookshelves, async () => {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.bookshelves.update(orderedIds[i], {
        sort_order: i,
        modified_at: new Date().toISOString(),
      });
    }
  });
}

// ============================================
// Recipe Operations
// ============================================

export async function createRecipe(recipe: Recipe): Promise<string> {
  return await db.recipes.add(recipe);
}

export async function getRecipe(id: string): Promise<Recipe | undefined> {
  return await db.recipes.get(id);
}

export async function getRecipesByCookbook(cookbookId: string): Promise<Recipe[]> {
  return await db.recipes.where('cookbook_id').equals(cookbookId).toArray();
}

export async function updateRecipe(id: string, updates: Partial<Recipe>): Promise<number> {
  return await db.recipes.update(id, {
    ...updates,
    modified_at: new Date().toISOString(),
  });
}

export async function deleteRecipe(id: string): Promise<void> {
  await db.recipes.delete(id);
}

// ============================================
// Course Type & Filtering Operations
// ============================================

export async function getRecipesByCourseType(courseType: CourseType): Promise<Recipe[]> {
  return await db.recipes.where('course_type').equals(courseType).toArray();
}

export async function getRecipesByCookbookAndCourseType(
  cookbookId: string,
  courseType: CourseType
): Promise<Recipe[]> {
  return await db.recipes
    .where('[cookbook_id+course_type]')
    .equals([cookbookId, courseType])
    .toArray();
}

export async function getSideDishRecipes(): Promise<Recipe[]> {
  return await db.recipes.where('course_type').equals('side_dish').toArray();
}

export async function getAllRecipes(): Promise<Recipe[]> {
  return await db.recipes.toArray();
}

export async function getRecipesByIds(ids: string[]): Promise<Recipe[]> {
  return await db.recipes.where('id').anyOf(ids).toArray();
}

/**
 * Get recipes with pagination for handling large datasets
 */
export async function getRecipesPaginated(
  cookbookId: string,
  options: {
    offset?: number;
    limit?: number;
    courseType?: CourseType | null;
    sortBy?: 'name' | 'difficulty' | 'time' | 'recent';
    sortDirection?: 'asc' | 'desc';
  } = {}
): Promise<{ recipes: Recipe[]; total: number }> {
  const { offset = 0, limit = 50, courseType, sortBy = 'name', sortDirection = 'asc' } = options;

  let collection = courseType
    ? db.recipes.where('[cookbook_id+course_type]').equals([cookbookId, courseType])
    : db.recipes.where('cookbook_id').equals(cookbookId);

  const total = await collection.count();
  let recipes = await collection.toArray();

  // Apply sorting
  recipes.sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'difficulty':
        comparison = a.difficulty.overall - b.difficulty.overall;
        break;
      case 'time': {
        const parseTime = (t: string) => {
          const hours = t.match(/(\d+)\s*h/)?.[1] || '0';
          const mins = t.match(/(\d+)\s*m/)?.[1] || '0';
          return parseInt(hours) * 60 + parseInt(mins);
        };
        comparison = parseTime(a.total_time) - parseTime(b.total_time);
        break;
      }
      case 'recent':
        comparison = new Date(b.modified_at).getTime() - new Date(a.modified_at).getTime();
        break;
    }
    return sortDirection === 'desc' ? -comparison : comparison;
  });

  // Favorites always first
  recipes.sort((a, b) => {
    if (a.favorite && !b.favorite) return -1;
    if (!a.favorite && b.favorite) return 1;
    return 0;
  });

  // Apply pagination
  return {
    recipes: recipes.slice(offset, offset + limit),
    total,
  };
}

/**
 * Get recipe counts by course type for a cookbook
 */
export async function getRecipeCountsByCourseType(
  cookbookId: string
): Promise<Record<string, number>> {
  const recipes = await db.recipes.where('cookbook_id').equals(cookbookId).toArray();
  const counts: Record<string, number> = { all: recipes.length };

  for (const recipe of recipes) {
    const type = recipe.course_type || 'uncategorized';
    counts[type] = (counts[type] || 0) + 1;
  }

  return counts;
}

export async function addCookHistoryEntry(
  recipeId: string,
  entry: CookHistory
): Promise<void> {
  const recipe = await db.recipes.get(recipeId);
  if (recipe) {
    const updatedHistory = [...recipe.cook_history, entry];
    await db.recipes.update(recipeId, {
      cook_history: updatedHistory,
      modified_at: new Date().toISOString(),
    });
  }
}

// ============================================
// Favorites Operations
// ============================================

export async function toggleFavorite(recipeId: string): Promise<boolean> {
  const recipe = await db.recipes.get(recipeId);
  if (recipe) {
    const newFavoriteState = !recipe.favorite;
    await db.recipes.update(recipeId, {
      favorite: newFavoriteState,
      modified_at: new Date().toISOString(),
    });
    return newFavoriteState;
  }
  return false;
}

export async function getFavoriteRecipes(): Promise<Recipe[]> {
  return await db.recipes.filter((recipe) => recipe.favorite === true).toArray();
}

export async function getAllRecipesWithFavorites(): Promise<Recipe[]> {
  const recipes = await db.recipes.toArray();
  // Sort favorites first, then by modified date
  return recipes.sort((a, b) => {
    if (a.favorite && !b.favorite) return -1;
    if (!a.favorite && b.favorite) return 1;
    return new Date(b.modified_at).getTime() - new Date(a.modified_at).getTime();
  });
}

// ============================================
// Cooking Session Operations
// ============================================

export async function saveCookingSession(session: CookingSession): Promise<string> {
  return await db.cookingSessions.put(session);
}

export async function getCookingSession(recipeId: string): Promise<CookingSession | undefined> {
  return await db.cookingSessions.get(recipeId);
}

export async function deleteCookingSession(recipeId: string): Promise<void> {
  await db.cookingSessions.delete(recipeId);
}

// ============================================
// Image Cache Operations
// ============================================

export async function cacheStepImage(
  recipeId: string,
  stepIndex: number,
  imageData: string,
  version: number = 1
): Promise<void> {
  const id = `${recipeId}_${stepIndex}_v${version}`;
  await db.imageCache.put({
    id,
    recipe_id: recipeId,
    step_index: stepIndex,
    image_data: imageData,
    version,
    created_at: new Date().toISOString(),
  });
}

export async function getCachedStepImage(
  recipeId: string,
  stepIndex: number
): Promise<string | null> {
  const cached = await db.imageCache
    .where('[recipe_id+step_index]')
    .equals([recipeId, stepIndex])
    .first();
  return cached?.image_data ?? null;
}

export async function clearImageCache(recipeId?: string): Promise<void> {
  if (recipeId) {
    await db.imageCache.where('recipe_id').equals(recipeId).delete();
  } else {
    await db.imageCache.clear();
  }
}

export async function getStepImageVersions(
  recipeId: string,
  stepIndex: number
): Promise<Array<{ version: number; image_data: string; created_at: string }>> {
  const versions = await db.imageCache
    .where('[recipe_id+step_index]')
    .equals([recipeId, stepIndex])
    .toArray();
  return versions
    .map(v => ({ version: v.version, image_data: v.image_data, created_at: v.created_at }))
    .sort((a, b) => b.version - a.version);
}

export async function getCachedStepImageByVersion(
  recipeId: string,
  stepIndex: number,
  version: number
): Promise<string | null> {
  const id = `${recipeId}_${stepIndex}_v${version}`;
  const cached = await db.imageCache.get(id);
  return cached?.image_data ?? null;
}

export async function getNextImageVersion(
  recipeId: string,
  stepIndex: number
): Promise<number> {
  const versions = await getStepImageVersions(recipeId, stepIndex);
  if (versions.length === 0) return 1;
  return Math.max(...versions.map(v => v.version)) + 1;
}

export async function getImageCacheStats(): Promise<{
  totalImages: number;
  totalSize: number;
  byRecipe: Record<string, number>;
}> {
  const all = await db.imageCache.toArray();
  const byRecipe: Record<string, number> = {};
  let totalSize = 0;

  for (const item of all) {
    byRecipe[item.recipe_id] = (byRecipe[item.recipe_id] || 0) + 1;
    totalSize += item.image_data.length;
  }

  return {
    totalImages: all.length,
    totalSize,
    byRecipe,
  };
}

// ============================================
// User Preferences (localStorage)
// ============================================

const PREFERENCES_KEY = 'recipe_runner_preferences';

export const defaultPreferences: UserPreferences = {
  ollama_config: {
    endpoint: 'http://localhost:11434',
    model: 'llama3.1:8b',
    temperature: 0.7,
    max_tokens: 500,
    timeout_ms: 30000,
  },
  timer_alert_type: 'both',
  skill_level: 'intermediate',
  dark_mode: false,
  auto_generate_visuals: true,
};

export function getPreferences(): UserPreferences {
  try {
    const stored = localStorage.getItem(PREFERENCES_KEY);
    if (stored) {
      return { ...defaultPreferences, ...JSON.parse(stored) };
    }
  } catch {
    // Ignore parse errors
  }
  return defaultPreferences;
}

export function savePreferences(preferences: Partial<UserPreferences>): void {
  const current = getPreferences();
  localStorage.setItem(
    PREFERENCES_KEY,
    JSON.stringify({ ...current, ...preferences })
  );
}

// ============================================
// Database Initialization
// ============================================

export async function initializeDatabase(): Promise<void> {
  await db.open();
}
