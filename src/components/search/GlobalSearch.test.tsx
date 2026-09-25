import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GlobalSearch } from './GlobalSearch';
import { searchAllRecipes, type RecipeSearchResult } from '../../services/recipeSearch';
import type { Cookbook, Recipe } from '../../types';

vi.mock('../../services/recipeSearch', () => ({
  searchAllRecipes: vi.fn(),
}));

const cookbook = { id: 'cb1', title: 'Weeknight Dinners' } as Cookbook;

function result(name: string, overrides: Partial<RecipeSearchResult> = {}): RecipeSearchResult {
  return {
    recipe: { id: name, name } as Recipe,
    cookbook,
    matchedOn: ['name'],
    ...overrides,
  };
}

describe('GlobalSearch', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('labels a match with the field that produced the matched text', async () => {
    vi.mocked(searchAllRecipes).mockResolvedValue([
      result('Roast Chicken', {
        matchedOn: ['description', 'ingredient'],
        matchedText: 'garlic',
        matchedTextField: 'ingredient',
      }),
      result('Soup', { matchedOn: ['description'] }),
    ]);
    render(<GlobalSearch onSelectResult={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Search all recipes'), { target: { value: 'garlic' } });

    expect(await screen.findByText(/matched ingredient: garlic/)).toBeInTheDocument();
    expect(screen.queryByText(/matched description: garlic/)).not.toBeInTheDocument();
    expect(screen.getByText(/matched description$/)).toBeInTheDocument();
  });

  it('selects the first result on Enter when nothing is highlighted', async () => {
    vi.mocked(searchAllRecipes).mockResolvedValue([result('Bread'), result('Bread Pudding')]);
    const onSelectResult = vi.fn();
    render(<GlobalSearch onSelectResult={onSelectResult} />);
    const input = screen.getByLabelText('Search all recipes');
    fireEvent.change(input, { target: { value: 'bread' } });
    await screen.findByText('Bread Pudding');

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSelectResult).toHaveBeenCalledWith(expect.objectContaining({ name: 'Bread' }), cookbook);
  });

  it('scrolls the keyboard-highlighted result into view and selects it', async () => {
    vi.mocked(searchAllRecipes).mockResolvedValue([result('Bread'), result('Bread Pudding')]);
    const onSelectResult = vi.fn();
    render(<GlobalSearch onSelectResult={onSelectResult} />);
    const input = screen.getByLabelText('Search all recipes');
    fireEvent.change(input, { target: { value: 'bread' } });
    await screen.findByText('Bread Pudding');

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(Element.prototype.scrollIntoView).toHaveBeenLastCalledWith({ block: 'nearest' });

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSelectResult).toHaveBeenCalledWith(expect.objectContaining({ name: 'Bread Pudding' }), cookbook);
  });
});
