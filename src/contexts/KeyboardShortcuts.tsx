/* eslint-disable react-refresh/only-export-components */
// Keyboard Shortcuts System
// Phase 10 Feature - Keyboard shortcuts for power users

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

// ============================================
// Types
// ============================================

export interface ShortcutDefinition {
  key: string;
  modifiers?: ('ctrl' | 'alt' | 'shift' | 'meta')[];
  description: string;
  category: 'navigation' | 'actions' | 'cooking' | 'general';
}

interface KeyboardShortcutsContextType {
  shortcuts: Record<string, ShortcutDefinition>;
  registerShortcut: (id: string, handler: () => void) => void;
  unregisterShortcut: (id: string) => void;
  showHelp: boolean;
  setShowHelp: (show: boolean) => void;
}

// ============================================
// Default Shortcuts
// ============================================

export const defaultShortcuts: Record<string, ShortcutDefinition> = {
  // Navigation
  'nav-home': {
    key: 'h',
    modifiers: ['ctrl'],
    description: 'Go to home/library',
    category: 'navigation',
  },
  'nav-back': {
    key: 'Escape',
    description: 'Go back / Close modal',
    category: 'navigation',
  },
  'nav-search': {
    key: '/',
    description: 'Focus search',
    category: 'navigation',
  },

  // Actions
  'action-favorite': {
    key: 'f',
    modifiers: ['ctrl'],
    description: 'Toggle favorite',
    category: 'actions',
  },
  'action-share': {
    key: 's',
    modifiers: ['ctrl', 'shift'],
    description: 'Share recipe',
    category: 'actions',
  },

  // Cooking
  'cooking-next': {
    key: 'ArrowRight',
    description: 'Next step',
    category: 'cooking',
  },
  'cooking-prev': {
    key: 'ArrowLeft',
    description: 'Previous step',
    category: 'cooking',
  },
  'cooking-timer': {
    key: 't',
    description: 'Start/pause timer',
    category: 'cooking',
  },
  'cooking-chef': {
    key: '?',
    modifiers: ['shift'],
    description: 'Ask Chef Ollama',
    category: 'cooking',
  },

  // General
  'general-help': {
    key: '?',
    description: 'Show keyboard shortcuts',
    category: 'general',
  },
  'general-theme': {
    key: 'd',
    modifiers: ['ctrl'],
    description: 'Toggle dark mode',
    category: 'general',
  },
};

// ============================================
// Context
// ============================================

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextType | null>(null);

export function useKeyboardShortcuts() {
  const context = useContext(KeyboardShortcutsContext);
  if (!context) {
    throw new Error('useKeyboardShortcuts must be used within a KeyboardShortcutsProvider');
  }
  return context;
}

// ============================================
// Provider
// ============================================

interface KeyboardShortcutsProviderProps {
  children: ReactNode;
}

