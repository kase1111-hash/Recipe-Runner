// Recipe Scaler Component
// Phase 4 Smart Feature - Interactive scaling UI

import { useState, useMemo } from 'react';
import { Button, Card } from '../common';
import { scaleRecipe, parseYield, getScalingPresets } from '../../services/recipeScaling';
import type { Recipe } from '../../types';
import type { ScaledRecipe, ScaledIngredient } from '../../services/recipeScaling';

interface RecipeScalerProps {
  recipe: Recipe;
  onApply: (scaledRecipe: ScaledRecipe) => void;
  onCancel: () => void;
}

export function RecipeScaler({ recipe, onApply, onCancel }: RecipeScalerProps) {
  const currentYield = parseYield(recipe.yield);
  const [targetYield, setTargetYield] = useState(currentYield.value);
  const [customYield, setCustomYield] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const presets = useMemo(() => getScalingPresets(recipe), [recipe]);

  const scaledRecipe = useMemo(() => {
    return scaleRecipe(recipe, targetYield);
  }, [recipe, targetYield]);

  const handlePresetClick = (value: number) => {
    setTargetYield(value);
    setShowCustom(false);
  };

  const handleCustomSubmit = () => {
    const value = parseFloat(customYield);
    if (!isNaN(value) && value > 0) {
      setTargetYield(value);
    }
  };

  const scaleFactor = targetYield / currentYield.value;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
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
              color: '#111827',
              margin: '0 0 0.5rem',
            }}
          >
            Scale Recipe
          </h2>
          <p style={{ color: '#6b7280', margin: '0 0 1.5rem' }}>
            Adjust the yield to automatically recalculate ingredients
          </p>

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
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                Original
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#6b7280' }}>
                {currentYield.value} {currentYield.unit}
              </div>
            </div>
            <div style={{ fontSize: '1.5rem', color: '#9ca3af' }}>→</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                Scaled
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2563eb' }}>
                {targetYield} {currentYield.unit}
              </div>
            </div>
          </div>

          {/* Scale Factor Display */}
          <div
            style={{
              textAlign: 'center',
              marginBottom: '1.5rem',
              padding: '0.5rem',
              background: scaleFactor === 1 ? '#f3f4f6' : '#eff6ff',
              borderRadius: '0.5rem',
            }}
          >
            <span style={{ fontSize: '0.875rem', color: scaleFactor === 1 ? '#6b7280' : '#2563eb' }}>
              {scaleFactor === 1
                ? 'Original recipe'
                : scaleFactor > 1
                ? `Scaling up ${scaleFactor.toFixed(2)}x`
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
                variant={targetYield === preset.value ? 'primary' : 'secondary'}
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
            <div
              style={{
                display: 'flex',
                gap: '0.5rem',
                marginBottom: '1rem',
              }}
            >
              <input
                type="number"
                min="0.1"
                step="0.5"
                value={customYield}
                onChange={(e) => setCustomYield(e.target.value)}
                placeholder={`Enter ${currentYield.unit}`}
                style={{
                  flex: 1,
                  padding: '0.5rem 0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                }}
              />
              <Button size="sm" onClick={handleCustomSubmit}>
                Apply
              </Button>
            </div>
          )}

          {/* Scaled Ingredients Preview */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#374151',
                marginBottom: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Scaled Ingredients
            </h3>
            <div
              style={{
                background: '#f9fafb',
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
                    borderBottom: idx < scaledRecipe.scaledIngredients.length - 1 ? '1px solid #e5e7eb' : 'none',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span
                        style={{
                          fontWeight: 600,
                          color: ing.scaledAmount !== ing.originalAmount ? '#2563eb' : '#374151',
                        }}
                      >
                        {ing.scaledAmount} {ing.unit}
                      </span>
                      <span style={{ color: '#374151' }}>{ing.item}</span>
                      {ing.prep && (
                        <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                          ({ing.prep})
                        </span>
                      )}
                    </div>
                    {ing.scaledAmount !== ing.originalAmount && (
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                        was: {ing.originalAmount} {ing.unit}
                      </div>
                    )}
                    {ing.scalingWarning && (
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: '#d97706',
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
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '0.5rem',
                padding: '0.75rem',
                marginBottom: '1.5rem',
              }}
            >
              <h4
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#92400e',
                  margin: '0 0 0.5rem',
                  textTransform: 'uppercase',
                }}
              >
                Scaling Notes
              </h4>
              <ul style={{ margin: 0, paddingLeft: '1rem', color: '#92400e', fontSize: '0.875rem' }}>
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
