import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecipeScaler } from './RecipeScaler';
import type { Recipe } from '../../types';

const mockRecipe: Recipe = {
  id: 'r1',
  cookbook_id: 'cb1',
  name: 'Pancakes',
  description: '',
  total_time: '20 min',
  active_time: '20 min',
  yield: '4 servings',
  difficulty: { overall: 1, technique: 1, timing: 1, ingredients: 1, equipment: 1 },
  equipment: [],
  tags: [],
  source: { type: 'original' },
  ingredients: [
    { item: 'flour', amount: '2', unit: 'cups', prep: null, optional: false, substitutes: [] },
    { item: 'salt', amount: 'a pinch', unit: '', prep: null, optional: false, substitutes: [] },
  ],
  steps: [],
  notes: '',
  created_at: '2026-01-01T00:00:00Z',
  modified_at: '2026-01-01T00:00:00Z',
  cook_history: [],
};

function renderScaler(props: Partial<React.ComponentProps<typeof RecipeScaler>> = {}) {
  const onApply = vi.fn();
  const onCancel = vi.fn();
  render(<RecipeScaler recipe={mockRecipe} onApply={onApply} onCancel={onCancel} {...props} />);
  return { onApply, onCancel };
}

describe('RecipeScaler', () => {
  it('starts on the original scale when nothing is applied', () => {
    renderScaler();
    expect(screen.getByText('Original recipe')).toBeInTheDocument();
  });

  it('pre-selects the currently applied scale', () => {
    const { onApply } = renderScaler({ appliedYield: '8 servings' });
    expect(screen.getByText('Scaling up 2x')).toBeInTheDocument();
    expect(screen.getByText('Currently scaled to 8 servings')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Apply Scaling'));
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply.mock.calls[0][0].yield).toBe('8 servings');
    expect(onApply.mock.calls[0][0].ingredients[0].amount).toBe('4');
  });

  it('opens the custom field for an applied scale that is not a preset', () => {
    renderScaler({ appliedYield: '7 servings' });
    expect(screen.getByLabelText('Custom yield in servings')).toHaveValue(7);
    expect(screen.getByText('Scaling up 1.75x')).toBeInTheDocument();
  });

  it('leaves unparseable amounts unchanged in the preview', () => {
    renderScaler({ appliedYield: '8 servings' });
    expect(screen.queryByText(/^0\s*$/)).not.toBeInTheDocument();
    expect(screen.getByText('a pinch')).toBeInTheDocument();
  });

  it('rejects zero, negative, and empty custom values', () => {
    renderScaler();
    fireEvent.click(screen.getByText('Custom'));
    const input = screen.getByLabelText('Custom yield in servings');
    const apply = screen.getByRole('button', { name: 'Apply' });

    expect(apply).toBeDisabled();

    fireEvent.change(input, { target: { value: '0' } });
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a number greater than 0');
    expect(apply).toBeDisabled();

    fireEvent.change(input, { target: { value: '-3' } });
    expect(apply).toBeDisabled();
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('Original recipe')).toBeInTheDocument();
  });

  it('applies a valid custom value', () => {
    renderScaler();
    fireEvent.click(screen.getByText('Custom'));
    fireEvent.change(screen.getByLabelText('Custom yield in servings'), { target: { value: '6' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(screen.getByText('Scaling up 1.5x')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
