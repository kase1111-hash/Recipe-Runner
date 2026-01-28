import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  db,
  createCookbook,
  getCookbook,
  getAllCookbooks,
  updateCookbook,
  deleteCookbook,
  createRecipe,
  getRecipe,
  getRecipesByCookbook,
  updateRecipe,
  deleteRecipe,
  toggleFavorite,
  DatabaseError,
} from './index';
import type { Cookbook, Recipe } from '../types';

describe('Database Operations', () => {
  beforeEach(async () => {
    // Clear database before each test
    await db.delete();
    await db.open();
  });

  afterEach(async () => {
    await db.delete();
  });

  describe('Cookbook Operations', () => {
    const mockCookbook: Cookbook = {
      id: 'test-cookbook-1',
      title: 'Test Cookbook',
      category: 'cooking',
      description: 'A test cookbook',
      author: 'Test Author',
      created_at: new Date().toISOString(),
      modified_at: new Date().toISOString(),
    };

    it('creates a cookbook', async () => {
      const id = await createCookbook(mockCookbook);
      expect(id).toBe('test-cookbook-1');
    });

    it('retrieves a cookbook by id', async () => {
      await createCookbook(mockCookbook);
      const cookbook = await getCookbook('test-cookbook-1');
      expect(cookbook).toBeDefined();
      expect(cookbook?.title).toBe('Test Cookbook');
    });

    it('returns undefined for non-existent cookbook', async () => {
      const cookbook = await getCookbook('non-existent');
      expect(cookbook).toBeUndefined();
    });

    it('gets all cookbooks', async () => {
      await createCookbook(mockCookbook);
      await createCookbook({
        ...mockCookbook,
        id: 'test-cookbook-2',
        title: 'Second Cookbook',
      });

      const cookbooks = await getAllCookbooks();
      expect(cookbooks.length).toBe(2);
    });

    it('updates a cookbook', async () => {
      await createCookbook(mockCookbook);
      const updated = await updateCookbook('test-cookbook-1', { title: 'Updated Title' });
      expect(updated).toBe(1);

      const cookbook = await getCookbook('test-cookbook-1');
      expect(cookbook?.title).toBe('Updated Title');
    });

    it('deletes a cookbook and associated recipes', async () => {
      await createCookbook(mockCookbook);
      await createRecipe({
        id: 'test-recipe-1',
        cookbook_id: 'test-cookbook-1',
        name: 'Test Recipe',
        description: '',
        total_time: '30 min',
        active_time: '15 min',
        yield: '4 servings',
        difficulty: { overall: 3, technique: 3, timing: 3, ingredients: 3, equipment: 3 },
        safe_temp: null,
        equipment: [],
        tags: [],
        source: { type: 'original' },
        ingredients: [],
        steps: [],
        notes: '',
        created_at: new Date().toISOString(),
        modified_at: new Date().toISOString(),
        cook_history: [],
      });

      await deleteCookbook('test-cookbook-1');

      const cookbook = await getCookbook('test-cookbook-1');
      expect(cookbook).toBeUndefined();

      const recipe = await getRecipe('test-recipe-1');
      expect(recipe).toBeUndefined();
    });
  });

  describe('Recipe Operations', () => {
    const mockCookbook: Cookbook = {
      id: 'test-cookbook-1',
      title: 'Test Cookbook',
      category: 'cooking',
      description: '',
      author: 'Test Author',
      created_at: new Date().toISOString(),
      modified_at: new Date().toISOString(),
    };

    const mockRecipe: Recipe = {
      id: 'test-recipe-1',
      cookbook_id: 'test-cookbook-1',
      name: 'Test Recipe',
      description: 'A delicious test recipe',
      total_time: '30 min',
      active_time: '15 min',
      yield: '4 servings',
      difficulty: { overall: 3, technique: 3, timing: 3, ingredients: 3, equipment: 3 },
      safe_temp: null,
      equipment: ['pan', 'spatula'],
      tags: ['quick', 'easy'],
      source: { type: 'original' },
      ingredients: [
        { item: 'flour', amount: '2', unit: 'cups', prep: null, optional: false, substitutes: [] },
      ],
      steps: [
        {
          index: 0,
          title: 'Mix',
          instruction: 'Mix ingredients',
          time_minutes: 5,
          time_display: '5 min',
          type: 'active',
          tip: null,
          visual_prompt: '',
          temperature: null,
          timer_default: null,
        },
      ],
      notes: '',
      created_at: new Date().toISOString(),
      modified_at: new Date().toISOString(),
      cook_history: [],
    };

    beforeEach(async () => {
      await createCookbook(mockCookbook);
    });

    it('creates a recipe', async () => {
      const id = await createRecipe(mockRecipe);
      expect(id).toBe('test-recipe-1');
    });

    it('retrieves a recipe by id', async () => {
      await createRecipe(mockRecipe);
      const recipe = await getRecipe('test-recipe-1');
      expect(recipe).toBeDefined();
      expect(recipe?.name).toBe('Test Recipe');
      expect(recipe?.ingredients.length).toBe(1);
      expect(recipe?.steps.length).toBe(1);
    });

    it('gets recipes by cookbook', async () => {
      await createRecipe(mockRecipe);
      await createRecipe({
        ...mockRecipe,
        id: 'test-recipe-2',
        name: 'Second Recipe',
      });

      const recipes = await getRecipesByCookbook('test-cookbook-1');
      expect(recipes.length).toBe(2);
    });

    it('updates a recipe', async () => {
      await createRecipe(mockRecipe);
      const updated = await updateRecipe('test-recipe-1', { name: 'Updated Recipe Name' });
      expect(updated).toBe(1);

      const recipe = await getRecipe('test-recipe-1');
      expect(recipe?.name).toBe('Updated Recipe Name');
    });

    it('deletes a recipe', async () => {
      await createRecipe(mockRecipe);
      await deleteRecipe('test-recipe-1');

      const recipe = await getRecipe('test-recipe-1');
      expect(recipe).toBeUndefined();
    });

    it('toggles favorite status', async () => {
      await createRecipe(mockRecipe);

      const newState = await toggleFavorite('test-recipe-1');
      expect(newState).toBe(true);

      const recipe = await getRecipe('test-recipe-1');
      expect(recipe?.favorite).toBe(true);

      const toggledBack = await toggleFavorite('test-recipe-1');
      expect(toggledBack).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('wraps errors in DatabaseError', async () => {
      // Try to create duplicate cookbook
      const mockCookbook: Cookbook = {
        id: 'duplicate-id',
        title: 'Test',
        category: 'cooking',
        description: '',
        author: 'Test Author',
        created_at: new Date().toISOString(),
        modified_at: new Date().toISOString(),
      };

      await createCookbook(mockCookbook);

      try {
        await createCookbook(mockCookbook);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(DatabaseError);
        expect((error as DatabaseError).operation).toBe('createCookbook');
        expect((error as DatabaseError).message).toContain('Duplicate');
      }
    });
  });
});
