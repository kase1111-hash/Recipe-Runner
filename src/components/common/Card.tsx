import type { ReactNode, CSSProperties, MouseEvent } from 'react';

interface CardProps {
  children: ReactNode;
  style?: CSSProperties;
  onClick?: (e: MouseEvent<HTMLDivElement>) => void;
  hoverable?: boolean;
}

export function Card({ children, style, onClick, hoverable = false }: CardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--card-bg)',
        borderRadius: '1rem',
        padding: '1.5rem',
        boxShadow: 'var(--card-shadow)',
        border: '1px solid var(--card-border)',
        cursor: onClick ? 'pointer' : 'default',
        transition: hoverable ? 'transform 0.2s, box-shadow 0.2s' : undefined,
        ...style,
      }}
      onMouseEnter={(e) => {
        if (hoverable) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
        }
      }}
      onMouseLeave={(e) => {
        if (hoverable) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'var(--card-shadow)';
        }
      }}
    >
      {children}
    </div>
  );
}
