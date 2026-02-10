import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MiseEnPlace } from './MiseEnPlace';
import type { Recipe } from '../../types';

vi.mock('../../services/substitutions', () => ({
  findSubstitutions: vi.fn().mockReturnValue({
    ingredient: 'Butter',
    substitutions: [
      { name: 'Margarine', ratio: '1:1', notes: 'Equal amounts', quality: 'good' as const, dietaryTags: [] },
    ],
    category: 'dairy',
  }),
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
  ingredients: [
    { item: 'Chicken breast', amount: '2', unit: 'lbs', prep: 'diced', optional: false, substitutes: [] },
    { item: 'Butter', amount: '2', unit: 'tbsp', prep: null, optional: false, substitutes: ['margarine'] },
    { item: 'Salt', amount: '1', unit: 'tsp', prep: null, optional: false, substitutes: [] },
    { item: 'Onion', amount: '1', unit: 'large', prep: 'chopped', optional: false, substitutes: [] },
  ],
  steps: [],
  notes: '',
  created_at: new Date().toISOString(),
  modified_at: new Date().toISOString(),
  cook_history: [],
};

describe('MiseEnPlace', () => {
  const defaultProps = {
    recipe: mockRecipe,
    onComplete: vi.fn(),
    onBack: vi.fn(),
  };

  function renderComponent(overrides: Partial<typeof defaultProps> = {}) {
    const props = {
      ...defaultProps,
      onComplete: vi.fn(),
      onBack: vi.fn(),
      ...overrides,
    };
    return { ...render(<MiseEnPlace {...props} />), props };
  }

  it('renders all ingredients', () => {
    renderComponent();

    expect(screen.getByText('Chicken breast')).toBeInTheDocument();
    expect(screen.getByText('Butter')).toBeInTheDocument();
    expect(screen.getByText('Salt')).toBeInTheDocument();
    expect(screen.getByText('Onion')).toBeInTheDocument();
  });

  it('items without prep start with prepped=true (only need gathering)', () => {
    renderComponent();

    // Butter and Salt have no prep instruction, so they should NOT show a prepped checkbox.
    // Items without prep are automatically prepped, meaning they only need a gathered checkbox.
    // The prepped checkbox button (title="Prepped") is only rendered when item.prep is truthy.
    const preppedButtons = screen.getAllByTitle('Prepped');
    // Only Chicken breast and Onion have prep, so only 2 prepped buttons should exist.
    expect(preppedButtons).toHaveLength(2);
  });

  it('items with prep start with prepped=false (need both gathering and prepping)', () => {
    renderComponent();

    // Chicken breast has prep='diced', Onion has prep='chopped'
    // These should show prep instructions in the UI
    expect(screen.getByText('Prep: diced')).toBeInTheDocument();
    expect(screen.getByText('Prep: chopped')).toBeInTheDocument();

    // The prepped buttons for items with prep should show the knife icon (not toggled)
    const preppedButtons = screen.getAllByTitle('Prepped');
    preppedButtons.forEach((btn) => {
      // Not yet prepped, so the button does not display the check mark
      expect(btn.textContent).not.toBe('\u2713');
    });
  });

  it('clicking gathered checkbox toggles it', () => {
    renderComponent();

    const gatheredButtons = screen.getAllByTitle('Gathered');
    expect(gatheredButtons).toHaveLength(4); // one per ingredient

    // Initially not gathered (shows inbox icon)
    const firstGathered = gatheredButtons[0];
    expect(firstGathered.textContent).toContain('\uD83D\uDCE5'); // inbox icon

    // Click to toggle gathered on
    fireEvent.click(firstGathered);
    expect(firstGathered.textContent).toContain('\u2713'); // check mark

    // Click again to toggle gathered off
    fireEvent.click(firstGathered);
    expect(firstGathered.textContent).toContain('\uD83D\uDCE5'); // back to inbox icon
  });

  it('clicking prepped checkbox toggles it (only for items with prep)', () => {
    renderComponent();

    const preppedButtons = screen.getAllByTitle('Prepped');
    expect(preppedButtons).toHaveLength(2); // only Chicken breast and Onion

    const firstPrepped = preppedButtons[0];

    // Initially not prepped (shows knife icon)
    expect(firstPrepped.textContent).not.toBe('\u2713');

    // Click to toggle prepped on
    fireEvent.click(firstPrepped);
    expect(firstPrepped.textContent).toContain('\u2713');

    // Click again to toggle prepped off
    fireEvent.click(firstPrepped);
    expect(firstPrepped.textContent).not.toBe('\u2713');
  });

  it('progress updates when items are toggled', () => {
    renderComponent();

    // Initial progress: items without prep (Butter, Salt) start prepped = 2 completed out of 8 total
    // Progress = (2/8) * 100 = 25%
    expect(screen.getByText('25%')).toBeInTheDocument();

    // Toggle gathered on the first item (Chicken breast)
    const gatheredButtons = screen.getAllByTitle('Gathered');
    fireEvent.click(gatheredButtons[0]);

    // Now 3 completed out of 8 = 37.5%, rounded to 38%
    expect(screen.getByText('38%')).toBeInTheDocument();
  });

  it('complete button is disabled when not all items are ready', () => {
    renderComponent();

    // When not all items are ready, the component shows "Skip to Cooking" (secondary variant)
    const skipButton = screen.getByText('Skip to Cooking');
    expect(skipButton).toBeInTheDocument();

    // The "Start Cooking!" button should not be present when items are incomplete
    expect(screen.queryByText(/Start Cooking/)).not.toBeInTheDocument();
  });

  it('all items ready enables complete button', () => {
    renderComponent();

    // Gather all items
    const gatheredButtons = screen.getAllByTitle('Gathered');
    gatheredButtons.forEach((btn) => fireEvent.click(btn));

    // Prep items that need prepping (Chicken breast and Onion)
    const preppedButtons = screen.getAllByTitle('Prepped');
    preppedButtons.forEach((btn) => fireEvent.click(btn));

    // Now the "Start Cooking!" button should appear
    expect(screen.getByText(/Start Cooking/)).toBeInTheDocument();
    // "Skip to Cooking" should no longer be shown
    expect(screen.queryByText('Skip to Cooking')).not.toBeInTheDocument();
  });

  it('clicking complete calls onComplete', () => {
    const onComplete = vi.fn();
    renderComponent({ onComplete });

    // Make all items ready
    const gatheredButtons = screen.getAllByTitle('Gathered');
    gatheredButtons.forEach((btn) => fireEvent.click(btn));
    const preppedButtons = screen.getAllByTitle('Prepped');
    preppedButtons.forEach((btn) => fireEvent.click(btn));

    // Click "Start Cooking!"
    fireEvent.click(screen.getByText(/Start Cooking/));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('back button calls onBack', () => {
    const onBack = vi.fn();
    renderComponent({ onBack });

    const backButton = screen.getByText(/Back/);
    fireEvent.click(backButton);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('items are categorized correctly (proteins, produce, dairy, spices)', () => {
    renderComponent();

    // Chicken breast -> proteins
    expect(screen.getByText('Proteins')).toBeInTheDocument();

    // Onion -> produce
    expect(screen.getByText('Produce')).toBeInTheDocument();

    // Butter -> dairy
    expect(screen.getByText('Dairy')).toBeInTheDocument();

    // Salt -> spices
    expect(screen.getByText('Spices & Seasonings')).toBeInTheDocument();

    // No items should land in "Pantry" or "Other" for this recipe
    expect(screen.queryByText('Pantry')).not.toBeInTheDocument();
    expect(screen.queryByText('Other')).not.toBeInTheDocument();
  });
});
