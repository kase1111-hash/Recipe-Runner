// DietaryWarnings Component
// Shows dietary warnings and adaptation options on recipes

import { useState, useEffect } from 'react';
import { Button } from '../common';
import type { Recipe, AdaptedRecipe, RecipeAdaptation } from '../../types';
import {
  getDietaryPreferences,
  getRecipeWarnings,
  adaptRecipe,
  isAdaptationAvailable,
} from '../../services/dietaryAdaptation';

interface DietaryWarningsProps {
  recipe: Recipe;
  onRecipeAdapted?: (adaptedRecipe: AdaptedRecipe) => void;
}

export function DietaryWarnings({ recipe, onRecipeAdapted }: DietaryWarningsProps) {
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isAdapting, setIsAdapting] = useState(false);
  const [adaptationError, setAdaptationError] = useState<string | null>(null);
  const [adaptedRecipe, setAdaptedRecipe] = useState<AdaptedRecipe | null>(null);
  const [ollamaAvailable, setOllamaAvailable] = useState(false);
  const [showAdaptations, setShowAdaptations] = useState(false);

  const prefs = getDietaryPreferences();

  useEffect(() => {
    if (prefs.enabled) {
      setWarnings(getRecipeWarnings(recipe));
      isAdaptationAvailable().then(setOllamaAvailable);
    } else {
      setWarnings([]);
    }
  }, [recipe, prefs.enabled]);

  async function handleAdaptRecipe() {
    setIsAdapting(true);
    setAdaptationError(null);

    try {
      const adapted = await adaptRecipe(recipe);
      setAdaptedRecipe(adapted);
      setShowAdaptations(true);
      onRecipeAdapted?.(adapted);
    } catch (err) {
      setAdaptationError(err instanceof Error ? err.message : 'Failed to adapt recipe');
    } finally {
      setIsAdapting(false);
    }
  }

  if (!prefs.enabled) {
    return null;
  }

  const hasActivePrefs = prefs.restrictions.length > 0 ||
                         prefs.healthConditions.length > 0 ||
                         prefs.allergies.length > 0 ||
                         prefs.weightGoal;

  if (!hasActivePrefs) {
    return null;
  }

  return (
    <div style={{ marginBottom: '1rem' }}>
      {/* Warnings */}
      {warnings.length > 0 && (
        <div
          style={{
            padding: '0.75rem 1rem',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--error, #ef4444)',
            borderRadius: '0.5rem',
            marginBottom: '0.75rem',
          }}
        >
          <div style={{ fontWeight: 600, color: 'var(--error, #ef4444)', marginBottom: '0.5rem' }}>
            Dietary Warnings
          </div>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--text-primary)', fontSize: '0.875rem' }}>
            {warnings.map((warning, i) => (
              <li key={i}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Adaptation Button */}
      {!adaptedRecipe && (
        <div
          style={{
            padding: '0.75rem 1rem',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-secondary)',
            borderRadius: '0.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div>
            <div style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
              Adapt for your dietary needs
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
              {prefs.restrictions.length > 0 && prefs.restrictions.slice(0, 3).map(r => r.replace('-', ' ')).join(', ')}
              {prefs.restrictions.length > 3 && ` +${prefs.restrictions.length - 3} more`}
              {prefs.healthConditions.length > 0 && (prefs.restrictions.length > 0 ? ' • ' : '') + `${prefs.healthConditions.length} health condition${prefs.healthConditions.length > 1 ? 's' : ''}`}
            </div>
          </div>
          <Button
            onClick={handleAdaptRecipe}
            disabled={isAdapting || !ollamaAvailable}
            size="sm"
          >
            {isAdapting ? 'Adapting...' : 'Adapt Recipe'}
          </Button>
        </div>
      )}

      {/* Ollama not available warning */}
      {!ollamaAvailable && !adaptedRecipe && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.5rem', textAlign: 'center' }}>
          AI adaptation requires Ollama running locally
        </div>
      )}

      {/* Adaptation Error */}
      {adaptationError && (
        <div
          style={{
            padding: '0.75rem 1rem',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--error, #ef4444)',
            borderRadius: '0.5rem',
            marginTop: '0.5rem',
            color: 'var(--error, #ef4444)',
            fontSize: '0.875rem',
          }}
        >
          {adaptationError}
        </div>
      )}

      {/* Adaptations Made */}
      {adaptedRecipe && adaptedRecipe.adaptations.length > 0 && (
        <div
          style={{
            padding: '0.75rem 1rem',
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid var(--success, #22c55e)',
            borderRadius: '0.5rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
            }}
            onClick={() => setShowAdaptations(!showAdaptations)}
          >
            <div style={{ fontWeight: 600, color: 'var(--success, #22c55e)' }}>
              ✓ Recipe Adapted ({adaptedRecipe.adaptations.length} change{adaptedRecipe.adaptations.length > 1 ? 's' : ''})
            </div>
            <span style={{ color: 'var(--text-tertiary)' }}>
              {showAdaptations ? '▼' : '▶'}
            </span>
          </div>

          {showAdaptations && (
            <div style={{ marginTop: '0.75rem' }}>
              {adaptedRecipe.adaptations.map((adaptation, i) => (
                <AdaptationItem key={i} adaptation={adaptation} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AdaptationItem({ adaptation }: { adaptation: RecipeAdaptation }) {
  const icons: Record<string, string> = {
    'ingredient_swap': '🔄',
    'ingredient_remove': '❌',
    'instruction_change': '📝',
    'portion_adjust': '⚖️',
    'warning': '⚠️',
  };

  const colors: Record<string, string> = {
    'ingredient_swap': 'var(--primary)',
    'ingredient_remove': 'var(--error, #ef4444)',
    'instruction_change': 'var(--text-primary)',
    'portion_adjust': 'var(--warning, #f59e0b)',
    'warning': 'var(--warning, #f59e0b)',
  };

  return (
    <div
      style={{
        padding: '0.5rem 0',
        borderBottom: '1px solid var(--border-secondary)',
        fontSize: '0.875rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
        <span>{icons[adaptation.type] || '•'}</span>
        <div style={{ flex: 1 }}>
          {adaptation.type === 'warning' ? (
            <div style={{ color: colors[adaptation.type] }}>{adaptation.adapted}</div>
          ) : (
            <>
              {adaptation.original && (
                <div style={{ textDecoration: 'line-through', color: 'var(--text-tertiary)' }}>
                  {adaptation.original}
                </div>
              )}
              <div style={{ color: colors[adaptation.type], fontWeight: 500 }}>
                {adaptation.adapted}
              </div>
            </>
          )}
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
            {adaptation.reason}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DietaryWarnings;
