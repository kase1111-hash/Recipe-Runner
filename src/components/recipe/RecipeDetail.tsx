// Recipe Detail Component
// Phase 5 Feature - View recipe with cook history

import { useState } from 'react';
import { Button, Card, DifficultyBadge } from '../common';
import { exportRecipe, downloadAsFile, copyToClipboard } from '../../services/export';
import type { Recipe } from '../../types';

interface RecipeDetailProps {
  recipe: Recipe;
  onStartCooking: () => void;
  onBack: () => void;
}

type Tab = 'overview' | 'ingredients' | 'history';

export function RecipeDetail({ recipe, onStartCooking, onBack }: RecipeDetailProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showExport, setShowExport] = useState(false);
  const [exportMessage, setExportMessage] = useState('');

  const cookCount = recipe.cook_history.length;
  const avgRating = cookCount > 0
    ? recipe.cook_history.reduce((acc, h) => acc + h.rating, 0) / cookCount
    : 0;
  const lastCooked = cookCount > 0
    ? new Date(recipe.cook_history[recipe.cook_history.length - 1].date)
    : null;

  const handleExport = async (format: 'json' | 'markdown' | 'text') => {
    const content = exportRecipe(recipe, { format, includeHistory: true, includeNotes: true });
    const extension = format === 'json' ? 'json' : format === 'markdown' ? 'md' : 'txt';
    const mimeType = format === 'json' ? 'application/json' : 'text/plain';
    const filename = `${recipe.name.toLowerCase().replace(/\s+/g, '-')}.${extension}`;
    downloadAsFile(content, filename, mimeType);
    setExportMessage(`Downloaded ${filename}`);
    setTimeout(() => setExportMessage(''), 3000);
  };

  const handleCopyRecipe = async () => {
    const content = exportRecipe(recipe, { format: 'text' });
    await copyToClipboard(content);
    setExportMessage('Copied to clipboard!');
    setTimeout(() => setExportMessage(''), 3000);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem' }}>
        <Button variant="ghost" onClick={onBack} style={{ marginBottom: '1rem' }}>
          ← Back
        </Button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1
              style={{
                fontSize: '2rem',
                fontWeight: 700,
                color: '#111827',
                margin: '0 0 0.5rem',
              }}
            >
              {recipe.name}
            </h1>
            <p style={{ color: '#6b7280', margin: '0 0 1rem' }}>
              {recipe.description}
            </p>

            {/* Quick Stats */}
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>⏱</span>
                <span style={{ color: '#374151', fontSize: '0.875rem' }}>
                  {recipe.total_time}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>🍽</span>
                <span style={{ color: '#374151', fontSize: '0.875rem' }}>
                  {recipe.yield}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>📋</span>
                <span style={{ color: '#374151', fontSize: '0.875rem' }}>
                  {recipe.steps.length} steps
                </span>
              </div>
              {recipe.safe_temp && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>🌡️</span>
                  <span style={{ color: '#374151', fontSize: '0.875rem' }}>
                    {recipe.safe_temp.value}{recipe.safe_temp.unit}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.75rem' }}>
            <DifficultyBadge score={recipe.difficulty} />
            <Button onClick={onStartCooking}>
              Start Cooking →
            </Button>
          </div>
        </div>
      </header>

      {/* Cook Stats Card */}
      {cookCount > 0 && (
        <Card style={{ marginBottom: '1.5rem', padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>
                {cookCount}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                Times Cooked
              </div>
            </div>
            {avgRating > 0 && (
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>
                  {'⭐'.repeat(Math.round(avgRating))}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  Avg Rating ({avgRating.toFixed(1)})
                </div>
              </div>
            )}
            {lastCooked && (
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>
                  {lastCooked.toLocaleDateString()}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  Last Cooked
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.25rem',
          marginBottom: '1rem',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        {(['overview', 'ingredients', 'history'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '0.75rem 1rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: activeTab === tab ? '#2563eb' : '#6b7280',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid #2563eb' : '2px solid transparent',
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {tab}
            {tab === 'history' && cookCount > 0 && ` (${cookCount})`}
          </button>
        ))}

        {/* Export button */}
        <div style={{ marginLeft: 'auto', position: 'relative' }}>
          <Button variant="ghost" size="sm" onClick={() => setShowExport(!showExport)}>
            📤 Export
          </Button>
          {showExport && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                background: 'white',
                borderRadius: '0.5rem',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                border: '1px solid #e5e7eb',
                padding: '0.5rem',
                zIndex: 100,
                minWidth: '150px',
              }}
            >
              <button
                onClick={() => { handleExport('markdown'); setShowExport(false); }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '0.5rem',
                  textAlign: 'left',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                }}
              >
                📄 Markdown
              </button>
              <button
                onClick={() => { handleExport('json'); setShowExport(false); }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '0.5rem',
                  textAlign: 'left',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                }}
              >
                📋 JSON
              </button>
              <button
                onClick={() => { handleExport('text'); setShowExport(false); }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '0.5rem',
                  textAlign: 'left',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                }}
              >
                📝 Text
              </button>
              <hr style={{ margin: '0.5rem 0', border: 'none', borderTop: '1px solid #e5e7eb' }} />
              <button
                onClick={() => { handleCopyRecipe(); setShowExport(false); }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '0.5rem',
                  textAlign: 'left',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                }}
              >
                📋 Copy to clipboard
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Export message */}
      {exportMessage && (
        <div
          style={{
            padding: '0.75rem',
            background: '#dcfce7',
            color: '#166534',
            borderRadius: '0.375rem',
            marginBottom: '1rem',
            fontSize: '0.875rem',
          }}
        >
          ✓ {exportMessage}
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div>
          {/* Equipment */}
          {recipe.equipment.length > 0 && (
            <Card style={{ marginBottom: '1rem', padding: '1rem' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', margin: '0 0 0.75rem' }}>
                🔧 Equipment
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {recipe.equipment.map((eq, idx) => (
                  <span
                    key={idx}
                    style={{
                      padding: '0.25rem 0.75rem',
                      background: '#f3f4f6',
                      borderRadius: '9999px',
                      fontSize: '0.875rem',
                      color: '#374151',
                    }}
                  >
                    {eq}
                  </span>
                ))}
              </div>
            </Card>
          )}

          {/* Steps Preview */}
          <Card style={{ padding: '1rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', margin: '0 0 0.75rem' }}>
              📋 Steps Overview
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {recipe.steps.map((step) => (
                <div
                  key={step.index}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    padding: '0.5rem',
                    background: '#f9fafb',
                    borderRadius: '0.375rem',
                  }}
                >
                  <span
                    style={{
                      width: '1.5rem',
                      height: '1.5rem',
                      borderRadius: '50%',
                      background: step.type === 'passive' ? '#dbeafe' : '#dcfce7',
                      color: step.type === 'passive' ? '#1d4ed8' : '#166534',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    {step.index + 1}
                  </span>
                  <div>
                    <div style={{ fontWeight: 500, color: '#374151', fontSize: '0.875rem' }}>
                      {step.title}
                    </div>
                    {step.time_display && (
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        {step.time_display} • {step.type}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'ingredients' && (
        <Card style={{ padding: '1rem' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', margin: '0 0 0.75rem' }}>
            🥬 Ingredients ({recipe.ingredients.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {recipe.ingredients.map((ing, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  padding: '0.5rem',
                  borderBottom: idx < recipe.ingredients.length - 1 ? '1px solid #e5e7eb' : 'none',
                }}
              >
                <span style={{ fontWeight: 600, color: '#374151', minWidth: '80px' }}>
                  {ing.amount} {ing.unit}
                </span>
                <span style={{ color: '#374151' }}>
                  {ing.item}
                  {ing.prep && <span style={{ color: '#6b7280' }}>, {ing.prep}</span>}
                </span>
                {ing.optional && (
                  <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#9ca3af', fontStyle: 'italic' }}>
                    optional
                  </span>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {activeTab === 'history' && (
        <div>
          {cookCount === 0 ? (
            <Card style={{ textAlign: 'center', padding: '3rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
              <h3 style={{ color: '#374151', margin: '0 0 0.5rem' }}>No Cook History Yet</h3>
              <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
                Start cooking to track your progress!
              </p>
              <Button onClick={onStartCooking}>Start Cooking</Button>
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[...recipe.cook_history].reverse().map((entry, idx) => (
                <Card key={idx} style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#374151' }}>
                        {new Date(entry.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        {entry.completed ? '✓ Completed' : '◐ Partially completed'}
                      </div>
                    </div>
                    {entry.rating > 0 && (
                      <div style={{ color: '#fbbf24' }}>
                        {'⭐'.repeat(entry.rating)}
                      </div>
                    )}
                  </div>

                  {entry.adjustments.length > 0 && (
                    <div style={{ marginTop: '0.75rem' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', marginBottom: '0.25rem' }}>
                        Adjustments:
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '1rem', fontSize: '0.875rem', color: '#374151' }}>
                        {entry.adjustments.map((adj, i) => (
                          <li key={i}>{adj}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {entry.notes && (
                    <div style={{ marginTop: '0.75rem' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', marginBottom: '0.25rem' }}>
                        Notes:
                      </div>
                      <p style={{ margin: 0, fontSize: '0.875rem', color: '#374151' }}>
                        {entry.notes}
                      </p>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tags */}
      {recipe.tags.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {recipe.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: '0.75rem',
                  padding: '0.25rem 0.75rem',
                  background: '#eff6ff',
                  color: '#1d4ed8',
                  borderRadius: '9999px',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
