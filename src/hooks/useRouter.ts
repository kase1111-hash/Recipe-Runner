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
  | 'complete'
  | 'shopping';

interface RouterState {
  view: AppView;
  selectedCookbook: Cookbook | null;
  selectedRecipe: Recipe | null;
  initialized: boolean;
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

// Cooking-flow sub-views get their own URL segment so each phase is a
// distinct history entry (browser Back steps back one phase, not out of
// the flow entirely).
const COOKING_FLOW_SEGMENTS: Partial<Record<AppView, string>> = {
  groceries: 'groceries',
  miseenplace: 'prep',
  cooking: 'cooking',
  complete: 'complete',
};

const SEGMENT_TO_VIEW: Record<string, AppView> = {
  groceries: 'groceries',
  prep: 'miseenplace',
  cooking: 'cooking',
  complete: 'complete',
};

function getPathFromState(state: RouterState): string {
  switch (state.view) {
    case 'library':
      return '/';
    case 'bookshelf':
      return '/bookshelf';
    case 'shopping':
      return '/shopping';
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
        const base = `/cookbook/${state.selectedCookbook.id}/${state.selectedRecipe.id}`;
        const segment = COOKING_FLOW_SEGMENTS[state.view];
        return segment ? `${base}/${segment}` : base;
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

  if (segments[0] === 'shopping') {
    return { view: 'shopping' };
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
    const recipeId = segments[2];
    if (segments.length >= 4 && SEGMENT_TO_VIEW[segments[3]]) {
      return { view: SEGMENT_TO_VIEW[segments[3]], cookbookId, recipeId };
    }
    return { view: 'detail', cookbookId, recipeId };
  }

  return { view: 'library' };
}

// ============================================
// Hook
// ============================================

export function useRouter(state: RouterState, dispatch: RouterDispatch): void {
  const isPopstateRef = useRef(false);
  const prevPathRef = useRef<string | null>(null);
  // Capture the URL the page loaded with BEFORE any state-driven push can
  // overwrite it — deep links like /cookbook/x/y must survive the first render.
  const initialPathRef = useRef(typeof window !== 'undefined' ? window.location.pathname : '/');
  const hydratedRef = useRef(false);
  // Latest state for the popstate handler (its effect only re-binds on dispatch)
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Push URL when state changes (but not during popstate handling, and not
  // before initial-URL hydration has run — otherwise the default 'library'
  // state would clobber the deep-linked URL)
  useEffect(() => {
    if (!hydratedRef.current) return;
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

      if (route.view === 'bookshelf' || route.view === 'shopping') {
        dispatch({ type: 'NAVIGATE', view: route.view });
        return;
      }

      if (route.cookbookId) {
        const current = stateRef.current;

        // Same recipe already loaded in this session: just switch phase.
        // This makes Back step through the cooking flow (cooking → prep →
        // groceries → detail) without reloading or losing app state.
        if (
          route.recipeId &&
          current.selectedRecipe?.id === route.recipeId &&
          current.selectedCookbook?.id === route.cookbookId
        ) {
          dispatch({ type: 'NAVIGATE', view: route.view });
          return;
        }

        // Need to load the cookbook
        const cookbook = await getCookbook(route.cookbookId);
        if (!cookbook) {
          dispatch({ type: 'BACK_TO_LIBRARY' });
          return;
        }

        if (route.recipeId) {
          // Load the recipe. Cooking-flow sub-views are session state we
          // can't safely restore cold (the grocery gate would be skipped),
          // so a fresh navigation lands on the recipe detail instead.
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

  // Handle initial URL on first load (deep linking). Waits for app
  // initialization (db + sample seed) so lookups don't race the seed.
  useEffect(() => {
    if (!state.initialized || hydratedRef.current) return;
    hydratedRef.current = true;

    async function hydrateFromUrl() {
      const route = parseRoute(initialPathRef.current);
      prevPathRef.current = initialPathRef.current;

      if (route.view === 'library') return; // Already the default

      if (route.view === 'bookshelf' || route.view === 'shopping') {
        dispatch({ type: 'NAVIGATE', view: route.view });
        return;
      }

      if (route.cookbookId) {
        const cookbook = await getCookbook(route.cookbookId);
        if (!cookbook) {
          // Unknown cookbook: normalize the URL back to the library
          prevPathRef.current = '/';
          window.history.replaceState(null, '', '/');
          return;
        }

        dispatch({ type: 'SELECT_COOKBOOK', cookbook });

        if (route.recipeId) {
          const recipes = await getRecipesByCookbook(cookbook.id);
          const recipe = recipes.find((r: Recipe) => r.id === route.recipeId);
          if (recipe) {
            dispatch({ type: 'SELECT_RECIPE', recipe });
            // Cooking-flow deep links land on detail (grocery gate intact);
            // reflect that in the URL.
            const detailPath = `/cookbook/${cookbook.id}/${recipe.id}`;
            if (initialPathRef.current !== detailPath) {
              prevPathRef.current = detailPath;
              window.history.replaceState(null, '', detailPath);
            }
          }
        }
      }
    }

    hydrateFromUrl();
  }, [state.initialized, dispatch]);
}
