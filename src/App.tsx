import { useReducer, useEffect, useCallback, useState } from 'react';
import { ThemeProvider, KeyboardShortcutsProvider, useShortcut, useTheme } from './contexts';
import { ShoppingListView } from './components/shopping/ShoppingListView';
import { CookbookLibrary } from './components/cookbook/CookbookLibrary';
import { BookshelfView } from './components/cookbook/BookshelfView';
import { RecipeList, RecipeScaler, MiseEnPlace, CookCompletion, RecipeDetail } from './components/recipe';
import { GroceryChecklist } from './components/recipe/GroceryChecklist';
import { StepExecutor } from './components/step/StepExecutor';
import { ChefOllamaChat } from './components/chef-ollama/ChefOllamaChat';
import { ErrorBoundary } from './components/common';
import { RecipeImport } from './components/import/RecipeImport';
import { RecipeEditor } from './components/import/RecipeEditor';
import { SharedRecipeImport } from './components/share/SharedRecipeImport';
import { useRouter } from './hooks/useRouter';
import { initializeDatabase, getRecipe, getCookbook, getActiveCookingSession, deleteCookingSession } from './db';
import { seedSampleData } from './data/sampleCookbook';
import type { Cookbook, Recipe, Ingredient, CookingSession } from './types';
import type { ParsedRecipe } from './services/recipeParser';
import type { ScaledRecipe } from './services/recipeScaling';

// ============================================
// State Types
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

interface AppState {
  initialized: boolean;
  view: AppView;
  selectedCookbook: Cookbook | null;
  selectedRecipe: Recipe | null;
  // The unscaled recipe while a scaling is applied — the scaler always works
  // from this so repeated scalings don't compound rounding
  baseRecipe: Recipe | null;
  parsedRecipe: ParsedRecipe | null;
  checkedIngredients: string[];
  showChefOllama: boolean;
  chefInitialMessage: string | undefined;
  chefStepIndex: number;
  refreshKey: number;
  showScaler: boolean;
  resumeSession: CookingSession | null;
  resumeStepIndex: number;
  // Encoded recipe from a /shared#… link
  sharedPayload: string | null;
}

// ============================================
// Action Types
// ============================================

type AppAction =
  | { type: 'INITIALIZE' }
  | { type: 'NAVIGATE'; view: AppView }
  | { type: 'SELECT_COOKBOOK'; cookbook: Cookbook }
  | { type: 'SELECT_RECIPE'; recipe: Recipe }
  | { type: 'START_COOKING' }
  | { type: 'SET_PARSED_RECIPE'; parsedRecipe: ParsedRecipe | null }
  | { type: 'SAVE_RECIPE' }
  | { type: 'SET_CHECKED_INGREDIENTS'; ingredients: string[] }
  | { type: 'OPEN_CHEF'; initialMessage?: string; stepIndex?: number }
  | { type: 'CLOSE_CHEF' }
  | { type: 'OPEN_SCALER' }
  | { type: 'APPLY_SCALING'; recipe: Recipe }
  | { type: 'CLOSE_SCALER' }
  | { type: 'BACK_TO_LIBRARY' }
  | { type: 'BACK_TO_COOKBOOK' }
  | { type: 'UPDATE_RECIPE'; recipe: Recipe }
  | { type: 'SET_RESUME_SESSION'; session: CookingSession | null }
  | { type: 'SET_COOKING_STEP'; stepIndex: number }
  | { type: 'OPEN_SHARED'; payload: string }
  | { type: 'RESUME_COOKING'; recipe: Recipe; cookbook: Cookbook; stepIndex: number; checkedIngredients: string[] };

// ============================================
// Initial State
// ============================================

const initialState: AppState = {
  initialized: false,
  view: 'library',
  selectedCookbook: null,
  selectedRecipe: null,
  baseRecipe: null,
  parsedRecipe: null,
  checkedIngredients: [],
  showChefOllama: false,
  chefInitialMessage: undefined,
  chefStepIndex: 0,
  refreshKey: 0,
  showScaler: false,
  resumeSession: null,
  resumeStepIndex: 0,
  sharedPayload: null,
};

