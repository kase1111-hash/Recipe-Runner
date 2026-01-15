// Theme Context
// Phase 10 Feature - Dark Mode and Theme Customization

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getPreferences, savePreferences } from '../db';

// ============================================
// Types
// ============================================

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  mode: ThemeMode;
  effectiveTheme: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

// ============================================
// CSS Variables
// ============================================

const lightTheme = {
  // Backgrounds
  '--bg-primary': '#ffffff',
  '--bg-secondary': '#f9fafb',
  '--bg-tertiary': '#f3f4f6',
  '--bg-hover': '#f3f4f6',
  '--bg-active': '#e5e7eb',

  // Card backgrounds
  '--card-bg': '#ffffff',
  '--card-border': '#e5e7eb',
  '--card-shadow': '0 1px 3px rgba(0, 0, 0, 0.1)',
  '--card-shadow-lg': '0 4px 12px rgba(0, 0, 0, 0.15)',

  // Text colors
  '--text-primary': '#111827',
  '--text-secondary': '#374151',
  '--text-tertiary': '#6b7280',
  '--text-muted': '#9ca3af',

  // Accent colors
  '--accent-primary': '#2563eb',
  '--accent-primary-hover': '#1d4ed8',
  '--accent-secondary': '#3b82f6',
  '--accent-light': '#eff6ff',

  // Status colors
  '--success': '#16a34a',
  '--success-text': '#166534',
  '--success-bg': '#dcfce7',
  '--success-border': '#86efac',
  '--warning': '#ca8a04',
  '--warning-text': '#92400e',
  '--warning-bg': '#fef3c7',
  '--warning-border': '#fcd34d',
  '--error': '#dc2626',
  '--error-text': '#991b1b',
  '--error-bg': '#fef2f2',
  '--error-border': '#fecaca',
  '--info': '#2563eb',
  '--info-bg': '#eff6ff',
  '--info-border': '#bfdbfe',

  // Borders
  '--border-primary': '#e5e7eb',
  '--border-secondary': '#d1d5db',

  // Input fields
  '--input-bg': '#ffffff',
  '--input-border': '#d1d5db',
  '--input-focus': '#2563eb',

  // Buttons
  '--btn-primary-bg': '#2563eb',
  '--btn-primary-text': '#ffffff',
  '--btn-secondary-bg': '#f3f4f6',
  '--btn-secondary-text': '#374151',
  '--btn-ghost-hover': 'rgba(0, 0, 0, 0.05)',

  // Overlay
  '--overlay-bg': 'rgba(0, 0, 0, 0.5)',
  '--overlay-light': 'rgba(255, 255, 255, 0.8)',

  // Progress/Charts
  '--progress-track': '#e5e7eb',
  '--progress-bar': '#2563eb',
};

const darkTheme = {
  // Backgrounds
  '--bg-primary': '#111827',
  '--bg-secondary': '#1f2937',
  '--bg-tertiary': '#374151',
  '--bg-hover': '#374151',
  '--bg-active': '#4b5563',

  // Card backgrounds
  '--card-bg': '#1f2937',
  '--card-border': '#374151',
  '--card-shadow': '0 1px 3px rgba(0, 0, 0, 0.3)',
  '--card-shadow-lg': '0 4px 12px rgba(0, 0, 0, 0.4)',

  // Text colors
  '--text-primary': '#f9fafb',
  '--text-secondary': '#e5e7eb',
  '--text-tertiary': '#9ca3af',
  '--text-muted': '#6b7280',

  // Accent colors
  '--accent-primary': '#3b82f6',
  '--accent-primary-hover': '#60a5fa',
  '--accent-secondary': '#2563eb',
  '--accent-light': '#1e3a5f',

  // Status colors
  '--success': '#22c55e',
  '--success-text': '#4ade80',
  '--success-bg': '#14532d',
  '--success-border': '#166534',
  '--warning': '#eab308',
  '--warning-text': '#fbbf24',
  '--warning-bg': '#422006',
  '--warning-border': '#713f12',
  '--error': '#ef4444',
  '--error-text': '#f87171',
  '--error-bg': '#450a0a',
  '--error-border': '#7f1d1d',
  '--info': '#3b82f6',
  '--info-bg': '#1e3a5f',
  '--info-border': '#1e40af',

  // Borders
  '--border-primary': '#374151',
  '--border-secondary': '#4b5563',

  // Input fields
  '--input-bg': '#1f2937',
  '--input-border': '#4b5563',
  '--input-focus': '#3b82f6',

  // Buttons
  '--btn-primary-bg': '#3b82f6',
  '--btn-primary-text': '#ffffff',
  '--btn-secondary-bg': '#374151',
  '--btn-secondary-text': '#e5e7eb',
  '--btn-ghost-hover': 'rgba(255, 255, 255, 0.1)',

  // Overlay
  '--overlay-bg': 'rgba(0, 0, 0, 0.7)',
  '--overlay-light': 'rgba(31, 41, 55, 0.9)',

  // Progress/Charts
  '--progress-track': '#374151',
  '--progress-bar': '#3b82f6',
};

