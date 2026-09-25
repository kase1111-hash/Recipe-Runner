// Shared Recipe Import
// Opens a self-contained share link (/shared#<payload>) and saves a copy of the
// recipe into one of the user's cookbooks.

import { useEffect, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { Button, Card, DifficultyBadge } from '../common';
import { createCookbook, createRecipe, getAllCookbooks } from '../../db';
import {
  createRecipeFromShared,
  decodeSharedRecipe,
  type SharedRecipeData,
} from '../../services/sharing';
import type { Cookbook, Recipe } from '../../types';

interface SharedRecipeImportProps {
  payload: string;
  onSaved: (recipe: Recipe, cookbook: Cookbook) => void;
  onCancel: () => void;
}

type LoadState =
  | { status: 'loading' }
  | { status: 'invalid' }
  | { status: 'ready'; recipe: SharedRecipeData };

// Select value for "create a new cookbook for this recipe"
const NEW_COOKBOOK = '__new__';
const NEW_COOKBOOK_TITLE = 'Shared Recipes';

export function SharedRecipeImport({ payload, onSaved, onCancel }: SharedRecipeImportProps) {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [cookbooks, setCookbooks] = useState<Cookbook[]>([]);
  const [cookbookId, setCookbookId] = useState<string>(NEW_COOKBOOK);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [recipe, books] = await Promise.all([
        decodeSharedRecipe(payload),
        getAllCookbooks().catch((error) => {
          // Still allow saving into a new cookbook
          console.error('Failed to load cookbooks:', error);
          return [] as Cookbook[];
        }),
      ]);
      if (cancelled) return;

      setCookbooks(books);
      // Prefer an existing "Shared Recipes" cookbook, then the most recent one
      const preferred = books.find((b) => b.title === NEW_COOKBOOK_TITLE) ?? books[0];
      setCookbookId(preferred?.id ?? NEW_COOKBOOK);
      setState(recipe ? { status: 'ready', recipe } : { status: 'invalid' });
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [payload]);

  async function handleSave() {
    if (state.status !== 'ready') return;
    setSaving(true);
    setSaveError(null);

    try {
      let cookbook = cookbooks.find((b) => b.id === cookbookId);
      if (!cookbook) {
        const now = new Date().toISOString();
        cookbook = {
          id: uuid(),
          title: NEW_COOKBOOK_TITLE,
          description: 'Recipes other people have shared with you',
          author: '',
          category: 'cooking',
          bookshelf_id: null,
          created_at: now,
          modified_at: now,
        };
        await createCookbook(cookbook);
        // Remember it, so a retry after a failed recipe save doesn't create a second one
        const created = cookbook;
        setCookbooks((prev) => [...prev, created]);
        setCookbookId(created.id);
      }

      const recipe = createRecipeFromShared(state.recipe, cookbook.id);
      await createRecipe(recipe);
      onSaved(recipe, cookbook);
    } catch (error) {
      console.error('Failed to save shared recipe:', error);
      setSaveError('Could not save the recipe. Please try again.');
      setSaving(false);
    }
  }

  if (state.status === 'loading') {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
        Opening shared recipe...
      </div>
    );
  }

  if (state.status === 'invalid') {
    return (
      <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
        <Card style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.75rem' }}>
            This share link can't be opened
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: '0 0 0.5rem' }}>
            The link looks incomplete or damaged. Some apps cut long links short when they're
            pasted or forwarded.
          </p>
          <p style={{ color: 'var(--text-tertiary)', margin: '0 0 1.5rem', fontSize: '0.875rem' }}>
            Ask the sender to copy the whole link and send it again. If it still won't open,
            try updating your browser.
          </p>
          <Button onClick={onCancel}>Go to my library</Button>
        </Card>
      </div>
    );
  }

  const { recipe } = state;
  const meta = [
    recipe.yield && `Yield: ${recipe.yield}`,
    recipe.total_time && `Total: ${recipe.total_time}`,
    recipe.active_time && `Active: ${recipe.active_time}`,
  ].filter(Boolean);

  const sectionHeadingStyle = {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
    margin: '0 0 0.75rem',
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <header style={{ marginBottom: '1.5rem' }}>
        <div
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--accent-primary)',
            marginBottom: '0.5rem',
          }}
        >
          Shared recipe
        </div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.5rem' }}>
          {recipe.name}
        </h1>
        {recipe.description && (
          <p style={{ color: 'var(--text-secondary)', margin: '0 0 0.75rem' }}>{recipe.description}</p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <DifficultyBadge score={recipe.difficulty} />
          {meta.length > 0 && (
            <span style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>{meta.join(' · ')}</span>
          )}
        </div>
        {recipe.source.title && (
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem', margin: '0.5rem 0 0' }}>
            Source: {recipe.source.title}
          </p>
        )}
      </header>

      {/* Save */}
      <Card style={{ marginBottom: '1.5rem' }}>
        <label
          htmlFor="shared-recipe-cookbook"
          style={{ display: 'block', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.5rem' }}
        >
          Save to cookbook
        </label>
        <select
          id="shared-recipe-cookbook"
          value={cookbookId}
          onChange={(e) => setCookbookId(e.target.value)}
          disabled={saving}
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid var(--border-secondary)',
            borderRadius: '0.375rem',
            background: 'var(--input-bg)',
            color: 'var(--text-primary)',
            fontSize: '0.875rem',
            marginBottom: '1rem',
          }}
        >
          {cookbooks.map((book) => (
            <option key={book.id} value={book.id}>
              {book.title}
            </option>
          ))}
          {!cookbooks.some((b) => b.title === NEW_COOKBOOK_TITLE) && (
            <option value={NEW_COOKBOOK}>New cookbook: {NEW_COOKBOOK_TITLE}</option>
          )}
        </select>

        {saveError && (
          <div
            role="alert"
            style={{
              padding: '0.75rem',
              background: 'var(--error-bg)',
              border: '1px solid var(--error-border)',
              borderRadius: '0.375rem',
              color: 'var(--error-text)',
              fontSize: '0.875rem',
              marginBottom: '1rem',
            }}
          >
            {saveError}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Button onClick={handleSave} disabled={saving} style={{ flex: 1 }}>
            {saving ? 'Saving...' : 'Save to my cookbook'}
          </Button>
          <Button variant="secondary" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        </div>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', margin: '0.75rem 0 0' }}>
          You'll get your own copy. Changes you make won't affect the sender's recipe.
        </p>
      </Card>

      {/* Ingredients */}
      <Card style={{ marginBottom: '1.5rem' }}>
        <h2 style={sectionHeadingStyle}>Ingredients ({recipe.ingredients.length})</h2>
        {recipe.ingredients.length === 0 ? (
          <p style={{ color: 'var(--text-tertiary)', margin: 0 }}>No ingredients listed.</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--text-secondary)' }}>
            {recipe.ingredients.map((ing, i) => (
              <li key={i} style={{ marginBottom: '0.25rem' }}>
                {[ing.amount, ing.unit, ing.item].filter(Boolean).join(' ')}
                {ing.prep && `, ${ing.prep}`}
                {ing.optional && (
                  <span style={{ color: 'var(--text-tertiary)' }}> (optional)</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Steps */}
      <Card>
        <h2 style={sectionHeadingStyle}>Steps ({recipe.steps.length})</h2>
        {recipe.steps.length === 0 ? (
          <p style={{ color: 'var(--text-tertiary)', margin: 0 }}>No steps listed.</p>
        ) : (
          <ol style={{ margin: 0, paddingLeft: '1.5rem', color: 'var(--text-secondary)' }}>
            {recipe.steps.map((step, i) => (
              <li key={i} style={{ marginBottom: '0.25rem' }}>
                {step.title}
                {step.time_display && (
                  <span style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}> · {step.time_display}</span>
                )}
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
