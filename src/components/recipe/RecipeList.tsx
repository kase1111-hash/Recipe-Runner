import { useState, useEffect } from 'react';
import { Card, Button, DifficultyBadge } from '../common';
import { getRecipesByCookbook } from '../../db';
import type { Cookbook, Recipe } from '../../types';

interface RecipeListProps {
  cookbook: Cookbook;
  onSelectRecipe: (recipe: Recipe) => void;
  onBack: () => void;
}

export function RecipeList({ cookbook, onSelectRecipe, onBack }: RecipeListProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecipes();
  }, [cookbook.id]);

  async function loadRecipes() {
    try {
      const data = await getRecipesByCookbook(cookbook.id);
      setRecipes(data);
    } catch (error) {
      console.error('Failed to load recipes:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
        Loading recipes...
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem' }}>
        <Button variant="ghost" onClick={onBack} style={{ marginBottom: '1rem' }}>
          ← Back to Library
        </Button>
        <h1
          style={{
            fontSize: '2rem',
            fontWeight: 700,
            color: '#111827',
            margin: 0,
          }}
        >
          {cookbook.title}
        </h1>
        <p style={{ color: '#6b7280', margin: '0.25rem 0 0' }}>
          {cookbook.description}
        </p>
      </header>

      {recipes.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📝</div>
          <h2 style={{ fontSize: '1.5rem', color: '#111827', margin: '0 0 0.5rem' }}>
            No Recipes Yet
          </h2>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
            Add your first recipe to this cookbook
          </p>
          <Button>Add Recipe</Button>
        </Card>
      ) : (
        <div
          style={{
            display: 'grid',
            gap: '1rem',
          }}
        >
          {recipes.map((recipe) => (
            <Card
              key={recipe.id}
              hoverable
              onClick={() => onSelectRecipe(recipe)}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div style={{ flex: 1 }}>
                  <h3
                    style={{
                      fontSize: '1.25rem',
                      fontWeight: 600,
                      color: '#111827',
                      margin: '0 0 0.5rem',
                    }}
                  >
                    {recipe.name}
                  </h3>
                  <p
                    style={{
                      fontSize: '0.875rem',
                      color: '#6b7280',
                      margin: '0 0 0.75rem',
                    }}
                  >
                    {recipe.description}
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      gap: '1rem',
                      fontSize: '0.875rem',
                      color: '#6b7280',
                    }}
                  >
                    <span>⏱ {recipe.total_time}</span>
                    <span>📊 {recipe.steps.length} steps</span>
                    <span>🍽 {recipe.yield}</span>
                    {recipe.safe_temp && <span>🌡️ {recipe.safe_temp.value}{recipe.safe_temp.unit}</span>}
                  </div>
                </div>
                <div style={{ marginLeft: '1rem' }}>
                  <DifficultyBadge score={recipe.difficulty} />
                </div>
              </div>
              {recipe.tags.length > 0 && (
                <div
                  style={{
                    marginTop: '0.75rem',
                    display: 'flex',
                    gap: '0.5rem',
                    flexWrap: 'wrap',
                  }}
                >
                  {recipe.tags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        fontSize: '0.75rem',
                        padding: '0.125rem 0.5rem',
                        background: '#f3f4f6',
                        borderRadius: '9999px',
                        color: '#6b7280',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
