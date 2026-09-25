import { useEffect, useState } from 'react';
import { Card, Button, ProgressBar } from '../common';
import { copyToClipboard } from '../../services/export';
import { categorizeIngredient, type IngredientCategory } from '../../services/ingredientCategories';
import type { Recipe, Ingredient } from '../../types';

// Shopping-list sections; eggs sit with dairy as they do in most stores
const GROCERY_SECTION: Record<IngredientCategory, string> = {
  produce: 'Produce',
  proteins: 'Proteins',
  eggs: 'Dairy',
  dairy: 'Dairy',
  pantry: 'Pantry',
  spices: 'Spices',
  other: 'Other',
};

function formatShoppingList(recipe: Recipe): string {
  const grouped: Record<string, Ingredient[]> = {};
  for (const ing of recipe.ingredients) {
    const cat = GROCERY_SECTION[categorizeIngredient(ing.item)];
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(ing);
  }

  const categoryOrder = ['Produce', 'Proteins', 'Dairy', 'Pantry', 'Spices', 'Other'];
  const lines: string[] = [`Shopping List: ${recipe.name} (${recipe.yield})\n`];

  for (const cat of categoryOrder) {
    const items = grouped[cat];
    if (!items || items.length === 0) continue;
    lines.push(`${cat.toUpperCase()}`);
    for (const ing of items) {
      const amount = [ing.amount, ing.unit].filter(Boolean).join(' ');
      const prep = ing.prep ? `, ${ing.prep}` : '';
      lines.push(`[ ] ${amount} ${ing.item}${prep}`);
    }
    lines.push('');
  }

  return lines.join('\n').trimEnd();
}

// Map checked ingredient names (the onComplete format) back to row indices.
// Each name claims one row, so a duplicated name ("butter" for crust and
// filling) restores as many rows as it appears in the list.
function indicesFromNames(ingredients: Ingredient[], names: string[]): Set<number> {
  const normalize = (name: string) => name.trim().toLowerCase();
  const result = new Set<number>();
  for (const name of names) {
    const idx = ingredients.findIndex(
      (ing, i) => !result.has(i) && normalize(ing.item) === normalize(name)
    );
    if (idx !== -1) result.add(idx);
  }
  return result;
}

interface GroceryChecklistProps {
  recipe: Recipe;
  // Receives the `item` name of every checked ingredient, in recipe order
  // (one entry per checked row, so duplicate names repeat)
  onComplete: (checkedIngredients: string[]) => void;
  onBack: () => void;
  onOpenChef: (ingredient: Ingredient) => void;
  onOpenScaler?: () => void;
  // Seeds the checklist, in the same format onComplete produces — e.g. when
  // returning here from cooking
  initialChecked?: string[];
}

