import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Card, Button } from '../common';
import { useEscapeToClose } from '../../contexts';
import { createCookbook } from '../../db';
import type { Cookbook, RecipeCategory } from '../../types';

interface NewCookbookModalProps {
  onCreated: (cookbook: Cookbook) => void;
  onClose: () => void;
}

const CATEGORY_OPTIONS: { value: RecipeCategory; label: string }[] = [
  { value: 'cooking', label: '🍳 Cooking' },
  { value: 'baking', label: '🥧 Baking' },
  { value: 'fermentation', label: '🫙 Fermentation' },
  { value: 'preservation', label: '🥫 Preservation' },
  { value: 'herbalism', label: '🌿 Herbalism' },
  { value: 'craft', label: '🛠️ Craft' },
];

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  border: '1px solid var(--input-border)',
  borderRadius: '0.5rem',
  fontSize: '0.875rem',
  background: 'var(--input-bg)',
  color: 'var(--text-primary)',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '0.25rem',
  fontSize: '0.875rem',
  color: 'var(--text-secondary)',
};

export function NewCookbookModal({ onCreated, onClose }: NewCookbookModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState<RecipeCategory>('cooking');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEscapeToClose(onClose);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Give your cookbook a name.');
      return;
    }

    setSaving(true);
    setError(null);
    const now = new Date().toISOString();
    const cookbook: Cookbook = {
      id: uuidv4(),
      title: trimmedTitle,
      description: description.trim(),
      author: author.trim(),
      category,
      bookshelf_id: null,
      created_at: now,
      modified_at: now,
    };

    try {
      await createCookbook(cookbook);
      onCreated(cookbook);
    } catch (err) {
      console.error('Failed to create cookbook:', err);
      setError('Could not create the cookbook. Please try again.');
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-cookbook-title"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <Card
        style={{ width: '100%', maxWidth: '500px', padding: '1.5rem' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="new-cookbook-title" style={{ margin: '0 0 1rem', color: 'var(--text-primary)' }}>
          New Cookbook
        </h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label htmlFor="new-cookbook-name" style={labelStyle}>
              Name
            </label>
            <input
              id="new-cookbook-name"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Weeknight Dinners"
              maxLength={100}
              autoFocus
              style={inputStyle}
            />
          </div>
          <div>
            <label htmlFor="new-cookbook-description" style={labelStyle}>
              Description (optional)
            </label>
            <input
              id="new-cookbook-description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={300}
              style={inputStyle}
            />
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 180px' }}>
              <label htmlFor="new-cookbook-category" style={labelStyle}>
                Category
              </label>
              <select
                id="new-cookbook-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as RecipeCategory)}
                style={inputStyle}
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: '1 1 180px' }}>
              <label htmlFor="new-cookbook-author" style={labelStyle}>
                Author (optional)
              </label>
              <input
                id="new-cookbook-author"
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                maxLength={100}
                style={inputStyle}
              />
            </div>
          </div>

          {error && (
            <p role="alert" style={{ margin: 0, fontSize: '0.875rem', color: 'var(--error-text)' }}>
              {error}
            </p>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Creating…' : 'Create Cookbook'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
