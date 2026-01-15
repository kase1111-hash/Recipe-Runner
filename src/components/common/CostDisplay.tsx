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
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>
            Estimated Cost
          </h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              {formatCurrency(cost.totalCost)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
              {formatCurrency(cost.costPerServing)}/serving
            </div>
          </div>
          <ConfidenceBadge confidence={cost.confidence} />
          <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>
            {expanded ? '▲' : '▼'}
          </span>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-primary)' }}>
          {/* Cost Breakdown */}
          <h4 style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', margin: '0 0 0.75rem', textTransform: 'uppercase' }}>
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
                  background: index % 2 === 0 ? 'var(--bg-secondary)' : 'var(--card-bg)',
                  borderRadius: '0.25rem',
                }}
              >
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{ic.name}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                    ({ic.amount} {ic.unit})
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    style={{
                      width: '60px',
                      height: '4px',
                      background: 'var(--progress-track)',
                      borderRadius: '2px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(100, ic.percentOfTotal)}%`,
                        height: '100%',
                        background: 'var(--success)',
                        borderRadius: '2px',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', minWidth: '50px', textAlign: 'right' }}>
                    {formatCurrency(ic.totalCost)}
                  </span>
                </div>
              </div>
            ))}
            {cost.ingredients.length > 8 && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textAlign: 'center', padding: '0.25rem' }}>
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
                background: 'var(--warning-bg)',
                borderRadius: '0.375rem',
              }}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--warning-text)', marginBottom: '0.25rem' }}>
                Missing Prices ({cost.unknownIngredients.length})
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--warning-text)' }}>
                {cost.unknownIngredients.slice(0, 5).join(', ')}
                {cost.unknownIngredients.length > 5 && ` and ${cost.unknownIngredients.length - 5} more`}
              </div>
            </div>
          )}

          {/* Cost Savings Tips */}
          <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
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
        background: 'var(--success-bg)',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        color: 'var(--success-text)',
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
  const styles = {
    high: { bg: 'var(--success-bg)', text: 'var(--success-text)' },
    medium: { bg: 'var(--warning-bg)', text: 'var(--warning-text)' },
    low: { bg: 'var(--error-bg)', text: 'var(--error-text)' },
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
        background: styles[confidence].bg,
        color: styles[confidence].text,
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
