import { useState, useEffect, useRef } from 'react';
import { searchAllRecipes, type RecipeSearchResult } from '../../services/recipeSearch';
import { useShortcut } from '../../contexts';
import type { Cookbook, Recipe } from '../../types';

interface GlobalSearchProps {
  onSelectResult: (recipe: Recipe, cookbook: Cookbook) => void;
}

const MATCH_LABELS: Record<string, string> = {
  ingredient: 'ingredient',
  tag: 'tag',
  description: 'description',
};

export function GlobalSearch({ onSelectResult }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RecipeSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useShortcut('nav-search', () => inputRef.current?.focus(), []);

  // Debounced search-as-you-type
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    let cancelled = false;
    const handle = setTimeout(async () => {
      try {
        const found = await searchAllRecipes(trimmed);
        if (!cancelled) {
          setResults(found);
          setHighlightIndex(-1);
        }
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleSelect(result: RecipeSearchResult) {
    setQuery('');
    setResults([]);
    onSelectResult(result.recipe, result.cookbook);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && highlightIndex >= 0 && results[highlightIndex]) {
      e.preventDefault();
      handleSelect(results[highlightIndex]);
    } else if (e.key === 'Escape') {
      setQuery('');
      inputRef.current?.blur();
    }
  }

  const showDropdown = query.trim().length > 0;

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', maxWidth: '480px' }}>
      <div style={{ position: 'relative' }}>
        <span
          style={{
            position: 'absolute',
            left: '0.75rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
            pointerEvents: 'none',
          }}
        >
          🔍
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search all recipes by name, ingredient, or tag..."
          aria-label="Search all recipes"
          style={{
            width: '100%',
            padding: '0.625rem 0.75rem 0.625rem 2.5rem',
            borderRadius: '0.625rem',
            border: '1px solid var(--border-secondary)',
            background: 'var(--input-bg)',
            color: 'var(--text-primary)',
            fontSize: '0.9375rem',
          }}
        />
      </div>

      {showDropdown && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 0.375rem)',
            left: 0,
            right: 0,
            background: 'var(--card-bg)',
            border: '1px solid var(--border-primary)',
            borderRadius: '0.625rem',
            boxShadow: 'var(--card-shadow-lg)',
            maxHeight: '400px',
            overflowY: 'auto',
            zIndex: 50,
          }}
        >
          {searching && results.length === 0 ? (
            <div style={{ padding: '1rem', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
              Searching...
            </div>
          ) : results.length === 0 ? (
            <div style={{ padding: '1rem', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
              No recipes match "{query.trim()}"
            </div>
          ) : (
            results.map((result, idx) => {
              // Explain non-obvious matches ("matched ingredient: garlic")
              const secondaryMatch = result.matchedOn.find((m) => m !== 'name' && MATCH_LABELS[m]);
              return (
                <button
                  key={result.recipe.id}
                  onClick={() => handleSelect(result)}
                  onMouseEnter={() => setHighlightIndex(idx)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.75rem 1rem',
                    border: 'none',
                    borderBottom: idx < results.length - 1 ? '1px solid var(--border-primary)' : 'none',
                    background: idx === highlightIndex ? 'var(--bg-hover)' : 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9375rem' }}>
                    {result.recipe.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.125rem' }}>
                    {result.cookbook.title}
                    {secondaryMatch && !result.matchedOn.includes('name') && (
                      <>
                        {' · '}
                        matched {MATCH_LABELS[secondaryMatch]}
                        {result.matchedText ? `: ${result.matchedText}` : ''}
                      </>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
