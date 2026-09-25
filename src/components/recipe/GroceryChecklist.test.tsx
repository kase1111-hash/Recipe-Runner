import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GroceryChecklist } from './GroceryChecklist';
import { copyToClipboard } from '../../services/export';
import type { Recipe } from '../../types';

vi.mock('howler', () => ({
  Howl: vi.fn(() => ({ play: vi.fn(), stop: vi.fn(), unload: vi.fn() })),
}));

vi.mock('../../services/export', () => ({
  copyToClipboard: vi.fn().mockResolvedValue(undefined),
}));

const mockRecipe: Recipe = {
  id: 'test-1',
  cookbook_id: 'cb-1',
  name: 'Test Pasta',
  description: 'A test recipe',
  total_time: '30 min',
  active_time: '15 min',
  yield: '4 servings',
  difficulty: { overall: 2, technique: 2, timing: 2, ingredients: 2, equipment: 2 },
  safe_temp: null,
  equipment: ['Large pot', 'Colander'],
  tags: ['pasta', 'italian'],
  source: { type: 'original' as const },
  ingredients: [
    { item: 'Spaghetti', amount: '1', unit: 'lb', prep: null, optional: false, substitutes: [] },
    { item: 'Olive oil', amount: '2', unit: 'tbsp', prep: null, optional: false, substitutes: ['vegetable oil', 'butter'] },
    { item: 'Garlic', amount: '3', unit: 'cloves', prep: 'minced', optional: false, substitutes: [] },
    { item: 'Parmesan', amount: '1/2', unit: 'cup', prep: 'grated', optional: true, substitutes: ['pecorino'] },
  ],
  steps: [],
  notes: '',
  created_at: new Date().toISOString(),
  modified_at: new Date().toISOString(),
  cook_history: [],
};

