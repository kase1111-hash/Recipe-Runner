interface ProgressBarProps {
  value: number;
  max: number;
  showLabel?: boolean;
  color?: string;
}

export function ProgressBar({
  value,
  max,
  showLabel = true,
  color = '#2563eb',
}: ProgressBarProps) {
  const percentage = max > 0 ? Math.round((value / max) * 100) : 0;

  return (
    <div style={{ width: '100%' }}>
      {showLabel && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '0.25rem',
            fontSize: '0.875rem',
            color: '#6b7280',
          }}
        >
          <span>
            {value} / {max}
          </span>
          <span>{percentage}%</span>
        </div>
      )}
      <div
        style={{
          width: '100%',
          height: '0.5rem',
          background: '#e5e7eb',
          borderRadius: '9999px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: '100%',
            background: color,
            borderRadius: '9999px',
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </div>
  );
}
