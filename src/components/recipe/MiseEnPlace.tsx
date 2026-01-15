// Mise en Place Mode
// Phase 4 Smart Feature - Pre-cooking preparation checklist

import { useState, useMemo } from 'react';
import { Button, Card } from '../common';
import { findSubstitutions, type SubstitutionResult } from '../../services/substitutions';
import type { Recipe, Ingredient } from '../../types';

interface MiseEnPlaceProps {
  recipe: Recipe;
  onComplete: () => void;
  onBack: () => void;
}

interface PrepItem extends Ingredient {
  id: string;
  gathered: boolean;
  prepped: boolean;
  substitution?: string;
}

type PrepCategory = 'proteins' | 'produce' | 'dairy' | 'pantry' | 'spices' | 'other';

const CATEGORY_KEYWORDS: Record<PrepCategory, string[]> = {
  proteins: ['chicken', 'beef', 'pork', 'fish', 'salmon', 'shrimp', 'tofu', 'egg', 'turkey', 'lamb', 'bacon', 'sausage'],
  produce: ['onion', 'garlic', 'tomato', 'pepper', 'lettuce', 'spinach', 'carrot', 'celery', 'potato', 'mushroom', 'lemon', 'lime', 'apple', 'banana', 'berry', 'herb', 'basil', 'cilantro', 'parsley', 'thyme', 'rosemary'],
  dairy: ['milk', 'cream', 'butter', 'cheese', 'yogurt', 'sour cream'],
  pantry: ['flour', 'sugar', 'oil', 'vinegar', 'broth', 'stock', 'pasta', 'rice', 'bread', 'can', 'sauce'],
  spices: ['salt', 'pepper', 'cumin', 'paprika', 'cinnamon', 'oregano', 'chili', 'curry', 'turmeric', 'ginger'],
  other: [],
};

const CATEGORY_LABELS: Record<PrepCategory, { label: string; icon: string }> = {
  proteins: { label: 'Proteins', icon: '🥩' },
  produce: { label: 'Produce', icon: '🥬' },
  dairy: { label: 'Dairy', icon: '🧈' },
  pantry: { label: 'Pantry', icon: '🥫' },
  spices: { label: 'Spices & Seasonings', icon: '🧂' },
  other: { label: 'Other', icon: '📦' },
};

function categorizeIngredient(item: string): PrepCategory {
  const lower = item.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (category === 'other') continue;
    if (keywords.some(kw => lower.includes(kw))) {
      return category as PrepCategory;
    }
  }
  return 'other';
}

