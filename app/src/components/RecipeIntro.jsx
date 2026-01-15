// RecipeIntro - Shows recipe overview before starting
const RecipeIntro = ({ recipe, onStart }) => {
  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      padding: '20px',
    },
    card: {
      maxWidth: '600px',
      margin: '0 auto',
      backgroundColor: '#fff',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      overflow: 'hidden',
    },
    header: {
      backgroundColor: '#4CAF50',
      color: '#fff',
      padding: '24px',
      textAlign: 'center',
    },
    title: {
      fontSize: '28px',
      fontWeight: '700',
      margin: '0 0 8px 0',
    },
    description: {
      fontSize: '16px',
      opacity: 0.9,
      margin: 0,
      lineHeight: '1.5',
    },
    body: {
      padding: '24px',
    },
    metaGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '16px',
      marginBottom: '24px',
    },
    metaItem: {
      textAlign: 'center',
      padding: '16px',
      backgroundColor: '#f9f9f9',
      borderRadius: '8px',
    },
    metaLabel: {
      fontSize: '12px',
      color: '#888',
      textTransform: 'uppercase',
      letterSpacing: '1px',
      marginBottom: '4px',
    },
    metaValue: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#333',
    },
    section: {
      marginBottom: '24px',
    },
    sectionTitle: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#333',
      marginBottom: '12px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    },
    equipmentList: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px',
    },
    equipmentItem: {
      padding: '6px 12px',
      backgroundColor: '#e8f5e9',
      color: '#2e7d32',
      borderRadius: '16px',
      fontSize: '14px',
    },
    safeTemp: {
      backgroundColor: '#ffebee',
      border: '2px solid #ef5350',
      borderRadius: '8px',
      padding: '16px',
      textAlign: 'center',
    },
    safeTempLabel: {
      fontSize: '12px',
      color: '#c62828',
      textTransform: 'uppercase',
      letterSpacing: '1px',
      marginBottom: '4px',
    },
    safeTempValue: {
      fontSize: '24px',
      fontWeight: '700',
      color: '#c62828',
    },
    safeTempLocation: {
      fontSize: '12px',
      color: '#666',
      marginTop: '4px',
    },
    startButton: {
      width: '100%',
      padding: '16px',
      fontSize: '18px',
      fontWeight: '600',
      backgroundColor: '#4CAF50',
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      marginTop: '8px',
    },
    stepCount: {
      textAlign: 'center',
      fontSize: '14px',
      color: '#666',
      marginTop: '12px',
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>{recipe.name}</h1>
          <p style={styles.description}>{recipe.description}</p>
        </div>

        <div style={styles.body}>
          <div style={styles.metaGrid}>
            <div style={styles.metaItem}>
              <div style={styles.metaLabel}>Total Time</div>
              <div style={styles.metaValue}>{recipe.totalTime}</div>
            </div>
            <div style={styles.metaItem}>
              <div style={styles.metaLabel}>Active Time</div>
              <div style={styles.metaValue}>{recipe.activeTime}</div>
            </div>
            <div style={styles.metaItem}>
              <div style={styles.metaLabel}>Yield</div>
              <div style={styles.metaValue}>{recipe.yield}</div>
            </div>
            <div style={styles.metaItem}>
              <div style={styles.metaLabel}>Difficulty</div>
              <div style={styles.metaValue}>{recipe.difficulty}</div>
            </div>
          </div>

          {recipe.equipment && recipe.equipment.length > 0 && (
            <div style={styles.section}>
              <div style={styles.sectionTitle}>Equipment Needed</div>
              <div style={styles.equipmentList}>
                {recipe.equipment.map((item, index) => (
                  <span key={index} style={styles.equipmentItem}>
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {recipe.safeTemp && (
            <div style={styles.section}>
              <div style={styles.safeTemp}>
                <div style={styles.safeTempLabel}>
                  🌡️ Safe Internal Temperature
                </div>
                <div style={styles.safeTempValue}>
                  {recipe.safeTemp.value}{recipe.safeTemp.unit}
                </div>
                <div style={styles.safeTempLocation}>
                  {recipe.safeTemp.location}
                </div>
              </div>
            </div>
          )}

          <button style={styles.startButton} onClick={onStart}>
            Start Cooking
          </button>

          <p style={styles.stepCount}>
            {recipe.steps.length} steps to delicious
          </p>
        </div>
      </div>
    </div>
  );
};

export default RecipeIntro;
