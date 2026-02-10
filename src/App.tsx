import { useReducer, useEffect, useCallback } from 'react';
import { ThemeProvider, KeyboardShortcutsProvider } from './contexts';
import { CookbookLibrary } from './components/cookbook/CookbookLibrary';
import { BookshelfView } from './components/cookbook/BookshelfView';
import { RecipeList, RecipeScaler, MiseEnPlace, CookCompletion, RecipeDetail } from './components/recipe';
import { GroceryChecklist } from './components/recipe/GroceryChecklist';
import { StepExecutor } from './components/step/StepExecutor';
import { ChefOllamaChat } from './components/chef-ollama/ChefOllamaChat';
import { RecipeImport } from './components/import/RecipeImport';
import { RecipeEditor } from './components/import/RecipeEditor';
import { initializeDatabase, getRecipe } from './db';
import { seedSampleData } from './data/sampleCookbook';
import type { Cookbook, Recipe, Ingredient } from './types';
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
  refreshKey: number;
  showScaler: boolean;
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
  | { type: 'OPEN_CHEF'; initialMessage?: string }
  | { type: 'CLOSE_CHEF' }
  | { type: 'OPEN_SCALER' }
  | { type: 'APPLY_SCALING'; recipe: Recipe }
  | { type: 'CLOSE_SCALER' }
  | { type: 'BACK_TO_LIBRARY' }
  | { type: 'BACK_TO_COOKBOOK' }
  | { type: 'UPDATE_RECIPE'; recipe: Recipe };

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
  refreshKey: 0,
  showScaler: false,
};

// ============================================
// Reducer
// ============================================

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'INITIALIZE':
      return { ...state, initialized: true };

    case 'NAVIGATE':
      return { ...state, view: action.view };

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

    default:
      return state;
  }
}

// ============================================
// App Component
// ============================================

function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Initialize database and seed sample data
  useEffect(() => {
    async function init() {
      await initializeDatabase();
      await seedSampleData();
      dispatch({ type: 'INITIALIZE' });
    }
    init();
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

  const handleOpenChef = useCallback(() => {
    dispatch({ type: 'OPEN_CHEF' });
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
          {state.view === 'library' && (
            <CookbookLibrary
              onSelectCookbook={handleSelectCookbook}
              onOpenBookshelf={handleOpenBookshelf}
            />
          )}

          {state.view === 'bookshelf' && (
            <BookshelfView
              onSelectCookbook={handleSelectCookbookFromBookshelf}
              onBack={handleBackFromBookshelf}
            />
          )}

          {state.view === 'cookbook' && state.selectedCookbook && (
            <RecipeList
              key={state.refreshKey}
              cookbook={state.selectedCookbook}
              onSelectRecipe={handleSelectRecipe}
              onAddRecipe={handleStartImport}
              onBack={handleBackToLibrary}
            />
          )}

          {state.view === 'detail' && state.selectedRecipe && (
            <RecipeDetail
              recipe={state.selectedRecipe}
              onStartCooking={handleStartCooking}
              onBack={handleBackToCookbook}
            />
          )}

          {state.view === 'import' && state.selectedCookbook && (
            <RecipeImport
              cookbook={state.selectedCookbook}
              onImportComplete={handleImportComplete}
              onCancel={handleCancelImport}
            />
          )}

          {state.view === 'edit' && state.selectedCookbook && state.parsedRecipe && (
            <RecipeEditor
              parsedRecipe={state.parsedRecipe}
              cookbook={state.selectedCookbook}
              onSave={handleSaveRecipe}
              onCancel={handleCancelImport}
            />
          )}

          {state.view === 'groceries' && state.selectedRecipe && (
            <GroceryChecklist
              recipe={state.selectedRecipe}
              onComplete={handleGroceriesComplete}
              onBack={handleBackToDetail}
              onOpenChef={handleOpenChefForIngredient}
              onOpenScaler={handleOpenScaler}
            />
          )}

          {state.view === 'miseenplace' && state.selectedRecipe && (
            <MiseEnPlace
              recipe={state.selectedRecipe}
              onComplete={handleMiseEnPlaceComplete}
              onBack={handleBackFromMiseEnPlace}
            />
          )}

          {state.view === 'cooking' && state.selectedRecipe && (
            <StepExecutor
              recipe={state.selectedRecipe}
              checkedIngredients={state.checkedIngredients}
              onComplete={handleCookingComplete}
              onOpenChef={handleOpenChef}
              onBack={handleBackToGroceries}
            />
          )}

          {state.view === 'complete' && state.selectedRecipe && (
            <CookCompletion
              recipe={state.selectedRecipe}
              onComplete={handleCompletionFinished}
              onCookAgain={handleCookAgain}
            />
          )}

          {/* Recipe Scaler Modal */}
          {state.showScaler && state.selectedRecipe && (
            <RecipeScaler
              recipe={state.selectedRecipe}
              onApply={handleApplyScaling}
              onCancel={handleCancelScaling}
            />
          )}

          {/* Chef Ollama Overlay */}
          {state.showChefOllama && state.selectedRecipe && (
            <ChefOllamaChat
              recipe={state.selectedRecipe}
              currentStepIndex={0}
              checkedIngredients={state.checkedIngredients}
              initialMessage={state.chefInitialMessage}
              onClose={handleCloseChef}
            />
          )}
        </div>
      </KeyboardShortcutsProvider>
    </ThemeProvider>
  );
}

export default App;
