import { useState, useEffect } from 'react';
import { CookbookLibrary } from './components/cookbook/CookbookLibrary';
import { RecipeList } from './components/recipe/RecipeList';
import { GroceryChecklist } from './components/recipe/GroceryChecklist';
import { StepExecutor } from './components/step/StepExecutor';
import { ChefOllamaChat } from './components/chef-ollama/ChefOllamaChat';
import { RecipeImport } from './components/import/RecipeImport';
import { RecipeEditor } from './components/import/RecipeEditor';
import { initializeDatabase } from './db';
import { seedSampleData } from './data/sampleCookbook';
import type { Cookbook, Recipe, Ingredient } from './types';
import type { ParsedRecipe } from './services/recipeParser';

type AppView = 'library' | 'cookbook' | 'import' | 'edit' | 'groceries' | 'cooking' | 'complete';

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
    setView('groceries');
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
    setView('cooking');
  }

  function handleCookingComplete() {
    setView('complete');
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

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      {view === 'library' && (
        <CookbookLibrary onSelectCookbook={handleSelectCookbook} />
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
          onBack={handleBackToCookbook}
          onOpenChef={handleOpenChefForIngredient}
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
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
          }}
        >
          <div
            style={{
              textAlign: 'center',
              maxWidth: '400px',
            }}
          >
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
            <h1
              style={{
                fontSize: '2rem',
                fontWeight: 700,
                color: '#111827',
                margin: '0 0 0.5rem',
              }}
            >
              Recipe Complete!
            </h1>
            <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
              You've finished making {selectedRecipe.name}. Enjoy your creation!
            </p>
            <button
              onClick={handleBackToLibrary}
              style={{
                padding: '0.75rem 2rem',
                fontSize: '1rem',
                fontWeight: 600,
                color: 'white',
                background: '#2563eb',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
              }}
            >
              Back to Library
            </button>
          </div>
        </div>
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