// ============================================
// Context
// ============================================

const ThemeContext = createContext<ThemeContextType | null>(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// ============================================
// Provider
// ============================================

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    // Initialize from preferences
    const prefs = getPreferences();
    return prefs.dark_mode ? 'dark' : 'light';
  });

  const [systemPreference, setSystemPreference] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  // Calculate effective theme
  const effectiveTheme = mode === 'system' ? systemPreference : mode;

  // Listen for system preference changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setSystemPreference(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Apply theme CSS variables
  useEffect(() => {
    const theme = effectiveTheme === 'dark' ? darkTheme : lightTheme;
    const root = document.documentElement;

    Object.entries(theme).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });

    // Also set a data attribute for components that need it
    root.setAttribute('data-theme', effectiveTheme);

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', effectiveTheme === 'dark' ? '#111827' : '#ffffff');
    }
  }, [effectiveTheme]);

  function setMode(newMode: ThemeMode) {
    setModeState(newMode);

    // Persist to preferences
    const prefs = getPreferences();
    savePreferences({
      ...prefs,
      dark_mode: newMode === 'dark' || (newMode === 'system' && systemPreference === 'dark'),
    });
  }

  function toggleTheme() {
    setMode(effectiveTheme === 'dark' ? 'light' : 'dark');
  }

  return (
    <ThemeContext.Provider value={{ mode, effectiveTheme, setMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ============================================
// Theme Toggle Component
// ============================================

interface ThemeToggleProps {
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ThemeToggle({ showLabel = false, size = 'md' }: ThemeToggleProps) {
  const { effectiveTheme, toggleTheme } = useTheme();

  const sizes = {
    sm: { button: '1.75rem', icon: '1rem' },
    md: { button: '2.25rem', icon: '1.25rem' },
    lg: { button: '2.75rem', icon: '1.5rem' },
  };

  return (
    <button
      onClick={toggleTheme}
      title={`Switch to ${effectiveTheme === 'dark' ? 'light' : 'dark'} mode`}
      aria-label={`Switch to ${effectiveTheme === 'dark' ? 'light' : 'dark'} mode`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: showLabel ? '0.5rem 0.75rem' : '0',
        width: showLabel ? 'auto' : sizes[size].button,
        height: sizes[size].button,
        justifyContent: 'center',
        border: 'none',
        borderRadius: '0.5rem',
        background: 'var(--btn-ghost-hover)',
        cursor: 'pointer',
        color: 'var(--text-primary)',
        fontSize: sizes[size].icon,
        transition: 'background 0.2s',
      }}
    >
      {effectiveTheme === 'dark' ? '🌙' : '☀️'}
      {showLabel && (
        <span style={{ fontSize: '0.875rem' }}>
          {effectiveTheme === 'dark' ? 'Dark' : 'Light'}
        </span>
      )}
    </button>
  );
}
