import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, Button, ProgressBar } from '../common';
import {
  loadShoppingList,
  consolidateItems,
  setConsolidatedItemChecked,
  removeConsolidatedItem,
  removeRecipeFromShoppingList,
  clearCheckedItems,
  clearShoppingList,
  addCustomShoppingItem,
  formatShoppingListText,
  type ConsolidatedItem,
} from '../../services/shoppingList';
import { copyToClipboard } from '../../services/export';
import type { ShoppingListItem } from '../../types';

interface ShoppingListViewProps {
  onBack: () => void;
}

type CopyState = 'idle' | 'copied' | 'failed';

export function ShoppingListView({ onBack }: ShoppingListViewProps) {
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [customText, setCustomText] = useState('');
  const [copyState, setCopyState] = useState<CopyState>('idle');
  const [confirmClear, setConfirmClear] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const refresh = useCallback(async () => {
    try {
      const loaded = await loadShoppingList();
      setItems(loaded);
    } catch {
      setErrorMessage('Could not load the shopping list');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => () => clearTimeout(copyTimer.current), []);

  const consolidated = consolidateItems(items);
  const checkedCount = consolidated.filter((c) => c.checked).length;
  // One entry per source recipe (id → name), in the order they were added
  const sourceRecipes = [
    ...new Map(
      items
        .filter((i) => i.recipe_id)
        .map((i) => [i.recipe_id as string, i.recipe_name || 'Untitled recipe'] as const)
    ).entries(),
  ];

  async function handleToggle(item: ConsolidatedItem) {
    await setConsolidatedItemChecked(item, !item.checked);
    await refresh();
  }

  async function handleRemove(item: ConsolidatedItem) {
    await removeConsolidatedItem(item);
    await refresh();
  }

  async function handleAddCustom() {
    const added = await addCustomShoppingItem(customText);
    if (added) {
      setCustomText('');
      await refresh();
    }
  }

  async function handleClearChecked() {
    await clearCheckedItems();
    await refresh();
  }

  async function handleClearAll() {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    setConfirmClear(false);
    await clearShoppingList();
    await refresh();
  }

  async function handleRemoveRecipe(recipeId: string, recipeName: string) {
    try {
      await removeRecipeFromShoppingList(recipeId);
      setErrorMessage('');
    } catch {
      setErrorMessage(`Could not remove ${recipeName} from the list`);
    }
    await refresh();
  }

  async function handleCopy() {
    const text = formatShoppingListText(consolidated);
    let next: CopyState;
    try {
      await copyToClipboard(text);
      next = 'copied';
    } catch {
      // Clipboard API is missing on plain-http origins, or permission was denied
      next = 'failed';
    }
    setCopyState(next);
    clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopyState('idle'), next === 'failed' ? 4000 : 2000);
  }

  async function handleShare() {
    try {
      await navigator.share({ title: 'Shopping List', text: formatShoppingListText(consolidated) });
    } catch (error) {
      // Closing the share sheet rejects with AbortError - that's not a failure
      if ((error as Error | undefined)?.name === 'AbortError') return;
      // Sharing isn't allowed here (e.g. no user gesture); fall back to copying
      await handleCopy();
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
        Loading shopping list...
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem' }}>
        <Button variant="ghost" onClick={onBack} style={{ marginBottom: '1rem' }}>
          ← Back
        </Button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h1
              style={{
                fontSize: '1.75rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                margin: '0 0 0.5rem',
              }}
            >
              🛒 Shopping List
            </h1>
            {sourceRecipes.length > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>From:</span>
                {sourceRecipes.map(([recipeId, recipeName]) => (
                  <span
                    key={recipeId}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      padding: '0.125rem 0.25rem 0.125rem 0.625rem',
                      background: 'var(--accent-light)',
                      color: 'var(--accent-primary)',
                      borderRadius: '9999px',
                      fontSize: '0.8125rem',
                    }}
                  >
                    {recipeName}
                    <button
                      onClick={() => handleRemoveRecipe(recipeId, recipeName)}
                      aria-label={`Remove ${recipeName} from shopping list`}
                      title={`Remove ${recipeName}'s ingredients`}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'inherit',
                        cursor: 'pointer',
                        padding: '0 0.25rem',
                        fontSize: '0.75rem',
                        lineHeight: 1,
                      }}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-tertiary)', margin: 0 }}>
                Add recipes from their detail page, or add items below
              </p>
            )}
          </div>
          {consolidated.length > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }} aria-live="polite">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopy}
                style={copyState === 'failed' ? { color: 'var(--error)' } : undefined}
              >
                {copyState === 'copied' ? '✓ Copied!' : copyState === 'failed' ? 'Copy failed' : '📋 Copy'}
              </Button>
              {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                <Button variant="secondary" size="sm" onClick={handleShare}>
                  Share
                </Button>
              )}
            </div>
          )}
        </div>
        {copyState === 'failed' && (
          <p role="alert" style={{ color: 'var(--error)', fontSize: '0.8125rem', margin: '0.5rem 0 0' }}>
            Couldn't copy to the clipboard - this browser blocked access.
          </p>
        )}
        {errorMessage && (
          <p role="alert" style={{ color: 'var(--error)', fontSize: '0.8125rem', margin: '0.5rem 0 0' }}>
            {errorMessage}
          </p>
        )}
      </header>

      {consolidated.length > 0 && (
        <Card style={{ marginBottom: '1.5rem' }}>
          <ProgressBar
            value={checkedCount}
            max={consolidated.length}
            color={checkedCount === consolidated.length ? 'var(--success)' : 'var(--accent-primary)'}
          />
          <p
            style={{
              marginTop: '0.75rem',
              fontSize: '0.875rem',
              color: 'var(--text-tertiary)',
              textAlign: 'center',
              margin: '0.75rem 0 0',
            }}
          >
            {checkedCount} of {consolidated.length} items in your cart
          </p>
        </Card>
      )}

      {/* Add custom item */}
      <Card style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddCustom();
            }}
            placeholder="Add an item (e.g. paper towels)..."
            aria-label="Add custom shopping item"
            style={{
              flex: 1,
              padding: '0.5rem 0.75rem',
              borderRadius: '0.5rem',
              border: '1px solid var(--border-secondary)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontSize: '0.9375rem',
            }}
          />
          <Button variant="secondary" size="sm" onClick={handleAddCustom} disabled={!customText.trim()}>
            + Add
          </Button>
        </div>
      </Card>

      {consolidated.length === 0 ? (
        <Card style={{ padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🧺</div>
          <div style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '0.5rem' }}>
            Your shopping list is empty
          </div>
          <div style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
            Open any recipe and tap "Add to Shopping List" — ingredients from multiple recipes are combined automatically.
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {consolidated.map((item) => {
            const itemRecipes = [...new Set(item.sources.map((s) => s.recipe_name).filter(Boolean))];
            const qty = [item.totalAmount, item.unit].filter(Boolean).join(' ');
            return (
              <Card key={item.key} style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <button
                    onClick={() => handleToggle(item)}
                    aria-label={`${item.checked ? 'Uncheck' : 'Check'} ${item.item}`}
                    style={{
                      width: '1.5rem',
                      height: '1.5rem',
                      borderRadius: '0.375rem',
                      border: `2px solid ${item.checked ? 'var(--success)' : 'var(--border-secondary)'}`,
                      background: item.checked ? 'var(--success)' : 'var(--card-bg)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {item.checked && (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>

                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: '1rem',
                        fontWeight: 500,
                        color: item.checked ? 'var(--text-muted)' : 'var(--text-primary)',
                        textDecoration: item.checked ? 'line-through' : 'none',
                      }}
                    >
                      {qty && <span style={{ fontWeight: 600 }}>{qty} </span>}
                      {item.item}
                    </div>
                    {itemRecipes.length > 0 && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                        {itemRecipes.join(', ')}
                      </div>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(item)}
                    aria-label={`Remove ${item.item}`}
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    ✕
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {consolidated.length > 0 && (
        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
          <Button variant="secondary" onClick={handleClearChecked} disabled={checkedCount === 0}>
            Clear checked ({checkedCount})
          </Button>
          <Button variant="ghost" onClick={handleClearAll} style={{ color: confirmClear ? 'var(--error)' : undefined }}>
            {confirmClear ? 'Tap again to confirm' : 'Clear all'}
          </Button>
        </div>
      )}
    </div>
  );
}
