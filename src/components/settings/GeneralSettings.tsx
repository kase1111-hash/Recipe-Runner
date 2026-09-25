// GeneralSettings Component
// Phase 10 Feature - Comprehensive Settings UI

import { useEffect, useRef, useState } from 'react';
import { Button, Card } from '../common';
import { useTheme, type ThemeMode } from '../../contexts';
import { getPreferences, savePreferences } from '../../db';
import { validateOllamaEndpoint } from '../../services/utils';
import type { ChefOllamaConfig, UserPreferences } from '../../types';

interface GeneralSettingsProps {
  onClose: () => void;
}

type SettingsTab = 'general' | 'cooking' | 'ai' | 'shortcuts';

// Matches the input's min/max. The db only rejects timeouts under 1 s, but a
// rejected value makes getPreferences fall back to defaults for EVERY setting.
const TIMEOUT_MIN_SECONDS = 10;
const TIMEOUT_MAX_SECONDS = 300;

export function GeneralSettings({ onClose }: GeneralSettingsProps) {
  const { mode, setMode } = useTheme();
  const [preferences, setPreferences] = useState<UserPreferences>(getPreferences);
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [saved, setSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [endpointWarning, setEndpointWarning] = useState<string | undefined>(() => {
    const result = validateOllamaEndpoint(preferences.ollama_config.endpoint);
    return result.warning;
  });
  // Drafts let these inputs hold in-progress text; only valid values are saved
  const [endpointDraft, setEndpointDraft] = useState(preferences.ollama_config.endpoint);
  const [endpointError, setEndpointError] = useState<string | undefined>();
  const [timeoutDraft, setTimeoutDraft] = useState(String(preferences.ollama_config.timeout_ms / 1000));

  useEffect(() => () => {
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
  }, []);

  function flashSaved() {
    setSaved(true);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSaved(false), 2000);
  }

  // Save only the fields that changed. savePreferences merges them into the
  // latest stored preferences, so anything written elsewhere while this modal
  // is open (e.g. theme_mode from the theme buttons) isn't overwritten with the
  // snapshot taken when the modal opened.
  function updatePreferences(updates: Partial<Omit<UserPreferences, 'ollama_config'>>) {
    setPreferences((prev) => ({ ...prev, ...updates }));
    savePreferences(updates);
    flashSaved();
  }

  function updateOllamaConfig(updates: Partial<ChefOllamaConfig>) {
    setPreferences((prev) => ({ ...prev, ollama_config: { ...prev.ollama_config, ...updates } }));
    savePreferences({ ollama_config: { ...getPreferences().ollama_config, ...updates } });
    flashSaved();
  }

  function handleEndpointChange(value: string) {
    setEndpointDraft(value);
    const trimmed = value.trim();
    const result = validateOllamaEndpoint(trimmed);
    if (result.valid) {
      setEndpointError(undefined);
      setEndpointWarning(result.warning);
      // A trailing slash would produce "//api/chat" request paths
      updateOllamaConfig({ endpoint: trimmed.replace(/\/+$/, '') });
    } else {
      setEndpointWarning(undefined);
      setEndpointError(
        `Enter a full address such as http://localhost:11434. Until then, ` +
        `${preferences.ollama_config.endpoint || 'the previous address'} stays in use.`
      );
    }
  }

  function parseTimeoutSeconds(value: string): number | null {
    const seconds = Number(value);
    return value.trim() !== '' && Number.isFinite(seconds) ? seconds : null;
  }

  function handleTimeoutChange(value: string) {
    setTimeoutDraft(value);
    const seconds = parseTimeoutSeconds(value);
    // Save complete, in-range values as they're typed; anything else waits for
    // blur. (Saving '' or 0 used to store NaN/0 and wipe all settings on reload.)
    if (seconds !== null && seconds >= TIMEOUT_MIN_SECONDS && seconds <= TIMEOUT_MAX_SECONDS) {
      updateOllamaConfig({ timeout_ms: Math.round(seconds) * 1000 });
    }
  }

  function handleTimeoutBlur() {
    const seconds = parseTimeoutSeconds(timeoutDraft);
    if (seconds === null) {
      // Nothing usable was typed: show the saved value again
      setTimeoutDraft(String(preferences.ollama_config.timeout_ms / 1000));
      return;
    }
    const clamped = Math.min(TIMEOUT_MAX_SECONDS, Math.max(TIMEOUT_MIN_SECONDS, Math.round(seconds)));
    setTimeoutDraft(String(clamped));
    if (clamped * 1000 !== preferences.ollama_config.timeout_ms) {
      updateOllamaConfig({ timeout_ms: clamped * 1000 });
    }
  }

  const timeoutSeconds = parseTimeoutSeconds(timeoutDraft);
  const timeoutOutOfRange =
    timeoutSeconds === null || timeoutSeconds < TIMEOUT_MIN_SECONDS || timeoutSeconds > TIMEOUT_MAX_SECONDS;

  const tabs: { id: SettingsTab; label: string; icon: string }[] = [
    { id: 'general', label: 'General', icon: '⚙️' },
    { id: 'cooking', label: 'Cooking', icon: '🍳' },
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

          {activeTab === 'ai' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Ollama Endpoint */}
              <SettingSection title="Ollama Endpoint" description="Local AI server address. All recipe data and conversations are sent here.">
                <input
                  type="text"
                  value={endpointDraft}
                  onChange={(e) => handleEndpointChange(e.target.value)}
                  placeholder="http://localhost:11434"
                  aria-label="Ollama endpoint"
                  aria-invalid={endpointError ? true : undefined}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: endpointError
                      ? '2px solid var(--error)'
                      : endpointWarning
                      ? '2px solid var(--warning, #f59e0b)'
                      : '1px solid var(--input-border)',
                    borderRadius: '0.5rem',
                    background: 'var(--input-bg)',
                    color: 'var(--text-primary)',
                    fontSize: '1rem',
                    fontFamily: 'monospace',
                  }}
                />
                {endpointWarning && (
                  <div
                    style={{
                      marginTop: '0.5rem',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      background: 'var(--warning-bg, #fef3cd)',
                      border: '1px solid var(--warning-border, #ffc107)',
                      fontSize: '0.8125rem',
                      color: 'var(--text-primary)',
                      display: 'flex',
                      gap: '0.5rem',
                      alignItems: 'flex-start',
                    }}
                  >
                    <span style={{ flexShrink: 0 }}>Warning:</span>
                    <span>{endpointWarning}</span>
                  </div>
                )}
                {endpointError && (
                  <div
                    role="alert"
                    style={{
                      marginTop: '0.5rem',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      background: 'var(--error-bg)',
                      border: '1px solid var(--error-border)',
                      fontSize: '0.8125rem',
                      color: 'var(--error-text)',
                    }}
                  >
                    {endpointError}
                  </div>
                )}
              </SettingSection>

              {/* Model */}
              <SettingSection title="AI Model" description="Ollama model to use for Chef assistance">
                <input
                  type="text"
                  value={preferences.ollama_config.model}
                  onChange={(e) => updateOllamaConfig({ model: e.target.value })}
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
                    onChange={(e) => updateOllamaConfig({ temperature: parseFloat(e.target.value) })}
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
                  value={timeoutDraft}
                  onChange={(e) => handleTimeoutChange(e.target.value)}
                  onBlur={handleTimeoutBlur}
                  min={TIMEOUT_MIN_SECONDS}
                  max={TIMEOUT_MAX_SECONDS}
                  aria-label="Timeout in seconds"
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
                <p
                  style={{
                    fontSize: '0.8125rem',
                    color: timeoutOutOfRange ? 'var(--warning-text)' : 'var(--text-tertiary)',
                    margin: '0.5rem 0 0',
                  }}
                >
                  {timeoutOutOfRange
                    ? `Enter ${TIMEOUT_MIN_SECONDS}–${TIMEOUT_MAX_SECONDS} seconds. Out-of-range values are adjusted when you leave this field.`
                    : `Between ${TIMEOUT_MIN_SECONDS} and ${TIMEOUT_MAX_SECONDS} seconds. Recipe import allows twice this long.`}
                </p>
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
