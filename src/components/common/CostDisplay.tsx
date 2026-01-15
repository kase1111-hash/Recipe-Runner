// Cost Display Component
// Phase 7 Feature - Show estimated recipe costs

import { useState, useMemo } from 'react';
import { Card } from './Card';
import {
  calculateRecipeCost,
  formatCurrency,
  type RecipeCost,
} from '../../services/costEstimation';
import type { Recipe } from '../../types';

interface CostDisplayProps {
  recipe: Recipe;
  compact?: boolean;
}

export function CostDisplay({ recipe, compact = false }: CostDisplayProps) {
  const [expanded, setExpanded] = useState(false);

  const cost = useMemo(() => calculateRecipeCost(recipe), [recipe]);

  if (compact) {
    return <CostBadge cost={cost} />;
  }

  return (
    <Card style={{ padding: '1rem' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.25rem' }}>💰</span>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', margin: 0 }}>
            Estimated Cost
          </h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 600, color: '#111827' }}>
              {formatCurrency(cost.totalCost)}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
              {formatCurrency(cost.costPerServing)}/serving
            </div>
          </div>
          <ConfidenceBadge confidence={cost.confidence} />
          <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>
            {expanded ? '▲' : '▼'}
          </span>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
          {/* Cost Breakdown */}
          <h4 style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', margin: '0 0 0.75rem', textTransform: 'uppercase' }}>
            Cost Breakdown
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {cost.ingredients.slice(0, 8).map((ic, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.375rem 0.5rem',
                  background: index % 2 === 0 ? '#f9fafb' : 'white',
                  borderRadius: '0.25rem',
                }}
              >
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '0.875rem', color: '#374151' }}>{ic.name}</span>
                  <span style={{ fontSize: '0.75rem', color: '#9ca3af', marginLeft: '0.5rem' }}>
                    ({ic.amount} {ic.unit})
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    style={{
                      width: '60px',
                      height: '4px',
                      background: '#e5e7eb',
                      borderRadius: '2px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(100, ic.percentOfTotal)}%`,
                        height: '100%',
                        background: '#10b981',
                        borderRadius: '2px',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827', minWidth: '50px', textAlign: 'right' }}>
                    {formatCurrency(ic.totalCost)}
                  </span>
                </div>
              </div>
            ))}
            {cost.ingredients.length > 8 && (
              <div style={{ fontSize: '0.75rem', color: '#6b7280', textAlign: 'center', padding: '0.25rem' }}>
                +{cost.ingredients.length - 8} more ingredients
              </div>
            )}
          </div>

          {/* Unknown Ingredients Warning */}
          {cost.unknownIngredients.length > 0 && (
            <div
              style={{
                marginTop: '1rem',
                padding: '0.75rem',
                background: '#fef3c7',
                borderRadius: '0.375rem',
              }}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: 500, color: '#92400e', marginBottom: '0.25rem' }}>
                Missing Prices ({cost.unknownIngredients.length})
              </div>
              <div style={{ fontSize: '0.75rem', color: '#92400e' }}>
                {cost.unknownIngredients.slice(0, 5).join(', ')}
                {cost.unknownIngredients.length > 5 && ` and ${cost.unknownIngredients.length - 5} more`}
              </div>
            </div>
          )}

          {/* Cost Savings Tips */}
          <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#6b7280' }}>
            <strong>Tip:</strong> The most expensive ingredient is {cost.ingredients[0]?.name || 'unknown'}{' '}
            ({Math.round(cost.ingredients[0]?.percentOfTotal || 0)}% of total cost).
          </div>
        </div>
      )}
    </Card>
  );
}

// Compact Cost Badge
interface CostBadgeProps {
  cost: RecipeCost;
}

export function CostBadge({ cost }: CostBadgeProps) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.375rem',
        padding: '0.25rem 0.5rem',
        background: '#d1fae5',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        color: '#065f46',
      }}
    >
      <span>💰</span>
      <span style={{ fontWeight: 500 }}>{formatCurrency(cost.costPerServing)}/serving</span>
    </div>
  );
}

// Standalone badge for use in lists
interface RecipeCostBadgeProps {
  recipe: Recipe;
}

export function RecipeCostBadge({ recipe }: RecipeCostBadgeProps) {
  const cost = useMemo(() => calculateRecipeCost(recipe), [recipe]);
  return <CostBadge cost={cost} />;
}

// Confidence Badge
function ConfidenceBadge({ confidence }: { confidence: 'high' | 'medium' | 'low' }) {
  const colors = {
    high: { bg: '#d1fae5', text: '#065f46' },
    medium: { bg: '#fef3c7', text: '#92400e' },
    low: { bg: '#fee2e2', text: '#991b1b' },
  };

  const labels = {
    high: 'Accurate',
    medium: 'Estimate',
    low: 'Rough',
  };

  return (
    <span
      style={{
        padding: '0.125rem 0.375rem',
        background: colors[confidence].bg,
        color: colors[confidence].text,
        borderRadius: '0.25rem',
        fontSize: '0.625rem',
        fontWeight: 500,
        textTransform: 'uppercase',
      }}
    >
      {labels[confidence]}
    </span>
  );
}
