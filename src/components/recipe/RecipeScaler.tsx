// Recipe Scaler Component
// Phase 4 Smart Feature - Interactive scaling UI

import { useState, useMemo } from 'react';
import { Button, Card } from '../common';
import {
  scaleRecipe,
  parseYield,
  getScalingPresets,
  formatScaledYield,
  resolveAppliedYieldValue,
} from '../../services/recipeScaling';
import type { Recipe } from '../../types';
import type { ScaledRecipe, ScaledIngredient } from '../../services/recipeScaling';

interface RecipeScalerProps {
  /** The UNSCALED recipe - scaling is always computed from the original */
  recipe: Recipe;
  /** Yield string currently applied (e.g. "8 servings"), to pre-select that scale */
  appliedYield?: string;
  onApply: (scaledRecipe: ScaledRecipe) => void;
  onCancel: () => void;
}

/** Float-safe comparison for yield values (presets are computed by multiplication) */
function sameYield(a: number, b: number): boolean {
  return Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
}

/** Parse the custom yield field; null unless it's a positive, finite number */
function parseCustomYield(text: string): number | null {
  if (!text.trim()) return null;
  const value = Number(text);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function RecipeScaler({ recipe, appliedYield, onApply, onCancel }: RecipeScalerProps) {
  const currentYield = useMemo(() => parseYield(recipe.yield), [recipe.yield]);
  const presets = useMemo(() => getScalingPresets(recipe), [recipe]);

  // Start on the scale that's currently applied, not always on "Original"
  const initialTarget = resolveAppliedYieldValue(recipe, appliedYield);
  const initialIsPreset = presets.some((preset) => sameYield(preset.value, initialTarget));
  const [targetYield, setTargetYield] = useState(initialTarget);
  const [customYield, setCustomYield] = useState(initialIsPreset ? '' : String(initialTarget));
  const [showCustom, setShowCustom] = useState(!initialIsPreset);

  const customValue = parseCustomYield(customYield);
  const customInvalid = customYield.trim() !== '' && customValue === null;

  const scaledRecipe = useMemo(() => {
    return scaleRecipe(recipe, targetYield);
  }, [recipe, targetYield]);

  const handlePresetClick = (value: number) => {
    setTargetYield(value);
    setShowCustom(false);
  };

  const handleCustomSubmit = () => {
    if (customValue !== null) {
      setTargetYield(customValue);
    }
  };

  const scaleFactor = targetYield / currentYield.value;
  const isApplied = appliedYield !== undefined && appliedYield !== recipe.yield;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'var(--overlay-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
    >
      <Card
        style={{
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
      >
        <div style={{ padding: '1.5rem' }}>
          <h2
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: '0 0 0.5rem',
            }}
          >
            Scale Recipe
          </h2>
          <p style={{ color: 'var(--text-tertiary)', margin: isApplied ? '0 0 0.25rem' : '0 0 1.5rem' }}>
            Adjust the yield to automatically recalculate ingredients
          </p>
          {isApplied && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '0 0 1.5rem' }}>
              Currently scaled to {appliedYield}
            </p>
          )}

          {/* Current vs Target */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>
                Original
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>
                {formatScaledYield(currentYield, currentYield.value)}
              </div>
            </div>
            <div style={{ fontSize: '1.5rem', color: 'var(--text-muted)' }}>→</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>
                Scaled
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                {formatScaledYield(currentYield, targetYield)}
              </div>
            </div>
          </div>

          {/* Scale Factor Display */}
          <div
            style={{
              textAlign: 'center',
              marginBottom: '1.5rem',
              padding: '0.5rem',
              background: scaleFactor === 1 ? 'var(--bg-tertiary)' : 'var(--accent-light)',
              borderRadius: '0.5rem',
            }}
          >
            <span style={{ fontSize: '0.875rem', color: scaleFactor === 1 ? 'var(--text-tertiary)' : 'var(--accent-primary)' }}>
              {scaleFactor === 1
                ? 'Original recipe'
                : scaleFactor > 1
                ? `Scaling up ${Number(scaleFactor.toFixed(2))}x`
                : `Scaling down to ${(scaleFactor * 100).toFixed(0)}%`}
            </span>
          </div>

          {/* Preset Buttons */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.5rem',
              marginBottom: '1rem',
            }}
          >
            {presets.map((preset) => (
              <Button
                key={preset.value}
                variant={sameYield(targetYield, preset.value) ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => handlePresetClick(preset.value)}
              >
                {preset.label}
              </Button>
            ))}
            <Button
              variant={showCustom ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setShowCustom(!showCustom)}
            >
              Custom
            </Button>
          </div>

          {/* Custom Input */}
          {showCustom && (
            <div style={{ marginBottom: '1rem' }}>
              <div
                style={{
                  display: 'flex',
                  gap: '0.5rem',
                }}
              >
                <input
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  value={customYield}
                  onChange={(e) => setCustomYield(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCustomSubmit();
                  }}
                  placeholder={`Enter ${currentYield.unit}`}
                  aria-label={`Custom yield in ${currentYield.unit}`}
                  aria-invalid={customInvalid}
                  style={{
                    flex: 1,
                    padding: '0.5rem 0.75rem',
                    border: `1px solid ${customInvalid ? 'var(--error)' : 'var(--border-secondary)'}`,
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    background: 'var(--input-bg)',
                    color: 'var(--text-primary)',
                  }}
                />
                <Button size="sm" onClick={handleCustomSubmit} disabled={customValue === null}>
                  Apply
                </Button>
              </div>
              {customInvalid && (
                <div role="alert" style={{ fontSize: '0.75rem', color: 'var(--error)', marginTop: '0.25rem' }}>
                  Enter a number greater than 0
                </div>
              )}
            </div>
          )}

          {/* Scaled Ingredients Preview */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Scaled Ingredients
            </h3>
            <div
              style={{
                background: 'var(--bg-secondary)',
                borderRadius: '0.5rem',
                padding: '0.75rem',
                maxHeight: '250px',
                overflow: 'auto',
              }}
            >
              {scaledRecipe.scaledIngredients.map((ing: ScaledIngredient, idx: number) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    padding: '0.5rem 0',
                    borderBottom: idx < scaledRecipe.scaledIngredients.length - 1 ? '1px solid var(--border-primary)' : 'none',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span
                        style={{
                          fontWeight: 600,
                          color: ing.scaledAmount !== ing.originalAmount ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        }}
                      >
                        {ing.scaledAmount} {ing.unit}
                      </span>
                      <span style={{ color: 'var(--text-secondary)' }}>{ing.item}</span>
                      {ing.prep && (
                        <span style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                          ({ing.prep})
                        </span>
                      )}
                    </div>
                    {ing.scaledAmount !== ing.originalAmount && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        was: {ing.originalAmount} {ing.unit}
                      </div>
                    )}
                    {ing.scalingWarning && (
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--warning)',
                          marginTop: '0.25rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                        }}
                      >
                        ⚠️ {ing.scalingWarning}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Scaling Notes */}
          {scaledRecipe.scalingNotes.length > 0 && (
            <div
              style={{
                background: 'var(--warning-bg)',
                border: '1px solid var(--warning-border)',
                borderRadius: '0.5rem',
                padding: '0.75rem',
                marginBottom: '1.5rem',
              }}
            >
              <h4
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--warning-text)',
                  margin: '0 0 0.5rem',
                  textTransform: 'uppercase',
                }}
              >
                Scaling Notes
              </h4>
              <ul style={{ margin: 0, paddingLeft: '1rem', color: 'var(--warning-text)', fontSize: '0.875rem' }}>
                {scaledRecipe.scalingNotes.map((note, idx) => (
                  <li key={idx} style={{ marginBottom: '0.25rem' }}>{note}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={() => onApply(scaledRecipe)}>
              Apply Scaling
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
