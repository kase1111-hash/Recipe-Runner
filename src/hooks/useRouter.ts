// URL Router Hook
// Syncs AppState view to browser URL for back-button and deep-linking support

import { useEffect, useRef } from 'react';
import { getCookbook, getRecipesByCookbook } from '../db';
import type { Cookbook, Recipe } from '../types';

// ============================================
// Types
// ============================================

type AppView =
  | 'library'
  | 'bookshelf'
  | 'cookbook'
  | 'detail'
  | 'import'
  | 'edit'
  | 'groceries'
  | 'miseenplace'
  | 'cooking'
  | 'complete';

interface RouterState {
  view: AppView;
  selectedCookbook: Cookbook | null;
  selectedRecipe: Recipe | null;
}

type RouterDispatch = (action: RouterAction) => void;

type RouterAction =
  | { type: 'NAVIGATE'; view: AppView }
  | { type: 'SELECT_COOKBOOK'; cookbook: Cookbook }
  | { type: 'SELECT_RECIPE'; recipe: Recipe }
  | { type: 'BACK_TO_LIBRARY' }
  | { type: 'BACK_TO_COOKBOOK' };

// ============================================
// Path Building
// ============================================

function getPathFromState(state: RouterState): string {
  switch (state.view) {
    case 'library':
      return '/';
    case 'bookshelf':
      return '/bookshelf';
    case 'cookbook':
      return state.selectedCookbook
        ? `/cookbook/${state.selectedCookbook.id}`
        : '/';
    case 'detail':
    case 'groceries':
    case 'miseenplace':
    case 'cooking':
    case 'complete':
      if (state.selectedCookbook && state.selectedRecipe) {
        return `/cookbook/${state.selectedCookbook.id}/${state.selectedRecipe.id}`;
      }
      return '/';
    case 'import':
    case 'edit':
      return state.selectedCookbook
        ? `/cookbook/${state.selectedCookbook.id}/import`
        : '/';
    default:
      return '/';
  }
}

// ============================================
// Path Parsing
// ============================================

interface ParsedRoute {
  view: AppView;
  cookbookId?: string;
  recipeId?: string;
}

function parseRoute(pathname: string): ParsedRoute {
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) {
    return { view: 'library' };
  }

  if (segments[0] === 'bookshelf') {
    return { view: 'bookshelf' };
  }

  if (segments[0] === 'cookbook') {
    if (segments.length === 1) {
      return { view: 'library' };
    }
    const cookbookId = segments[1];
    if (segments.length === 2) {
      return { view: 'cookbook', cookbookId };
    }
    if (segments[2] === 'import') {
      return { view: 'import', cookbookId };
    }
    return { view: 'detail', cookbookId, recipeId: segments[2] };
  }

  return { view: 'library' };
}

// ============================================
// Hook
// ============================================

export function useRouter(state: RouterState, dispatch: RouterDispatch): void {
  const isPopstateRef = useRef(false);
  const prevPathRef = useRef<string | null>(null);

  // Push URL when state changes (but not during popstate handling)
  useEffect(() => {
    if (isPopstateRef.current) {
      isPopstateRef.current = false;
      return;
    }

    const path = getPathFromState(state);
    if (path !== prevPathRef.current) {
      prevPathRef.current = path;
      window.history.pushState(null, '', path);
    }
  }, [state]);

  // Handle browser back/forward
  useEffect(() => {
    async function handlePopState() {
      isPopstateRef.current = true;
      const route = parseRoute(window.location.pathname);
      prevPathRef.current = window.location.pathname;

      if (route.view === 'library') {
        dispatch({ type: 'BACK_TO_LIBRARY' });
        return;
      }

      if (route.view === 'bookshelf') {
        dispatch({ type: 'NAVIGATE', view: 'bookshelf' });
        return;
      }

      if (route.cookbookId) {
        // Need to load the cookbook
        const cookbook = await getCookbook(route.cookbookId);
        if (!cookbook) {
          dispatch({ type: 'BACK_TO_LIBRARY' });
          return;
        }

        if (route.recipeId) {
          // Load the recipe
          const recipes = await getRecipesByCookbook(cookbook.id);
          const recipe = recipes.find((r: Recipe) => r.id === route.recipeId);
          if (recipe) {
            dispatch({ type: 'SELECT_COOKBOOK', cookbook });
            dispatch({ type: 'SELECT_RECIPE', recipe });
          } else {
            dispatch({ type: 'SELECT_COOKBOOK', cookbook });
          }
        } else {
          dispatch({ type: 'SELECT_COOKBOOK', cookbook });
        }
      }
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [dispatch]);

  // Handle initial URL on first load (deep linking)
  useEffect(() => {
    async function hydrateFromUrl() {
      const route = parseRoute(window.location.pathname);
      prevPathRef.current = window.location.pathname;

      if (route.view === 'library') return; // Already the default

      if (route.view === 'bookshelf') {
        dispatch({ type: 'NAVIGATE', view: 'bookshelf' });
        return;
      }

      if (route.cookbookId) {
        const cookbook = await getCookbook(route.cookbookId);
        if (!cookbook) return;

        dispatch({ type: 'SELECT_COOKBOOK', cookbook });

        if (route.recipeId) {
          const recipes = await getRecipesByCookbook(cookbook.id);
          const recipe = recipes.find((r: Recipe) => r.id === route.recipeId);
          if (recipe) {
            dispatch({ type: 'SELECT_RECIPE', recipe });
          }
        }
      }
    }

    hydrateFromUrl();
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
