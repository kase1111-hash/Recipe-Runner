// CompletionScreen - Shown when recipe is completed
const CompletionScreen = ({ recipe, onStartOver, onExit }) => {
  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    },
    card: {
      maxWidth: '500px',
      width: '100%',
      backgroundColor: '#fff',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      textAlign: 'center',
      padding: '40px 24px',
    },
    emoji: {
      fontSize: '64px',
      marginBottom: '16px',
    },
    title: {
      fontSize: '28px',
      fontWeight: '700',
      color: '#333',
      marginBottom: '8px',
    },
    subtitle: {
      fontSize: '18px',
      color: '#666',
      marginBottom: '32px',
    },
    recipeName: {
      fontSize: '20px',
      fontWeight: '600',
      color: '#4CAF50',
      marginBottom: '8px',
    },
    message: {
      fontSize: '16px',
      color: '#666',
      lineHeight: '1.6',
      marginBottom: '32px',
    },
    buttonGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    },
    primaryButton: {
      width: '100%',
      padding: '14px',
      fontSize: '16px',
      fontWeight: '600',
      backgroundColor: '#4CAF50',
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
    },
    secondaryButton: {
      width: '100%',
      padding: '14px',
      fontSize: '16px',
      fontWeight: '600',
      backgroundColor: '#fff',
      color: '#666',
      border: '1px solid #ddd',
      borderRadius: '8px',
      cursor: 'pointer',
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.emoji}>🎉</div>
        <h1 style={styles.title}>All Done!</h1>
        <p style={styles.subtitle}>You've completed</p>
        <p style={styles.recipeName}>{recipe.name}</p>

        <p style={styles.message}>
          Great job working through all {recipe.steps.length} steps!
          {recipe.safeTemp && (
            <>
              {' '}Remember to verify the internal temperature reaches{' '}
              {recipe.safeTemp.value}{recipe.safeTemp.unit} at the{' '}
              {recipe.safeTemp.location}.
            </>
          )}
        </p>

        <div style={styles.buttonGroup}>
          <button style={styles.primaryButton} onClick={onExit}>
            Back to Home
          </button>
          <button style={styles.secondaryButton} onClick={onStartOver}>
            Cook Again
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompletionScreen;
