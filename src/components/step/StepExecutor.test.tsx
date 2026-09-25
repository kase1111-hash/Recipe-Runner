import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { StepExecutor } from './StepExecutor';
import { saveCookingSession } from '../../db';
import type { Recipe } from '../../types';

const sound = vi.hoisted(() => ({ play: vi.fn(), stop: vi.fn(), unload: vi.fn() }));

vi.mock('howler', () => ({
  Howl: vi.fn(() => sound),
}));

vi.mock('../../db', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../db')>()),
  saveCookingSession: vi.fn().mockResolvedValue('session'),
  deleteCookingSession: vi.fn().mockResolvedValue(undefined),
}));

const mockRecipe: Recipe = {
  id: 'test-1',
  cookbook_id: 'cb-1',
  name: 'Test Chicken',
  description: 'A test recipe',
  total_time: '45 min',
  active_time: '20 min',
  yield: '4 servings',
  difficulty: { overall: 3, technique: 3, timing: 3, ingredients: 3, equipment: 3 },
  safe_temp: { value: 165, unit: '°F' as const, location: 'thickest part' },
  equipment: [],
  tags: [],
  source: { type: 'original' as const },
  ingredients: [
    { item: 'Chicken', amount: '2', unit: 'lbs', prep: null, optional: false, substitutes: [] },
  ],
  steps: [
    {
      index: 0,
      title: 'Prep the chicken',
      instruction: 'Season the chicken with salt and pepper.',
      time_minutes: 5,
      time_display: '5 min',
      type: 'active' as const,
      tip: 'Pat chicken dry first for better seasoning.',
      visual_prompt: '',
      temperature: null,
      timer_default: null,
    },
    {
      index: 1,
      title: 'Sear the chicken',
      instruction: 'Heat oil in a pan and sear chicken.',
      time_minutes: 10,
      time_display: '10 min',
      type: 'active' as const,
      tip: null,
      visual_prompt: '',
      temperature: { value: 375, unit: '°F' as const, target: 'oil' },
      timer_default: 600,
    },
    {
      index: 2,
      title: 'Rest the chicken',
      instruction: 'Let the chicken rest before slicing.',
      time_minutes: 10,
      time_display: '10 min',
      type: 'passive' as const,
      tip: 'Tent with foil.',
      visual_prompt: '',
      temperature: null,
      timer_default: 600,
    },
  ],
  notes: '',
  created_at: new Date().toISOString(),
  modified_at: new Date().toISOString(),
  cook_history: [],
};

const defaultProps = {
  recipe: mockRecipe,
  checkedIngredients: ['Chicken'],
  onComplete: vi.fn(),
  onOpenChef: vi.fn(),
  onBack: vi.fn(),
};