export function MiseEnPlace({ recipe, onComplete, onBack }: MiseEnPlaceProps) {
  const [prepItems, setPrepItems] = useState<PrepItem[]>(() =>
    recipe.ingredients.map((ing, idx) => ({
      ...ing,
      id: `prep-${idx}`,
      gathered: false,
      prepped: !ing.prep, // If no prep required, mark as prepped
      substitution: undefined,
    }))
  );
  const [showSubstitutions, setShowSubstitutions] = useState<string | null>(null);

  // Group ingredients by category
  const categorizedItems = useMemo(() => {
    const groups: Record<PrepCategory, PrepItem[]> = {
      proteins: [],
      produce: [],
      dairy: [],
      pantry: [],
      spices: [],
      other: [],
    };

    prepItems.forEach(item => {
      const category = categorizeIngredient(item.item);
      groups[category].push(item);
    });

    return groups;
  }, [prepItems]);

  const toggleGathered = (id: string) => {
    setPrepItems(items =>
      items.map(item =>
        item.id === id ? { ...item, gathered: !item.gathered } : item
      )
    );
  };

  const togglePrepped = (id: string) => {
    setPrepItems(items =>
      items.map(item =>
        item.id === id ? { ...item, prepped: !item.prepped } : item
      )
    );
  };

  const setSubstitution = (id: string, sub: string) => {
    setPrepItems(items =>
      items.map(item =>
        item.id === id ? { ...item, substitution: sub } : item
      )
    );
    setShowSubstitutions(null);
  };

  const progress = useMemo(() => {
    const total = prepItems.length * 2; // Both gathered and prepped
    const completed = prepItems.reduce((acc, item) => {
      return acc + (item.gathered ? 1 : 0) + (item.prepped ? 1 : 0);
    }, 0);
    return Math.round((completed / total) * 100);
  }, [prepItems]);

  const allReady = prepItems.every(item => item.gathered && item.prepped);

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem' }}>
        <Button variant="ghost" onClick={onBack} style={{ marginBottom: '1rem' }}>
          ← Back
        </Button>
        <h1
          style={{
            fontSize: '1.75rem',
            fontWeight: 700,
            color: '#111827',
            margin: '0 0 0.5rem',
          }}
        >
          Mise en Place
        </h1>
        <p style={{ color: '#6b7280', margin: 0 }}>
          "Everything in its place" - Gather and prep your ingredients before cooking
        </p>
      </header>

      {/* Progress Bar */}
      <div style={{ marginBottom: '2rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '0.5rem',
          }}
        >
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
            Preparation Progress
          </span>
          <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>{progress}%</span>
        </div>
        <div
          style={{
            height: '0.5rem',
            background: '#e5e7eb',
            borderRadius: '9999px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: progress === 100 ? '#22c55e' : '#2563eb',
              borderRadius: '9999px',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* Recipe Info */}
      <Card style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', margin: '0 0 0.5rem' }}>
          {recipe.name}
        </h2>
        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
          <span>🍽 {recipe.yield}</span>
          <span>⏱ {recipe.total_time}</span>
          <span>📋 {recipe.ingredients.length} ingredients</span>
        </div>
      </Card>

      {/* Equipment Check */}
      {recipe.equipment.length > 0 && (
        <Card style={{ marginBottom: '1.5rem', padding: '1rem' }}>
          <h3
            style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#374151',
              margin: '0 0 0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            🔧 Equipment Needed
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {recipe.equipment.map((eq, idx) => (
              <span
                key={idx}
                style={{
                  padding: '0.25rem 0.75rem',
                  background: '#f3f4f6',
                  borderRadius: '9999px',
                  fontSize: '0.875rem',
                  color: '#374151',
                }}
              >
                {eq}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Categorized Ingredients */}
      {Object.entries(categorizedItems).map(([category, items]) => {
        if (items.length === 0) return null;
        const { label, icon } = CATEGORY_LABELS[category as PrepCategory];

        return (
          <Card key={category} style={{ marginBottom: '1rem', padding: '1rem' }}>
            <h3
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#374151',
                margin: '0 0 0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span>{icon}</span>
              {label}
              <span style={{ color: '#9ca3af', fontWeight: 400 }}>
                ({items.filter(i => i.gathered && i.prepped).length}/{items.length})
              </span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem',
                    background: item.gathered && item.prepped ? '#f0fdf4' : '#f9fafb',
                    borderRadius: '0.5rem',
                    border: `1px solid ${item.gathered && item.prepped ? '#bbf7d0' : '#e5e7eb'}`,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 600, color: '#374151' }}>
                        {item.amount} {item.unit}
                      </span>
                      <span style={{ color: '#374151' }}>
                        {item.substitution || item.item}
                      </span>
                      {item.substitution && (
                        <span
                          style={{
                            fontSize: '0.75rem',
                            color: '#6b7280',
                            textDecoration: 'line-through',
                          }}
                        >
                          (was: {item.item})
                        </span>
                      )}
                    </div>
                    {item.prep && (
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                        Prep: {item.prep}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {/* Substitution button */}
                    <div style={{ position: 'relative' }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowSubstitutions(showSubstitutions === item.id ? null : item.id)}
                        style={{ fontSize: '0.75rem' }}
                      >
                        🔄
                      </Button>
                      {showSubstitutions === item.id && (
                        <SubstitutionDropdown
                          ingredient={item.item}
                          onSelect={(sub) => setSubstitution(item.id, sub)}
                          onClose={() => setShowSubstitutions(null)}
                        />
                      )}
                    </div>

                    {/* Gathered checkbox */}
                    <button
                      onClick={() => toggleGathered(item.id)}
                      style={{
                        width: '2rem',
                        height: '2rem',
                        borderRadius: '0.375rem',
                        border: `2px solid ${item.gathered ? '#22c55e' : '#d1d5db'}`,
                        background: item.gathered ? '#22c55e' : 'white',
                        color: 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.875rem',
                      }}
                      title="Gathered"
                    >
                      {item.gathered ? '✓' : '📥'}
                    </button>

                    {/* Prepped checkbox */}
                    {item.prep && (
                      <button
                        onClick={() => togglePrepped(item.id)}
                        style={{
                          width: '2rem',
                          height: '2rem',
                          borderRadius: '0.375rem',
                          border: `2px solid ${item.prepped ? '#22c55e' : '#d1d5db'}`,
                          background: item.prepped ? '#22c55e' : 'white',
                          color: 'white',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.875rem',
                        }}
                        title="Prepped"
                      >
                        {item.prepped ? '✓' : '🔪'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        );
      })}

      {/* Action Button */}
      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        {allReady ? (
          <Button onClick={onComplete} style={{ minWidth: '200px' }}>
            ✓ Start Cooking!
          </Button>
        ) : (
          <div>
            <Button variant="secondary" onClick={onComplete} style={{ minWidth: '200px' }}>
              Skip to Cooking
            </Button>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
              {prepItems.filter(i => !i.gathered).length} items still to gather,{' '}
              {prepItems.filter(i => !i.prepped && i.prep).length} items still to prep
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Substitution Dropdown Component
interface SubstitutionDropdownProps {
  ingredient: string;
  onSelect: (sub: string) => void;
  onClose: () => void;
}

function SubstitutionDropdown({ ingredient, onSelect, onClose }: SubstitutionDropdownProps) {
  // Create a minimal Ingredient object for the lookup
  const substitution: SubstitutionResult | null = findSubstitutions({
    item: ingredient,
    amount: '',
    unit: '',
    prep: null,
    optional: false,
    substitutes: [],
  });

  return (
    <div
      style={{
        position: 'absolute',
        top: '100%',
        right: 0,
        zIndex: 100,
        minWidth: '250px',
        background: 'white',
        borderRadius: '0.5rem',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        border: '1px solid #e5e7eb',
        padding: '0.5rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.5rem',
          paddingBottom: '0.5rem',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151' }}>
          Substitutes for {ingredient}
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#6b7280',
          }}
        >
          ×
        </button>
      </div>

      {substitution ? (
        <div style={{ maxHeight: '200px', overflow: 'auto' }}>
          {substitution.substitutes.map((sub, idx: number) => (
            <button
              key={idx}
              onClick={() => onSelect(sub.substitute)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '0.5rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                borderRadius: '0.25rem',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f4f6')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
            >
              <div style={{ fontWeight: 500, color: '#374151', fontSize: '0.875rem' }}>
                {sub.substitute}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                {sub.ratio} • {sub.notes}
              </div>
              {sub.dietaryTags && sub.dietaryTags.length > 0 && (
                <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.25rem' }}>
                  {sub.dietaryTags.map((tag: string) => (
                    <span
                      key={tag}
                      style={{
                        fontSize: '0.625rem',
                        padding: '0.125rem 0.375rem',
                        background: '#dbeafe',
                        color: '#1d4ed8',
                        borderRadius: '9999px',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      ) : (
        <div style={{ padding: '1rem', textAlign: 'center', color: '#6b7280', fontSize: '0.875rem' }}>
          No substitutions found for this ingredient
        </div>
      )}
    </div>
  );
}
