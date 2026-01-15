// Meal Plan Grocery List Component
// Phase 6 Feature - Combined shopping list from meal plan

import { useState, useEffect } from 'react';
import { Button, Card } from '../common';
import {
  getMealPlan,
  generateGroceryListFromPlan,
  type MealPlan,
  type AggregatedIngredient,
} from '../../services/mealPlanning';
import { isCommonlyStocked } from '../../services/pantry';
import { copyToClipboard, downloadAsFile } from '../../services/export';

interface MealPlanGroceryListProps {
  planId: string;
  onBack: () => void;
}

type SortBy = 'name' | 'category';

const CATEGORIES: Record<string, string[]> = {
  'Produce': ['onion', 'garlic', 'tomato', 'pepper', 'lettuce', 'spinach', 'carrot', 'celery', 'potato', 'mushroom', 'lemon', 'lime', 'ginger', 'herb', 'basil', 'cilantro', 'parsley', 'thyme', 'rosemary', 'broccoli', 'zucchini'],
  'Meat & Seafood': ['chicken', 'beef', 'pork', 'fish', 'salmon', 'shrimp', 'turkey', 'lamb', 'bacon', 'sausage'],
  'Dairy & Eggs': ['milk', 'cream', 'butter', 'cheese', 'yogurt', 'sour cream', 'egg'],
  'Bakery': ['bread', 'tortilla', 'bun', 'roll'],
  'Pantry': ['flour', 'sugar', 'oil', 'vinegar', 'broth', 'stock', 'pasta', 'rice', 'sauce', 'honey', 'maple', 'soy'],
  'Spices': ['salt', 'pepper', 'cumin', 'paprika', 'cinnamon', 'oregano', 'chili', 'curry', 'turmeric'],
};

function categorizeItem(name: string): string {
  const lower = name.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORIES)) {
    if (keywords.some(kw => lower.includes(kw))) {
      return category;
    }
  }
  return 'Other';
}

function formatAmount(amount: number, unit: string): string {
  // Round to nice fractions
  const rounded = Math.round(amount * 4) / 4;
  if (rounded === Math.floor(rounded)) {
    return `${rounded} ${unit}`;
  }
  const whole = Math.floor(rounded);
  const frac = rounded - whole;
  let fracStr = '';
  if (frac === 0.25) fracStr = '1/4';
  else if (frac === 0.5) fracStr = '1/2';
  else if (frac === 0.75) fracStr = '3/4';
  else fracStr = frac.toFixed(1);

  return whole > 0 ? `${whole} ${fracStr} ${unit}` : `${fracStr} ${unit}`;
}