// ============================================
// Reducer
// ============================================

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'INITIALIZE':
      return { ...state, initialized: true };

    case 'NAVIGATE':
      return {
        ...state,
        view: action.view,
        // resumeStepIndex tracks the step being cooked, so leaving and
        // re-entering the step executor (Exit, browser Back/Forward) resumes
        // where the cook left off. A finished cook starts the next from 1.
        ...(action.view === 'complete' ? { resumeStepIndex: 0 } : {}),
      };

    case 'SELECT_COOKBOOK':
      return { ...state, selectedCookbook: action.cookbook, view: 'cookbook' };

    case 'SELECT_RECIPE':
      return {
        ...state,
        selectedRecipe: action.recipe,
        baseRecipe: null,
        checkedIngredients: [],
        resumeStepIndex: 0,
        view: 'detail',
      };

    case 'START_COOKING':
      // A fresh cook from the recipe page: new grocery check, step 1
      return { ...state, checkedIngredients: [], resumeStepIndex: 0, view: 'groceries' };

    case 'SET_PARSED_RECIPE':
      if (!action.parsedRecipe) return { ...state, parsedRecipe: null };
      // A parse that finishes after the user cancelled or navigated away
      // must not yank them into the editor (or into a blank screen when no
      // cookbook is selected any more)
      if (state.view !== 'import' || !state.selectedCookbook) return state;
      return { ...state, parsedRecipe: action.parsedRecipe, view: 'edit' };

    case 'SAVE_RECIPE':
      return {
        ...state,
        parsedRecipe: null,
        refreshKey: state.refreshKey + 1,
        view: 'cookbook',
      };

    case 'SET_CHECKED_INGREDIENTS':
      return {
        ...state,
        checkedIngredients: action.ingredients,
        view: 'miseenplace',
      };

    case 'OPEN_CHEF':
      return {
        ...state,
        showChefOllama: true,
        chefInitialMessage: action.initialMessage,
        chefStepIndex: action.stepIndex ?? 0,
      };

    case 'CLOSE_CHEF':
      return {
        ...state,
        showChefOllama: false,
        chefInitialMessage: undefined,
      };

    case 'OPEN_SCALER':
      return { ...state, showScaler: true };

    case 'APPLY_SCALING':
      return {
        ...state,
        baseRecipe: state.baseRecipe ?? state.selectedRecipe,
        selectedRecipe: action.recipe,
        showScaler: false,
      };

    case 'CLOSE_SCALER':
      return { ...state, showScaler: false };

    case 'BACK_TO_LIBRARY':
      return {
        ...state,
        selectedCookbook: null,
        selectedRecipe: null,
        baseRecipe: null,
        checkedIngredients: [],
        sharedPayload: null,
        view: 'library',
      };

    case 'BACK_TO_COOKBOOK':
      return {
        ...state,
        selectedRecipe: null,
        baseRecipe: null,
        checkedIngredients: [],
        view: 'cookbook',
      };

    case 'UPDATE_RECIPE':
      return { ...state, selectedRecipe: action.recipe, baseRecipe: null };

    case 'SET_RESUME_SESSION':
      return { ...state, resumeSession: action.session };

    case 'SET_COOKING_STEP':
      return { ...state, resumeStepIndex: action.stepIndex };

    case 'OPEN_SHARED':
      return { ...state, sharedPayload: action.payload, view: 'shared' };

    case 'RESUME_COOKING':
      return {
        ...state,
        selectedCookbook: action.cookbook,
        selectedRecipe: action.recipe,
        checkedIngredients: action.checkedIngredients,
        baseRecipe: null,
        resumeStepIndex: action.stepIndex,
        resumeSession: null,
        view: 'cooking',
      };

    default:
      return state;
  }
}

// ============================================
// App-level Keyboard Shortcuts
// ============================================

// Must render inside KeyboardShortcutsProvider, so it can't live in App itself
function AppShortcuts({ onHome, onEscape }: { onHome: () => void; onEscape: () => void }) {
  const { toggleTheme } = useTheme();
  useShortcut('nav-home', onHome, [onHome]);
  useShortcut('nav-back', onEscape, [onEscape]);
  useShortcut('general-theme', toggleTheme, [toggleTheme]);
  return null;
}

// ============================================
// App Component
// ============================================

