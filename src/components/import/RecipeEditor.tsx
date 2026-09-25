import { useState } from 'react';
import { Card, Button, DifficultyBadge } from '../common';
import {
  assessDifficulty,
  createBlankIngredient,
  createBlankStep,
  createRecipeFromParsed,
  formatMinutes,
  stepTimingFromText,
  type ParsedRecipe,
} from '../../services/recipeParser';
import { createRecipe } from '../../db';
import type { Cookbook, Ingredient, Step, DifficultyScore, CourseType } from '../../types';
import { CourseTypeLabels } from '../../types';

type EditorTab = 'overview' | 'ingredients' | 'steps';

interface ValidationIssue {
  tab: EditorTab;
  message: string;
}

/** Split a comma-separated field into trimmed, non-empty entries */
function parseList(text: string, lowercase = false): string[] {
  return text
    .split(',')
    .map((s) => (lowercase ? s.trim().toLowerCase() : s.trim()))
    .filter(Boolean);
}

/** Step indexes must match their position after any add/remove/reorder */
function renumberSteps(steps: Step[]): Step[] {
  return steps.map((step, i) => (step.index === i ? step : { ...step, index: i }));
}

/** Start with at least one row of each (manual entry, or a parse that found nothing) */
function prepareForEditing(recipe: ParsedRecipe): ParsedRecipe {
  return {
    ...recipe,
    ingredients: recipe.ingredients.length > 0 ? recipe.ingredients : [createBlankIngredient()],
    steps: recipe.steps.length > 0 ? renumberSteps(recipe.steps) : [createBlankStep(0)],
  };
}

function isBlankIngredient(ing: Ingredient): boolean {
  return !ing.item.trim() && !ing.amount.trim() && !ing.unit.trim() && !(ing.prep ?? '').trim();
}

function isBlankStep(step: Step): boolean {
  return (
    !step.title.trim() &&
    !step.instruction.trim() &&
    !step.time_display.trim() &&
    !(step.tip ?? '').trim() &&
    !step.visual_prompt.trim()
  );
}

/**
 * Build the recipe that will be saved: untouched blank rows are dropped, list
 * fields are parsed, steps renumbered and titled. Also reports anything the
 * cooking flow can't work without (a name, an ingredient, a step to follow).
 */