export function MealPlanGroceryList({ planId, onBack }: MealPlanGroceryListProps) {
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [ingredients, setIngredients] = useState<AggregatedIngredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortBy>('category');
  const [hideCommon, setHideCommon] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      const p = getMealPlan(planId);
      if (p) {
        setPlan(p);
        const list = await generateGroceryListFromPlan(planId);
        setIngredients(list);

        // Auto-check commonly stocked items
        const autoChecked = new Set<string>();
        for (const ing of list) {
          if (isCommonlyStocked(ing.item)) {
            autoChecked.add(ing.item);
          }
        }
        setChecked(autoChecked);
      }
      setLoading(false);
    }
    load();
  }, [planId]);

  const toggleItem = (item: string) => {
    const next = new Set(checked);
    if (next.has(item)) {
      next.delete(item);
    } else {
      next.add(item);
    }
    setChecked(next);
  };

  const filteredIngredients = hideCommon
    ? ingredients.filter(ing => !isCommonlyStocked(ing.item))
    : ingredients;

  const groupedIngredients = filteredIngredients.reduce((acc, ing) => {
    const category = categorizeItem(ing.item);
    if (!acc[category]) acc[category] = [];
    acc[category].push(ing);
    return acc;
  }, {} as Record<string, AggregatedIngredient[]>);

  const sortedCategories = Object.keys(groupedIngredients).sort((a, b) => {
    if (a === 'Other') return 1;
    if (b === 'Other') return -1;
    return a.localeCompare(b);
  });

  const handleCopy = async () => {
    const uncheckedItems = filteredIngredients.filter(ing => !checked.has(ing.item));
    let text = `Shopping List for ${plan?.name}\n${'='.repeat(40)}\n\n`;

    if (sortBy === 'category') {
      for (const category of sortedCategories) {
        const items = groupedIngredients[category].filter(ing => !checked.has(ing.item));
        if (items.length === 0) continue;
        text += `${category}\n${'-'.repeat(20)}\n`;
        for (const ing of items) {
          text += `• ${formatAmount(ing.totalAmount, ing.unit)} ${ing.item}\n`;
        }
        text += '\n';
      }
    } else {
      for (const ing of uncheckedItems) {
        text += `• ${formatAmount(ing.totalAmount, ing.unit)} ${ing.item}\n`;
      }
    }

    await copyToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    let text = `Shopping List for ${plan?.name}\n${'='.repeat(40)}\n\n`;

    for (const category of sortedCategories) {
      const items = groupedIngredients[category].filter(ing => !checked.has(ing.item));
      if (items.length === 0) continue;
      text += `${category}\n${'-'.repeat(20)}\n`;
      for (const ing of items) {
        text += `• ${formatAmount(ing.totalAmount, ing.unit)} ${ing.item}\n`;
        if (ing.recipes.length > 1) {
          text += `  (for: ${ing.recipes.join(', ')})\n`;
        }
      }
      text += '\n';
    }

    const filename = `shopping-list-${plan?.name.toLowerCase().replace(/\s+/g, '-')}.txt`;
    downloadAsFile(text, filename, 'text/plain');
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
        Loading grocery list...
      </div>
    );
  }

  if (!plan) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
        Plan not found
      </div>
    );
  }

  const uncheckedCount = filteredIngredients.filter(ing => !checked.has(ing.item)).length;

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem' }}>
        <Button variant="ghost" onClick={onBack} style={{ marginBottom: '1rem' }}>
          ← Back to Planner
        </Button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#111827', margin: '0 0 0.25rem' }}>
              Shopping List
            </h1>
            <p style={{ color: '#6b7280', margin: 0 }}>{plan.name}</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button variant="secondary" size="sm" onClick={handleCopy}>
              {copied ? '✓ Copied!' : '📋 Copy'}
            </Button>
            <Button variant="secondary" size="sm" onClick={handleDownload}>
              📥 Download
            </Button>
          </div>
        </div>
      </header>

      {/* Progress */}
      <Card style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
            {uncheckedCount} items to buy
          </span>
          <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            {checked.size} checked off
          </span>
        </div>
        <div style={{ height: '0.5rem', background: '#e5e7eb', borderRadius: '9999px', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${((filteredIngredients.length - uncheckedCount) / filteredIngredients.length) * 100}%`,
              background: uncheckedCount === 0 ? '#22c55e' : '#2563eb',
              borderRadius: '9999px',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </Card>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.875rem', color: '#6b7280' }}>Sort:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            style={{
              padding: '0.375rem 0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
            }}
          >
            <option value="category">By Category</option>
            <option value="name">Alphabetical</option>
          </select>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#6b7280', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={hideCommon}
            onChange={(e) => setHideCommon(e.target.checked)}
          />
          Hide pantry staples
        </label>
      </div>

      {/* Ingredient List */}
      {sortBy === 'category' ? (
        sortedCategories.map((category) => {
          const items = groupedIngredients[category];
          return (
            <Card key={category} style={{ marginBottom: '1rem', padding: '1rem' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', margin: '0 0 0.75rem' }}>
                {category}
                <span style={{ fontWeight: 400, color: '#9ca3af', marginLeft: '0.5rem' }}>
                  ({items.filter(i => !checked.has(i.item)).length}/{items.length})
                </span>
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {items.map((ing) => (
                  <IngredientRow
                    key={ing.item}
                    ingredient={ing}
                    checked={checked.has(ing.item)}
                    onToggle={() => toggleItem(ing.item)}
                    isCommon={isCommonlyStocked(ing.item)}
                  />
                ))}
              </div>
            </Card>
          );
        })
      ) : (
        <Card style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {filteredIngredients
              .sort((a, b) => a.item.localeCompare(b.item))
              .map((ing) => (
                <IngredientRow
                  key={ing.item}
                  ingredient={ing}
                  checked={checked.has(ing.item)}
                  onToggle={() => toggleItem(ing.item)}
                  isCommon={isCommonlyStocked(ing.item)}
                />
              ))}
          </div>
        </Card>
      )}

      {filteredIngredients.length === 0 && (
        <Card style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🛒</div>
          <p style={{ color: '#6b7280' }}>
            {hideCommon ? 'All items are pantry staples!' : 'No meals planned yet'}
          </p>
        </Card>
      )}
    </div>
  );
}

// ============================================
// Ingredient Row Component
// ============================================

interface IngredientRowProps {
  ingredient: AggregatedIngredient;
  checked: boolean;
  onToggle: () => void;
  isCommon: boolean;
}

function IngredientRow({ ingredient, checked, onToggle, isCommon }: IngredientRowProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.5rem',
        borderRadius: '0.375rem',
        background: checked ? '#f9fafb' : 'transparent',
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width: '1.25rem',
          height: '1.25rem',
          borderRadius: '0.25rem',
          border: `2px solid ${checked ? '#22c55e' : '#d1d5db'}`,
          background: checked ? '#22c55e' : 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {checked && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </button>

      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: '0.875rem',
            color: checked ? '#9ca3af' : '#374151',
            textDecoration: checked ? 'line-through' : 'none',
          }}
        >
          <span style={{ fontWeight: 600 }}>
            {formatAmount(ingredient.totalAmount, ingredient.unit)}
          </span>{' '}
          {ingredient.item}
          {isCommon && (
            <span
              style={{
                marginLeft: '0.5rem',
                fontSize: '0.625rem',
                padding: '0.125rem 0.375rem',
                background: '#dbeafe',
                color: '#1d4ed8',
                borderRadius: '9999px',
              }}
            >
              pantry
            </span>
          )}
        </div>
        {ingredient.recipes.length > 1 && !checked && (
          <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
            for: {ingredient.recipes.join(', ')}
          </div>
        )}
      </div>
    </div>
  );
}
