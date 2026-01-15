import { useState } from 'react';
import { sampleRecipe } from './data/sampleRecipe';
import { RecipeIntro, StepExecutor, CompletionScreen } from './components';

// App views
const VIEWS = {
  INTRO: 'intro',
  COOKING: 'cooking',
  COMPLETE: 'complete',
};

function App() {
  const [currentView, setCurrentView] = useState(VIEWS.INTRO);
  const recipe = sampleRecipe;

  const handleStart = () => {
    setCurrentView(VIEWS.COOKING);
  };

  const handleComplete = () => {
    setCurrentView(VIEWS.COMPLETE);
  };

  const handleExit = () => {
    setCurrentView(VIEWS.INTRO);
  };

  const handleStartOver = () => {
    setCurrentView(VIEWS.COOKING);
  };

  return (
    <>
      {currentView === VIEWS.INTRO && (
        <RecipeIntro recipe={recipe} onStart={handleStart} />
      )}
      {currentView === VIEWS.COOKING && (
        <StepExecutor
          recipe={recipe}
          onComplete={handleComplete}
          onExit={handleExit}
        />
      )}
      {currentView === VIEWS.COMPLETE && (
        <CompletionScreen
          recipe={recipe}
          onStartOver={handleStartOver}
          onExit={handleExit}
        />
      )}
    </>
  );
}

export default App;
