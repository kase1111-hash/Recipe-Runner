import { useState } from 'react';
import StepDisplay from './StepDisplay';
import Navigation from './Navigation';
import ProgressIndicator from './ProgressIndicator';

// StepExecutor - Main component for executing recipe steps
const StepExecutor = ({ recipe, onComplete, onExit }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const totalSteps = recipe.steps.length;
  const currentStep = recipe.steps[currentStepIndex];
  const isLastStep = currentStepIndex === totalSteps - 1;

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handleComplete = () => {
    onComplete();
  };

  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      backgroundColor: '#fff',
    },
    header: {
      padding: '16px 20px',
      borderBottom: '1px solid #e0e0e0',
      backgroundColor: '#fff',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    },
    headerTop: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '12px',
    },
    recipeName: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#333',
      margin: 0,
    },
    exitButton: {
      padding: '8px 16px',
      fontSize: '14px',
      backgroundColor: 'transparent',
      color: '#666',
      border: '1px solid #ddd',
      borderRadius: '6px',
      cursor: 'pointer',
    },
    content: {
      flex: 1,
      overflowY: 'auto',
      paddingBottom: '20px',
    },
    footer: {
      position: 'sticky',
      bottom: 0,
      zIndex: 100,
    },
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerTop}>
          <h1 style={styles.recipeName}>{recipe.name}</h1>
          <button style={styles.exitButton} onClick={onExit}>
            Exit
          </button>
        </div>
        <ProgressIndicator
          currentStep={currentStepIndex}
          totalSteps={totalSteps}
        />
      </header>

      <main style={styles.content}>
        <StepDisplay
          step={currentStep}
          stepNumber={currentStepIndex + 1}
          isLastStep={isLastStep}
          safeTemp={recipe.safeTemp}
        />
      </main>

      <footer style={styles.footer}>
        <Navigation
          currentStep={currentStepIndex}
          totalSteps={totalSteps}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onComplete={handleComplete}
        />
      </footer>
    </div>
  );
};

export default StepExecutor;
