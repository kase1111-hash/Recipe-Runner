// Cook Completion Component
// Phase 5 Feature - Rate and note completed cook sessions

import { useState } from 'react';
import { Button, Card } from '../common';
import { addCookHistoryEntry } from '../../db';
import { recordIngredientsUsed } from '../../services/pantry';
import type { Recipe, CookHistory } from '../../types';

interface CookCompletionProps {
  recipe: Recipe;
  checkedIngredients: string[];
  onComplete: () => void;
  onCookAgain: () => void;
}

export function CookCompletion({
  recipe,
  checkedIngredients,
  onComplete,
  onCookAgain,
}: CookCompletionProps) {
  const [rating, setRating] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [adjustments, setAdjustments] = useState<string[]>([]);
  const [newAdjustment, setNewAdjustment] = useState('');
  const [completed, setCompleted] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleAddAdjustment = () => {
    if (newAdjustment.trim()) {
      setAdjustments([...adjustments, newAdjustment.trim()]);
      setNewAdjustment('');
    }
  };

  const handleRemoveAdjustment = (index: number) => {
    setAdjustments(adjustments.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      // Create cook history entry
      const entry: CookHistory = {
        date: new Date().toISOString(),
        completed,
        notes,
        adjustments,
        rating,
      };

      // Save to database
      await addCookHistoryEntry(recipe.id, entry);

      // Record ingredients in pantry memory
      recordIngredientsUsed(checkedIngredients);

      setSaved(true);
    } catch (error) {
      console.error('Failed to save cook history:', error);
    } finally {
      setSaving(false);
    }
  };

  const cookCount = recipe.cook_history.length;
  const avgRating = cookCount > 0
    ? recipe.cook_history.reduce((acc, h) => acc + h.rating, 0) / cookCount
    : 0;

  if (saved) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          background: '#f9fafb',
        }}
      >
        <Card style={{ maxWidth: '500px', textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 700,
              color: '#111827',
              margin: '0 0 0.5rem',
            }}
          >
            Great Job!
          </h1>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
            You've completed {recipe.name}!
            {rating > 0 && ` You rated it ${rating}/5 stars.`}
          </p>

          {/* Stats */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '2rem',
              marginBottom: '2rem',
              padding: '1rem',
              background: '#f3f4f6',
              borderRadius: '0.5rem',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>
                {cookCount + 1}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Times Cooked</div>
            </div>
            {avgRating > 0 && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>
                  {avgRating.toFixed(1)}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Avg Rating</div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <Button variant="secondary" onClick={onCookAgain}>
              Cook Again
            </Button>
            <Button onClick={onComplete}>
              Back to Library
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: '2rem',
        background: '#f9fafb',
      }}
    >
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👨‍🍳</div>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 700,
              color: '#111827',
              margin: '0 0 0.5rem',
            }}
          >
            How Did It Go?
          </h1>
          <p style={{ color: '#6b7280', margin: 0 }}>
            Rate your experience making {recipe.name}
          </p>
        </header>

        {/* Completion Status */}
        <Card style={{ marginBottom: '1rem', padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontWeight: 600, color: '#374151' }}>Did you finish?</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button
                variant={completed ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setCompleted(true)}
              >
                Yes
              </Button>
              <Button
                variant={!completed ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setCompleted(false)}
              >
                Partially
              </Button>
            </div>
          </div>
        </Card>

        {/* Rating */}
        <Card style={{ marginBottom: '1rem', padding: '1rem' }}>
          <div style={{ marginBottom: '0.5rem' }}>
            <span style={{ fontWeight: 600, color: '#374151' }}>Your Rating</span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                style={{
                  fontSize: '2rem',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  transition: 'transform 0.1s',
                  transform: rating >= star ? 'scale(1.1)' : 'scale(1)',
                }}
              >
                {rating >= star ? '⭐' : '☆'}
              </button>
            ))}
          </div>
          {rating > 0 && (
            <div style={{ textAlign: 'center', marginTop: '0.5rem', color: '#6b7280' }}>
              {rating === 1 && 'Needs improvement'}
              {rating === 2 && 'Just okay'}
              {rating === 3 && 'Good'}
              {rating === 4 && 'Great!'}
              {rating === 5 && 'Amazing!'}
            </div>
          )}
        </Card>

        {/* Adjustments */}
        <Card style={{ marginBottom: '1rem', padding: '1rem' }}>
          <div style={{ marginBottom: '0.75rem' }}>
            <span style={{ fontWeight: 600, color: '#374151' }}>Adjustments Made</span>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.25rem 0 0' }}>
              Record any changes you made to the recipe
            </p>
          </div>

          {adjustments.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
              {adjustments.map((adj, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.5rem 0.75rem',
                    background: '#f3f4f6',
                    borderRadius: '0.375rem',
                  }}
                >
                  <span style={{ fontSize: '0.875rem', color: '#374151' }}>{adj}</span>
                  <button
                    onClick={() => handleRemoveAdjustment(idx)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#9ca3af',
                      cursor: 'pointer',
                      padding: '0.25rem',
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={newAdjustment}
              onChange={(e) => setNewAdjustment(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddAdjustment()}
              placeholder="e.g., Used olive oil instead of butter"
              style={{
                flex: 1,
                padding: '0.5rem 0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
              }}
            />
            <Button variant="secondary" size="sm" onClick={handleAddAdjustment}>
              Add
            </Button>
          </div>
        </Card>

        {/* Notes */}
        <Card style={{ marginBottom: '1.5rem', padding: '1rem' }}>
          <div style={{ marginBottom: '0.5rem' }}>
            <span style={{ fontWeight: 600, color: '#374151' }}>Notes</span>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any thoughts or tips for next time..."
            rows={3}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />
        </Card>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <Button variant="ghost" onClick={onComplete}>
            Skip
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save & Finish'}
          </Button>
        </div>
      </div>
    </div>
  );
}
