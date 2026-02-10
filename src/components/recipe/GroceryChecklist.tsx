import { useState } from 'react';
import { Card, Button, ProgressBar } from '../common';
import type { Recipe, Ingredient } from '../../types';

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Produce: [
    'onion', 'garlic', 'tomato', 'lettuce', 'pepper', 'carrot', 'celery',
    'potato', 'mushroom', 'herb', 'basil', 'cilantro', 'parsley', 'lemon',
    'lime', 'avocado', 'spinach', 'kale', 'broccoli', 'cucumber', 'zucchini',
    'ginger',
  ],
  Proteins: [
    'chicken', 'beef', 'pork', 'fish', 'salmon', 'shrimp', 'turkey', 'lamb',
    'tofu', 'tempeh', 'sausage', 'bacon', 'steak', 'ground',
  ],
  Dairy: [
    'milk', 'cream', 'cheese', 'butter', 'yogurt', 'egg', 'sour cream',
    'parmesan', 'mozzarella', 'cheddar', 'ricotta',
  ],
  Pantry: [
    'flour', 'sugar', 'salt', 'oil', 'vinegar', 'soy sauce', 'pasta', 'rice',
    'bread', 'stock', 'broth', 'canned', 'tomato paste', 'honey', 'maple',
    'vanilla', 'baking',
  ],
  Spices: [
    'pepper', 'cumin', 'paprika', 'cinnamon', 'oregano', 'thyme', 'rosemary',
    'chili', 'cayenne', 'nutmeg', 'turmeric', 'coriander', 'bay leaf', 'clove',
  ],
};

function categorizeIngredient(ingredient: Ingredient): string {
  const text = `${ingredient.item} ${ingredient.prep ?? ''}`.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => text.includes(kw))) {
      return category;
    }
  }
  return 'Other';
}

function formatShoppingList(recipe: Recipe): string {
  const grouped: Record<string, Ingredient[]> = {};
  for (const ing of recipe.ingredients) {
    const cat = categorizeIngredient(ing);
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
  const [copied, setCopied] = useState(false);

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
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const text = formatShoppingList(recipe);
                    navigator.clipboard.writeText(text).then(() => {
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    });
                  }}
                >
                  {copied ? 'Copied!' : 'Export List'}
                </Button>
                {typeof navigator !== 'undefined' && navigator.share && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const text = formatShoppingList(recipe);
                      navigator.share({ title: `Shopping List: ${recipe.name}`, text });
                    }}
                  >
                    Share
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <Card style={{ marginBottom: '1.5rem' }}>
        <ProgressBar
          value={checked.size}
          max={recipe.ingredients.length}
          color={allChecked ? 'var(--success)' : 'var(--accent-primary)'}
        />
        {!allChecked && (
          <p
            style={{
              marginTop: '0.75rem',
              fontSize: '0.875rem',
              color: 'var(--text-tertiary)',
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
                  border: `2px solid ${checked.has(ingredient.item) ? 'var(--success)' : 'var(--border-secondary)'}`,
                  background: checked.has(ingredient.item) ? 'var(--success)' : 'var(--card-bg)',
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
                    color: checked.has(ingredient.item) ? 'var(--text-muted)' : 'var(--text-primary)',
                    textDecoration: checked.has(ingredient.item) ? 'line-through' : 'none',
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
                onClick={() => handleMissingIngredient(ingredient)}
                style={{ color: 'var(--text-tertiary)' }}
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
