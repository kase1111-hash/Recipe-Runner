import { describe, it, expect } from 'vitest';
import { exportRecipe, exportRecipeAsText, exportRecipeAsMarkdown } from './export';
import type { Recipe } from '../types';

const recipe: Recipe = {
  id: 'r1',
  cookbook_id: 'cb1',
  name: 'Roast Chicken',
  description: 'Crispy skin',
  total_time: '1 hr 30 min',
  active_time: '20 min',
  yield: '4 servings',
  difficulty: { overall: 2, technique: 2, timing: 2, ingredients: 1, equipment: 2 },
  safe_temp: { value: 165, unit: '°F', location: 'thickest part of thigh' },
  equipment: ['Roasting pan'],
  tags: ['dinner', 'roasting'],
  source: { type: 'original' },
  ingredients: [
    { item: 'chicken', amount: '4', unit: 'lb', prep: 'patted dry', optional: false, substitutes: [] },
  ],
  steps: [
    {
      index: 0,
      title: 'Roast',
      instruction: 'Roast until done.',
      time_minutes: 60,
      time_display: '1 hr',
      type: 'passive',
      tip: 'Rest before carving',
      visual_prompt: '',
    },
  ],
  notes: 'Brine overnight for extra juiciness.',
  created_at: '2024-01-01T00:00:00.000Z',
  modified_at: '2024-01-01T00:00:00.000Z',
  cook_history: [],
};

describe('plain text export', () => {
  it('includes the safe temperature, like markdown', () => {
    const text = exportRecipeAsText(recipe);
    expect(text).toContain('Safe Temperature: 165°F (thickest part of thigh)');
    expect(exportRecipeAsMarkdown(recipe)).toContain('**Safe Temperature:** 165°F (thickest part of thigh)');
  });

  it('omits the safe temperature line when there is none', () => {
    expect(exportRecipeAsText({ ...recipe, safe_temp: null })).not.toContain('Safe Temperature');
  });

  it('includes notes only when asked, like markdown', () => {
    expect(exportRecipe(recipe, { format: 'text' })).not.toContain('Brine overnight');
    expect(exportRecipe(recipe, { format: 'markdown' })).not.toContain('Brine overnight');

    const text = exportRecipe(recipe, { format: 'text', includeNotes: true });
    expect(text).toContain('NOTES');
    expect(text).toContain('Brine overnight for extra juiciness.');
    expect(exportRecipe(recipe, { format: 'markdown', includeNotes: true })).toContain('Brine overnight for extra juiciness.');
  });

  it('includes tags', () => {
    expect(exportRecipeAsText(recipe)).toContain('Tags: dinner, roasting');
  });

  it('still includes the core recipe content', () => {
    const text = exportRecipeAsText(recipe);
    expect(text).toContain('ROAST CHICKEN');
    expect(text).toContain('• 4 lb chicken, patted dry');
    expect(text).toContain('1. ROAST');
    expect(text).toContain('TIP: Rest before carving');
  });
});
