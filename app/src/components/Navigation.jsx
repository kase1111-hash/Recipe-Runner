// Navigation - Previous/Next buttons for step navigation
const Navigation = ({
  currentStep,
  totalSteps,
  onPrevious,
  onNext,
  onComplete
}) => {
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  const styles = {
    container: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px 20px',
      borderTop: '1px solid #e0e0e0',
      backgroundColor: '#fafafa',
    },
    button: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '12px 24px',
      fontSize: '16px',
      fontWeight: '600',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    },
    prevButton: {
      backgroundColor: '#fff',
      color: '#333',
      border: '1px solid #ddd',
    },
    prevButtonDisabled: {
      backgroundColor: '#f5f5f5',
      color: '#bbb',
      border: '1px solid #e0e0e0',
      cursor: 'not-allowed',
    },
    nextButton: {
      backgroundColor: '#4CAF50',
      color: '#fff',
    },
    completeButton: {
      backgroundColor: '#2196F3',
      color: '#fff',
    },
    placeholder: {
      width: '120px',
    },
  };

  const getPrevButtonStyle = () => ({
    ...styles.button,
    ...(isFirstStep ? styles.prevButtonDisabled : styles.prevButton),
  });

  const getNextButtonStyle = () => ({
    ...styles.button,
    ...(isLastStep ? styles.completeButton : styles.nextButton),
  });

  return (
    <div style={styles.container}>
      {isFirstStep ? (
        <div style={styles.placeholder} />
      ) : (
        <button
          style={getPrevButtonStyle()}
          onClick={onPrevious}
          disabled={isFirstStep}
        >
          <span>←</span>
          <span>Previous</span>
        </button>
      )}

      {isLastStep ? (
        <button style={getNextButtonStyle()} onClick={onComplete}>
          <span>Done</span>
          <span>✓</span>
        </button>
      ) : (
        <button style={getNextButtonStyle()} onClick={onNext}>
          <span>Next</span>
          <span>→</span>
        </button>
      )}
    </div>
  );
};

export default Navigation;
