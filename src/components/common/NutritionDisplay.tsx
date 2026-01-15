// Nutrition Display Component
// Phase 6 Feature - Show nutritional information

import { useMemo, useState } from 'react';
import { Card } from './Card';
import {
  getDetailedNutrition,
  getDailyValuePercent,
  type NutritionPerServing,
} from '../../services/nutrition';
import type { Recipe } from '../../types';

interface NutritionDisplayProps {
  recipe: Recipe;
  compact?: boolean;
}

export function NutritionDisplay({ recipe, compact = false }: NutritionDisplayProps) {
  const [showDetails, setShowDetails] = useState(false);

  const nutritionData = useMemo(() => {
    return getDetailedNutrition(recipe);
  }, [recipe]);

  const dailyValues = useMemo(() => {
    return getDailyValuePercent(nutritionData.perServing);
  }, [nutritionData]);

  if (compact) {
    return (
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          fontSize: '0.75rem',
          color: '#6b7280',
        }}
      >
        <span>🔥 {nutritionData.perServing.calories} cal</span>
        <span>🥩 {nutritionData.perServing.protein}g protein</span>
        <span>🍞 {nutritionData.perServing.carbohydrates}g carbs</span>
        <span>🧈 {nutritionData.perServing.fat}g fat</span>
      </div>
    );
  }

  return (
    <Card style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
          Nutrition Facts
          <span style={{ fontWeight: 400, color: '#9ca3af', marginLeft: '0.5rem' }}>
            (per serving)
          </span>
        </h3>
        {nutritionData.coveragePercent < 100 && (
          <span
            style={{
              fontSize: '0.625rem',
              padding: '0.125rem 0.5rem',
              background: '#fef3c7',
              color: '#92400e',
              borderRadius: '9999px',
            }}
            title={`${nutritionData.coveragePercent}% of ingredients matched`}
          >
            ~{nutritionData.coveragePercent}% estimated
          </span>
        )}
      </div>

      {/* Main stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '0.5rem',
          marginBottom: '1rem',
        }}
      >
        <NutritionStat
          label="Calories"
          value={nutritionData.perServing.calories}
          unit=""
          percent={dailyValues.calories}
          color="#ef4444"
        />
        <NutritionStat
          label="Protein"
          value={nutritionData.perServing.protein}
          unit="g"
          percent={dailyValues.protein}
          color="#22c55e"
        />
        <NutritionStat
          label="Carbs"
          value={nutritionData.perServing.carbohydrates}
          unit="g"
          percent={dailyValues.carbohydrates}
          color="#f59e0b"
        />
        <NutritionStat
          label="Fat"
          value={nutritionData.perServing.fat}
          unit="g"
          percent={dailyValues.fat}
          color="#3b82f6"
        />
      </div>

      {/* Toggle details */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          background: 'none',
          border: 'none',
          color: '#6b7280',
          fontSize: '0.75rem',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        {showDetails ? '▼' : '▶'} More details
      </button>

      {/* Detailed view */}
      {showDetails && (
        <div style={{ marginTop: '0.75rem' }}>
          {/* Additional nutrients */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '0.5rem',
              marginBottom: '1rem',
            }}
          >
            <NutritionStat
              label="Fiber"
              value={nutritionData.perServing.fiber}
              unit="g"
              percent={dailyValues.fiber}
              color="#84cc16"
              small
            />
            <NutritionStat
              label="Sugar"
              value={nutritionData.perServing.sugar}
              unit="g"
              percent={dailyValues.sugar}
              color="#ec4899"
              small
            />
            <NutritionStat
              label="Sodium"
              value={nutritionData.perServing.sodium}
              unit="mg"
              percent={dailyValues.sodium}
              color="#8b5cf6"
              small
            />
          </div>

          {/* Ingredient breakdown */}
          {nutritionData.breakdown.length > 0 && (
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', marginBottom: '0.5rem' }}>
                Top Contributors
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {nutritionData.breakdown
                  .sort((a, b) => b.nutrition.calories - a.nutrition.calories)
                  .slice(0, 5)
                  .map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.75rem',
                        padding: '0.25rem 0',
                        borderBottom: '1px solid #f3f4f6',
                      }}
                    >
                      <span style={{ color: '#374151' }}>
                        {item.ingredient}
                        {item.confidence !== 'high' && (
                          <span style={{ color: '#9ca3af', marginLeft: '0.25rem' }}>
                            ({item.confidence})
                          </span>
                        )}
                      </span>
                      <span style={{ color: '#6b7280' }}>
                        {item.nutrition.calories} cal
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Servings info */}
          <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#9ca3af' }}>
            Based on {nutritionData.perServing.servings} servings •
            Total recipe: {nutritionData.total.calories} calories
          </div>
        </div>
      )}
    </Card>
  );
}

// ============================================
// Nutrition Stat Component
// ============================================

interface NutritionStatProps {
  label: string;
  value: number;
  unit: string;
  percent: number;
  color: string;
  small?: boolean;
}

function NutritionStat({ label, value, unit, percent, color, small }: NutritionStatProps) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: small ? '0.5rem' : '0.75rem',
        background: '#f9fafb',
        borderRadius: '0.5rem',
      }}
    >
      <div
        style={{
          fontSize: small ? '1rem' : '1.25rem',
          fontWeight: 700,
          color: '#111827',
        }}
      >
        {value}
        <span style={{ fontSize: small ? '0.625rem' : '0.75rem', fontWeight: 400, color: '#6b7280' }}>
          {unit}
        </span>
      </div>
      <div style={{ fontSize: '0.625rem', color: '#6b7280', marginBottom: '0.25rem' }}>
        {label}
      </div>
      {/* Progress bar */}
      <div
        style={{
          height: '0.25rem',
          background: '#e5e7eb',
          borderRadius: '9999px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${Math.min(percent, 100)}%`,
            background: color,
            borderRadius: '9999px',
          }}
        />
      </div>
      <div style={{ fontSize: '0.5rem', color: '#9ca3af', marginTop: '0.125rem' }}>
        {percent}% DV
      </div>
    </div>
  );
}

// ============================================
// Inline Nutrition Badge
// ============================================

interface NutritionBadgeProps {
  nutrition: NutritionPerServing;
}

export function NutritionBadge({ nutrition }: NutritionBadgeProps) {
  return (
    <div
      style={{
        display: 'inline-flex',
        gap: '0.5rem',
        padding: '0.25rem 0.5rem',
        background: '#f3f4f6',
        borderRadius: '0.25rem',
        fontSize: '0.75rem',
      }}
    >
      <span style={{ color: '#ef4444' }}>🔥 {nutrition.calories}</span>
      <span style={{ color: '#22c55e' }}>P: {nutrition.protein}g</span>
      <span style={{ color: '#f59e0b' }}>C: {nutrition.carbohydrates}g</span>
      <span style={{ color: '#3b82f6' }}>F: {nutrition.fat}g</span>
    </div>
  );
}
