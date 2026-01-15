import { useState, useEffect } from 'react';
import { Card, Button, Timer, ProgressBar } from '../common';
import { generateStepVisual } from '../../services/visualGeneration';
import type { Recipe, VisualGenerationResult } from '../../types';

interface StepExecutorProps {
  recipe: Recipe;
  checkedIngredients: string[];
  onComplete: () => void;
  onOpenChef: () => void;
  onBack: () => void;
}

export function StepExecutor({
  recipe,
  onComplete,
  onOpenChef,
  onBack,
}: StepExecutorProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepVisual, setStepVisual] = useState<VisualGenerationResult | null>(null);
  const [loadingVisual, setLoadingVisual] = useState(false);
  const [visualError, setVisualError] = useState<string | null>(null);

  const currentStep = recipe.steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === recipe.steps.length - 1;

  // Load visual for current step
  useEffect(() => {
    loadStepVisual();
  }, [currentStepIndex]);

  async function loadStepVisual() {
    if (!currentStep.visual_prompt) {
      setStepVisual(null);
      return;
    }

    setLoadingVisual(true);
    setVisualError(null);

    try {
      const result = await generateStepVisual({
        recipe_id: recipe.id,
        step_index: currentStep.index,
        visual_prompt: currentStep.visual_prompt,
      });
      setStepVisual(result);
    } catch (error) {
      console.error('Failed to generate step visual:', error);
      setVisualError('Could not generate visual');
    } finally {
      setLoadingVisual(false);
    }
  }

  async function regenerateVisual() {
    setStepVisual(null);
    await loadStepVisual();
  }

  function goToNextStep() {
    if (isLastStep) {
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
        background: '#f9fafb',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <header
        style={{
          background: 'white',
          borderBottom: '1px solid #e5e7eb',
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
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              Step {currentStepIndex + 1} of {recipe.steps.length}
            </div>
            <div style={{ fontWeight: 600, color: '#111827' }}>{recipe.name}</div>
          </div>
          <Button variant="ghost" onClick={onOpenChef}>
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
        style={{
          flex: 1,
          padding: '2rem',
          maxWidth: '800px',
          margin: '0 auto',
          width: '100%',
        }}
      >
        {/* Step Title */}
        <Card style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 700,
              color: '#111827',
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
              color: '#6b7280',
            }}
          >
            <span>⏱ {currentStep.time_display}</span>
            <span>•</span>
            <span
              style={{
                color: currentStep.type === 'active' ? '#2563eb' : '#6b7280',
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
              color: '#374151',
              margin: 0,
            }}
          >
            {currentStep.instruction}
          </p>
        </Card>

        {/* Visual Reference (Phase 2 Core Feature) */}
        {currentStep.visual_prompt && (
          <Card style={{ marginBottom: '1.5rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.75rem',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280', fontWeight: 600 }}>
                👁️ Visual Reference
              </h3>
              {stepVisual && !loadingVisual && (
                <Button variant="ghost" size="sm" onClick={regenerateVisual}>
                  ↻ Regenerate
                </Button>
              )}
            </div>

            {loadingVisual && (
              <div
                style={{
                  height: '256px',
                  background: '#f3f4f6',
                  borderRadius: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6b7280',
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎨</div>
                  <div>Generating visual...</div>
                </div>
              </div>
            )}

            {stepVisual && !loadingVisual && (
              <img
                src={stepVisual.image_url}
                alt={`Visual reference for step ${currentStep.index + 1}`}
                style={{
                  width: '100%',
                  borderRadius: '0.5rem',
                  border: '1px solid #e5e7eb',
                }}
              />
            )}

            {visualError && !loadingVisual && (
              <div
                style={{
                  padding: '1rem',
                  background: '#fef2f2',
                  borderRadius: '0.5rem',
                  color: '#dc2626',
                  fontSize: '0.875rem',
                  textAlign: 'center',
                }}
              >
                {visualError}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={regenerateVisual}
                  style={{ marginLeft: '0.5rem' }}
                >
                  Try Again
                </Button>
              </div>
            )}

            <p
              style={{
                marginTop: '0.75rem',
                fontSize: '0.875rem',
                color: '#6b7280',
                fontStyle: 'italic',
              }}
            >
              {currentStep.visual_prompt}
            </p>
          </Card>
        )}

        {/* Tip */}
        {currentStep.tip && (
          <Card
            style={{
              marginBottom: '1.5rem',
              background: '#fef3c7',
              border: '1px solid #fcd34d',
            }}
          >
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.25rem' }}>💡</span>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.875rem',
                  color: '#92400e',
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
              background: '#fee2e2',
              border: '1px solid #fca5a5',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.5rem' }}>🌡️</span>
              <div>
                <div style={{ fontWeight: 600, color: '#dc2626' }}>
                  {currentStep.temperature.value}{currentStep.temperature.unit}
                </div>
                {currentStep.temperature.target && (
                  <div style={{ fontSize: '0.875rem', color: '#991b1b' }}>
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
              background: '#dcfce7',
              border: '1px solid #86efac',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.5rem' }}>✅</span>
              <div>
                <div style={{ fontWeight: 600, color: '#166534' }}>
                  Safe Internal Temperature: {recipe.safe_temp.value}{recipe.safe_temp.unit}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#15803d' }}>
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
          background: 'white',
          borderTop: '1px solid #e5e7eb',
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
          >
            ← Previous
          </Button>

          <Button onClick={goToNextStep} size="lg">
            {isLastStep ? '✓ Done' : 'Next →'}
          </Button>
        </div>
      </footer>
    </div>
  );
}
