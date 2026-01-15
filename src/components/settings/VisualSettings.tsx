// Visual Settings Component
// Phase 8 Feature - Configure visual generation preferences

import { useState, useEffect } from 'react';
import { Button, Card } from '../common';
import {
  getVisualSettings,
  saveVisualSettings,
  resetVisualSettings,
  type VisualSettings as VisualSettingsType,
} from '../../services/visualGeneration';
import { getImageCacheStats, clearImageCache } from '../../db';

interface VisualSettingsProps {
  onClose: () => void;
}

export function VisualSettings({ onClose }: VisualSettingsProps) {
  const [settings, setSettings] = useState<VisualSettingsType>(getVisualSettings());
  const [cacheStats, setCacheStats] = useState<{
    totalImages: number;
    totalSize: number;
    byRecipe: Record<string, number>;
  } | null>(null);
  const [clearing, setClearing] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadCacheStats();
  }, []);

  async function loadCacheStats() {
    const stats = await getImageCacheStats();
    setCacheStats(stats);
  }

  function handleChange<K extends keyof VisualSettingsType>(
    key: K,
    value: VisualSettingsType[K]
  ) {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function handleSave() {
    saveVisualSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleReset() {
    const defaults = resetVisualSettings();
    setSettings(defaults);
    setSaved(false);
  }

  async function handleClearCache() {
    if (!confirm('Clear all cached images? This cannot be undone.')) return;

    setClearing(true);
    await clearImageCache();
    await loadCacheStats();
    setClearing(false);
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--overlay-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--card-bg)',
          borderRadius: '0.75rem',
          width: '100%',
          maxWidth: '500px',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderBottom: '1px solid var(--border-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            background: 'var(--card-bg)',
            zIndex: 1,
          }}
        >
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
            Visual Generation Settings
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.25rem',
              cursor: 'pointer',
              color: 'var(--text-tertiary)',
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: '1.5rem' }}>
          {/* Enable/Disable */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => handleChange('enabled', e.target.checked)}
                style={{ width: '1.25rem', height: '1.25rem', accentColor: 'var(--accent-primary)' }}
              />
              <div>
                <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Enable Visual Generation</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
                  Show AI-generated visuals for recipe steps
                </div>
              </div>
            </label>
          </div>

          {settings.enabled && (
            <>
              {/* Style Selection */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                  Visual Style
                </label>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    onClick={() => handleChange('style', 'realistic')}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      border: settings.style === 'realistic' ? '2px solid var(--accent-primary)' : '1px solid var(--border-secondary)',
                      borderRadius: '0.5rem',
                      background: settings.style === 'realistic' ? 'var(--accent-light)' : 'var(--bg-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>📷</div>
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Realistic</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Photo-like images</div>
                  </button>
                  <button
                    onClick={() => handleChange('style', 'illustrated')}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      border: settings.style === 'illustrated' ? '2px solid var(--accent-primary)' : '1px solid var(--border-secondary)',
                      borderRadius: '0.5rem',
                      background: settings.style === 'illustrated' ? 'var(--accent-light)' : 'var(--bg-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>🎨</div>
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Illustrated</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Diagram style</div>
                  </button>
                </div>
              </div>

              {/* Auto-Generate */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={settings.autoGenerate}
                    onChange={(e) => handleChange('autoGenerate', e.target.checked)}
                    style={{ width: '1.25rem', height: '1.25rem', accentColor: 'var(--accent-primary)' }}
                  />
                  <div>
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Auto-Generate</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
                      Automatically generate visuals when viewing steps
                    </div>
                  </div>
                </label>
              </div>

              {/* Prefetching */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={settings.prefetchEnabled}
                    onChange={(e) => handleChange('prefetchEnabled', e.target.checked)}
                    style={{ width: '1.25rem', height: '1.25rem', accentColor: 'var(--accent-primary)' }}
                  />
                  <div>
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Prefetch Upcoming Steps</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
                      Generate visuals for next steps in background
                    </div>
                  </div>
                </label>

                {settings.prefetchEnabled && (
                  <div style={{ marginTop: '0.75rem', marginLeft: '2rem' }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>
                      Steps to prefetch: {settings.prefetchCount}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={settings.prefetchCount}
                      onChange={(e) => handleChange('prefetchCount', parseInt(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
                    />
                  </div>
                )}
              </div>

              {/* API Provider */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                  Image Generation Provider
                </label>
                <select
                  value={settings.apiProvider}
                  onChange={(e) => handleChange('apiProvider', e.target.value as 'local' | 'sdwebui' | 'openai' | 'stability')}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid var(--border-secondary)',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    background: 'var(--input-bg)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <option value="local">Local (Ollama) - Not recommended</option>
                  <option value="sdwebui">Stable Diffusion WebUI (Local, Free)</option>
                  <option value="openai">OpenAI DALL-E 3</option>
                  <option value="stability">Stability AI (SDXL)</option>
                </select>

                {/* Provider info */}
                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                  {settings.apiProvider === 'local' && (
                    <>Ollama doesn't support image generation. Use SD WebUI instead.</>
                  )}
                  {settings.apiProvider === 'sdwebui' && (
                    <>Free local generation. Requires AUTOMATIC1111 WebUI running with --api flag.</>
                  )}
                  {settings.apiProvider === 'openai' && (
                    <>Uses DALL-E 3. Costs ~$0.04-0.08 per image. Get API key at platform.openai.com</>
                  )}
                  {settings.apiProvider === 'stability' && (
                    <>Uses Stable Diffusion XL. Requires credits. Get API key at platform.stability.ai</>
                  )}
                </div>

                {/* SD WebUI Endpoint */}
                {settings.apiProvider === 'sdwebui' && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>
                      WebUI URL
                    </label>
                    <input
                      type="text"
                      value={settings.sdwebuiEndpoint || 'http://localhost:7860'}
                      onChange={(e) => handleChange('sdwebuiEndpoint', e.target.value)}
                      placeholder="http://localhost:7860"
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid var(--border-secondary)',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        background: 'var(--input-bg)',
                        color: 'var(--text-primary)',
                      }}
                    />
                    <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Start WebUI with: <code style={{ background: 'var(--bg-tertiary)', padding: '0.125rem 0.25rem', borderRadius: '0.25rem' }}>python launch.py --api</code>
                    </div>
                  </div>
                )}

                {/* API Key for cloud providers */}
                {(settings.apiProvider === 'openai' || settings.apiProvider === 'stability') && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>
                      API Key
                    </label>
                    <input
                      type="password"
                      value={settings.apiKey || ''}
                      onChange={(e) => handleChange('apiKey', e.target.value)}
                      placeholder="Enter API key..."
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid var(--border-secondary)',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        background: 'var(--input-bg)',
                        color: 'var(--text-primary)',
                      }}
                    />
                    {!settings.apiKey && (
                      <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--warning)' }}>
                        API key required for image generation
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Cache Management */}
          <Card style={{ padding: '1rem', background: 'var(--bg-secondary)', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, margin: '0 0 0.75rem', color: 'var(--text-primary)' }}>
              Image Cache
            </h3>
            {cacheStats && (
              <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginBottom: '0.75rem' }}>
                <div><strong style={{ color: 'var(--text-secondary)' }}>{cacheStats.totalImages}</strong> cached images</div>
                <div>Total size: <strong style={{ color: 'var(--text-secondary)' }}>{formatBytes(cacheStats.totalSize)}</strong></div>
              </div>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleClearCache}
              disabled={clearing || !cacheStats?.totalImages}
            >
              {clearing ? 'Clearing...' : 'Clear Cache'}
            </Button>
          </Card>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Button variant="secondary" onClick={handleReset} style={{ flex: 1 }}>
              Reset to Defaults
            </Button>
            <Button variant="primary" onClick={handleSave} style={{ flex: 1 }}>
              {saved ? '✓ Saved!' : 'Save Settings'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
