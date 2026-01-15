import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

const variants = {
  primary: {
    background: '#2563eb',
    color: '#ffffff',
    border: 'none',
    hoverBackground: '#1d4ed8',
  },
  secondary: {
    background: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
    hoverBackground: '#e5e7eb',
  },
  danger: {
    background: '#dc2626',
    color: '#ffffff',
    border: 'none',
    hoverBackground: '#b91c1c',
  },
  ghost: {
    background: 'transparent',
    color: '#374151',
    border: 'none',
    hoverBackground: '#f3f4f6',
  },
};

const sizes = {
  sm: { padding: '0.375rem 0.75rem', fontSize: '0.875rem' },
  md: { padding: '0.5rem 1rem', fontSize: '1rem' },
  lg: { padding: '0.75rem 1.5rem', fontSize: '1.125rem' },
};

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  style,
  disabled,
  ...props
}: ButtonProps) {
  const variantStyles = variants[variant];
  const sizeStyles = sizes[size];

  return (
    <button
      {...props}
      disabled={disabled}
      style={{
        ...sizeStyles,
        background: disabled ? '#d1d5db' : variantStyles.background,
        color: disabled ? '#9ca3af' : variantStyles.color,
        border: variantStyles.border,
        borderRadius: '0.5rem',
        fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background-color 0.2s, transform 0.1s',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        ...style,
      }}
    >
      {children}
    </button>
  );
}
