// Side Dish Suggestions Component
// Shows recommended side dishes for main course recipes

import { useState, useEffect } from 'react';
import { Card, Button, DifficultyBadge } from '../common';
import { getSideDishSuggestions, SideDishSuggestion } from '../../services/sideDishSuggestions';
import type { Recipe } from '../../types';
import { CourseTypeLabels } from '../../types';

interface SideDishSuggestionsProps {
  recipe: Recipe;
  onSelectRecipe: (recipe: Recipe) => void;
}

export function SideDishSuggestions({ recipe, onSelectRecipe }: SideDishSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<SideDishSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  // Only show suggestions for main courses
  const shouldShowSuggestions = recipe.course_type === 'main_course' || !recipe.course_type;

  useEffect(() => {
    if (shouldShowSuggestions) {
      loadSuggestions();
    } else {
      setLoading(false);
    }
  }, [recipe.id, shouldShowSuggestions]);

  async function loadSuggestions() {
    setLoading(true);
    setError(null);
    try {
      const results = await getSideDishSuggestions(recipe, {
        limit: 6,
        includeSameBookOnly: false,
      });
      setSuggestions(results);
    } catch (err) {
      setError('Failed to load suggestions');
      console.error('Failed to load side dish suggestions:', err);
    } finally {
      setLoading(false);
    }
  }

  // Don't render if not a main course or no suggestions
  if (!shouldShowSuggestions || (!loading && suggestions.length === 0)) {
    return null;
  }

  if (loading) {
    return (
      <Card style={{ marginBottom: '1rem', padding: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-tertiary)' }}>
          <span style={{ fontSize: '1.25rem' }}>🥗</span>
          <span>Finding complementary side dishes...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return null; // Silently fail for suggestions
  }

  const displayedSuggestions = expanded ? suggestions : suggestions.slice(0, 3);

  return (
    <Card style={{ marginBottom: '1rem', padding: '1rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.75rem',
        }}
      >
        <h3
          style={{
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span style={{ fontSize: '1.25rem' }}>🥗</span>
          Suggested Side Dishes
        </h3>
        <span
          style={{
            fontSize: '0.75rem',
            color: 'var(--text-tertiary)',
          }}
        >
          {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '0.75rem',
        }}
      >
        {displayedSuggestions.map((suggestion) => (
          <SuggestionCard
            key={suggestion.recipe.id}
            suggestion={suggestion}
            onClick={() => onSelectRecipe(suggestion.recipe)}
          />
        ))}
      </div>

      {suggestions.length > 3 && (
        <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Show Less' : `Show ${suggestions.length - 3} More`}
          </Button>
        </div>
      )}
    </Card>
  );
}

// ============================================
// Suggestion Card Sub-component
// ============================================

interface SuggestionCardProps {
  suggestion: SideDishSuggestion;
  onClick: () => void;
}

function SuggestionCard({ suggestion, onClick }: SuggestionCardProps) {
  const { recipe, score, reasons } = suggestion;

  // Convert score to percentage for the match indicator
  const matchPercentage = Math.round(score * 100);
  const matchColor =
    matchPercentage >= 80
      ? 'var(--success)'
      : matchPercentage >= 60
      ? 'var(--warning)'
      : 'var(--text-tertiary)';

  return (
    <div
      onClick={onClick}
      style={{
        padding: '0.75rem',
        background: 'var(--bg-secondary)',
        borderRadius: '0.5rem',
        cursor: 'pointer',
        border: '1px solid var(--border-primary)',
        transition: 'box-shadow 0.2s, transform 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = 'var(--card-shadow)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'none';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.25rem',
            }}
          >
            <h4
              style={{
                margin: 0,
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {recipe.name}
            </h4>
          </div>

          {/* Course Type Badge */}
          {recipe.course_type && CourseTypeLabels[recipe.course_type] && (
            <span
              style={{
                display: 'inline-block',
                fontSize: '0.625rem',
                padding: '0.125rem 0.375rem',
                background: 'var(--accent-light)',
                borderRadius: '9999px',
                color: 'var(--accent-primary)',
                marginBottom: '0.25rem',
              }}
            >
              {CourseTypeLabels[recipe.course_type].icon} {CourseTypeLabels[recipe.course_type].label}
            </span>
          )}

          {/* Recipe Info */}
          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              fontSize: '0.75rem',
              color: 'var(--text-tertiary)',
              marginBottom: '0.5rem',
            }}
          >
            <span>⏱ {recipe.total_time}</span>
            <span>📊 {recipe.steps.length} steps</span>
          </div>

          {/* Pairing Reasons */}
          <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>
            {reasons.slice(0, 2).join(' • ')}
          </div>
        </div>

        {/* Match Score */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginLeft: '0.5rem',
          }}
        >
          <div
            style={{
              width: '2.5rem',
              height: '2.5rem',
              borderRadius: '50%',
              background: `conic-gradient(${matchColor} ${matchPercentage}%, var(--bg-tertiary) 0%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: '2rem',
                height: '2rem',
                borderRadius: '50%',
                background: 'var(--bg-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.625rem',
                fontWeight: 600,
                color: matchColor,
              }}
            >
              {matchPercentage}%
            </div>
          </div>
          <span
            style={{
              fontSize: '0.5rem',
              color: 'var(--text-muted)',
              marginTop: '0.125rem',
            }}
          >
            Match
          </span>
        </div>
      </div>
    </div>
  );
}
