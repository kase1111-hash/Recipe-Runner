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
          background: `${label.color}15`,
          color: label.color,
          borderRadius: '9999px',
          fontSize: '0.875rem',
          fontWeight: 600,
        }}
      >
        <span
          style={{
            width: '0.5rem',
            height: '0.5rem',
            borderRadius: '50%',
            background: label.color,
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
            color: '#6b7280',
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
  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          style={{
            width: '0.5rem',
            height: '0.5rem',
            borderRadius: '2px',
            background: i <= value ? DifficultyLabels[value].color : '#e5e7eb',
          }}
        />
      ))}
    </div>
  );
}
