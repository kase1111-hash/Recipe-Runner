import { useState } from 'react';
import { Card, Button, DifficultyBadge } from '../common';
import {
  assessDifficulty,
  createRecipeFromParsed,
  type ParsedRecipe,
} from '../../services/recipeParser';
import { createRecipe } from '../../db';
import type { Cookbook, Ingredient, Step, DifficultyScore, CourseType } from '../../types';
import { CourseTypeLabels } from '../../types';


const CUISINE_OPTIONS = [
  'American',
  'Asian',
  'Chinese',
  'French',
  'Greek',
  'Indian',
  'Italian',
  'Japanese',
  'Korean',
  'Mediterranean',
  'Mexican',
  'Middle Eastern',
  'Southern',
  'Thai',
  'Vietnamese',
  'Other',
];

interface RecipeEditorProps {
  parsedRecipe: ParsedRecipe;
  cookbook: Cookbook;
  onSave: () => void;
  onCancel: () => void;
}

export function RecipeEditor({ parsedRecipe, cookbook, onSave, onCancel }: RecipeEditorProps) {
  const [recipe, setRecipe] = useState<ParsedRecipe>(parsedRecipe);
  const [difficulty, setDifficulty] = useState<DifficultyScore | null>(null);
  const [saving, setSaving] = useState(false);
  const [assessingDifficulty, setAssessingDifficulty] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'ingredients' | 'steps'>('overview');

  async function handleAssessDifficulty() {
    setAssessingDifficulty(true);
    try {
      const assessed = await assessDifficulty(recipe);
      setDifficulty(assessed);
    } catch (error) {
      console.error('Failed to assess difficulty:', error);
    } finally {
      setAssessingDifficulty(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const finalDifficulty = difficulty || {
        overall: 3,
        technique: 3,
        timing: 3,
        ingredients: 3,
        equipment: 3,
      };

      const newRecipe = createRecipeFromParsed(recipe, cookbook.id, finalDifficulty);
      await createRecipe(newRecipe);
      onSave();
    } catch (error) {
      console.error('Failed to save recipe:', error);
      alert('Failed to save recipe. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function updateRecipe(updates: Partial<ParsedRecipe>) {
    setRecipe({ ...recipe, ...updates });
  }

  function updateIngredient(index: number, updates: Partial<Ingredient>) {
    const newIngredients = [...recipe.ingredients];
    newIngredients[index] = { ...newIngredients[index], ...updates };
    updateRecipe({ ingredients: newIngredients });
  }

  function removeIngredient(index: number) {
    updateRecipe({ ingredients: recipe.ingredients.filter((_, i) => i !== index) });
  }

  function addIngredient() {
    updateRecipe({
      ingredients: [
        ...recipe.ingredients,
        { item: '', amount: '', unit: '', prep: null, optional: false, substitutes: [] },
      ],
    });
  }

  function updateStep(index: number, updates: Partial<Step>) {
    const newSteps = [...recipe.steps];
    newSteps[index] = { ...newSteps[index], ...updates };
    updateRecipe({ steps: newSteps });
  }

  function removeStep(index: number) {
    const newSteps = recipe.steps.filter((_, i) => i !== index);
    // Reindex steps
    const reindexed = newSteps.map((step, i) => ({ ...step, index: i }));
    updateRecipe({ steps: reindexed });
  }

  function addStep() {
    const newIndex = recipe.steps.length;
    updateRecipe({
      steps: [
        ...recipe.steps,
        {
          index: newIndex,
          title: `Step ${newIndex + 1}`,
          instruction: '',
          time_minutes: 5,
          time_display: '5 min',
          type: 'active',
          tip: null,
          visual_prompt: '',
          temperature: null,
          timer_default: null,
        },
      ],
    });
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'ingredients', label: `Ingredients (${recipe.ingredients.length})` },
    { id: 'steps', label: `Steps (${recipe.steps.length})` },
  ] as const;

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem' }}>
        <Button variant="ghost" onClick={onCancel} style={{ marginBottom: '1rem' }}>
          ← Back to Import
        </Button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#111827', margin: 0 }}>
              Review & Edit Recipe
            </h1>
            <p style={{ color: '#6b7280', margin: '0.25rem 0 0' }}>
              Make any corrections before saving to {cookbook.title}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button variant="secondary" onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Recipe'}
            </Button>
          </div>
        </div>
      </header>

      {/* Confidence indicator */}
      <Card style={{ marginBottom: '1.5rem', background: '#fefce8', border: '1px solid #fef08a' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.25rem' }}>🤖</span>
          <div>
            <div style={{ fontWeight: 500, color: '#854d0e' }}>
              AI Parsing Confidence: {Math.round(recipe.confidence * 100)}%
            </div>
            <div style={{ fontSize: '0.875rem', color: '#a16207' }}>
              Please review the extracted data and make any necessary corrections.
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.25rem',
          marginBottom: '1.5rem',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.75rem 1.25rem',
              border: 'none',
              background: 'none',
              fontWeight: 500,
              color: activeTab === tab.id ? '#2563eb' : '#6b7280',
              borderBottom: activeTab === tab.id ? '2px solid #2563eb' : '2px solid transparent',
              cursor: 'pointer',
              marginBottom: '-1px',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Card>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#374151', marginBottom: '1rem' }}>
              Basic Information
            </h3>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>
                  Recipe Name
                </label>
                <input
                  type="text"
                  value={recipe.name}
                  onChange={(e) => updateRecipe({ name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '1rem',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>
                  Description
                </label>
                <textarea
                  value={recipe.description}
                  onChange={(e) => updateRecipe({ description: e.target.value })}
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '1rem',
                    resize: 'vertical',
                  }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>
                    Total Time
                  </label>
                  <input
                    type="text"
                    value={recipe.total_time}
                    onChange={(e) => updateRecipe({ total_time: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>
                    Active Time
                  </label>
                  <input
                    type="text"
                    value={recipe.active_time}
                    onChange={(e) => updateRecipe({ active_time: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>
                    Yield
                  </label>
                  <input
                    type="text"
                    value={recipe.yield}
                    onChange={(e) => updateRecipe({ yield: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                    }}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Classification Card */}
          <Card>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#374151', marginBottom: '1rem' }}>
              Classification
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>
                  Course Type
                </label>
                <select
                  value={recipe.course_type || ''}
                  onChange={(e) => updateRecipe({ course_type: (e.target.value as CourseType) || null })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    background: 'white',
                  }}
                >
                  <option value="">Select course type...</option>
                  {(Object.keys(CourseTypeLabels) as CourseType[]).map((type) => (
                    <option key={type} value={type}>
                      {CourseTypeLabels[type].icon} {CourseTypeLabels[type].label}
                    </option>
                  ))}
                </select>
                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  Helps with pairing suggestions and filtering
                </p>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>
                  Cuisine
                </label>
                <select
                  value={recipe.cuisine || ''}
                  onChange={(e) => updateRecipe({ cuisine: e.target.value || null })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    background: 'white',
                  }}
                >
                  <option value="">Select cuisine...</option>
                  {CUISINE_OPTIONS.map((cuisine) => (
                    <option key={cuisine} value={cuisine}>
                      {cuisine}
                    </option>
                  ))}
                </select>
                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  Used for pairing complementary dishes
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#374151', margin: 0 }}>
                Difficulty Assessment
              </h3>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAssessDifficulty}
                disabled={assessingDifficulty}
              >
                {assessingDifficulty ? 'Assessing...' : difficulty ? 'Reassess' : 'Auto-Assess'}
              </Button>
            </div>
            {difficulty ? (
              <DifficultyBadge score={difficulty} showDetails />
            ) : (
              <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                Click "Auto-Assess" to have AI evaluate the recipe difficulty, or manually set after saving.
              </p>
            )}
          </Card>

          <Card>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#374151', marginBottom: '1rem' }}>
              Equipment
            </h3>
            <input
              type="text"
              value={recipe.equipment.join(', ')}
              onChange={(e) => updateRecipe({ equipment: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
              placeholder="Mixing bowl, whisk, baking sheet..."
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
              }}
            />
            <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
              Separate items with commas
            </p>
          </Card>

          <Card>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#374151', marginBottom: '1rem' }}>
              Tags
            </h3>
            <input
              type="text"
              value={recipe.tags.join(', ')}
              onChange={(e) => updateRecipe({ tags: e.target.value.split(',').map(s => s.trim().toLowerCase()).filter(Boolean) })}
              placeholder="dinner, comfort food, quick..."
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
              }}
            />
          </Card>

          <Card>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#374151', marginBottom: '1rem' }}>
              Notes
            </h3>
            <textarea
              value={recipe.notes}
              onChange={(e) => updateRecipe({ notes: e.target.value })}
              rows={3}
              placeholder="Any additional notes..."
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                resize: 'vertical',
              }}
            />
          </Card>
        </div>
      )}

      {/* Ingredients Tab */}
      {activeTab === 'ingredients' && (
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {recipe.ingredients.map((ingredient, index) => (
              <Card key={index} style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '80px 80px 1fr 150px', gap: '0.5rem', flex: 1 }}>
                    <input
                      type="text"
                      value={ingredient.amount}
                      onChange={(e) => updateIngredient(index, { amount: e.target.value })}
                      placeholder="Amount"
                      style={{
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                      }}
                    />
                    <input
                      type="text"
                      value={ingredient.unit}
                      onChange={(e) => updateIngredient(index, { unit: e.target.value })}
                      placeholder="Unit"
                      style={{
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                      }}
                    />
                    <input
                      type="text"
                      value={ingredient.item}
                      onChange={(e) => updateIngredient(index, { item: e.target.value })}
                      placeholder="Ingredient"
                      style={{
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                      }}
                    />
                    <input
                      type="text"
                      value={ingredient.prep || ''}
                      onChange={(e) => updateIngredient(index, { prep: e.target.value || null })}
                      placeholder="Prep (optional)"
                      style={{
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                      }}
                    />
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeIngredient(index)}>
                    ✕
                  </Button>
                </div>
              </Card>
            ))}
          </div>
          <Button variant="secondary" onClick={addIngredient} style={{ marginTop: '1rem' }}>
            + Add Ingredient
          </Button>
        </div>
      )}

      {/* Steps Tab */}
      {activeTab === 'steps' && (
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {recipe.steps.map((step, index) => (
              <Card key={index}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#6b7280' }}>
                    Step {index + 1}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeStep(index)}>
                    ✕
                  </Button>
                </div>
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px', gap: '0.5rem' }}>
                    <input
                      type="text"
                      value={step.title}
                      onChange={(e) => updateStep(index, { title: e.target.value })}
                      placeholder="Step title"
                      style={{
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                      }}
                    />
                    <input
                      type="text"
                      value={step.time_display}
                      onChange={(e) => updateStep(index, { time_display: e.target.value })}
                      placeholder="Time"
                      style={{
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                      }}
                    />
                    <select
                      value={step.type}
                      onChange={(e) => updateStep(index, { type: e.target.value as 'active' | 'passive' })}
                      style={{
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                      }}
                    >
                      <option value="active">Active</option>
                      <option value="passive">Passive</option>
                    </select>
                  </div>
                  <textarea
                    value={step.instruction}
                    onChange={(e) => updateStep(index, { instruction: e.target.value })}
                    placeholder="Step instructions..."
                    rows={2}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      resize: 'vertical',
                    }}
                  />
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#6b7280' }}>Visual Prompt (for AI image generation)</label>
                    <textarea
                      value={step.visual_prompt}
                      onChange={(e) => updateStep(index, { visual_prompt: e.target.value })}
                      placeholder="Describe what this step should look like when done correctly..."
                      rows={2}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        resize: 'vertical',
                        fontSize: '0.875rem',
                      }}
                    />
                  </div>
                  <input
                    type="text"
                    value={step.tip || ''}
                    onChange={(e) => updateStep(index, { tip: e.target.value || null })}
                    placeholder="Tip (optional)"
                    style={{
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>
              </Card>
            ))}
          </div>
          <Button variant="secondary" onClick={addStep} style={{ marginTop: '1rem' }}>
            + Add Step
          </Button>
        </div>
      )}
    </div>
  );
}
