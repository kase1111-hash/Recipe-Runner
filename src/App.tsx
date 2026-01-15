import { useState, useEffect } from 'react';
import { CookbookLibrary } from './components/cookbook/CookbookLibrary';
import { RecipeList, RecipeScaler, MiseEnPlace, CookCompletion, RecipeDetail } from './components/recipe';
import { GroceryChecklist } from './components/recipe/GroceryChecklist';
import { StepExecutor } from './components/step/StepExecutor';
import { ChefOllamaChat } from './components/chef-ollama/ChefOllamaChat';
import { RecipeImport } from './components/import/RecipeImport';
import { RecipeEditor } from './components/import/RecipeEditor';
import { MealPlanner, MealPlanGroceryList } from './components/mealplan';
import { initializeDatabase, getRecipe } from './db';
import { seedSampleData } from './data/sampleCookbook';
import type { Cookbook, Recipe, Ingredient } from './types';
import type { ParsedRecipe } from './services/recipeParser';
import type { ScaledRecipe } from './services/recipeScaling';

type AppView = 'library' | 'cookbook' | 'detail' | 'import' | 'edit' | 'groceries' | 'miseenplace' | 'cooking' | 'complete' | 'mealplanner' | 'mealplangroceries';

function App() {
  const [initialized, setInitialized] = useState(false);
  const [view, setView] = useState<AppView>('library');
  const [selectedCookbook, setSelectedCookbook] = useState<Cookbook | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [parsedRecipe, setParsedRecipe] = useState<ParsedRecipe | null>(null);
  const [checkedIngredients, setCheckedIngredients] = useState<string[]>([]);
  const [showChefOllama, setShowChefOllama] = useState(false);
  const [chefInitialMessage, setChefInitialMessage] = useState<string | undefined>();
  const [refreshKey, setRefreshKey] = useState(0);
  const [showScaler, setShowScaler] = useState(false);
  const [selectedMealPlanId, setSelectedMealPlanId] = useState<string | null>(null);

  // Initialize database and seed sample data
  useEffect(() => {
    async function init() {
      await initializeDatabase();
      await seedSampleData();
      setInitialized(true);
    }
    init();
  }, []);

  if (!initialized) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f9fafb',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🍳</div>
          <div style={{ color: '#6b7280' }}>Loading Recipe Runner...</div>
        </div>
      </div>
    );
  }

  function handleSelectCookbook(cookbook: Cookbook) {
    setSelectedCookbook(cookbook);
    setView('cookbook');
  }

  function handleSelectRecipe(recipe: Recipe) {
    setSelectedRecipe(recipe);
    setView('detail');
  }

  function handleStartCookingFromDetail() {
    setView('groceries');
  }

  function handleBackToDetail() {
    setView('detail');
  }

  function handleStartImport() {
    setView('import');
  }

  function handleImportComplete(parsed: ParsedRecipe) {
    setParsedRecipe(parsed);
    setView('edit');
  }

  function handleSaveRecipe() {
    setParsedRecipe(null);
    setRefreshKey(prev => prev + 1); // Trigger refresh of recipe list
    setView('cookbook');
  }

  function handleCancelImport() {
    setParsedRecipe(null);
    setView('cookbook');
  }

  function handleGroceriesComplete(checked: string[]) {
    setCheckedIngredients(checked);
    setView('miseenplace');
  }

  function handleMiseEnPlaceComplete() {
    setView('cooking');
  }

  function handleBackFromMiseEnPlace() {
    setView('groceries');
  }

  function handleOpenScaler() {
    setShowScaler(true);
  }

  function handleApplyScaling(scaledRecipe: ScaledRecipe) {
    // Update the selected recipe with scaled values
    setSelectedRecipe(scaledRecipe as Recipe);
    setShowScaler(false);
  }

  function handleCancelScaling() {
    setShowScaler(false);
  }

  function handleCookingComplete() {
    setView('complete');
  }

  async function handleCompletionFinished() {
    // Refresh the recipe to get updated cook history
    if (selectedRecipe) {
      const refreshed = await getRecipe(selectedRecipe.id);
      if (refreshed) {
        setSelectedRecipe(refreshed);
      }
    }
    setCheckedIngredients([]);
    handleBackToLibrary();
  }

  function handleCookAgain() {
    setView('groceries');
  }

  function handleOpenChefForIngredient(ingredient: Ingredient) {
    setChefInitialMessage(`I don't have ${ingredient.item}. What can I substitute?`);
    setShowChefOllama(true);
  }

  function handleOpenChef() {
    setChefInitialMessage(undefined);
    setShowChefOllama(true);
  }

  function handleCloseChef() {
    setShowChefOllama(false);
    setChefInitialMessage(undefined);
  }

  function handleBackToLibrary() {
    setSelectedCookbook(null);
    setSelectedRecipe(null);
    setCheckedIngredients([]);
    setView('library');
  }

  function handleBackToCookbook() {
    setSelectedRecipe(null);
    setCheckedIngredients([]);
    setView('cookbook');
  }

  function handleBackToGroceries() {
    setView('groceries');
  }

  function handleOpenMealPlanner() {
    setView('mealplanner');
  }

  function handleViewMealPlanGroceries(planId: string) {
    setSelectedMealPlanId(planId);
    setView('mealplangroceries');
  }

  function handleBackFromMealPlanner() {
    setView('library');
  }

  function handleBackFromMealPlanGroceries() {
    setView('mealplanner');
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      {view === 'library' && (
        <CookbookLibrary
          onSelectCookbook={handleSelectCookbook}
          onOpenMealPlanner={handleOpenMealPlanner}
        />
      )}

      {view === 'cookbook' && selectedCookbook && (
        <RecipeList
          key={refreshKey}
          cookbook={selectedCookbook}
          onSelectRecipe={handleSelectRecipe}
          onAddRecipe={handleStartImport}
          onBack={handleBackToLibrary}
        />
      )}

      {view === 'detail' && selectedRecipe && (
        <RecipeDetail
          recipe={selectedRecipe}
          onStartCooking={handleStartCookingFromDetail}
          onBack={handleBackToCookbook}
        />
      )}

      {view === 'import' && selectedCookbook && (
        <RecipeImport
          cookbook={selectedCookbook}
          onImportComplete={handleImportComplete}
          onCancel={handleCancelImport}
        />
      )}

      {view === 'edit' && selectedCookbook && parsedRecipe && (
        <RecipeEditor
          parsedRecipe={parsedRecipe}
          cookbook={selectedCookbook}
          onSave={handleSaveRecipe}
          onCancel={handleCancelImport}
        />
      )}

      {view === 'groceries' && selectedRecipe && (
        <GroceryChecklist
          recipe={selectedRecipe}
          onComplete={handleGroceriesComplete}
          onBack={handleBackToDetail}
          onOpenChef={handleOpenChefForIngredient}
          onOpenScaler={handleOpenScaler}
        />
      )}

      {view === 'miseenplace' && selectedRecipe && (
        <MiseEnPlace
          recipe={selectedRecipe}
          onComplete={handleMiseEnPlaceComplete}
          onBack={handleBackFromMiseEnPlace}
        />
      )}

      {view === 'cooking' && selectedRecipe && (
        <StepExecutor
          recipe={selectedRecipe}
          checkedIngredients={checkedIngredients}
          onComplete={handleCookingComplete}
          onOpenChef={handleOpenChef}
          onBack={handleBackToGroceries}
        />
      )}

      {view === 'complete' && selectedRecipe && (
        <CookCompletion
          recipe={selectedRecipe}
          checkedIngredients={checkedIngredients}
          onComplete={handleCompletionFinished}
          onCookAgain={handleCookAgain}
        />
      )}

      {view === 'mealplanner' && (
        <MealPlanner
          onViewGroceryList={handleViewMealPlanGroceries}
          onBack={handleBackFromMealPlanner}
        />
      )}

      {view === 'mealplangroceries' && selectedMealPlanId && (
        <MealPlanGroceryList
          planId={selectedMealPlanId}
          onBack={handleBackFromMealPlanGroceries}
        />
      )}

      {/* Recipe Scaler Modal */}
      {showScaler && selectedRecipe && (
        <RecipeScaler
          recipe={selectedRecipe}
          onApply={handleApplyScaling}
          onCancel={handleCancelScaling}
        />
      )}

      {/* Chef Ollama Overlay */}
      {showChefOllama && selectedRecipe && (
        <ChefOllamaChat
          recipe={selectedRecipe}
          currentStepIndex={0}
          checkedIngredients={checkedIngredients}
          initialMessage={chefInitialMessage}
          onClose={handleCloseChef}
        />
      )}
    </div>
  );
}

export default App;
