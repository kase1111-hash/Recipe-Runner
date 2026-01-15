// DietarySettings Component
// Configure dietary restrictions, health conditions, allergies, and goals

import { useState, useEffect } from 'react';
import { Button } from '../common';
import type { DietaryPreferences, DietaryRestriction, HealthCondition, WeightGoal } from '../../types';
import {
  getDietaryPreferences,
  saveDietaryPreferences,
  DIETARY_RESTRICTION_INFO,
  HEALTH_CONDITION_INFO,
} from '../../services/dietaryAdaptation';

interface DietarySettingsProps {
  onClose?: () => void;
  embedded?: boolean;
}

export function DietarySettings({ onClose, embedded = false }: DietarySettingsProps) {
  const [prefs, setPrefs] = useState<DietaryPreferences>(getDietaryPreferences);
  const [newAllergy, setNewAllergy] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setPrefs(getDietaryPreferences());
  }, []);

  function updatePrefs(updates: Partial<DietaryPreferences>) {
    const newPrefs = { ...prefs, ...updates };
    setPrefs(newPrefs);
    saveDietaryPreferences(newPrefs);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function toggleRestriction(restriction: DietaryRestriction) {
    const current = prefs.restrictions;
    const updated = current.includes(restriction)
      ? current.filter(r => r !== restriction)
      : [...current, restriction];
    updatePrefs({ restrictions: updated });
  }

  function toggleCondition(condition: HealthCondition) {
    const current = prefs.healthConditions;
    const updated = current.includes(condition)
      ? current.filter(c => c !== condition)
      : [...current, condition];
    updatePrefs({ healthConditions: updated });
  }

  function addAllergy() {
    if (newAllergy.trim() && !prefs.allergies.includes(newAllergy.trim())) {
      updatePrefs({ allergies: [...prefs.allergies, newAllergy.trim()] });
      setNewAllergy('');
    }
  }

  function removeAllergy(allergy: string) {
    updatePrefs({ allergies: prefs.allergies.filter(a => a !== allergy) });
  }

  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Enable/Disable Toggle */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem',
          background: prefs.enabled ? 'var(--success-bg, rgba(34, 197, 94, 0.1))' : 'var(--bg-tertiary)',
          borderRadius: '0.5rem',
          border: prefs.enabled ? '1px solid var(--success)' : '1px solid var(--border-secondary)',
        }}
      >
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            Dietary Adaptation
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            {prefs.enabled ? 'Recipes will be adapted to your preferences' : 'Recipes shown as-is'}
          </div>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={prefs.enabled}
            onChange={(e) => updatePrefs({ enabled: e.target.checked })}
            style={{ width: '1.25rem', height: '1.25rem', accentColor: 'var(--primary)' }}
          />
        </label>
      </div>

      {/* Dietary Restrictions */}
      <section>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
          Dietary Restrictions
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {(Object.keys(DIETARY_RESTRICTION_INFO) as DietaryRestriction[]).map(restriction => {
            const info = DIETARY_RESTRICTION_INFO[restriction];
            const isSelected = prefs.restrictions.includes(restriction);
            return (
              <button
                key={restriction}
                onClick={() => toggleRestriction(restriction)}
                title={info.description}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '2rem',
                  border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-secondary)',
                  background: isSelected ? 'var(--primary-bg, rgba(59, 130, 246, 0.1))' : 'var(--bg-secondary)',
                  color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                  fontWeight: isSelected ? 600 : 400,
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  transition: 'all 0.15s ease',
                }}
              >
                {info.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Health Conditions */}
      <section>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
          Health Conditions
        </h3>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.5rem' }}>
          Select any conditions that affect your diet. Recipes will be adapted with appropriate considerations.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {(Object.keys(HEALTH_CONDITION_INFO) as HealthCondition[]).map(condition => {
            const info = HEALTH_CONDITION_INFO[condition];
            const isSelected = prefs.healthConditions.includes(condition);
            return (
              <button
                key={condition}
                onClick={() => toggleCondition(condition)}
                title={info.considerations.join(', ')}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '2rem',
                  border: isSelected ? '2px solid var(--warning, #f59e0b)' : '1px solid var(--border-secondary)',
                  background: isSelected ? 'rgba(245, 158, 11, 0.1)' : 'var(--bg-secondary)',
                  color: isSelected ? 'var(--warning, #f59e0b)' : 'var(--text-secondary)',
                  fontWeight: isSelected ? 600 : 400,
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  transition: 'all 0.15s ease',
                }}
              >
                {info.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Allergies */}
      <section>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
          Allergies
        </h3>
        <p style={{ fontSize: '0.75rem', color: 'var(--error, #ef4444)', marginBottom: '0.5rem' }}>
          Critical: These ingredients will be flagged and substituted in all recipes.
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <input
            type="text"
            value={newAllergy}
            onChange={(e) => setNewAllergy(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addAllergy()}
            placeholder="Add allergy (e.g., sesame, mustard)"
            style={{
              flex: 1,
              padding: '0.5rem 0.75rem',
              borderRadius: '0.375rem',
              border: '1px solid var(--border-secondary)',
              background: 'var(--input-bg)',
              color: 'var(--text-primary)',
              fontSize: '0.875rem',
            }}
          />
          <Button onClick={addAllergy} size="sm">Add</Button>
        </div>
        {prefs.allergies.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {prefs.allergies.map(allergy => (
              <span
                key={allergy}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '2rem',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid var(--error, #ef4444)',
                  color: 'var(--error, #ef4444)',
                  fontSize: '0.875rem',
                }}
              >
                {allergy}
                <button
                  onClick={() => removeAllergy(allergy)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'inherit',
                    cursor: 'pointer',
                    padding: '0 0.25rem',
                    fontSize: '1rem',
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Weight Goals */}
      <section>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
          Weight Goals
        </h3>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          {[
            { value: null, label: 'No Goal' },
            { value: 'lose' as WeightGoal, label: 'Lose Weight' },
            { value: 'maintain' as WeightGoal, label: 'Maintain' },
            { value: 'gain' as WeightGoal, label: 'Gain Weight' },
          ].map(option => (
            <button
              key={option.label}
              onClick={() => updatePrefs({ weightGoal: option.value })}
              style={{
                flex: 1,
                padding: '0.5rem',
                borderRadius: '0.375rem',
                border: prefs.weightGoal === option.value ? '2px solid var(--primary)' : '1px solid var(--border-secondary)',
                background: prefs.weightGoal === option.value ? 'var(--primary-bg, rgba(59, 130, 246, 0.1))' : 'var(--bg-secondary)',
                color: prefs.weightGoal === option.value ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: prefs.weightGoal === option.value ? 600 : 400,
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              {option.label}
            </button>
          ))}
        </div>

        {prefs.weightGoal && (
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>
                Daily Calorie Target
              </label>
              <input
                type="number"
                value={prefs.calorieTarget || ''}
                onChange={(e) => updatePrefs({ calorieTarget: e.target.value ? parseInt(e.target.value) : null })}
                placeholder="e.g., 2000"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '0.375rem',
                  border: '1px solid var(--border-secondary)',
                  background: 'var(--input-bg)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>
                Daily Protein (g)
              </label>
              <input
                type="number"
                value={prefs.proteinTarget || ''}
                onChange={(e) => updatePrefs({ proteinTarget: e.target.value ? parseInt(e.target.value) : null })}
                placeholder="e.g., 150"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '0.375rem',
                  border: '1px solid var(--border-secondary)',
                  background: 'var(--input-bg)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                }}
              />
            </div>
          </div>
        )}
      </section>

      {/* Custom Notes */}
      <section>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
          Additional Notes
        </h3>
        <textarea
          value={prefs.customNotes}
          onChange={(e) => updatePrefs({ customNotes: e.target.value })}
          placeholder="Any other dietary preferences or restrictions (e.g., 'no cilantro', 'prefer low-fat alternatives')"
          rows={3}
          style={{
            width: '100%',
            padding: '0.75rem',
            borderRadius: '0.375rem',
            border: '1px solid var(--border-secondary)',
            background: 'var(--input-bg)',
            color: 'var(--text-primary)',
            fontSize: '0.875rem',
            resize: 'vertical',
          }}
        />
      </section>

      {/* Summary */}
      {prefs.enabled && (prefs.restrictions.length > 0 || prefs.healthConditions.length > 0 || prefs.allergies.length > 0) && (
        <section style={{
          padding: '1rem',
          background: 'var(--bg-tertiary)',
          borderRadius: '0.5rem',
          border: '1px solid var(--border-secondary)',
        }}>
          <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Active Adaptations
          </h4>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {[
              prefs.restrictions.length > 0 && `${prefs.restrictions.length} dietary restriction${prefs.restrictions.length > 1 ? 's' : ''}`,
              prefs.healthConditions.length > 0 && `${prefs.healthConditions.length} health condition${prefs.healthConditions.length > 1 ? 's' : ''}`,
              prefs.allergies.length > 0 && `${prefs.allergies.length} allerg${prefs.allergies.length > 1 ? 'ies' : 'y'}`,
              prefs.weightGoal && `${prefs.weightGoal} weight goal`,
            ].filter(Boolean).join(' • ')}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.5rem' }}>
            Recipes will be automatically adapted using AI when you view them.
          </p>
        </section>
      )}
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--overlay-bg, rgba(0, 0, 0, 0.5))',
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
          maxWidth: '600px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '1.5rem',
            borderBottom: '1px solid var(--border-primary)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Dietary Preferences
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
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                padding: '0.25rem',
              }}
            >
              ×
            </button>
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
          {content}
        </div>
      </div>
    </div>
  );
}

export default DietarySettings;