describe('GroceryChecklist', () => {
  const defaultProps = {
    recipe: mockRecipe,
    onComplete: vi.fn(),
    onBack: vi.fn(),
    onOpenChef: vi.fn(),
  };

  function renderChecklist(overrides = {}) {
    return render(<GroceryChecklist {...defaultProps} {...overrides} />);
  }

  it('renders all ingredient items', () => {
    renderChecklist();

    expect(screen.getByText('Spaghetti')).toBeInTheDocument();
    expect(screen.getByText('Olive oil')).toBeInTheDocument();
    expect(screen.getByText('Garlic')).toBeInTheDocument();
    expect(screen.getByText('Parmesan')).toBeInTheDocument();
  });

  it('shows progress bar starting at 0', () => {
    renderChecklist();

    // The ProgressBar renders "value / max" as a label — initially 0 / 3 (Parmesan is optional and doesn't count)
    expect(screen.getByText('0 / 3')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('checking an ingredient updates progress', () => {
    renderChecklist();

    // Use the same approach that works in other tests: find the "Don't have this"
    // button for Spaghetti (first ingredient), then locate the checkbox in the same row.
    const dontHaveButtons = screen.getAllByText("Don't have this");
    const spaghettiRow = dontHaveButtons[0].closest('div[style]')!;
    const spaghettiCheckbox = spaghettiRow.querySelector('button')!;

    fireEvent.click(spaghettiCheckbox);

    expect(screen.getByText('1 / 3')).toBeInTheDocument();
    expect(screen.getByText('33%')).toBeInTheDocument();
  });

  it('proceed button is disabled when not all ingredients are checked', () => {
    renderChecklist();

    // The proceed button shows "X items remaining" while required items are unchecked
    const proceedButton = screen.getByText('3 items remaining');
    expect(proceedButton).toBeDisabled();
  });

  it('checking all ingredients enables proceed button', () => {
    renderChecklist();

    // Check all 4 ingredients by clicking the "Don't have this" sibling buttons' parent's first button
    const dontHaveButtons = screen.getAllByText("Don't have this");

    // Each "Don't have this" button is in a row with a checkbox button.
    // We need to click the checkbox for each ingredient.
    dontHaveButtons.forEach((dontHaveBtn) => {
      const row = dontHaveBtn.closest('div[style]')!;
      const firstButton = row.querySelector('button')!;
      fireEvent.click(firstButton);
    });

    const proceedButton = screen.getByText('Start Cooking →');
    expect(proceedButton).not.toBeDisabled();
  });

  it('clicking proceed calls onComplete with all checked items', () => {
    const onComplete = vi.fn();
    renderChecklist({ onComplete });

    // Check all ingredients
    const dontHaveButtons = screen.getAllByText("Don't have this");
    dontHaveButtons.forEach((dontHaveBtn) => {
      const row = dontHaveBtn.closest('div[style]')!;
      const firstButton = row.querySelector('button')!;
      fireEvent.click(firstButton);
    });

    // Click the proceed button
    fireEvent.click(screen.getByText('Start Cooking →'));

    expect(onComplete).toHaveBeenCalledTimes(1);
    const checkedItems = onComplete.mock.calls[0][0];
    expect(checkedItems).toHaveLength(4);
    expect(checkedItems).toContain('Spaghetti');
    expect(checkedItems).toContain('Olive oil');
    expect(checkedItems).toContain('Garlic');
    expect(checkedItems).toContain('Parmesan');
  });

  it('back button calls onBack', () => {
    const onBack = vi.fn();
    renderChecklist({ onBack });

    fireEvent.click(screen.getByText('← Back'));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('equipment list is displayed', () => {
    renderChecklist();

    expect(screen.getByText('Equipment Needed')).toBeInTheDocument();
    expect(screen.getByText('Large pot')).toBeInTheDocument();
    expect(screen.getByText('Colander')).toBeInTheDocument();
  });

  it('shows substitutes for unchecked ingredients that have them', () => {
    renderChecklist();

    // Olive oil has substitutes ['vegetable oil', 'butter']
    expect(screen.getByText(/Can substitute: vegetable oil or butter/)).toBeInTheDocument();

    // Parmesan has substitutes ['pecorino']
    expect(screen.getByText(/Can substitute: pecorino/)).toBeInTheDocument();

    // Spaghetti has no substitutes — make sure no substitute hint appears for it
    // Garlic has no substitutes either
    const allSubstituteHints = screen.getAllByText(/Can substitute:/);
    expect(allSubstituteHints).toHaveLength(2);
  });

  it('missing ingredient button calls onOpenChef with the ingredient', () => {
    const onOpenChef = vi.fn();
    renderChecklist({ onOpenChef });

    // Find the "Don't have this" buttons — one per ingredient
    const dontHaveButtons = screen.getAllByText("Don't have this");
    expect(dontHaveButtons).toHaveLength(4);

    // Click the "Don't have this" button for the first ingredient (Spaghetti)
    fireEvent.click(dontHaveButtons[0]);

    expect(onOpenChef).toHaveBeenCalledTimes(1);
    expect(onOpenChef).toHaveBeenCalledWith(mockRecipe.ingredients[0]);
  });

  it('missing ingredient button unchecks the ingredient when clicked', () => {
    renderChecklist();

    // First, check the Spaghetti ingredient
    const dontHaveButtons = screen.getAllByText("Don't have this");
    const spaghettiRow = dontHaveButtons[0].closest('div[style]')!;
    const spaghettiCheckbox = spaghettiRow.querySelector('button')!;

    fireEvent.click(spaghettiCheckbox);

    // Verify it was checked — progress should show 1/3
    expect(screen.getByText('1 / 3')).toBeInTheDocument();

    // Now click "Don't have this" for Spaghetti — should uncheck it
    fireEvent.click(dontHaveButtons[0]);

    // Progress should go back to 0/3
    expect(screen.getByText('0 / 3')).toBeInTheDocument();
  });

  it('does not show equipment section when recipe has no equipment', () => {
    const recipeWithoutEquipment = { ...mockRecipe, equipment: [] };
    renderChecklist({ recipe: recipeWithoutEquipment });

    expect(screen.queryByText('Equipment Needed')).not.toBeInTheDocument();
  });

  it('hides substitute hint once the ingredient is checked', () => {
    renderChecklist();

    // Olive oil has substitutes — verify hint is initially shown
    expect(screen.getByText(/Can substitute: vegetable oil or butter/)).toBeInTheDocument();

    // Check the Olive oil ingredient
    const dontHaveButtons = screen.getAllByText("Don't have this");
    // Olive oil is the second ingredient (index 1)
    const oliveOilRow = dontHaveButtons[1].closest('div[style]')!;
    const oliveOilCheckbox = oliveOilRow.querySelector('button')!;

    fireEvent.click(oliveOilCheckbox);

    // The substitute hint for olive oil should be hidden now
    expect(screen.queryByText(/Can substitute: vegetable oil or butter/)).not.toBeInTheDocument();
  });

  describe('optional ingredients', () => {
    it('do not block cooking', () => {
      const onComplete = vi.fn();
      renderChecklist({ onComplete });

      // Check the three required ingredients; leave optional Parmesan unchecked
      fireEvent.click(screen.getByRole('checkbox', { name: /Spaghetti/ }));
      fireEvent.click(screen.getByRole('checkbox', { name: /Olive oil/ }));
      fireEvent.click(screen.getByRole('checkbox', { name: /Garlic/ }));

      expect(screen.getByText('3 / 3')).toBeInTheDocument();
      expect(screen.queryByText(/Check off all/)).not.toBeInTheDocument();
      const proceed = screen.getByText('Start Cooking →');
      expect(proceed).not.toBeDisabled();

      fireEvent.click(proceed);
      expect(onComplete).toHaveBeenCalledWith(['Spaghetti', 'Olive oil', 'Garlic']);
    });

    it('"Don\'t have this" on an optional ingredient still lets you cook', () => {
      renderChecklist();

      fireEvent.click(screen.getByRole('checkbox', { name: /Spaghetti/ }));
      fireEvent.click(screen.getByRole('checkbox', { name: /Olive oil/ }));
      fireEvent.click(screen.getByRole('checkbox', { name: /Garlic/ }));
      fireEvent.click(screen.getByRole('checkbox', { name: /Parmesan/ }));
      // Parmesan is the 4th row
      fireEvent.click(screen.getAllByText("Don't have this")[3]);

      expect(screen.getByRole('checkbox', { name: /Parmesan/ })).toHaveAttribute('aria-checked', 'false');
      expect(screen.getByText('Start Cooking →')).not.toBeDisabled();
    });

    it('counts only required items in the remaining text', () => {
      renderChecklist();

      fireEvent.click(screen.getByRole('checkbox', { name: /Parmesan/ }));
      // Checking the optional one doesn't change what's required
      expect(screen.getByText('3 items remaining')).toBeDisabled();
      expect(screen.getByText(/Check off all required ingredients/)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('checkbox', { name: /Spaghetti/ }));
      fireEvent.click(screen.getByRole('checkbox', { name: /Olive oil/ }));
      expect(screen.getByText('1 item remaining')).toBeDisabled();
    });
  });

  describe('accessibility', () => {
    it('ingredient check buttons are labeled checkboxes', () => {
      renderChecklist();

      const boxes = screen.getAllByRole('checkbox');
      expect(boxes).toHaveLength(4);

      const spaghetti = screen.getByRole('checkbox', { name: '1 lb Spaghetti' });
      expect(spaghetti).toHaveAttribute('aria-checked', 'false');
      // The E2E flow selects these by their inline width
      expect(spaghetti.style.width).toBe('1.5rem');

      fireEvent.click(spaghetti);
      expect(spaghetti).toHaveAttribute('aria-checked', 'true');

      expect(screen.getByRole('checkbox', { name: '1/2 cup Parmesan (optional)' })).toBeInTheDocument();
    });
  });

  describe('initialChecked', () => {
    it('seeds checked state from ingredient names', () => {
      renderChecklist({ initialChecked: ['Spaghetti', 'Garlic'] });

      expect(screen.getByRole('checkbox', { name: /Spaghetti/ })).toHaveAttribute('aria-checked', 'true');
      expect(screen.getByRole('checkbox', { name: /Garlic/ })).toHaveAttribute('aria-checked', 'true');
      expect(screen.getByRole('checkbox', { name: /Olive oil/ })).toHaveAttribute('aria-checked', 'false');
      expect(screen.getByText('2 / 3')).toBeInTheDocument();
    });

    it('round-trips the array passed to onComplete, including duplicate names', () => {
      const recipe: Recipe = {
        ...mockRecipe,
        ingredients: [
          { item: 'Butter', amount: '1', unit: 'stick', prep: null, optional: false, substitutes: [] },
          { item: 'Flour', amount: '2', unit: 'cups', prep: null, optional: false, substitutes: [] },
          { item: 'Butter', amount: '2', unit: 'tbsp', prep: null, optional: false, substitutes: [] },
        ],
      };
      const onComplete = vi.fn();
      const first = render(
        <GroceryChecklist {...defaultProps} recipe={recipe} onComplete={onComplete} />
      );
      screen.getAllByRole('checkbox').forEach((box) => fireEvent.click(box));
      fireEvent.click(screen.getByText('Start Cooking →'));
      const emitted = onComplete.mock.calls[0][0];
      expect(emitted).toEqual(['Butter', 'Flour', 'Butter']);
      first.unmount();

      renderChecklist({ recipe, initialChecked: emitted });
      screen.getAllByRole('checkbox').forEach((box) => {
        expect(box).toHaveAttribute('aria-checked', 'true');
      });
      expect(screen.getByText('Start Cooking →')).not.toBeDisabled();
    });

    it('ignores names that are no longer in the recipe', () => {
      renderChecklist({ initialChecked: ['Anchovies', 'Spaghetti'] });

      expect(screen.getByText('1 / 3')).toBeInTheDocument();
    });
  });

  describe('export list', () => {
    it('copies a list grouped with word-boundary categories', async () => {
      const recipe: Recipe = {
        ...mockRecipe,
        ingredients: [
          { item: 'black pepper', amount: '1', unit: 'tsp', prep: 'freshly ground', optional: false, substitutes: [] },
          { item: 'ground cumin', amount: '1', unit: 'tsp', prep: null, optional: false, substitutes: [] },
          { item: 'eggplant', amount: '1', unit: '', prep: 'cubed', optional: false, substitutes: [] },
          { item: 'butternut squash', amount: '1', unit: '', prep: null, optional: false, substitutes: [] },
          { item: 'eggs', amount: '2', unit: '', prep: null, optional: false, substitutes: [] },
        ],
      };
      renderChecklist({ recipe });

      fireEvent.click(screen.getByText('Export List'));

      await waitFor(() => expect(screen.getByText('Copied!')).toBeInTheDocument());
      const text = vi.mocked(copyToClipboard).mock.calls[0][0];
      expect(text).toContain('PRODUCE\n[ ] 1 eggplant, cubed\n[ ] 1 butternut squash\n');
      expect(text).toContain('DAIRY\n[ ] 2 eggs\n');
      expect(text).toContain('SPICES\n[ ] 1 tsp black pepper, freshly ground\n[ ] 1 tsp ground cumin');
      expect(text).not.toContain('PROTEINS');
    });

    it('shows an error when copying is rejected', async () => {
      vi.mocked(copyToClipboard).mockRejectedValueOnce(new Error('denied'));
      renderChecklist();

      fireEvent.click(screen.getByText('Export List'));

      expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't copy to the clipboard");
      expect(screen.getByText('Copy failed')).toBeInTheDocument();
    });

    it('shows an error when the Clipboard API is missing entirely', async () => {
      // On plain-http origins navigator.clipboard is undefined, so the call
      // throws synchronously instead of rejecting
      vi.mocked(copyToClipboard).mockImplementationOnce(() => {
        throw new TypeError("Cannot read properties of undefined (reading 'writeText')");
      });
      renderChecklist();

      fireEvent.click(screen.getByText('Export List'));

      expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't copy to the clipboard");
    });
  });
});
