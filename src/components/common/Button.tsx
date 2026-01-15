import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

const variants = {
  primary: {
    background: 'var(--btn-primary-bg)',
    color: 'var(--btn-primary-text)',
    border: 'none',
  },
  secondary: {
    background: 'var(--btn-secondary-bg)',
    color: 'var(--btn-secondary-text)',
    border: '1px solid var(--border-secondary)',
  },
  danger: {
    background: 'var(--error)',
    color: '#ffffff',
    border: 'none',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text-secondary)',
    border: 'none',
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
        background: disabled ? 'var(--border-secondary)' : variantStyles.background,
        color: disabled ? 'var(--text-muted)' : variantStyles.color,
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
