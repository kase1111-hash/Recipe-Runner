import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CookCompletion } from './CookCompletion';
import { addCookHistoryEntry } from '../../db';
import type { Recipe } from '../../types';

vi.mock('../../db', () => ({
  addCookHistoryEntry: vi.fn().mockResolvedValue(undefined),
}));

const mockRecipe: Recipe = {
  id: 'test-1',
  cookbook_id: 'cb-1',
  name: 'Test Recipe',
  description: 'A test recipe',
  total_time: '30 min',
  active_time: '15 min',
  yield: '4 servings',
  difficulty: { overall: 2, technique: 2, timing: 2, ingredients: 2, equipment: 2 },
  safe_temp: null,
  equipment: [],
  tags: [],
  source: { type: 'original' as const },
  ingredients: [],
  steps: [],
  notes: '',
  created_at: new Date().toISOString(),
  modified_at: new Date().toISOString(),
  cook_history: [
    { date: '2024-01-01', completed: true, notes: '', adjustments: [], rating: 4 },
    { date: '2024-02-01', completed: true, notes: 'Great!', adjustments: [], rating: 5 },
  ],
};

describe('CookCompletion', () => {
  const mockOnComplete = vi.fn();
  const mockOnCookAgain = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders completion form with recipe name', () => {
    render(
      <CookCompletion
        recipe={mockRecipe}
        onComplete={mockOnComplete}
        onCookAgain={mockOnCookAgain}
      />
    );

    expect(screen.getByText('How Did It Go?')).toBeInTheDocument();
    expect(screen.getByText(/Test Recipe/)).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getByText('Partially')).toBeInTheDocument();
    expect(screen.getByText('Your Rating')).toBeInTheDocument();
    expect(screen.getByText('Adjustments Made')).toBeInTheDocument();
    expect(screen.getByText('Notes')).toBeInTheDocument();
    expect(screen.getByText('Save & Finish')).toBeInTheDocument();
    expect(screen.getByText('Skip')).toBeInTheDocument();
  });

  it('star rating selection works', () => {
    render(
      <CookCompletion
        recipe={mockRecipe}
        onComplete={mockOnComplete}
        onCookAgain={mockOnCookAgain}
      />
    );

    // Initially no rating text is shown
    expect(screen.queryByText('Great!')).not.toBeInTheDocument();

    // There are 5 star buttons rendered with "☆"
    const starButtons = screen.getAllByRole('button').filter(
      (btn) => btn.textContent === '☆' || btn.textContent === '⭐'
    );
    expect(starButtons).toHaveLength(5);

    // Click the 4th star
    fireEvent.click(starButtons[3]);

    // After clicking 4th star, stars 1-4 should be filled
    const updatedStarButtons = screen.getAllByRole('button').filter(
      (btn) => btn.textContent === '☆' || btn.textContent === '⭐'
    );
    const filledStars = updatedStarButtons.filter((btn) => btn.textContent === '⭐');
    expect(filledStars).toHaveLength(4);

    // Rating label should appear
    expect(screen.getByText('Great!')).toBeInTheDocument();
  });

  it('can add an adjustment by pressing Enter', () => {
    render(
      <CookCompletion
        recipe={mockRecipe}
        onComplete={mockOnComplete}
        onCookAgain={mockOnCookAgain}
      />
    );

    const input = screen.getByPlaceholderText('e.g., Used olive oil instead of butter');

    fireEvent.change(input, { target: { value: 'Added extra garlic' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.getByText('Added extra garlic')).toBeInTheDocument();
    // Input should be cleared after adding
    expect(input).toHaveValue('');
  });

  it('can add an adjustment by clicking the Add button', () => {
    render(
      <CookCompletion
        recipe={mockRecipe}
        onComplete={mockOnComplete}
        onCookAgain={mockOnCookAgain}
      />
    );

    const input = screen.getByPlaceholderText('e.g., Used olive oil instead of butter');
    const addButton = screen.getByText('Add');

    fireEvent.change(input, { target: { value: 'Used less salt' } });
    fireEvent.click(addButton);

    expect(screen.getByText('Used less salt')).toBeInTheDocument();
    expect(input).toHaveValue('');
  });

  it('can remove an adjustment', () => {
    render(
      <CookCompletion
        recipe={mockRecipe}
        onComplete={mockOnComplete}
        onCookAgain={mockOnCookAgain}
      />
    );

    const input = screen.getByPlaceholderText('e.g., Used olive oil instead of butter');

    // Add two adjustments
    fireEvent.change(input, { target: { value: 'First adjustment' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.change(input, { target: { value: 'Second adjustment' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.getByText('First adjustment')).toBeInTheDocument();
    expect(screen.getByText('Second adjustment')).toBeInTheDocument();

    // Click the remove button (×) on the first adjustment
    const removeButtons = screen.getAllByText('×');
    fireEvent.click(removeButtons[0]);

    expect(screen.queryByText('First adjustment')).not.toBeInTheDocument();
    expect(screen.getByText('Second adjustment')).toBeInTheDocument();
  });

  it('does not add empty adjustment text', () => {
    render(
      <CookCompletion
        recipe={mockRecipe}
        onComplete={mockOnComplete}
        onCookAgain={mockOnCookAgain}
      />
    );

    const input = screen.getByPlaceholderText('e.g., Used olive oil instead of butter');
    const addButton = screen.getByText('Add');

    // Try adding empty string
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.click(addButton);

    // Try adding whitespace-only string
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.click(addButton);

    // No adjustment items should be rendered (no × buttons)
    expect(screen.queryByText('×')).not.toBeInTheDocument();
  });

  it('skip button calls onComplete', () => {
    render(
      <CookCompletion
        recipe={mockRecipe}
        onComplete={mockOnComplete}
        onCookAgain={mockOnCookAgain}
      />
    );

    fireEvent.click(screen.getByText('Skip'));

    expect(mockOnComplete).toHaveBeenCalledTimes(1);
  });

  it('save button calls addCookHistoryEntry with correct data', async () => {
    render(
      <CookCompletion
        recipe={mockRecipe}
        onComplete={mockOnComplete}
        onCookAgain={mockOnCookAgain}
      />
    );

    // Set rating to 3
    const starButtons = screen.getAllByRole('button').filter(
      (btn) => btn.textContent === '☆' || btn.textContent === '⭐'
    );
    fireEvent.click(starButtons[2]);

    // Set completion to Partially
    fireEvent.click(screen.getByText('Partially'));

    // Add an adjustment
    const input = screen.getByPlaceholderText('e.g., Used olive oil instead of butter');
    fireEvent.change(input, { target: { value: 'Reduced sugar' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    // Add notes
    const notesTextarea = screen.getByPlaceholderText('Any thoughts or tips for next time...');
    fireEvent.change(notesTextarea, { target: { value: 'Turned out well' } });

    // Click save
    fireEvent.click(screen.getByText('Save & Finish'));

    await waitFor(() => {
      expect(addCookHistoryEntry).toHaveBeenCalledTimes(1);
      expect(addCookHistoryEntry).toHaveBeenCalledWith('test-1', expect.objectContaining({
        completed: false,
        notes: 'Turned out well',
        adjustments: ['Reduced sugar'],
        rating: 3,
        date: expect.any(String),
      }));
    });
  });

  it('after save, shows celebration view', async () => {
    render(
      <CookCompletion
        recipe={mockRecipe}
        onComplete={mockOnComplete}
        onCookAgain={mockOnCookAgain}
      />
    );

    fireEvent.click(screen.getByText('Save & Finish'));

    await waitFor(() => {
      expect(screen.getByText('Great Job!')).toBeInTheDocument();
      expect(screen.getByText(/You've completed Test Recipe!/)).toBeInTheDocument();
    });

    expect(screen.getByText('Cook Again')).toBeInTheDocument();
    expect(screen.getByText('Back to Library')).toBeInTheDocument();
  });

  it('Cook Again button in celebration view calls onCookAgain', async () => {
    render(
      <CookCompletion
        recipe={mockRecipe}
        onComplete={mockOnComplete}
        onCookAgain={mockOnCookAgain}
      />
    );

    fireEvent.click(screen.getByText('Save & Finish'));

    await waitFor(() => {
      expect(screen.getByText('Cook Again')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Cook Again'));

    expect(mockOnCookAgain).toHaveBeenCalledTimes(1);
  });

  it('Back to Library button in celebration view calls onComplete', async () => {
    render(
      <CookCompletion
        recipe={mockRecipe}
        onComplete={mockOnComplete}
        onCookAgain={mockOnCookAgain}
      />
    );

    fireEvent.click(screen.getByText('Save & Finish'));

    await waitFor(() => {
      expect(screen.getByText('Back to Library')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Back to Library'));

    expect(mockOnComplete).toHaveBeenCalledTimes(1);
  });

  it('shows correct cook count in celebration (previous + 1)', async () => {
    render(
      <CookCompletion
        recipe={mockRecipe}
        onComplete={mockOnComplete}
        onCookAgain={mockOnCookAgain}
      />
    );

    fireEvent.click(screen.getByText('Save & Finish'));

    await waitFor(() => {
      expect(screen.getByText('Great Job!')).toBeInTheDocument();
    });

    // mockRecipe has 2 entries in cook_history, so count should be 2 + 1 = 3
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Times Cooked')).toBeInTheDocument();
  });

  it('save button shows saving state while saving', async () => {
    // Make addCookHistoryEntry hang until we resolve it
    let resolvePromise: () => void;
    const pendingPromise = new Promise<void>((resolve) => {
      resolvePromise = resolve;
    });
    vi.mocked(addCookHistoryEntry).mockReturnValueOnce(pendingPromise);

    render(
      <CookCompletion
        recipe={mockRecipe}
        onComplete={mockOnComplete}
        onCookAgain={mockOnCookAgain}
      />
    );

    fireEvent.click(screen.getByText('Save & Finish'));

    // While saving, button text should change to "Saving..."
    await waitFor(() => {
      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });

    // The button should be disabled while saving
    const savingButton = screen.getByText('Saving...').closest('button');
    expect(savingButton).toBeDisabled();

    // Resolve the save
    resolvePromise!();

    // After save completes, celebration view should appear
    await waitFor(() => {
      expect(screen.getByText('Great Job!')).toBeInTheDocument();
    });
  });
});