describe('StepExecutor', () => {
  it('renders first step with title and instruction', () => {
    render(<StepExecutor {...defaultProps} />);

    expect(screen.getByText('Prep the chicken')).toBeInTheDocument();
    expect(screen.getByText('Season the chicken with salt and pepper.')).toBeInTheDocument();
  });

  it('shows step counter "Step 1 of 3"', () => {
    render(<StepExecutor {...defaultProps} />);

    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
  });

  it('next button advances to step 2', () => {
    render(<StepExecutor {...defaultProps} />);

    fireEvent.click(screen.getByText('Next →'));

    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
    expect(screen.getByText('Sear the chicken')).toBeInTheDocument();
    expect(screen.getByText('Heat oil in a pan and sear chicken.')).toBeInTheDocument();
  });

  it('previous button goes back to step 1', () => {
    render(<StepExecutor {...defaultProps} />);

    // Go to step 2
    fireEvent.click(screen.getByText('Next →'));
    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();

    // Go back to step 1
    fireEvent.click(screen.getByText('← Previous'));
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
    expect(screen.getByText('Prep the chicken')).toBeInTheDocument();
  });

  it('previous button is disabled on first step', () => {
    render(<StepExecutor {...defaultProps} />);

    const previousButton = screen.getByText('← Previous');
    expect(previousButton).toBeDisabled();
  });

  it('on last step, button text is "Done"', () => {
    render(<StepExecutor {...defaultProps} />);

    // Navigate to the last step
    fireEvent.click(screen.getByText('Next →'));
    fireEvent.click(screen.getByText('Next →'));

    expect(screen.getByText('Step 3 of 3')).toBeInTheDocument();
    expect(screen.getByText('✓ Done')).toBeInTheDocument();
  });

  it('clicking Done on last step calls onComplete', () => {
    const onComplete = vi.fn();
    render(<StepExecutor {...defaultProps} onComplete={onComplete} />);

    // Navigate to the last step
    fireEvent.click(screen.getByText('Next →'));
    fireEvent.click(screen.getByText('Next →'));

    // Click Done
    fireEvent.click(screen.getByText('✓ Done'));

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('timer renders when step has timer_default', () => {
    render(<StepExecutor {...defaultProps} />);

    // Step 1 has no timer_default, navigate to step 2 which does
    fireEvent.click(screen.getByText('Next →'));

    // The Timer component renders with "Timer" label and a "Start" button
    expect(screen.getByText('Timer')).toBeInTheDocument();
  });

  it('timer does not render when step has no timer_default', () => {
    render(<StepExecutor {...defaultProps} />);

    // Step 1 has no timer_default
    // The Timer component would show "▶ Start" button if present
    expect(screen.queryByText('▶ Start')).not.toBeInTheDocument();
  });

  it('temperature is displayed when step has temperature', () => {
    render(<StepExecutor {...defaultProps} />);

    // Navigate to step 2 which has temperature
    fireEvent.click(screen.getByText('Next →'));

    expect(screen.getByText('375°F')).toBeInTheDocument();
    expect(screen.getByText('oil')).toBeInTheDocument();
  });

  it('tip is displayed when step has tip', () => {
    render(<StepExecutor {...defaultProps} />);

    // Step 1 has a tip
    expect(screen.getByText('Pat chicken dry first for better seasoning.')).toBeInTheDocument();
  });

  it('chef help button calls onOpenChef with current step index', () => {
    const onOpenChef = vi.fn();
    render(<StepExecutor {...defaultProps} onOpenChef={onOpenChef} />);

    fireEvent.click(screen.getByText('👨‍🍳 Help'));

    expect(onOpenChef).toHaveBeenCalledTimes(1);
    expect(onOpenChef).toHaveBeenCalledWith(0);

    // Navigate to step 2 and click again
    fireEvent.click(screen.getByText('Next →'));
    fireEvent.click(screen.getByText('👨‍🍳 Help'));

    expect(onOpenChef).toHaveBeenCalledTimes(2);
    expect(onOpenChef).toHaveBeenCalledWith(1);
  });

  it('safe temperature is shown on last step', () => {
    render(<StepExecutor {...defaultProps} />);

    // Safe temp should not appear on step 1
    expect(screen.queryByText(/Safe Internal Temperature/)).not.toBeInTheDocument();

    // Navigate to the last step
    fireEvent.click(screen.getByText('Next →'));
    fireEvent.click(screen.getByText('Next →'));

    expect(screen.getByText('Safe Internal Temperature: 165°F')).toBeInTheDocument();
    expect(screen.getByText('Measure at: thickest part')).toBeInTheDocument();
  });

  it('empty steps array shows guard message', () => {
    const emptyRecipe: Recipe = {
      ...mockRecipe,
      steps: [],
    };

    render(<StepExecutor {...defaultProps} recipe={emptyRecipe} />);

    expect(screen.getByText('No steps available for this recipe.')).toBeInTheDocument();
  });

  it('shows step type badge for active step', () => {
    render(<StepExecutor {...defaultProps} />);

    // Step 1 is active type
    expect(screen.getByText('🙌 Active')).toBeInTheDocument();
  });

  it('shows step type badge for passive step', () => {
    render(<StepExecutor {...defaultProps} />);

    // Navigate to step 3 which is passive
    fireEvent.click(screen.getByText('Next →'));
    fireEvent.click(screen.getByText('Next →'));

    expect(screen.getByText('⏳ Passive')).toBeInTheDocument();
  });

  describe('initial step and session saving', () => {
    it('clamps a resumed step index past the end to the last step', () => {
      // e.g. a session saved before the recipe was edited down to 3 steps
      render(<StepExecutor {...defaultProps} initialStepIndex={7} />);

      expect(screen.getByText('Step 3 of 3')).toBeInTheDocument();
      expect(screen.getByText('Rest the chicken')).toBeInTheDocument();
      expect(screen.queryByText('No steps available for this recipe.')).not.toBeInTheDocument();
    });

    it('clamps a negative step index to the first step', () => {
      render(<StepExecutor {...defaultProps} initialStepIndex={-2} />);

      expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
    });

    it('saves the session with the clamped index', () => {
      render(<StepExecutor {...defaultProps} initialStepIndex={7} />);

      expect(saveCookingSession).toHaveBeenCalledWith(
        expect.objectContaining({ recipeId: 'test-1', currentStepIndex: 2 })
      );
    });

    it('does not save a cooking session for a recipe with no steps', () => {
      render(<StepExecutor {...defaultProps} recipe={{ ...mockRecipe, steps: [] }} />);

      expect(screen.getByText('No steps available for this recipe.')).toBeInTheDocument();
      expect(saveCookingSession).not.toHaveBeenCalled();
    });
  });

  describe('timers across step navigation', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    function advance(ms: number) {
      act(() => {
        vi.advanceTimersByTime(ms);
      });
    }

    // Step 2 ("Sear the chicken") has a 10-minute timer
    function startSearTimer() {
      fireEvent.click(screen.getByText('Next →'));
      fireEvent.click(screen.getByText('▶ Start'));
    }

    it('keeps a running timer going in compact form after moving to the next step', () => {
      render(<StepExecutor {...defaultProps} />);
      startSearTimer();
      advance(60_000);
      expect(screen.getByText('09:00')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Next →'));
      expect(screen.getByText('Step 3 of 3')).toBeInTheDocument();

      // Step 2's timer is still there, labeled, and still counting
      expect(screen.getByText('Step 2 · Sear the chicken')).toBeInTheDocument();
      advance(1000);
      expect(screen.getByText('08:59')).toBeInTheDocument();

      // Step 3's own timer is shown at full size, untouched
      expect(screen.getByText('10:00')).toBeInTheDocument();
      expect(screen.getByText('▶ Start')).toBeInTheDocument();
    });

    it('a background timer still rings and can be silenced and cleared from the compact view', () => {
      render(<StepExecutor {...defaultProps} />);
      startSearTimer();
      fireEvent.click(screen.getByText('Next →'));

      advance(600_000);
      expect(sound.play).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByRole('button', { name: 'Stop alarm' }));
      expect(sound.stop).toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: 'Reset timer' }));
      expect(screen.queryByText('Step 2 · Sear the chicken')).not.toBeInTheDocument();
    });

    it('going back shows the same running timer at full size', () => {
      render(<StepExecutor {...defaultProps} />);
      startSearTimer();
      advance(30_000);

      fireEvent.click(screen.getByText('Next →'));
      advance(30_000);
      fireEvent.click(screen.getByText('← Previous'));

      expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
      expect(screen.getByText('09:00')).toBeInTheDocument();
      expect(screen.getByText('⏸ Pause')).toBeInTheDocument();
      // Back at full size, so it's no longer listed as another step's timer
      expect(screen.queryByText('Step 2 · Sear the chicken')).not.toBeInTheDocument();
    });

    it('keeps a background timer on steps that have no timer of their own', () => {
      render(<StepExecutor {...defaultProps} />);
      startSearTimer();

      fireEvent.click(screen.getByText('← Previous'));
      expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
      expect(screen.getByText('Step 2 · Sear the chicken')).toBeInTheDocument();
      expect(screen.queryByText('▶ Start')).not.toBeInTheDocument();
    });

    it('keeps paused timers but drops idle ones', () => {
      render(<StepExecutor {...defaultProps} />);

      // Visit step 2 without starting its timer
      fireEvent.click(screen.getByText('Next →'));
      fireEvent.click(screen.getByText('Next →'));
      expect(screen.queryByText('Step 2 · Sear the chicken')).not.toBeInTheDocument();

      // Start and pause step 3's timer, then move away
      fireEvent.click(screen.getByText('▶ Start'));
      advance(5000);
      fireEvent.click(screen.getByText('⏸ Pause'));
      fireEvent.click(screen.getByText('← Previous'));

      expect(screen.getByText('Step 3 · Rest the chicken')).toBeInTheDocument();
      expect(screen.getByText('09:55')).toBeInTheDocument();
    });
  });
});
