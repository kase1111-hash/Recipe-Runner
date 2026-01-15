// StepVisual Component
// Phase 8 Feature - Visual generation with versioning and gallery

import { useState, useEffect } from 'react';
import { Button, Card } from '../common';
import {
  generateStepVisual,
  regenerateStepVisual,
  getStepVisualVersions,
  getStepVisualByVersion,
  getVisualSettings,
  prefetchUpcomingSteps,
} from '../../services/visualGeneration';
import type { VisualGenerationResult, Step } from '../../types';

interface StepVisualProps {
  recipeId: string;
  step: Step;
  allSteps?: Step[];  // For prefetching
  onVisualLoad?: (visual: VisualGenerationResult) => void;
}

export function StepVisual({ recipeId, step, allSteps, onVisualLoad }: StepVisualProps) {
  const [visual, setVisual] = useState<VisualGenerationResult | null>(null);
  const [versions, setVersions] = useState<Array<{ version: number; image_url: string; created_at: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGallery, setShowGallery] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);

  const settings = getVisualSettings();

  useEffect(() => {
    if (step.visual_prompt && settings.enabled && settings.autoGenerate) {
      loadVisual();
      loadVersions();
    }
  }, [step.index, step.visual_prompt]);

  // Prefetch upcoming steps when visual loads
  useEffect(() => {
    if (visual && settings.prefetchEnabled && allSteps) {
      prefetchUpcomingSteps(recipeId, allSteps, step.index, settings.prefetchCount);
    }
  }, [visual]);

  async function loadVisual() {
    if (!step.visual_prompt) return;

    setLoading(true);
    setError(null);

    try {
      const result = await generateStepVisual({
        recipe_id: recipeId,
        step_index: step.index,
        visual_prompt: step.visual_prompt,
        style: settings.style,
      });
      setVisual(result);
      setSelectedVersion(result.version);
      onVisualLoad?.(result);
    } catch (err) {
      console.error('Failed to generate visual:', err);
      const errorMessage = err instanceof Error ? err.message : 'Could not generate visual';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  async function loadVersions() {
    try {
      const vers = await getStepVisualVersions(recipeId, step.index);
      setVersions(vers);
    } catch (err) {
      console.error('Failed to load versions:', err);
    }
  }

  async function handleRegenerate() {
    if (!step.visual_prompt) return;

    setRegenerating(true);
    setError(null);

    try {
      const result = await regenerateStepVisual({
        recipe_id: recipeId,
        step_index: step.index,
        visual_prompt: step.visual_prompt,
        style: settings.style,
      });
      setVisual(result);
      setSelectedVersion(result.version);
      await loadVersions();
      onVisualLoad?.(result);
    } catch (err) {
      console.error('Failed to regenerate visual:', err);
      const errorMessage = err instanceof Error ? err.message : 'Could not regenerate visual';
      setError(errorMessage);
    } finally {
      setRegenerating(false);
    }
  }

  async function handleSelectVersion(version: number) {
    setSelectedVersion(version);
    const result = await getStepVisualByVersion(recipeId, step.index, version);
    if (result) {
      setVisual(result);
      onVisualLoad?.(result);
    }
    setShowGallery(false);
  }

  if (!step.visual_prompt || !settings.enabled) {
    return null;
  }

  return (
    <Card style={{ marginBottom: '1.5rem' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.75rem',
        }}
      >
        <h3 style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>
          👁️ Visual Reference
        </h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {versions.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowGallery(!showGallery)}
            >
              {showGallery ? 'Hide Gallery' : `Gallery (${versions.length})`}
            </Button>
          )}
          {visual && !loading && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRegenerate}
              disabled={regenerating}
            >
              {regenerating ? '...' : '↻ New Version'}
            </Button>
          )}
        </div>
      </div>

      {/* Version Gallery */}
      {showGallery && versions.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            overflowX: 'auto',
            paddingBottom: '0.75rem',
            marginBottom: '0.75rem',
            borderBottom: '1px solid var(--border-primary)',
          }}
        >
          {versions.map((v) => (
            <button
              key={v.version}
              onClick={() => handleSelectVersion(v.version)}
              style={{
                flexShrink: 0,
                width: '80px',
                height: '80px',
                padding: 0,
                border: selectedVersion === v.version ? '3px solid var(--accent-primary)' : '1px solid var(--border-primary)',
                borderRadius: '0.5rem',
                overflow: 'hidden',
                cursor: 'pointer',
                background: 'var(--card-bg)',
              }}
            >
              <img
                src={v.image_url}
                alt={`Version ${v.version}`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            </button>
          ))}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div
          style={{
            height: '256px',
            background: 'var(--bg-tertiary)',
            borderRadius: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-tertiary)',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎨</div>
            <div>Generating visual...</div>
          </div>
        </div>
      )}

      {/* Image Display */}
      {visual && !loading && (
        <div style={{ position: 'relative' }}>
          <img
            src={visual.image_url}
            alt={`Visual reference for step ${step.index + 1}`}
            style={{
              width: '100%',
              borderRadius: '0.5rem',
              border: '1px solid var(--border-primary)',
            }}
          />
          {regenerating && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'var(--overlay-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '0.5rem',
              }}
            >
              <div style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎨</div>
                <div>Generating new version...</div>
              </div>
            </div>
          )}
          {visual.cached && (
            <div
              style={{
                position: 'absolute',
                top: '0.5rem',
                right: '0.5rem',
                background: 'var(--overlay-bg)',
                color: 'var(--btn-primary-text)',
                padding: '0.25rem 0.5rem',
                borderRadius: '0.25rem',
                fontSize: '0.625rem',
                textTransform: 'uppercase',
              }}
            >
              Cached
            </div>
          )}
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div
          style={{
            padding: '1rem',
            background: 'var(--error-bg)',
            borderRadius: '0.5rem',
            color: 'var(--error)',
            fontSize: '0.875rem',
            textAlign: 'center',
          }}
        >
          {error}
          <Button
            variant="ghost"
            size="sm"
            onClick={loadVisual}
            style={{ marginLeft: '0.5rem' }}
          >
            Try Again
          </Button>
        </div>
      )}

      {/* Description */}
      <p
        style={{
          marginTop: '0.75rem',
          marginBottom: 0,
          fontSize: '0.875rem',
          color: 'var(--text-tertiary)',
          fontStyle: 'italic',
        }}
      >
        {step.visual_prompt}
      </p>

      {/* Version Info */}
      {visual && visual.version > 0 && (
        <div
          style={{
            marginTop: '0.5rem',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
          }}
        >
          Version {visual.version} of {versions.length || 1}
        </div>
      )}
    </Card>
  );
}