export function KeyboardShortcutsProvider({ children }: KeyboardShortcutsProviderProps) {
  const [handlers, setHandlers] = useState<Record<string, () => void>>({});
  const [showHelp, setShowHelp] = useState(false);

  function registerShortcut(id: string, handler: () => void) {
    setHandlers((prev) => ({ ...prev, [id]: handler }));
  }

  function unregisterShortcut(id: string) {
    setHandlers((prev) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [id]: _removed, ...rest } = prev;
      return rest;
    });
  }

  // Global keyboard event listener
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Don't trigger shortcuts when typing in inputs
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        // Allow Escape to work in inputs
        if (event.key !== 'Escape') {
          return;
        }
      }

      // Find matching shortcut
      for (const [id, shortcut] of Object.entries(defaultShortcuts)) {
        const modifiersMatch =
          (!shortcut.modifiers ||
            shortcut.modifiers.every((mod) => {
              switch (mod) {
                case 'ctrl':
                  return event.ctrlKey || event.metaKey;
                case 'alt':
                  return event.altKey;
                case 'shift':
                  return event.shiftKey;
                case 'meta':
                  return event.metaKey;
                default:
                  return false;
              }
            })) &&
          // Ensure no extra modifiers are pressed (except for shortcuts that need them)
          (shortcut.modifiers?.includes('ctrl') || (!event.ctrlKey && !event.metaKey)) &&
          (shortcut.modifiers?.includes('alt') || !event.altKey) &&
          (shortcut.modifiers?.includes('shift') || !event.shiftKey || shortcut.key === '?');

        if (modifiersMatch && event.key === shortcut.key) {
          // Check if handler exists
          if (handlers[id]) {
            event.preventDefault();
            handlers[id]();
            return;
          }

          // Special case for help shortcut
          if (id === 'general-help') {
            event.preventDefault();
            setShowHelp((prev) => !prev);
            return;
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);

  return (
    <KeyboardShortcutsContext.Provider
      value={{
        shortcuts: defaultShortcuts,
        registerShortcut,
        unregisterShortcut,
        showHelp,
        setShowHelp,
      }}
    >
      {children}
      {showHelp && <KeyboardShortcutsHelp onClose={() => setShowHelp(false)} />}
    </KeyboardShortcutsContext.Provider>
  );
}

// ============================================
// Help Modal Component
// ============================================

interface KeyboardShortcutsHelpProps {
  onClose: () => void;
}

function KeyboardShortcutsHelp({ onClose }: KeyboardShortcutsHelpProps) {
  const categories: Record<string, string> = {
    navigation: 'Navigation',
    actions: 'Actions',
    cooking: 'Cooking',
    general: 'General',
  };

  const shortcutsByCategory = Object.entries(defaultShortcuts).reduce(
    (acc, [, shortcut]) => {
      if (!acc[shortcut.category]) {
        acc[shortcut.category] = [];
      }
      acc[shortcut.category].push(shortcut);
      return acc;
    },
    {} as Record<string, ShortcutDefinition[]>
  );

  function formatKey(shortcut: ShortcutDefinition): string {
    const parts: string[] = [];
    if (shortcut.modifiers) {
      if (shortcut.modifiers.includes('ctrl')) parts.push('Ctrl');
      if (shortcut.modifiers.includes('alt')) parts.push('Alt');
      if (shortcut.modifiers.includes('shift')) parts.push('Shift');
      if (shortcut.modifiers.includes('meta')) parts.push('Cmd');
    }
    parts.push(shortcut.key === ' ' ? 'Space' : shortcut.key);
    return parts.join(' + ');
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--card-bg)',
          borderRadius: '1rem',
          padding: '2rem',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: '1.5rem',
              color: 'var(--text-tertiary)',
            }}
          >
            ×
          </button>
        </div>

        {Object.entries(categories).map(([category, title]) => (
          <div key={category} style={{ marginBottom: '1.5rem' }}>
            <h3
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '0.75rem',
              }}
            >
              {title}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {shortcutsByCategory[category]?.map((shortcut, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.5rem 0',
                    borderBottom: '1px solid var(--border-primary)',
                  }}
                >
                  <span style={{ color: 'var(--text-secondary)' }}>{shortcut.description}</span>
                  <kbd
                    style={{
                      padding: '0.25rem 0.5rem',
                      background: 'var(--bg-tertiary)',
                      borderRadius: '0.25rem',
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-secondary)',
                    }}
                  >
                    {formatKey(shortcut)}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div
          style={{
            marginTop: '1rem',
            padding: '1rem',
            background: 'var(--accent-light)',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            color: 'var(--text-secondary)',
          }}
        >
          Press <kbd style={{ padding: '0.125rem 0.375rem', background: 'var(--bg-tertiary)', borderRadius: '0.25rem', fontFamily: 'monospace' }}>?</kbd> anytime to show this help
        </div>
      </div>
    </div>
  );
}

// ============================================
// Hook for registering shortcuts in components
// ============================================

export function useShortcut(id: string, handler: () => void, deps: unknown[] = []) {
  const { registerShortcut, unregisterShortcut } = useKeyboardShortcuts();

  useEffect(() => {
    registerShortcut(id, handler);
    return () => unregisterShortcut(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, ...deps]);
}
