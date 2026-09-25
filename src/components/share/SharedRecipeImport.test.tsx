import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SharedRecipeImport } from './SharedRecipeImport';
import { createCookbook, createRecipe, getAllCookbooks } from '../../db';
import { createShareLink } from '../../services/sharing';
import type { Cookbook, Recipe } from '../../types';

vi.mock('../../db', () => ({
  getAllCookbooks: vi.fn(),
  createCookbook: vi.fn(),
  createRecipe: vi.fn(),
}));

const cookbooks: Cookbook[] = [
  { id: 'cb-1', title: 'Weeknight Dinners', description: '', author: '', category: 'cooking', created_at: '', modified_at: '' },
  { id: 'cb-2', title: 'Baking', description: '', author: '', category: 'baking', created_at: '', modified_at: '' },
];

const sharedRecipe: Recipe = {
  id: 'sender-recipe-id',
  cookbook_id: 'sender-cookbook',
  name: 'Crème Brûlée',
  description: 'Silky custard 🍮',
  total_time: '5 hr',
  active_time: '30 min',
  yield: '6 ramekins',
  difficulty: { overall: 3, technique: 3, timing: 3, ingredients: 2, equipment: 3 },
  safe_temp: null,
  equipment: [],
  tags: [],
  source: { type: 'original' },
  ingredients: [
    { item: 'heavy cream', amount: '2', unit: 'cups', prep: null, optional: false, substitutes: [] },
    { item: 'sugar', amount: '½', unit: 'cup', prep: 'divided', optional: true, substitutes: [] },
  ],
  steps: [
    { index: 0, title: 'Heat the cream', instruction: 'Warm to 80°C.', time_minutes: 10, time_display: '10 min', type: 'active', visual_prompt: '' },
    { index: 1, title: 'Chill', instruction: 'Refrigerate.', time_minutes: 240, time_display: '4 hr', type: 'passive', visual_prompt: '' },
  ],
  notes: '',
  created_at: '2024-01-01T00:00:00.000Z',
  modified_at: '2024-01-01T00:00:00.000Z',
  cook_history: [{ date: '2024-01-02', completed: true, notes: 'private', adjustments: [], rating: 5 }],
};

async function payloadFor(recipe: Recipe): Promise<string> {
  const link = await createShareLink(recipe);
  return link.slice(link.indexOf('#') + 1);
}

describe('SharedRecipeImport', () => {
  const onSaved = vi.fn();
  const onCancel = vi.fn();

  beforeEach(() => {
    vi.mocked(getAllCookbooks).mockResolvedValue(cookbooks);
    vi.mocked(createCookbook).mockImplementation(async (cookbook) => cookbook.id);
    vi.mocked(createRecipe).mockImplementation(async (recipe) => recipe.id);
  });

  it('shows a loading state, then a preview of the shared recipe', async () => {
    render(<SharedRecipeImport payload={await payloadFor(sharedRecipe)} onSaved={onSaved} onCancel={onCancel} />);

    expect(screen.getByText('Opening shared recipe...')).toBeInTheDocument();

    expect(await screen.findByRole('heading', { name: 'Crème Brûlée' })).toBeInTheDocument();
    expect(screen.getByText('Silky custard 🍮')).toBeInTheDocument();
    expect(screen.getByText(/Yield: 6 ramekins/)).toBeInTheDocument();
    expect(screen.getByText(/2 cups heavy cream/)).toBeInTheDocument();
    expect(screen.getByText(/½ cup sugar/)).toBeInTheDocument();
    expect(screen.getByText('Heat the cream')).toBeInTheDocument();
    expect(screen.getByText('Chill')).toBeInTheDocument();

    const select = screen.getByLabelText('Save to cookbook') as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => o.textContent)).toEqual([
      'Weeknight Dinners',
      'Baking',
      'New cookbook: Shared Recipes',
    ]);
    expect(select.value).toBe('cb-1');
  });

  it('saves a new copy into the chosen cookbook', async () => {
    render(<SharedRecipeImport payload={await payloadFor(sharedRecipe)} onSaved={onSaved} onCancel={onCancel} />);

    fireEvent.change(await screen.findByLabelText('Save to cookbook'), { target: { value: 'cb-2' } });
    fireEvent.click(screen.getByText('Save to my cookbook'));

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    const [saved, cookbook] = onSaved.mock.calls[0] as [Recipe, Cookbook];
    expect(cookbook).toEqual(cookbooks[1]);
    expect(saved.cookbook_id).toBe('cb-2');
    expect(saved.id).not.toBe(sharedRecipe.id);
    expect(saved.cook_history).toEqual([]);
    expect(saved.name).toBe('Crème Brûlée');
    expect(saved.steps.map((s) => s.index)).toEqual([0, 1]);
    expect(createRecipe).toHaveBeenCalledWith(saved);
    expect(createCookbook).not.toHaveBeenCalled();
  });

  it('creates a "Shared Recipes" cookbook when the user has none', async () => {
    vi.mocked(getAllCookbooks).mockResolvedValue([]);
    render(<SharedRecipeImport payload={await payloadFor(sharedRecipe)} onSaved={onSaved} onCancel={onCancel} />);

    const select = (await screen.findByLabelText('Save to cookbook')) as HTMLSelectElement;
    expect(select.options).toHaveLength(1);
    fireEvent.click(screen.getByText('Save to my cookbook'));

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    const [saved, cookbook] = onSaved.mock.calls[0] as [Recipe, Cookbook];
    expect(cookbook.title).toBe('Shared Recipes');
    expect(createCookbook).toHaveBeenCalledWith(cookbook);
    expect(saved.cookbook_id).toBe(cookbook.id);
  });

  it('shows an error and stays put when saving fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(createRecipe).mockRejectedValue(new Error('quota'));
    render(<SharedRecipeImport payload={await payloadFor(sharedRecipe)} onSaved={onSaved} onCancel={onCancel} />);

    fireEvent.click(await screen.findByText('Save to my cookbook'));

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save the recipe');
    expect(onSaved).not.toHaveBeenCalled();
    expect(screen.getByText('Save to my cookbook')).not.toBeDisabled();
  });

  it('shows a friendly error for a broken link and offers the library', async () => {
    const payload = await payloadFor(sharedRecipe);
    render(<SharedRecipeImport payload={payload.slice(0, 40)} onSaved={onSaved} onCancel={onCancel} />);

    expect(await screen.findByText("This share link can't be opened")).toBeInTheDocument();
    fireEvent.click(screen.getByText('Go to my library'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('treats an empty payload as a broken link', async () => {
    render(<SharedRecipeImport payload="" onSaved={onSaved} onCancel={onCancel} />);
    expect(await screen.findByText("This share link can't be opened")).toBeInTheDocument();
  });

  it('cancels from the preview', async () => {
    render(<SharedRecipeImport payload={await payloadFor(sharedRecipe)} onSaved={onSaved} onCancel={onCancel} />);
    fireEvent.click(await screen.findByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
