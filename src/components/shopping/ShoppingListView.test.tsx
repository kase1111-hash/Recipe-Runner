import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ShoppingListView } from './ShoppingListView';
import { addRecipeToShoppingList, loadShoppingList } from '../../services/shoppingList';
import { copyToClipboard } from '../../services/export';
import { db } from '../../db';
import type { Recipe } from '../../types';

vi.mock('../../services/export', () => ({
  copyToClipboard: vi.fn(),
}));

function makeRecipe(id: string, name: string, item: string): Recipe {
  return {
    id,
    cookbook_id: 'cb1',
    name,
    description: '',
    total_time: '10 min',
    active_time: '10 min',
    yield: '2 servings',
    difficulty: { overall: 1, technique: 1, timing: 1, ingredients: 1, equipment: 1 },
    equipment: [],
    tags: [],
    source: { type: 'original' },
    ingredients: [{ item, amount: '1', unit: 'cup', optional: false, substitutes: [] }],
    steps: [],
    notes: '',
    created_at: '2026-01-01T00:00:00Z',
    modified_at: '2026-01-01T00:00:00Z',
    cook_history: [],
  };
}

describe('ShoppingListView', () => {
  const originalShare = navigator.share;

  beforeEach(async () => {
    await db.shoppingList.clear();
    await addRecipeToShoppingList(makeRecipe('r1', 'Pancakes', 'flour'));
    await addRecipeToShoppingList(makeRecipe('r2', 'Smoothie', 'yogurt'));
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'share', { value: originalShare, configurable: true, writable: true });
  });

  it('lists each source recipe and removes one with its ✕', async () => {
    render(<ShoppingListView onBack={vi.fn()} />);
    expect(await screen.findByText('From:')).toBeInTheDocument();
    expect(screen.getByLabelText('Remove Smoothie from shopping list')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Remove Pancakes from shopping list'));

    await waitFor(() => expect(screen.queryByLabelText('Remove Pancakes from shopping list')).not.toBeInTheDocument());
    expect(screen.queryByText('Pancakes')).not.toBeInTheDocument();
    expect(screen.queryByText('flour')).not.toBeInTheDocument();
    expect(screen.getByText('yogurt')).toBeInTheDocument();
    const rows = await loadShoppingList();
    expect(rows.every((r) => r.recipe_id === 'r2')).toBe(true);
  });

  it('shows success feedback when copying works', async () => {
    vi.mocked(copyToClipboard).mockResolvedValue(undefined);
    render(<ShoppingListView onBack={vi.fn()} />);
    fireEvent.click(await screen.findByText('📋 Copy'));
    expect(await screen.findByText('✓ Copied!')).toBeInTheDocument();
    expect(vi.mocked(copyToClipboard).mock.calls[0][0]).toContain('flour');
  });

  it('shows failure feedback when the clipboard is unavailable', async () => {
    vi.mocked(copyToClipboard).mockImplementation(() => {
      throw new TypeError("Cannot read properties of undefined (reading 'writeText')");
    });
    render(<ShoppingListView onBack={vi.fn()} />);
    fireEvent.click(await screen.findByText('📋 Copy'));
    expect(await screen.findByText('Copy failed')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't copy");
  });

  it('treats a cancelled share sheet as a no-op', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('Share canceled', 'AbortError'));
    Object.defineProperty(navigator, 'share', { value: share, configurable: true, writable: true });
    render(<ShoppingListView onBack={vi.fn()} />);
    fireEvent.click(await screen.findByText('Share'));
    await waitFor(() => expect(share).toHaveBeenCalled());
    expect(copyToClipboard).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('falls back to copying when sharing fails for another reason', async () => {
    vi.mocked(copyToClipboard).mockResolvedValue(undefined);
    const share = vi.fn().mockRejectedValue(new DOMException('Not allowed', 'NotAllowedError'));
    Object.defineProperty(navigator, 'share', { value: share, configurable: true, writable: true });
    render(<ShoppingListView onBack={vi.fn()} />);
    fireEvent.click(await screen.findByText('Share'));
    expect(await screen.findByText('✓ Copied!')).toBeInTheDocument();
  });
});