// Compact version for recipe preview
interface StepVisualPreviewProps {
  recipeId: string;
  step: Step;
  size?: 'sm' | 'md' | 'lg';
}

export function StepVisualPreview({ recipeId, step, size = 'md' }: StepVisualPreviewProps) {
  const [visual, setVisual] = useState<VisualGenerationResult | null>(null);

  useEffect(() => {
    loadVisual();
  }, [step.index]);

  async function loadVisual() {
    if (!step.visual_prompt) return;

    try {
      const result = await generateStepVisual({
        recipe_id: recipeId,
        step_index: step.index,
        visual_prompt: step.visual_prompt,
      });
      setVisual(result);
    } catch (err) {
      console.error('Failed to load preview:', err);
    }
  }

  const sizes = {
    sm: { width: 60, height: 60 },
    md: { width: 100, height: 100 },
    lg: { width: 150, height: 150 },
  };

  if (!step.visual_prompt || !visual) {
    return (
      <div
        style={{
          width: sizes[size].width,
          height: sizes[size].height,
          background: 'var(--bg-tertiary)',
          borderRadius: '0.375rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: size === 'sm' ? '1rem' : '1.5rem',
        }}
      >
        👁️
      </div>
    );
  }

  return (
    <img
      src={visual.image_url}
      alt={`Step ${step.index + 1}`}
      style={{
        width: sizes[size].width,
        height: sizes[size].height,
        objectFit: 'cover',
        borderRadius: '0.375rem',
        border: '1px solid var(--border-primary)',
      }}
    />
  );
}
