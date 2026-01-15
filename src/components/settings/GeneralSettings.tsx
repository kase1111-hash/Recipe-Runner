// GeneralSettings Component
// Phase 10 Feature - Comprehensive Settings UI

import { useState } from 'react';
import { Button, Card } from '../common';
import { useTheme, type ThemeMode } from '../../contexts';
import { getPreferences, savePreferences } from '../../db';
import type { UserPreferences } from '../../types';

interface GeneralSettingsProps {
  onClose: () => void;
}

type SettingsTab = 'general' | 'cooking' | 'visual' | 'ai' | 'shortcuts';

export function GeneralSettings({ onClose }: GeneralSettingsProps) {
  const { mode, setMode } = useTheme();
  const [preferences, setPreferences] = useState<UserPreferences>(getPreferences);
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [saved, setSaved] = useState(false);

  function updatePreferences(updates: Partial<UserPreferences>) {
    const newPrefs = { ...preferences, ...updates };
    setPreferences(newPrefs);
    savePreferences(newPrefs);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const tabs: { id: SettingsTab; label: string; icon: string }[] = [
    { id: 'general', label: 'General', icon: '⚙️' },
    { id: 'cooking', label: 'Cooking', icon: '🍳' },
    { id: 'visual', label: 'Visual', icon: '🎨' },
    { id: 'ai', label: 'AI Settings', icon: '🤖' },
    { id: 'shortcuts', label: 'Shortcuts', icon: '⌨️' },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--card-bg)',
          borderRadius: '1rem',
          width: '90%',
          maxWidth: '700px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.5rem',
            borderBottom: '1px solid var(--border-primary)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Settings
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {saved && (
              <span style={{ color: 'var(--success)', fontSize: '0.875rem' }}>
                Saved!
              </span>
            )}
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
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '0.25rem',
            padding: '0 1.5rem',
            borderBottom: '1px solid var(--border-primary)',
            overflowX: 'auto',
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '0.75rem 1rem',
                border: 'none',
                background: 'none',
                fontWeight: 500,
                color: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--text-tertiary)',
                borderBottom: activeTab === tab.id ? '2px solid var(--accent-primary)' : '2px solid transparent',
                cursor: 'pointer',
                marginBottom: '-1px',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
          {activeTab === 'general' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Theme */}
              <SettingSection title="Theme" description="Choose your preferred color scheme">
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {(['light', 'dark', 'system'] as const).map((themeOption) => (
                    <button
                      key={themeOption}
                      onClick={() => setMode(themeOption as ThemeMode)}
                      style={{
                        flex: 1,
                        padding: '0.75rem 1rem',
                        border: mode === themeOption ? '2px solid var(--accent-primary)' : '1px solid var(--border-secondary)',
                        borderRadius: '0.5rem',
                        background: mode === themeOption ? 'var(--accent-light)' : 'var(--bg-secondary)',
                        color: mode === themeOption ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontWeight: mode === themeOption ? 500 : 400,
                      }}
                    >
                      {themeOption === 'light' && '☀️ Light'}
                      {themeOption === 'dark' && '🌙 Dark'}
                      {themeOption === 'system' && '💻 System'}
                    </button>
                  ))}
                </div>
              </SettingSection>

              {/* Skill Level */}
              <SettingSection title="Cooking Skill Level" description="Affects recipe suggestions and tips">
                <select
                  value={preferences.skill_level}
                  onChange={(e) => updatePreferences({ skill_level: e.target.value as UserPreferences['skill_level'] })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--input-border)',
                    borderRadius: '0.5rem',
                    background: 'var(--input-bg)',
                    color: 'var(--text-primary)',
                    fontSize: '1rem',
                  }}
                >
                  <option value="beginner">Beginner - New to cooking</option>
                  <option value="intermediate">Intermediate - Comfortable in kitchen</option>
                  <option value="advanced">Advanced - Experienced cook</option>
                  <option value="expert">Expert - Professional level</option>
                </select>
              </SettingSection>
            </div>
          )}

          {activeTab === 'cooking' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Timer Alerts */}
              <SettingSection title="Timer Alerts" description="How you want to be notified when timers complete">
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {(['sound', 'vibrate', 'both'] as const).map((alertType) => (
                    <button
                      key={alertType}
                      onClick={() => updatePreferences({ timer_alert_type: alertType })}
                      style={{
                        flex: 1,
                        padding: '0.75rem 1rem',
                        border: preferences.timer_alert_type === alertType ? '2px solid var(--accent-primary)' : '1px solid var(--border-secondary)',
                        borderRadius: '0.5rem',
                        background: preferences.timer_alert_type === alertType ? 'var(--accent-light)' : 'var(--bg-secondary)',
                        color: preferences.timer_alert_type === alertType ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontWeight: preferences.timer_alert_type === alertType ? 500 : 400,
                      }}
                    >
                      {alertType === 'sound' && '🔊 Sound'}
                      {alertType === 'vibrate' && '📳 Vibrate'}
                      {alertType === 'both' && '🔔 Both'}
                    </button>
                  ))}
                </div>
              </SettingSection>

              {/* Cook History Info */}
              <Card style={{ background: 'var(--info-bg)', border: '1px solid var(--info-border)' }}>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>ℹ️</span>
                  <div>
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Cook History</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      Your cooking history is automatically saved when you complete a recipe. View it on each recipe's detail page.
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'visual' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Auto Generate Visuals */}
              <SettingSection title="Auto-Generate Visuals" description="Automatically generate step images using AI">
                <ToggleSwitch
                  checked={preferences.auto_generate_visuals}
                  onChange={(checked) => updatePreferences({ auto_generate_visuals: checked })}
                />
              </SettingSection>

              <Card style={{ background: 'var(--warning-bg)', border: '1px solid var(--warning-border)' }}>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>💡</span>
                  <div>
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Visual Settings</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      For more visual options (style, prefetching, API provider), use the Visual Settings button (⚙️) in the cooking view.
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'ai' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Ollama Endpoint */}
              <SettingSection title="Ollama Endpoint" description="Local AI server address">
                <input
                  type="text"
                  value={preferences.ollama_config.endpoint}
                  onChange={(e) =>
                    updatePreferences({
                      ollama_config: { ...preferences.ollama_config, endpoint: e.target.value },
                    })
                  }
                  placeholder="http://localhost:11434"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--input-border)',
                    borderRadius: '0.5rem',
                    background: 'var(--input-bg)',
                    color: 'var(--text-primary)',
                    fontSize: '1rem',
                    fontFamily: 'monospace',
                  }}
                />
              </SettingSection>

              {/* Model */}
              <SettingSection title="AI Model" description="Ollama model to use for Chef assistance">
                <input
                  type="text"
                  value={preferences.ollama_config.model}
                  onChange={(e) =>
                    updatePreferences({
                      ollama_config: { ...preferences.ollama_config, model: e.target.value },
                    })
                  }
                  placeholder="llama3.2"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--input-border)',
                    borderRadius: '0.5rem',
                    background: 'var(--input-bg)',
                    color: 'var(--text-primary)',
                    fontSize: '1rem',
                    fontFamily: 'monospace',
                  }}
                />
              </SettingSection>

              {/* Temperature */}
              <SettingSection title="Temperature" description="Creativity level (0 = focused, 1 = creative)">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={preferences.ollama_config.temperature}
                    onChange={(e) =>
                      updatePreferences({
                        ollama_config: { ...preferences.ollama_config, temperature: parseFloat(e.target.value) },
                      })
                    }
                    style={{ flex: 1 }}
                  />
                  <span style={{ color: 'var(--text-secondary)', minWidth: '2rem' }}>
                    {preferences.ollama_config.temperature}
                  </span>
                </div>
              </SettingSection>

              {/* Timeout */}
              <SettingSection title="Timeout (seconds)" description="Maximum wait time for AI responses">
                <input
                  type="number"
                  value={preferences.ollama_config.timeout_ms / 1000}
                  onChange={(e) =>
                    updatePreferences({
                      ollama_config: { ...preferences.ollama_config, timeout_ms: parseInt(e.target.value) * 1000 },
                    })
                  }
                  min="10"
                  max="300"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--input-border)',
                    borderRadius: '0.5rem',
                    background: 'var(--input-bg)',
                    color: 'var(--text-primary)',
                    fontSize: '1rem',
                  }}
                />
              </SettingSection>
            </div>
          )}

          {activeTab === 'shortcuts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Press <kbd style={{ padding: '0.125rem 0.5rem', background: 'var(--bg-tertiary)', borderRadius: '0.25rem', fontFamily: 'monospace' }}>?</kbd> anywhere in the app to view all keyboard shortcuts.
              </p>

              <Card>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: '0.75rem' }}>
                  NAVIGATION
                </h4>
                <ShortcutRow shortcut="Ctrl + H" description="Go to home/library" />
                <ShortcutRow shortcut="Escape" description="Go back / Close modal" />
                <ShortcutRow shortcut="/" description="Focus search" />
              </Card>

              <Card>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: '0.75rem' }}>
                  COOKING
                </h4>
                <ShortcutRow shortcut="→" description="Next step" />
                <ShortcutRow shortcut="←" description="Previous step" />
                <ShortcutRow shortcut="T" description="Start/pause timer" />
                <ShortcutRow shortcut="Shift + ?" description="Ask Chef Ollama" />
              </Card>

              <Card>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: '0.75rem' }}>
                  ACTIONS
                </h4>
                <ShortcutRow shortcut="Ctrl + F" description="Toggle favorite" />
                <ShortcutRow shortcut="Ctrl + D" description="Toggle dark mode" />
              </Card>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--border-primary)',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Helper Components
// ============================================

interface SettingSectionProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

function SettingSection({ title, description, children }: SettingSectionProps) {
  return (
    <div>
      <div style={{ marginBottom: '0.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
          {title}
        </h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', margin: '0.25rem 0 0' }}>
          {description}
        </p>
      </div>
      {children}
    </div>
  );
}

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleSwitch({ checked, onChange }: ToggleSwitchProps) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: '3rem',
        height: '1.5rem',
        borderRadius: '9999px',
        border: 'none',
        background: checked ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 0.2s',
      }}
    >
      <div
        style={{
          width: '1.25rem',
          height: '1.25rem',
          borderRadius: '50%',
          background: 'white',
          position: 'absolute',
          top: '0.125rem',
          left: checked ? '1.625rem' : '0.125rem',
          transition: 'left 0.2s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }}
      />
    </button>
  );
}

interface ShortcutRowProps {
  shortcut: string;
  description: string;
}

function ShortcutRow({ shortcut, description }: ShortcutRowProps) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.5rem 0',
        borderBottom: '1px solid var(--border-primary)',
      }}
    >
      <span style={{ color: 'var(--text-secondary)' }}>{description}</span>
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
        {shortcut}
      </kbd>
    </div>
  );
}
