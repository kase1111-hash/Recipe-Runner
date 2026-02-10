import { useReducer, useEffect, useCallback, useState } from 'react';
import { ThemeProvider, KeyboardShortcutsProvider } from './contexts';
import { CookbookLibrary } from './components/cookbook/CookbookLibrary';
import { BookshelfView } from './components/cookbook/BookshelfView';
import { RecipeList, RecipeScaler, MiseEnPlace, CookCompletion, RecipeDetail } from './components/recipe';
import { GroceryChecklist } from './components/recipe/GroceryChecklist';
import { StepExecutor } from './components/step/StepExecutor';
import { ChefOllamaChat } from './components/chef-ollama/ChefOllamaChat';
import { ErrorBoundary } from './components/common';
import { RecipeImport } from './components/import/RecipeImport';
import { RecipeEditor } from './components/import/RecipeEditor';
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
  | 'complete';

interface AppState {
  initialized: boolean;
  view: AppView;
  selectedCookbook: Cookbook | null;
  selectedRecipe: Recipe | null;
  parsedRecipe: ParsedRecipe | null;
  checkedIngredients: string[];
  showChefOllama: boolean;
  chefInitialMessage: string | undefined;
  chefStepIndex: number;
  refreshKey: number;
  showScaler: boolean;
  resumeSession: CookingSession | null;
  resumeStepIndex: number;
}

// ============================================
// Action Types
// ============================================

type AppAction =
  | { type: 'INITIALIZE' }
  | { type: 'NAVIGATE'; view: AppView }
  | { type: 'SELECT_COOKBOOK'; cookbook: Cookbook }
  | { type: 'SELECT_RECIPE'; recipe: Recipe }
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
  | { type: 'RESUME_COOKING'; recipe: Recipe; cookbook: Cookbook; stepIndex: number; checkedIngredients: string[] };

// ============================================
// Initial State
// ============================================

const initialState: AppState = {
  initialized: false,
  view: 'library',
  selectedCookbook: null,
  selectedRecipe: null,
  parsedRecipe: null,
  checkedIngredients: [],
  showChefOllama: false,
  chefInitialMessage: undefined,
  chefStepIndex: 0,
  refreshKey: 0,
  showScaler: false,
  resumeSession: null,
  resumeStepIndex: 0,
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
        // Reset resume step when entering cooking normally (not via RESUME_COOKING)
        ...(action.view === 'cooking' ? { resumeStepIndex: 0 } : {}),
      };

    case 'SELECT_COOKBOOK':
      return { ...state, selectedCookbook: action.cookbook, view: 'cookbook' };

    case 'SELECT_RECIPE':
      return { ...state, selectedRecipe: action.recipe, view: 'detail' };

    case 'SET_PARSED_RECIPE':
      return {
        ...state,
        parsedRecipe: action.parsedRecipe,
        view: action.parsedRecipe ? 'edit' : state.view,
      };

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
        checkedIngredients: [],
        view: 'library',
      };

    case 'BACK_TO_COOKBOOK':
      return {
        ...state,
        selectedRecipe: null,
        checkedIngredients: [],
        view: 'cookbook',
      };

    case 'UPDATE_RECIPE':
      return { ...state, selectedRecipe: action.recipe };

    case 'SET_RESUME_SESSION':
      return { ...state, resumeSession: action.session };

    case 'RESUME_COOKING':
      return {
        ...state,
        selectedCookbook: action.cookbook,
        selectedRecipe: action.recipe,
        checkedIngredients: action.checkedIngredients,
        resumeStepIndex: action.stepIndex,
        resumeSession: null,
        view: 'cooking',
      };

    default:
      return state;
  }
}

// ============================================
// App Component
// ============================================

function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Sync browser URL with app state for back-button and deep-linking
  useRouter(
    { view: state.view, selectedCookbook: state.selectedCookbook, selectedRecipe: state.selectedRecipe },
    dispatch,
  );

  // Initialize database, seed sample data, and check for interrupted sessions
  useEffect(() => {
    async function init() {
      await initializeDatabase();
      await seedSampleData();
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
    dispatch({ type: 'NAVIGATE', view: 'groceries' });
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

  const handleCompletionFinished = useCallback(async () => {
    if (state.selectedRecipe) {
      const refreshed = await getRecipe(state.selectedRecipe.id);
      if (refreshed) {
        dispatch({ type: 'UPDATE_RECIPE', recipe: refreshed });
      }
    }
    dispatch({ type: 'BACK_TO_LIBRARY' });
  }, [state.selectedRecipe]);

  const handleCookAgain = useCallback(() => {
    dispatch({ type: 'NAVIGATE', view: 'groceries' });
  }, []);

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
                recipe={state.selectedRecipe}
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
