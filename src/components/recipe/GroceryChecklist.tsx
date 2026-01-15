import { useState } from 'react';
import { Card, Button, ProgressBar } from '../common';
import type { Recipe, Ingredient } from '../../types';

interface GroceryChecklistProps {
  recipe: Recipe;
  onComplete: (checkedIngredients: string[]) => void;
  onBack: () => void;
  onOpenChef: (ingredient: Ingredient) => void;
  onOpenScaler?: () => void;
}

export function GroceryChecklist({
  recipe,
  onComplete,
  onBack,
  onOpenChef,
  onOpenScaler,
}: GroceryChecklistProps) {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const allChecked = checked.size === recipe.ingredients.length;

  function toggleIngredient(item: string) {
    const next = new Set(checked);
    if (next.has(item)) {
      next.delete(item);
    } else {
      next.add(item);
    }
    setChecked(next);
  }

  function handleMissingIngredient(ingredient: Ingredient) {
    // Uncheck the ingredient
    const next = new Set(checked);
    next.delete(ingredient.item);
    setChecked(next);
    // Open Chef Ollama for substitution
    onOpenChef(ingredient);
  }

  function handleProceed() {
    if (allChecked) {
      onComplete(Array.from(checked));
    }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem' }}>
        <Button variant="ghost" onClick={onBack} style={{ marginBottom: '1rem' }}>
          ← Back
        </Button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1
              style={{
                fontSize: '1.75rem',
                fontWeight: 700,
                color: '#111827',
                margin: '0 0 0.5rem',
              }}
            >
              Grocery Checklist
            </h1>
            <p style={{ color: '#6b7280', margin: 0 }}>{recipe.name}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
              Yield: <strong style={{ color: '#111827' }}>{recipe.yield}</strong>
            </div>
            {onOpenScaler && (
              <Button variant="secondary" size="sm" onClick={onOpenScaler}>
                ⚖️ Scale Recipe
              </Button>
            )}
          </div>
        </div>
      </header>

      <Card style={{ marginBottom: '1.5rem' }}>
        <ProgressBar
          value={checked.size}
          max={recipe.ingredients.length}
          color={allChecked ? '#22c55e' : '#2563eb'}
        />
        {!allChecked && (
          <p
            style={{
              marginTop: '0.75rem',
              fontSize: '0.875rem',
              color: '#6b7280',
              textAlign: 'center',
            }}
          >
            Check off all ingredients before cooking
          </p>
        )}
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {recipe.ingredients.map((ingredient) => (
          <Card
            key={ingredient.item}
            style={{
              padding: '1rem',
              opacity: ingredient.optional ? 0.8 : 1,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
              }}
            >
              <button
                onClick={() => toggleIngredient(ingredient.item)}
                style={{
                  width: '1.5rem',
                  height: '1.5rem',
                  borderRadius: '0.375rem',
                  border: `2px solid ${checked.has(ingredient.item) ? '#22c55e' : '#d1d5db'}`,
                  background: checked.has(ingredient.item) ? '#22c55e' : 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {checked.has(ingredient.item) && (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>

              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: '1rem',
                    fontWeight: 500,
                    color: checked.has(ingredient.item) ? '#9ca3af' : '#111827',
                    textDecoration: checked.has(ingredient.item) ? 'line-through' : 'none',
                  }}
                >
                  <span style={{ fontWeight: 600 }}>
                    {ingredient.amount} {ingredient.unit}
                  </span>{' '}
                  {ingredient.item}
                  {ingredient.prep && (
                    <span style={{ color: '#6b7280', fontWeight: 400 }}>
                      , {ingredient.prep}
                    </span>
                  )}
                </div>
                {ingredient.optional && (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: '#9ca3af',
                      fontStyle: 'italic',
                    }}
                  >
                    optional
                  </span>
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleMissingIngredient(ingredient)}
                style={{ color: '#6b7280' }}
              >
                Don't have this
              </Button>
            </div>

            {ingredient.substitutes.length > 0 && !checked.has(ingredient.item) && (
              <div
                style={{
                  marginTop: '0.5rem',
                  marginLeft: '2.5rem',
                  fontSize: '0.75rem',
                  color: '#6b7280',
                }}
              >
                💡 Can substitute: {ingredient.substitutes.join(' or ')}
              </div>
            )}
          </Card>
        ))}
      </div>

      {recipe.equipment.length > 0 && (
        <>
          <h2
            style={{
              fontSize: '1.25rem',
              fontWeight: 600,
              color: '#111827',
              margin: '2rem 0 1rem',
            }}
          >
            Equipment Needed
          </h2>
          <Card>
            <ul
              style={{
                margin: 0,
                padding: '0 0 0 1.25rem',
                color: '#374151',
              }}
            >
              {recipe.equipment.map((item) => (
                <li key={item} style={{ marginBottom: '0.5rem' }}>
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}

      <div
        style={{
          marginTop: '2rem',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <Button
          onClick={handleProceed}
          disabled={!allChecked}
          size="lg"
          style={{ minWidth: '200px' }}
        >
          {allChecked ? 'Start Cooking →' : `${recipe.ingredients.length - checked.size} items remaining`}
        </Button>
      </div>
    </div>
  );
}
