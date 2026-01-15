// StepDisplay - Displays a single recipe step
const StepDisplay = ({ step, stepNumber, isLastStep, safeTemp }) => {
  const styles = {
    container: {
      padding: '20px',
      maxWidth: '600px',
      margin: '0 auto',
    },
    stepNumber: {
      fontSize: '14px',
      color: '#888',
      textTransform: 'uppercase',
      letterSpacing: '1px',
      marginBottom: '8px',
    },
    title: {
      fontSize: '28px',
      fontWeight: '700',
      color: '#1a1a1a',
      marginBottom: '16px',
      lineHeight: '1.2',
    },
    meta: {
      display: 'flex',
      gap: '16px',
      marginBottom: '24px',
      flexWrap: 'wrap',
    },
    metaItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: '14px',
      color: '#555',
    },
    timeIcon: {
      fontSize: '16px',
    },
    typeBadge: {
      padding: '4px 12px',
      borderRadius: '16px',
      fontSize: '12px',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    },
    activeBadge: {
      backgroundColor: '#fff3e0',
      color: '#e65100',
    },
    passiveBadge: {
      backgroundColor: '#e3f2fd',
      color: '#1565c0',
    },
    instruction: {
      fontSize: '18px',
      lineHeight: '1.7',
      color: '#333',
      marginBottom: '24px',
    },
    tipContainer: {
      backgroundColor: '#fffde7',
      border: '1px solid #fff59d',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '24px',
    },
    tipHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '8px',
      fontWeight: '600',
      color: '#f57f17',
      fontSize: '14px',
    },
    tipText: {
      fontSize: '14px',
      color: '#666',
      lineHeight: '1.5',
    },
    tempContainer: {
      backgroundColor: '#ffebee',
      border: '2px solid #ef5350',
      borderRadius: '8px',
      padding: '16px',
      textAlign: 'center',
    },
    tempHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      marginBottom: '8px',
      fontWeight: '700',
      color: '#c62828',
      fontSize: '14px',
      textTransform: 'uppercase',
      letterSpacing: '1px',
    },
    tempValue: {
      fontSize: '36px',
      fontWeight: '700',
      color: '#c62828',
      marginBottom: '4px',
    },
    tempLocation: {
      fontSize: '14px',
      color: '#666',
    },
  };

  const getBadgeStyle = () => ({
    ...styles.typeBadge,
    ...(step.type === 'active' ? styles.activeBadge : styles.passiveBadge),
  });

  return (
    <div style={styles.container}>
      <div style={styles.stepNumber}>Step {stepNumber}</div>

      <h2 style={styles.title}>{step.title}</h2>

      <div style={styles.meta}>
        <div style={styles.metaItem}>
          <span style={styles.timeIcon}>⏱</span>
          <span>{step.time}</span>
        </div>
        <span style={getBadgeStyle()}>
          {step.type}
        </span>
      </div>

      <p style={styles.instruction}>{step.instruction}</p>

      {step.tip && (
        <div style={styles.tipContainer}>
          <div style={styles.tipHeader}>
            <span>💡</span>
            <span>Tip</span>
          </div>
          <p style={styles.tipText}>{step.tip}</p>
        </div>
      )}

      {isLastStep && safeTemp && (
        <div style={styles.tempContainer}>
          <div style={styles.tempHeader}>
            <span>🌡️</span>
            <span>Safe Internal Temperature</span>
          </div>
          <div style={styles.tempValue}>
            {safeTemp.value}{safeTemp.unit}
          </div>
          <div style={styles.tempLocation}>
            Measure at: {safeTemp.location}
          </div>
        </div>
      )}
    </div>
  );
};

export default StepDisplay;