function prepareForSave(
  recipe: ParsedRecipe,
  equipmentText: string,
  tagsText: string
): { recipe: ParsedRecipe; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = [];

  const name = recipe.name.trim();
  if (!name) {
    issues.push({ tab: 'overview', message: 'Give the recipe a name.' });
  }

  const ingredients = recipe.ingredients.filter((ing) => !isBlankIngredient(ing));
  recipe.ingredients.forEach((ing, i) => {
    if (!isBlankIngredient(ing) && !ing.item.trim()) {
      issues.push({ tab: 'ingredients', message: `Ingredient row ${i + 1} needs an ingredient name.` });
    }
  });
  if (!ingredients.some((ing) => ing.item.trim())) {
    issues.push({ tab: 'ingredients', message: 'Add at least one ingredient.' });
  }

  const steps = recipe.steps.filter((step) => !isBlankStep(step));
  recipe.steps.forEach((step, i) => {
    if (!isBlankStep(step) && !step.instruction.trim()) {
      issues.push({ tab: 'steps', message: `Step ${i + 1} needs instructions.` });
    }
  });
  if (!steps.some((step) => step.instruction.trim())) {
    issues.push({ tab: 'steps', message: 'Add at least one step with instructions.' });
  }

  const finalSteps = renumberSteps(steps).map((step) => ({
    ...step,
    title: step.title.trim() || `Step ${step.index + 1}`,
    instruction: step.instruction.trim(),
  }));
  const sumMinutes = (list: Step[]) => list.reduce((sum, step) => sum + step.time_minutes, 0);

  return {
    issues,
    recipe: {
      ...recipe,
      name,
      equipment: parseList(equipmentText),
      tags: parseList(tagsText, true),
      ingredients: ingredients.map((ing) => ({ ...ing, item: ing.item.trim() })),
      steps: finalSteps,
      // Fill blank times from the steps so hand-entered recipes still get estimates
      total_time: recipe.total_time.trim() || formatMinutes(sumMinutes(finalSteps)),
      active_time:
        recipe.active_time.trim() ||
        formatMinutes(sumMinutes(finalSteps.filter((step) => step.type === 'active'))),
    },
  };
}


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
  const [recipe, setRecipe] = useState<ParsedRecipe>(() => prepareForEditing(parsedRecipe));
  const [difficulty, setDifficulty] = useState<DifficultyScore | null>(null);
  const [saving, setSaving] = useState(false);
  const [assessingDifficulty, setAssessingDifficulty] = useState(false);
  const [activeTab, setActiveTab] = useState<EditorTab>('overview');
  // Raw text for the comma-separated fields; parsed on blur and on save so
  // spaces and commas can be typed freely
  const [equipmentText, setEquipmentText] = useState(() => parsedRecipe.equipment.join(', '));
  const [tagsText, setTagsText] = useState(() => parsedRecipe.tags.join(', '));
  const [dirty, setDirty] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  const isManual = Boolean(recipe.manual);
  // Once a save has been attempted, keep the problem list current as the user fixes things
  const validationIssues = showValidation ? prepareForSave(recipe, equipmentText, tagsText).issues : [];

  async function handleAssessDifficulty() {
    setAssessingDifficulty(true);
    try {
      const assessed = await assessDifficulty({
        ...recipe,
        equipment: parseList(equipmentText),
        tags: parseList(tagsText, true),
      });
      setDifficulty(assessed);
    } catch (error) {
      console.error('Failed to assess difficulty:', error);
    } finally {
      setAssessingDifficulty(false);
    }
  }

  async function handleSave() {
    const { recipe: finalRecipe, issues } = prepareForSave(recipe, equipmentText, tagsText);
    if (issues.length > 0) {
      setShowValidation(true);
      setActiveTab(issues[0].tab);
      return;
    }

    setSaving(true);
    try {
      const finalDifficulty = difficulty || {
        overall: 3,
        technique: 3,
        timing: 3,
        ingredients: 3,
        equipment: 3,
      };

      const newRecipe = createRecipeFromParsed(finalRecipe, cookbook.id, finalDifficulty);
      await createRecipe(newRecipe);
      onSave();
    } catch (error) {
      console.error('Failed to save recipe:', error);
      alert('Failed to save recipe. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    // Cancelling discards the recipe entirely (it returns to the cookbook)
    if (dirty && !window.confirm('Discard this recipe? Your changes will not be saved.')) {
      return;
    }
    onCancel();
  }

  function updateRecipe(updates: Partial<ParsedRecipe> | ((prev: ParsedRecipe) => Partial<ParsedRecipe>)) {
    setRecipe((prev) => ({ ...prev, ...(typeof updates === 'function' ? updates(prev) : updates) }));
    setDirty(true);
  }

  function updateIngredient(index: number, updates: Partial<Ingredient>) {
    updateRecipe((prev) => ({
      ingredients: prev.ingredients.map((ing, i) => (i === index ? { ...ing, ...updates } : ing)),
    }));
  }

  function removeIngredient(index: number) {
    updateRecipe((prev) => ({ ingredients: prev.ingredients.filter((_, i) => i !== index) }));
  }

  function addIngredient() {
    updateRecipe((prev) => ({ ingredients: [...prev.ingredients, createBlankIngredient()] }));
  }

  function updateStep(index: number, updates: Partial<Step>) {
    updateRecipe((prev) => ({
      steps: prev.steps.map((step, i) => (i === index ? { ...step, ...updates } : step)),
    }));
  }

  function updateStepTime(index: number, text: string) {
    // The cooking Timer reads timer_default (seconds) and estimates read
    // time_minutes, so both follow the text rather than just time_display
    updateStep(index, { time_display: text, ...stepTimingFromText(text) });
  }

  function tidyStepTime(index: number) {
    // Show typed shorthand ("45", "1h30m") in the standard form once the field loses focus
    setRecipe((prev) => {
      const step = prev.steps[index];
      const formatted = step ? formatMinutes(step.time_minutes) : '';
      if (!formatted || formatted === step.time_display) return prev;
      return {
        ...prev,
        steps: prev.steps.map((s, i) => (i === index ? { ...s, time_display: formatted } : s)),
      };
    });
  }

  function removeStep(index: number) {
    updateRecipe((prev) => ({ steps: renumberSteps(prev.steps.filter((_, i) => i !== index)) }));
  }

  function moveStep(index: number, offset: -1 | 1) {
    updateRecipe((prev) => {
      const target = index + offset;
      if (target < 0 || target >= prev.steps.length) return {};
      const steps = [...prev.steps];
      [steps[index], steps[target]] = [steps[target], steps[index]];
      return { steps: renumberSteps(steps) };
    });
  }

  function addStep() {
    updateRecipe((prev) => ({ steps: [...prev.steps, createBlankStep(prev.steps.length)] }));
  }

  function commitEquipment() {
    const list = parseList(equipmentText);
    setRecipe((prev) => ({ ...prev, equipment: list }));
    setEquipmentText(list.join(', '));
  }

  function commitTags() {
    const list = parseList(tagsText, true);
    setRecipe((prev) => ({ ...prev, tags: list }));
    setTagsText(list.join(', '));
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'ingredients', label: `Ingredients (${recipe.ingredients.length})` },
    { id: 'steps', label: `Steps (${recipe.steps.length})` },
  ] as const;

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem' }}>
        <Button variant="ghost" onClick={handleCancel} disabled={saving} style={{ marginBottom: '1rem' }}>
          ← Cancel
        </Button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              {isManual ? 'New Recipe' : 'Review & Edit Recipe'}
            </h1>
            <p style={{ color: 'var(--text-tertiary)', margin: '0.25rem 0 0' }}>
              {isManual
                ? `Enter the recipe details, then save it to ${cookbook.title}`
                : `Make any corrections before saving to ${cookbook.title}`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button variant="secondary" onClick={handleCancel} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Recipe'}
            </Button>
          </div>
        </div>
      </header>

      {/* Confidence indicator (AI imports only) */}
      {!isManual && (
        <Card style={{ marginBottom: '1.5rem', background: 'var(--warning-bg)', border: '1px solid var(--warning-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.25rem' }}>🤖</span>
            <div>
              <div style={{ fontWeight: 500, color: 'var(--warning-text)' }}>
                AI Parsing Confidence: {Math.round(recipe.confidence * 100)}%
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--warning)' }}>
                Please review the extracted data and make any necessary corrections.
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Validation problems from the last save attempt */}
      {validationIssues.length > 0 && (
        <Card style={{ marginBottom: '1.5rem', background: 'var(--error-bg)', border: '1px solid var(--error-border)' }}>
          <div role="alert">
            <div style={{ fontWeight: 500, color: 'var(--error)' }}>Before this recipe can be saved:</div>
            <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', fontSize: '0.875rem', color: 'var(--error-text)' }}>
              {validationIssues.map((issue) => (
                <li key={issue.message}>
                  <button
                    type="button"
                    onClick={() => setActiveTab(issue.tab)}
                    style={{
                      border: 'none',
                      background: 'none',
                      padding: 0,
                      font: 'inherit',
                      color: 'inherit',
                      textAlign: 'left',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    {issue.message}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.25rem',
          marginBottom: '1.5rem',
          borderBottom: '1px solid var(--border-primary)',
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
              color: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--text-tertiary)',
              borderBottom: activeTab === tab.id ? '2px solid var(--accent-primary)' : '2px solid transparent',
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
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Basic Information
            </h3>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label htmlFor="recipe-editor-name" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  Recipe Name
                </label>
                <input
                  id="recipe-editor-name"
                  type="text"
                  value={recipe.name}
                  onChange={(e) => updateRecipe({ name: e.target.value })}
                  placeholder="e.g. Grandma's Apple Pie"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid var(--border-secondary)',
                    borderRadius: '0.375rem',
                    background: 'var(--input-bg)',
                    color: 'var(--text-primary)',
                    fontSize: '1rem',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  Description
                </label>
                <textarea
                  value={recipe.description}
                  onChange={(e) => updateRecipe({ description: e.target.value })}
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid var(--border-secondary)',
                    borderRadius: '0.375rem',
                    background: 'var(--input-bg)',
                    color: 'var(--text-primary)',
                    fontSize: '1rem',
                    resize: 'vertical',
                  }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    Total Time
                  </label>
                  <input
                    type="text"
                    value={recipe.total_time}
                    onChange={(e) => updateRecipe({ total_time: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid var(--border-secondary)',
                      borderRadius: '0.375rem',
                      background: 'var(--input-bg)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    Active Time
                  </label>
                  <input
                    type="text"
                    value={recipe.active_time}
                    onChange={(e) => updateRecipe({ active_time: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid var(--border-secondary)',
                      borderRadius: '0.375rem',
                      background: 'var(--input-bg)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    Yield
                  </label>
                  <input
                    type="text"
                    value={recipe.yield}
                    onChange={(e) => updateRecipe({ yield: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid var(--border-secondary)',
                      borderRadius: '0.375rem',
                      background: 'var(--input-bg)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Classification Card */}
          <Card>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Classification
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  Course Type
                </label>
                <select
                  value={recipe.course_type || ''}
                  onChange={(e) => updateRecipe({ course_type: (e.target.value as CourseType) || null })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid var(--border-secondary)',
                    borderRadius: '0.375rem',
                    background: 'var(--input-bg)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                  }}
                >
                  <option value="">Select course type...</option>
                  {(Object.keys(CourseTypeLabels) as CourseType[]).map((type) => (
                    <option key={type} value={type}>
                      {CourseTypeLabels[type].icon} {CourseTypeLabels[type].label}
                    </option>
                  ))}
                </select>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                  Helps with pairing suggestions and filtering
                </p>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  Cuisine
                </label>
                <select
                  value={recipe.cuisine || ''}
                  onChange={(e) => updateRecipe({ cuisine: e.target.value || null })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid var(--border-secondary)',
                    borderRadius: '0.375rem',
                    background: 'var(--input-bg)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                  }}
                >
                  <option value="">Select cuisine...</option>
                  {CUISINE_OPTIONS.map((cuisine) => (
                    <option key={cuisine} value={cuisine}>
                      {cuisine}
                    </option>
                  ))}
                </select>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                  Used for pairing complementary dishes
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>
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
              <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                Click "Auto-Assess" to have AI evaluate the recipe difficulty, or manually set after saving.
              </p>
            )}
          </Card>

          <Card>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Equipment
            </h3>
            <input
              type="text"
              value={equipmentText}
              onChange={(e) => {
                setEquipmentText(e.target.value);
                setDirty(true);
              }}
              onBlur={commitEquipment}
              placeholder="Mixing bowl, whisk, baking sheet..."
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid var(--border-secondary)',
                borderRadius: '0.375rem',
                background: 'var(--input-bg)',
                color: 'var(--text-primary)',
              }}
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
              Separate items with commas
            </p>
          </Card>

          <Card>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Tags
            </h3>
            <input
              type="text"
              value={tagsText}
              onChange={(e) => {
                setTagsText(e.target.value);
                setDirty(true);
              }}
              onBlur={commitTags}
              placeholder="dinner, comfort food, quick..."
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid var(--border-secondary)',
                borderRadius: '0.375rem',
                background: 'var(--input-bg)',
                color: 'var(--text-primary)',
              }}
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
              Separate tags with commas
            </p>
          </Card>

          <Card>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '1rem' }}>
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
                border: '1px solid var(--border-secondary)',
                borderRadius: '0.375rem',
                background: 'var(--input-bg)',
                color: 'var(--text-primary)',
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
                        border: '1px solid var(--border-secondary)',
                        borderRadius: '0.375rem',
                        background: 'var(--input-bg)',
                        color: 'var(--text-primary)',
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
                        border: '1px solid var(--border-secondary)',
                        borderRadius: '0.375rem',
                        background: 'var(--input-bg)',
                        color: 'var(--text-primary)',
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
                        border: '1px solid var(--border-secondary)',
                        borderRadius: '0.375rem',
                        background: 'var(--input-bg)',
                        color: 'var(--text-primary)',
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
                        border: '1px solid var(--border-secondary)',
                        borderRadius: '0.375rem',
                        background: 'var(--input-bg)',
                        color: 'var(--text-primary)',
                        fontSize: '0.875rem',
                      }}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeIngredient(index)}
                    aria-label={`Remove ingredient ${index + 1}`}
                  >
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
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>
                    Step {index + 1}
                  </div>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveStep(index, -1)}
                      disabled={index === 0}
                      aria-label={`Move step ${index + 1} up`}
                    >
                      ↑
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveStep(index, 1)}
                      disabled={index === recipe.steps.length - 1}
                      aria-label={`Move step ${index + 1} down`}
                    >
                      ↓
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeStep(index)}
                      aria-label={`Remove step ${index + 1}`}
                    >
                      ✕
                    </Button>
                  </div>
                </div>
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px', gap: '0.5rem' }}>
                    <input
                      type="text"
                      value={step.title}
                      onChange={(e) => updateStep(index, { title: e.target.value })}
                      placeholder={`Step title (default: Step ${index + 1})`}
                      style={{
                        padding: '0.5rem',
                        border: '1px solid var(--border-secondary)',
                        borderRadius: '0.375rem',
                        background: 'var(--input-bg)',
                        color: 'var(--text-primary)',
                      }}
                    />
                    <input
                      type="text"
                      value={step.time_display}
                      onChange={(e) => updateStepTime(index, e.target.value)}
                      onBlur={() => tidyStepTime(index)}
                      placeholder="Time, e.g. 10 min"
                      aria-label={`Step ${index + 1} time`}
                      title="Sets this step's cooking timer"
                      style={{
                        padding: '0.5rem',
                        border: '1px solid var(--border-secondary)',
                        borderRadius: '0.375rem',
                        background: 'var(--input-bg)',
                        color: 'var(--text-primary)',
                      }}
                    />
                    <select
                      value={step.type}
                      onChange={(e) => updateStep(index, { type: e.target.value as 'active' | 'passive' })}
                      style={{
                        padding: '0.5rem',
                        border: '1px solid var(--border-secondary)',
                        borderRadius: '0.375rem',
                        background: 'var(--input-bg)',
                        color: 'var(--text-primary)',
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
                      border: '1px solid var(--border-secondary)',
                      borderRadius: '0.375rem',
                      background: 'var(--input-bg)',
                      color: 'var(--text-primary)',
                      resize: 'vertical',
                    }}
                  />
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Visual Prompt (for AI image generation)</label>
                    <textarea
                      value={step.visual_prompt}
                      onChange={(e) => updateStep(index, { visual_prompt: e.target.value })}
                      placeholder="Describe what this step should look like when done correctly..."
                      rows={2}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid var(--border-secondary)',
                        borderRadius: '0.375rem',
                        background: 'var(--input-bg)',
                        color: 'var(--text-primary)',
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
                      border: '1px solid var(--border-secondary)',
                      borderRadius: '0.375rem',
                      background: 'var(--input-bg)',
                      color: 'var(--text-primary)',
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