export function GroceryChecklist({
  recipe,
  onComplete,
  onBack,
  onOpenChef,
  onOpenScaler,
  initialChecked,
}: GroceryChecklistProps) {
  // Use index-based keys to handle duplicate ingredient names (e.g., "butter" for crust and filling)
  const [checked, setChecked] = useState<Set<number>>(() =>
    indicesFromNames(recipe.ingredients, initialChecked ?? [])
  );
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');

  // Optional ingredients never block cooking — only required ones gate the
  // Start button and count toward progress
  const requiredIndices = recipe.ingredients
    .map((ing, idx) => (ing.optional ? -1 : idx))
    .filter((idx) => idx !== -1);
  const requiredChecked = requiredIndices.filter((idx) => checked.has(idx)).length;
  const requiredRemaining = requiredIndices.length - requiredChecked;
  const hasOptional = requiredIndices.length < recipe.ingredients.length;
  const canProceed = requiredRemaining === 0;

  // Clear the copy feedback after a moment
  useEffect(() => {
    if (copyStatus === 'idle') return;
    const timeout = setTimeout(() => setCopyStatus('idle'), copyStatus === 'failed' ? 4000 : 2000);
    return () => clearTimeout(timeout);
  }, [copyStatus]);

  function handleCopy() {
    const text = formatShoppingList(recipe);
    // Starting from a resolved promise turns a synchronous throw (no
    // Clipboard API on plain-http origins) into a rejection we can report
    Promise.resolve()
      .then(() => copyToClipboard(text))
      .then(
        () => setCopyStatus('copied'),
        () => setCopyStatus('failed')
      );
  }

  function toggleIngredient(index: number) {
    // Functional update — rapid successive toggles batch into one render,
    // and building from a stale closure would drop all but the last one
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  function handleMissingIngredient(ingredient: Ingredient, index: number) {
    // Uncheck the ingredient
    setChecked((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
    // Open Chef Ollama for substitution
    onOpenChef(ingredient);
  }

  function handleProceed() {
    if (canProceed) {
      // Convert indices back to ingredient names for downstream consumers
      onComplete(
        recipe.ingredients
          .filter((_, idx) => checked.has(idx))
          .map((ing) => ing.item)
      );
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
                color: 'var(--text-primary)',
                margin: '0 0 0.5rem',
              }}
            >
              Grocery Checklist
            </h1>
            <p style={{ color: 'var(--text-tertiary)', margin: 0 }}>{recipe.name}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>
              Yield: <strong style={{ color: 'var(--text-primary)' }}>{recipe.yield}</strong>
            </div>
            {onOpenScaler && (
              <Button variant="secondary" size="sm" onClick={onOpenScaler}>
                ⚖️ Scale Recipe
              </Button>
            )}
            {recipe.ingredients.length > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                <Button variant="secondary" size="sm" onClick={handleCopy}>
                  {copyStatus === 'copied' ? 'Copied!' : copyStatus === 'failed' ? 'Copy failed' : 'Export List'}
                </Button>
                {typeof navigator !== 'undefined' && navigator.share && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const text = formatShoppingList(recipe);
                      // Dismissing the share sheet rejects — nothing to report
                      navigator.share({ title: `Shopping List: ${recipe.name}`, text }).catch(() => {});
                    }}
                  >
                    Share
                  </Button>
                )}
              </div>
            )}
            {copyStatus === 'failed' && (
              <div
                role="alert"
                style={{ fontSize: '0.75rem', color: 'var(--error)', marginTop: '0.25rem' }}
              >
                Couldn't copy to the clipboard
              </div>
            )}
          </div>
        </div>
      </header>

      <Card style={{ marginBottom: '1.5rem' }}>
        <ProgressBar
          value={requiredChecked}
          max={requiredIndices.length}
          color={canProceed ? 'var(--success)' : 'var(--accent-primary)'}
        />
        {!canProceed && (
          <p
            style={{
              marginTop: '0.75rem',
              fontSize: '0.875rem',
              color: 'var(--text-tertiary)',
              textAlign: 'center',
            }}
          >
            {hasOptional
              ? 'Check off all required ingredients before cooking (optional ones can be skipped)'
              : 'Check off all ingredients before cooking'}
          </p>
        )}
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {recipe.ingredients.map((ingredient, idx) => (
          <Card
            key={idx}
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
                role="checkbox"
                aria-checked={checked.has(idx)}
                aria-label={`${[ingredient.amount, ingredient.unit, ingredient.item].filter(Boolean).join(' ')}${ingredient.optional ? ' (optional)' : ''}`}
                onClick={() => toggleIngredient(idx)}
                style={{
                  width: '1.5rem',
                  height: '1.5rem',
                  borderRadius: '0.375rem',
                  border: `2px solid ${checked.has(idx) ? 'var(--success)' : 'var(--border-secondary)'}`,
                  background: checked.has(idx) ? 'var(--success)' : 'var(--card-bg)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {checked.has(idx) && (
                  <svg
                    aria-hidden="true"
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
                    color: checked.has(idx) ? 'var(--text-muted)' : 'var(--text-primary)',
                    textDecoration: checked.has(idx) ? 'line-through' : 'none',
                  }}
                >
                  <span style={{ fontWeight: 600 }}>
                    {ingredient.amount} {ingredient.unit}
                  </span>{' '}
                  {ingredient.item}
                  {ingredient.prep && (
                    <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>
                      , {ingredient.prep}
                    </span>
                  )}
                </div>
                {ingredient.optional && (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
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
                onClick={() => handleMissingIngredient(ingredient, idx)}
                style={{ color: 'var(--text-tertiary)' }}
              >
                Don't have this
              </Button>
            </div>

            {ingredient.substitutes.length > 0 && !checked.has(idx) && (
              <div
                style={{
                  marginTop: '0.5rem',
                  marginLeft: '2.5rem',
                  fontSize: '0.75rem',
                  color: 'var(--text-tertiary)',
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
              color: 'var(--text-primary)',
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
                color: 'var(--text-secondary)',
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
          disabled={!canProceed}
          size="lg"
          style={{ minWidth: '200px' }}
        >
          {canProceed
            ? 'Start Cooking →'
            : `${requiredRemaining} ${requiredRemaining === 1 ? 'item' : 'items'} remaining`}
        </Button>
      </div>
    </div>
  );
}
