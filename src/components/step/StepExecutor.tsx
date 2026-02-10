import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, Button, Timer, ProgressBar } from '../common';
import { saveCookingSession, deleteCookingSession } from '../../db';
import type { Recipe } from '../../types';

interface StepExecutorProps {
  recipe: Recipe;
  checkedIngredients: string[];
  onComplete: () => void;
  onOpenChef: (stepIndex?: number) => void;
  onBack: () => void;
  initialStepIndex?: number;
}

export function StepExecutor({
  recipe,
  checkedIngredients,
  onComplete,
  onOpenChef,
  onBack,
  initialStepIndex = 0,
}: StepExecutorProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(initialStepIndex);

  const currentStep = recipe.steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === recipe.steps.length - 1;

  // Save cooking session on every step change
  useEffect(() => {
    saveCookingSession({
      recipeId: recipe.id,
      cookbookId: recipe.cookbook_id,
      currentStepIndex,
      checkedIngredients,
      activeTimers: [],
      startedAt: new Date().toISOString(),
      notes: '',
    }).catch(() => {
      // Session save is best-effort
    });
  }, [currentStepIndex, recipe.id, recipe.cookbook_id, checkedIngredients]);

  // Swipe navigation for mobile
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;
    // Only trigger swipe if horizontal movement > 60px and > vertical movement
    if (Math.abs(deltaX) < 60 || Math.abs(deltaX) < Math.abs(deltaY)) return;
    if (deltaX < 0 && !isLastStep) {
      setCurrentStepIndex((prev) => prev + 1);
    } else if (deltaX > 0 && !isFirstStep) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  }, [isFirstStep, isLastStep]);

  // Guard against empty steps array
  if (!currentStep) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>No steps available for this recipe.</p>
        <Button onClick={onBack}>← Go Back</Button>
      </div>
    );
  }

  function goToNextStep() {
    if (isLastStep) {
      deleteCookingSession(recipe.id).catch(() => {});
      onComplete();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  }

  function goToPreviousStep() {
    if (!isFirstStep) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-secondary)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <header
        style={{
          background: 'var(--card-bg)',
          borderBottom: '1px solid var(--border-primary)',
          padding: '1rem 2rem',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            maxWidth: '1000px',
            margin: '0 auto',
          }}
        >
          <Button variant="ghost" onClick={onBack}>
            ← Exit
          </Button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
              Step {currentStepIndex + 1} of {recipe.steps.length}
            </div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{recipe.name}</div>
          </div>
          <Button variant="ghost" onClick={() => onOpenChef(currentStepIndex)}>
            👨‍🍳 Help
          </Button>
        </div>
        <div style={{ maxWidth: '1000px', margin: '0.75rem auto 0' }}>
          <ProgressBar
            value={currentStepIndex + 1}
            max={recipe.steps.length}
            showLabel={false}
          />
        </div>
      </header>

      {/* Main Content */}
      <main
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          flex: 1,
          padding: '2rem',
          maxWidth: '800px',
          margin: '0 auto',
          width: '100%',
          touchAction: 'pan-y',
        }}
      >
        {/* Step Title */}
        <Card style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: '0 0 0.5rem',
              textTransform: 'uppercase',
              letterSpacing: '0.025em',
            }}
          >
            {currentStep.title}
          </h1>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '1rem',
              fontSize: '0.875rem',
              color: 'var(--text-tertiary)',
            }}
          >
            <span>⏱ {currentStep.time_display}</span>
            <span>•</span>
            <span
              style={{
                color: currentStep.type === 'active' ? 'var(--accent-primary)' : 'var(--text-tertiary)',
                fontWeight: 500,
              }}
            >
              {currentStep.type === 'active' ? '🙌 Active' : '⏳ Passive'}
            </span>
          </div>
        </Card>

        {/* Instruction */}
        <Card style={{ marginBottom: '1.5rem' }}>
          <p
            style={{
              fontSize: '1.125rem',
              lineHeight: 1.7,
              color: 'var(--text-secondary)',
              margin: 0,
            }}
          >
            {currentStep.instruction}
          </p>
        </Card>

        {/* Tip */}
        {currentStep.tip && (
          <Card
            style={{
              marginBottom: '1.5rem',
              background: 'var(--warning-bg)',
              border: '1px solid var(--warning-border)',
            }}
          >
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.25rem' }}>💡</span>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.875rem',
                  color: 'var(--warning-text)',
                  lineHeight: 1.5,
                }}
              >
                {currentStep.tip}
              </p>
            </div>
          </Card>
        )}

        {/* Timer */}
        {currentStep.timer_default && (
          <div style={{ marginBottom: '1.5rem' }}>
            <Timer
              defaultSeconds={currentStep.timer_default}
              onComplete={() => {
                // Timer complete notification handled in Timer component
              }}
            />
          </div>
        )}

        {/* Temperature */}
        {currentStep.temperature && (
          <Card
            style={{
              marginBottom: '1.5rem',
              background: 'var(--error-bg)',
              border: '1px solid var(--error-border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.5rem' }}>🌡️</span>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--error)' }}>
                  {currentStep.temperature.value}{currentStep.temperature.unit}
                </div>
                {currentStep.temperature.target && (
                  <div style={{ fontSize: '0.875rem', color: 'var(--error-text)' }}>
                    {currentStep.temperature.target}
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Safe Temperature (on last step) */}
        {isLastStep && recipe.safe_temp && (
          <Card
            style={{
              marginBottom: '1.5rem',
              background: 'var(--success-bg)',
              border: '1px solid var(--success-border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.5rem' }}>✅</span>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--success-text)' }}>
                  Safe Internal Temperature: {recipe.safe_temp.value}{recipe.safe_temp.unit}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--success)' }}>
                  Measure at: {recipe.safe_temp.location}
                </div>
              </div>
            </div>
          </Card>
        )}
      </main>

      {/* Navigation Footer */}
      <footer
        style={{
          background: 'var(--card-bg)',
          borderTop: '1px solid var(--border-primary)',
          padding: '1rem 2rem',
          position: 'sticky',
          bottom: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            maxWidth: '800px',
            margin: '0 auto',
          }}
        >
          <Button
            variant="secondary"
            onClick={goToPreviousStep}
            disabled={isFirstStep}
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            ← Previous
          </Button>

          <Button onClick={goToNextStep} size="lg" style={{ minHeight: '44px' }}>
            {isLastStep ? '✓ Done' : 'Next →'}
          </Button>
        </div>
      </footer>

    </div>
  );
}
