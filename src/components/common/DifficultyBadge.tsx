import { DifficultyLabels, type DifficultyScore } from '../../types';

interface DifficultyBadgeProps {
  score: DifficultyScore;
  showDetails?: boolean;
}

export function DifficultyBadge({ score, showDetails = false }: DifficultyBadgeProps) {
  const label = DifficultyLabels[score.overall] || DifficultyLabels[3];

  return (
    <div style={{ display: 'inline-block' }}>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.375rem',
          padding: '0.25rem 0.75rem',
          // The level color lives in the tint, border and dot; the label uses
          // the theme's text color — amber/lime text on a near-white tint was
          // unreadable (~1.6:1) in light mode
          background: `${label.color}1f`,
          border: `1px solid ${label.color}66`,
          color: 'var(--text-primary)',
          borderRadius: '9999px',
          fontSize: '0.875rem',
          fontWeight: 600,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: '0.5rem',
            height: '0.5rem',
            borderRadius: '50%',
            background: label.color,
            flexShrink: 0,
          }}
        />
        {label.label}
      </div>

      {showDetails && (
        <div
          style={{
            marginTop: '0.75rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '0.5rem',
            fontSize: '0.75rem',
            color: 'var(--text-tertiary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span>Technique:</span>
            <ScoreIndicator value={score.technique} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span>Timing:</span>
            <ScoreIndicator value={score.timing} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span>Ingredients:</span>
            <ScoreIndicator value={score.ingredients} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span>Equipment:</span>
            <ScoreIndicator value={score.equipment} />
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreIndicator({ value }: { value: number }) {
  // Sub-scores are plain numbers — clamp so an out-of-range value (0, 6, …)
  // can't index DifficultyLabels as undefined and crash on .color
  const clamped = Math.min(5, Math.max(1, Math.round(value) || 1));
  const color = DifficultyLabels[clamped].color;
  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          style={{
            width: '0.5rem',
            height: '0.5rem',
            borderRadius: '2px',
            background: i <= clamped ? color : 'var(--progress-track)',
          }}
        />
      ))}
    </div>
  );
}