function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Sync browser URL with app state for back-button and deep-linking
  useRouter(
    {
      view: state.view,
      selectedCookbook: state.selectedCookbook,
      selectedRecipe: state.selectedRecipe,
      sharedPayload: state.sharedPayload,
      initialized: state.initialized,
    },
    dispatch,
  );

  // Initialize database, seed sample data, and check for interrupted sessions
  useEffect(() => {
    async function init() {
      try {
        await initializeDatabase();
        await seedSampleData();
      } catch (error) {
        // A failed seed (quota, private-mode restrictions) must not strand
        // the app on the loading screen — continue with whatever loaded
        console.error('Initialization error:', error);
      }
      dispatch({ type: 'INITIALIZE' });
      // Check for interrupted cooking sessions
      try {
        const session = await getActiveCookingSession();
        if (session) {
          dispatch({ type: 'SET_RESUME_SESSION', session });
        }
      } catch {
        // Session check is best-effort
      }
    }
    init();
  }, []);

  // Track online/offline status
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  // ============================================
  // Event Handlers
  // ============================================

  const handleSelectCookbook = useCallback((cookbook: Cookbook) => {
    dispatch({ type: 'SELECT_COOKBOOK', cookbook });
  }, []);

  const handleSelectRecipe = useCallback((recipe: Recipe) => {
    dispatch({ type: 'SELECT_RECIPE', recipe });
  }, []);

  const handleStartCooking = useCallback(() => {
    dispatch({ type: 'START_COOKING' });
  }, []);

  const handleStartImport = useCallback(() => {
    dispatch({ type: 'NAVIGATE', view: 'import' });
  }, []);

  const handleImportComplete = useCallback((parsed: ParsedRecipe) => {
    dispatch({ type: 'SET_PARSED_RECIPE', parsedRecipe: parsed });
  }, []);

  const handleSaveRecipe = useCallback(() => {
    dispatch({ type: 'SAVE_RECIPE' });
  }, []);

  const handleCancelImport = useCallback(() => {
    dispatch({ type: 'SET_PARSED_RECIPE', parsedRecipe: null });
    dispatch({ type: 'NAVIGATE', view: 'cookbook' });
  }, []);

  const handleGroceriesComplete = useCallback((checked: string[]) => {
    dispatch({ type: 'SET_CHECKED_INGREDIENTS', ingredients: checked });
  }, []);

  const handleMiseEnPlaceComplete = useCallback(() => {
    dispatch({ type: 'NAVIGATE', view: 'cooking' });
  }, []);

  const handleOpenScaler = useCallback(() => {
    dispatch({ type: 'OPEN_SCALER' });
  }, []);

  const handleApplyScaling = useCallback((scaledRecipe: ScaledRecipe) => {
    dispatch({ type: 'APPLY_SCALING', recipe: scaledRecipe as Recipe });
  }, []);

  const handleCancelScaling = useCallback(() => {
    dispatch({ type: 'CLOSE_SCALER' });
  }, []);

  const handleCookingComplete = useCallback(() => {
    dispatch({ type: 'NAVIGATE', view: 'complete' });
  }, []);

  const handleCompletionFinished = useCallback(() => {
    dispatch({ type: 'BACK_TO_LIBRARY' });
  }, []);

  const handleCookAgain = useCallback(async () => {
    // Reload so the cook just saved is in cook_history — otherwise the next
    // completion screen's stats and the History tab lag one cook behind
    if (state.selectedRecipe) {
      try {
        const refreshed = await getRecipe(state.selectedRecipe.id);
        if (refreshed) dispatch({ type: 'UPDATE_RECIPE', recipe: refreshed });
      } catch {
        // Stale history is better than blocking the next cook
      }
    }
    dispatch({ type: 'START_COOKING' });
  }, [state.selectedRecipe]);

  const handleOpenChefForIngredient = useCallback((ingredient: Ingredient) => {
    dispatch({
      type: 'OPEN_CHEF',
      initialMessage: `I don't have ${ingredient.item}. What can I substitute?`,
    });
  }, []);

  const handleOpenChef = useCallback((stepIndex?: number) => {
    dispatch({ type: 'OPEN_CHEF', stepIndex });
  }, []);

  const handleCloseChef = useCallback(() => {
    dispatch({ type: 'CLOSE_CHEF' });
  }, []);

  const handleBackToLibrary = useCallback(() => {
    dispatch({ type: 'BACK_TO_LIBRARY' });
  }, []);

  const handleCookingStepChange = useCallback((stepIndex: number) => {
    dispatch({ type: 'SET_COOKING_STEP', stepIndex });
  }, []);

  // Ctrl+H — inert in the editor for the same reason Escape is: it would
  // silently discard an in-progress recipe
  const handleHomeShortcut = useCallback(() => {
    if (state.view === 'edit') return;
    dispatch({ type: 'BACK_TO_LIBRARY' });
  }, [state.view]);

  const handleBackToCookbook = useCallback(() => {
    dispatch({ type: 'BACK_TO_COOKBOOK' });
  }, []);

  const handleBackToDetail = useCallback(() => {
    dispatch({ type: 'NAVIGATE', view: 'detail' });
  }, []);

  const handleBackToGroceries = useCallback(() => {
    dispatch({ type: 'NAVIGATE', view: 'groceries' });
  }, []);

  const handleBackFromMiseEnPlace = useCallback(() => {
    dispatch({ type: 'NAVIGATE', view: 'groceries' });
  }, []);

  const handleOpenBookshelf = useCallback(() => {
    dispatch({ type: 'NAVIGATE', view: 'bookshelf' });
  }, []);

  const handleBackFromBookshelf = useCallback(() => {
    dispatch({ type: 'NAVIGATE', view: 'library' });
  }, []);

  const handleSelectCookbookFromBookshelf = useCallback((cookbook: Cookbook) => {
    dispatch({ type: 'SELECT_COOKBOOK', cookbook });
  }, []);

  const handleOpenShopping = useCallback(() => {
    dispatch({ type: 'NAVIGATE', view: 'shopping' });
  }, []);

  const handleSelectSearchResult = useCallback((recipe: Recipe, cookbook: Cookbook) => {
    dispatch({ type: 'SELECT_COOKBOOK', cookbook });
    dispatch({ type: 'SELECT_RECIPE', recipe });
  }, []);

  // A recipe saved from a /shared link opens like any other recipe
  const handleSharedRecipeSaved = useCallback((recipe: Recipe, cookbook: Cookbook) => {
    dispatch({ type: 'SELECT_COOKBOOK', cookbook });
    dispatch({ type: 'SELECT_RECIPE', recipe });
  }, []);

  // Escape mirrors each view's on-screen back button. Deliberately inert in
  // 'edit' (a stray Escape must not discard an in-progress recipe edit),
  // 'cooking' (a stray keypress mid-cook must not exit the step executor —
  // it has its own Exit button) and 'complete' (user should choose Save or
  // Done explicitly).
  const handleEscape = useCallback(() => {
    if (state.showChefOllama) {
      dispatch({ type: 'CLOSE_CHEF' });
      return;
    }
    if (state.showScaler) {
      dispatch({ type: 'CLOSE_SCALER' });
      return;
    }
    switch (state.view) {
      case 'bookshelf':
      case 'shopping':
        dispatch({ type: 'NAVIGATE', view: 'library' });
        break;
      case 'shared':
        dispatch({ type: 'BACK_TO_LIBRARY' });
        break;
      case 'cookbook':
        dispatch({ type: 'BACK_TO_LIBRARY' });
        break;
      case 'detail':
        dispatch({ type: 'BACK_TO_COOKBOOK' });
        break;
      case 'import':
        dispatch({ type: 'NAVIGATE', view: 'cookbook' });
        break;
      case 'groceries':
        dispatch({ type: 'NAVIGATE', view: 'detail' });
        break;
      case 'miseenplace':
        dispatch({ type: 'NAVIGATE', view: 'groceries' });
        break;
      default:
        break;
    }
  }, [state.view, state.showChefOllama, state.showScaler]);

  const handleResumeCooking = useCallback(async () => {
    if (!state.resumeSession) return;
    const session = state.resumeSession;
    try {
      const [recipe, cookbook] = await Promise.all([
        getRecipe(session.recipeId),
        getCookbook(session.cookbookId),
      ]);
      if (recipe && cookbook) {
        dispatch({
          type: 'RESUME_COOKING',
          recipe,
          cookbook,
          stepIndex: session.currentStepIndex,
          checkedIngredients: session.checkedIngredients,
        });
      } else {
        await deleteCookingSession(session.recipeId);
        dispatch({ type: 'SET_RESUME_SESSION', session: null });
      }
    } catch {
      dispatch({ type: 'SET_RESUME_SESSION', session: null });
    }
  }, [state.resumeSession]);

  const handleDismissResume = useCallback(async () => {
    if (state.resumeSession) {
      await deleteCookingSession(state.resumeSession.recipeId).catch(() => {});
    }
    dispatch({ type: 'SET_RESUME_SESSION', session: null });
  }, [state.resumeSession]);

  // ============================================
  // Loading State
  // ============================================

  if (!state.initialized) {
    return (
      <ThemeProvider>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-secondary)',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🍳</div>
            <div style={{ color: 'var(--text-tertiary)' }}>Loading Recipe Runner...</div>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  // ============================================
  // Render
  // ============================================

  return (
    <ThemeProvider>
      <KeyboardShortcutsProvider>
        <AppShortcuts onHome={handleHomeShortcut} onEscape={handleEscape} />
        <div style={{ minHeight: '100vh', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
          {/* Offline Indicator */}
          {isOffline && (
            <div
              style={{
                background: 'var(--warning-bg)',
                borderBottom: '1px solid var(--warning-border)',
                padding: '0.5rem 2rem',
                textAlign: 'center',
                fontSize: '0.875rem',
                color: 'var(--warning-text)',
              }}
            >
              You're offline. Recipes and cooking work normally — Chef Ollama requires a connection.
            </div>
          )}

          {/* Resume Interrupted Cook Banner */}
          {state.resumeSession && state.view === 'library' && (
            <div
              style={{
                background: 'var(--accent-light)',
                border: '1px solid var(--accent-primary)',
                borderRadius: '0.75rem',
                padding: '1rem 1.5rem',
                margin: '1rem 2rem 0',
                maxWidth: '1200px',
                marginLeft: 'auto',
                marginRight: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  Resume Cooking?
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
                  You have an unfinished cooking session (step {state.resumeSession.currentStepIndex + 1})
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                <button
                  onClick={handleResumeCooking}
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'var(--accent-primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  Resume
                </button>
                <button
                  onClick={handleDismissResume}
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'transparent',
                    color: 'var(--text-tertiary)',
                    border: '1px solid var(--border-secondary)',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                  }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {state.view === 'library' && (
            <ErrorBoundary resetLabel="Reload Library" onReset={handleBackToLibrary}>
              <CookbookLibrary
                onSelectCookbook={handleSelectCookbook}
                onOpenBookshelf={handleOpenBookshelf}
                onOpenShopping={handleOpenShopping}
                onSelectSearchResult={handleSelectSearchResult}
              />
            </ErrorBoundary>
          )}

          {state.view === 'shopping' && (
            <ErrorBoundary resetLabel="Back to Library" onReset={handleBackToLibrary}>
              <ShoppingListView onBack={handleBackToLibrary} />
            </ErrorBoundary>
          )}

          {state.view === 'shared' && state.sharedPayload !== null && (
            <ErrorBoundary resetLabel="Back to Library" onReset={handleBackToLibrary}>
              <SharedRecipeImport
                key={state.sharedPayload}
                payload={state.sharedPayload}
                onSaved={handleSharedRecipeSaved}
                onCancel={handleBackToLibrary}
              />
            </ErrorBoundary>
          )}

          {state.view === 'bookshelf' && (
            <ErrorBoundary resetLabel="Back to Library" onReset={handleBackToLibrary}>
              <BookshelfView
                onSelectCookbook={handleSelectCookbookFromBookshelf}
                onBack={handleBackFromBookshelf}
              />
            </ErrorBoundary>
          )}

          {state.view === 'cookbook' && state.selectedCookbook && (
            <ErrorBoundary resetLabel="Back to Library" onReset={handleBackToLibrary}>
              <RecipeList
                key={state.refreshKey}
                cookbook={state.selectedCookbook}
                onSelectRecipe={handleSelectRecipe}
                onAddRecipe={handleStartImport}
                onBack={handleBackToLibrary}
              />
            </ErrorBoundary>
          )}

          {state.view === 'detail' && state.selectedRecipe && (
            <ErrorBoundary resetLabel="Back to Cookbook" onReset={handleBackToCookbook}>
              <RecipeDetail
                recipe={state.selectedRecipe}
                onStartCooking={handleStartCooking}
                onBack={handleBackToCookbook}
              />
            </ErrorBoundary>
          )}

          {state.view === 'import' && state.selectedCookbook && (
            <ErrorBoundary resetLabel="Cancel Import" onReset={handleCancelImport}>
              <RecipeImport
                cookbook={state.selectedCookbook}
                onImportComplete={handleImportComplete}
                onCancel={handleCancelImport}
              />
            </ErrorBoundary>
          )}

          {state.view === 'edit' && state.selectedCookbook && state.parsedRecipe && (
            <ErrorBoundary resetLabel="Cancel Edit" onReset={handleCancelImport}>
              <RecipeEditor
                parsedRecipe={state.parsedRecipe}
                cookbook={state.selectedCookbook}
                onSave={handleSaveRecipe}
                onCancel={handleCancelImport}
              />
            </ErrorBoundary>
          )}

          {state.view === 'groceries' && state.selectedRecipe && (
            <ErrorBoundary resetLabel="Back to Recipe" onReset={handleBackToDetail}>
              <GroceryChecklist
                recipe={state.selectedRecipe}
                initialChecked={state.checkedIngredients}
                onComplete={handleGroceriesComplete}
                onBack={handleBackToDetail}
                onOpenChef={handleOpenChefForIngredient}
                onOpenScaler={handleOpenScaler}
              />
            </ErrorBoundary>
          )}

          {state.view === 'miseenplace' && state.selectedRecipe && (
            <ErrorBoundary resetLabel="Back to Groceries" onReset={handleBackToGroceries}>
              <MiseEnPlace
                recipe={state.selectedRecipe}
                onComplete={handleMiseEnPlaceComplete}
                onBack={handleBackFromMiseEnPlace}
              />
            </ErrorBoundary>
          )}

          {state.view === 'cooking' && state.selectedRecipe && (
            <ErrorBoundary resetLabel="Back to Recipe" onReset={handleBackToDetail}>
              <StepExecutor
                recipe={state.selectedRecipe}
                checkedIngredients={state.checkedIngredients}
                onComplete={handleCookingComplete}
                onOpenChef={handleOpenChef}
                onBack={handleBackToGroceries}
                initialStepIndex={state.resumeStepIndex}
                onStepChange={handleCookingStepChange}
              />
            </ErrorBoundary>
          )}

          {state.view === 'complete' && state.selectedRecipe && (
            <ErrorBoundary resetLabel="Back to Library" onReset={handleBackToLibrary}>
              <CookCompletion
                recipe={state.selectedRecipe}
                onComplete={handleCompletionFinished}
                onCookAgain={handleCookAgain}
              />
            </ErrorBoundary>
          )}

          {/* Recipe Scaler Modal */}
          {state.showScaler && state.selectedRecipe && (
            <ErrorBoundary resetLabel="Close Scaler" onReset={handleCancelScaling}>
              <RecipeScaler
                recipe={state.baseRecipe ?? state.selectedRecipe}
                appliedYield={state.baseRecipe ? state.selectedRecipe.yield : undefined}
                onApply={handleApplyScaling}
                onCancel={handleCancelScaling}
              />
            </ErrorBoundary>
          )}

          {/* Chef Ollama Overlay */}
          {state.showChefOllama && state.selectedRecipe && (
            <ErrorBoundary resetLabel="Close Chef" onReset={handleCloseChef}>
              <ChefOllamaChat
                recipe={state.selectedRecipe}
                currentStepIndex={state.chefStepIndex}
                checkedIngredients={state.checkedIngredients}
                initialMessage={state.chefInitialMessage}
                onClose={handleCloseChef}
              />
            </ErrorBoundary>
          )}
        </div>
      </KeyboardShortcutsProvider>
    </ThemeProvider>
  );
}

export default App;
