// ProgressIndicator - Shows current step position in recipe
const ProgressIndicator = ({ currentStep, totalSteps }) => {
  const percentage = ((currentStep + 1) / totalSteps) * 100;

  const styles = {
    container: {
      width: '100%',
      padding: '12px 0',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '8px',
      fontSize: '14px',
      color: '#666',
    },
    stepText: {
      fontWeight: '600',
      color: '#333',
    },
    barContainer: {
      width: '100%',
      height: '6px',
      backgroundColor: '#e0e0e0',
      borderRadius: '3px',
      overflow: 'hidden',
    },
    barFill: {
      height: '100%',
      width: `${percentage}%`,
      backgroundColor: '#4CAF50',
      borderRadius: '3px',
      transition: 'width 0.3s ease-in-out',
    },
    dots: {
      display: 'flex',
      justifyContent: 'space-between',
      marginTop: '8px',
      padding: '0 2px',
    },
    dot: {
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      transition: 'all 0.2s ease',
    },
  };

  const getDotStyle = (index) => ({
    ...styles.dot,
    backgroundColor: index <= currentStep ? '#4CAF50' : '#e0e0e0',
    transform: index === currentStep ? 'scale(1.3)' : 'scale(1)',
  });

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.stepText}>
          Step {currentStep + 1} of {totalSteps}
        </span>
        <span>{Math.round(percentage)}% complete</span>
      </div>
      <div style={styles.barContainer}>
        <div style={styles.barFill} />
      </div>
      {totalSteps <= 12 && (
        <div style={styles.dots}>
          {Array.from({ length: totalSteps }).map((_, index) => (
            <div key={index} style={getDotStyle(index)} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProgressIndicator;
