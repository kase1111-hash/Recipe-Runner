// URL Router Hook
// Syncs AppState view to browser URL for back-button and deep-linking support

import { useCallback, useEffect, useRef } from 'react';
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
  | 'shopping'
  | 'shared';

interface RouterState {
  view: AppView;
  selectedCookbook: Cookbook | null;
  selectedRecipe: Recipe | null;
  sharedPayload: string | null;
  initialized: boolean;
}

type RouterDispatch = (action: RouterAction) => void;

type RouterAction =
  | { type: 'NAVIGATE'; view: AppView }
  | { type: 'SELECT_COOKBOOK'; cookbook: Cookbook }
  | { type: 'SELECT_RECIPE'; recipe: Recipe }
  | { type: 'BACK_TO_LIBRARY' }
  | { type: 'BACK_TO_COOKBOOK' }
  | { type: 'OPEN_SHARED'; payload: string };

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
    case 'shared':
      // The recipe travels in the fragment, so it must stay in the URL
      return state.sharedPayload ? `/shared#${state.sharedPayload}` : '/';
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

  if (segments[0] === 'shared') {
    return { view: 'shared' };
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
// Route Resolution
// ============================================

// Phases a history entry may re-enter. Only reachable from inside the flow
// (plus groceries from detail, which is the flow's entry gate) — a cold
// Back/Forward into /cooking would skip the grocery check, and /complete
// would record the same cook twice.
const REENTERABLE_FLOW_VIEWS: AppView[] = ['groceries', 'miseenplace', 'cooking'];

function canReenterFlowView(from: AppView, to: AppView): boolean {
  if (to === 'groceries') return from === 'detail' || REENTERABLE_FLOW_VIEWS.includes(from);
  if (to === 'miseenplace' || to === 'cooking') return REENTERABLE_FLOW_VIEWS.includes(from);
  return false;
}

interface ResolvedRoute {
  // The URL the app will actually show — may differ from the requested one
  // when a route can't be restored as-is (unknown ids, gated cooking phases)
  path: string;
  actions: RouterAction[];
}

function currentLocationPath(): string {
  return window.location.pathname + window.location.hash;
}

// Resolve a URL to the state it can safely restore, loading cookbook and
// recipe from the database when the app doesn't have them in memory
async function resolveRoute(
  route: ParsedRoute,
  hash: string,
  current: RouterState | null,
): Promise<ResolvedRoute> {
  switch (route.view) {
    case 'library':
      return { path: '/', actions: [{ type: 'BACK_TO_LIBRARY' }] };
    case 'bookshelf':
    case 'shopping':
      return { path: `/${route.view}`, actions: [{ type: 'NAVIGATE', view: route.view }] };
    case 'shared': {
      const payload = hash.replace(/^#/, '');
      return payload
        ? { path: `/shared#${payload}`, actions: [{ type: 'OPEN_SHARED', payload }] }
        : { path: '/', actions: [{ type: 'BACK_TO_LIBRARY' }] };
    }
  }

  if (!route.cookbookId) return { path: '/', actions: [{ type: 'BACK_TO_LIBRARY' }] };
  const cookbookPath = `/cookbook/${route.cookbookId}`;

  // Same recipe already loaded: switch phase without reloading, so Back
  // steps through the cooking flow (cooking → prep → groceries → detail)
  if (
    current &&
    route.recipeId &&
    current.selectedRecipe?.id === route.recipeId &&
    current.selectedCookbook?.id === route.cookbookId
  ) {
    const detailPath = `${cookbookPath}/${route.recipeId}`;
    if (route.view === 'detail' || canReenterFlowView(current.view, route.view)) {
      const segment = COOKING_FLOW_SEGMENTS[route.view];
      return {
        path: segment ? `${detailPath}/${segment}` : detailPath,
        actions: [{ type: 'NAVIGATE', view: route.view }],
      };
    }
    return { path: detailPath, actions: [{ type: 'NAVIGATE', view: 'detail' }] };
  }

  const cookbook = await getCookbook(route.cookbookId);
  if (!cookbook) return { path: '/', actions: [{ type: 'BACK_TO_LIBRARY' }] };
  const selectCookbook: RouterAction = { type: 'SELECT_COOKBOOK', cookbook };

  if (route.recipeId) {
    const recipes = await getRecipesByCookbook(cookbook.id);
    const recipe = recipes.find((r: Recipe) => r.id === route.recipeId);
    if (recipe) {
      // Cooking-flow phases are session state that can't be restored cold
      // (the grocery gate would be skipped), so they land on the detail
      return {
        path: `${cookbookPath}/${recipe.id}`,
        actions: [selectCookbook, { type: 'SELECT_RECIPE', recipe }],
      };
    }
  }

  // Also covers /import: the import form holds no restorable state
  return { path: cookbookPath, actions: [selectCookbook] };
}

// ============================================
// Hook
// ============================================

export function useRouter(state: RouterState, dispatch: RouterDispatch): void {
  // The path the address bar currently shows (as far as the app knows)
  const prevPathRef = useRef<string | null>(null);
  // Capture the URL the page loaded with BEFORE any state-driven push can
  // overwrite it — deep links like /cookbook/x/y must survive the first render.
  const initialPathRef = useRef(typeof window !== 'undefined' ? currentLocationPath() : '/');
  const hydrationStartedRef = useRef(false);
  const hydratedRef = useRef(false);
  // Latest state for the popstate handler (its effect only re-binds on dispatch)
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Push URL when state changes. Nothing is pushed until initial-URL
  // hydration has finished — otherwise the default 'library' state (and
  // every intermediate state while hydration awaits the db) would push
  // stray entries over the deep-linked URL.
  useEffect(() => {
    if (!hydratedRef.current) return;

    const path = getPathFromState(state);
    if (path !== prevPathRef.current) {
      prevPathRef.current = path;
      window.history.pushState(null, '', path);
    }
  }, [state]);

  // Apply a resolved route: fix up the address bar first (replace, never
  // push — the entry already exists), then update app state. The push
  // effect then sees state already matching prevPathRef and stays quiet.
  const applyResolvedRoute = useCallback(
    ({ path, actions }: ResolvedRoute) => {
      if (path !== currentLocationPath()) {
        window.history.replaceState(null, '', path);
      }
      prevPathRef.current = path;
      actions.forEach(dispatch);
    },
    [dispatch],
  );

  // Handle browser back/forward
  useEffect(() => {
    let latestPop = 0;

    async function handlePopState() {
      const popId = ++latestPop;
      // What the address bar shows right now — the push effect must not
      // re-push it while the route resolves
      prevPathRef.current = currentLocationPath();
      const route = parseRoute(window.location.pathname);
      try {
        const resolved = await resolveRoute(route, window.location.hash, stateRef.current);
        // A newer Back/Forward superseded this one while it awaited the db
        if (popId !== latestPop) return;
        applyResolvedRoute(resolved);
      } catch (error) {
        console.error('Failed to restore route:', error);
        if (popId === latestPop) applyResolvedRoute({ path: '/', actions: [{ type: 'BACK_TO_LIBRARY' }] });
      }
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [applyResolvedRoute]);

  // Handle initial URL on first load (deep linking). Waits for app
  // initialization (db + sample seed) so lookups don't race the seed.
  useEffect(() => {
    if (!state.initialized || hydrationStartedRef.current) return;
    hydrationStartedRef.current = true;

    const initialPath = initialPathRef.current;
    const hashIndex = initialPath.indexOf('#');
    const pathname = hashIndex >= 0 ? initialPath.slice(0, hashIndex) : initialPath;
    const hash = hashIndex >= 0 ? initialPath.slice(hashIndex) : '';

    resolveRoute(parseRoute(pathname), hash, null)
      .catch((error): ResolvedRoute => {
        console.error('Failed to restore route:', error);
        return { path: '/', actions: [] };
      })
      .then((resolved) => {
        // The library is already the initial state; replaying BACK_TO_LIBRARY
        // would only cost a render
        const actions = resolved.actions.filter((a) => a.type !== 'BACK_TO_LIBRARY');
        applyResolvedRoute({ path: resolved.path, actions });
        // Enable pushes only now, after the final state is dispatched
        hydratedRef.current = true;
      });
  }, [state.initialized, applyResolvedRoute]);
}
