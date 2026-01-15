import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card, Button, DifficultyBadge, FavoriteButton } from '../common';
import { getRecipesByCookbook, getRecipeCountsByCourseType } from '../../db';
import type { Cookbook, Recipe, CourseType } from '../../types';
import { CourseTypeLabels } from '../../types';

interface RecipeListProps {
  cookbook: Cookbook;
  onSelectRecipe: (recipe: Recipe) => void;
  onAddRecipe: () => void;
  onBack: () => void;
}

type FilterOption = 'all' | 'favorites' | 'recent';
type SortOption = 'name' | 'difficulty' | 'time' | 'recent';

const RECIPES_PER_PAGE = 50;

export function RecipeList({ cookbook, onSelectRecipe, onAddRecipe, onBack }: RecipeListProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterOption>('all');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [courseTypeFilter, setCourseTypeFilter] = useState<CourseType | 'all'>('all');
  const [courseTypeCounts, setCourseTypeCounts] = useState<Record<string, number>>({});
  const [displayCount, setDisplayCount] = useState(RECIPES_PER_PAGE);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadRecipes();
  }, [cookbook.id]);

  // Reset display count when filters change
  useEffect(() => {
    setDisplayCount(RECIPES_PER_PAGE);
  }, [searchQuery, filter, sortBy, courseTypeFilter]);

  async function loadRecipes() {
    try {
      const [data, counts] = await Promise.all([
        getRecipesByCookbook(cookbook.id),
        getRecipeCountsByCourseType(cookbook.id),
      ]);
      setRecipes(data);
      setCourseTypeCounts(counts);
    } catch (error) {
      console.error('Failed to load recipes:', error);
    } finally {
      setLoading(false);
    }
  }

  // Load more recipes when scrolling near bottom
  const handleScroll = useCallback(() => {
    if (!listRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    if (scrollHeight - scrollTop - clientHeight < 200) {
      setDisplayCount((prev) => prev + RECIPES_PER_PAGE);
    }
  }, []);

  // Filter and sort recipes
  const filteredRecipes = useMemo(() => {
    let result = [...recipes];

    // Apply course type filter
    if (courseTypeFilter !== 'all') {
      result = result.filter((recipe) => recipe.course_type === courseTypeFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (recipe) =>
          recipe.name.toLowerCase().includes(query) ||
          recipe.description.toLowerCase().includes(query) ||
          recipe.tags.some((tag) => tag.toLowerCase().includes(query)) ||
          recipe.ingredients.some((ing) => ing.item.toLowerCase().includes(query)) ||
          (recipe.cuisine && recipe.cuisine.toLowerCase().includes(query)) ||
          (recipe.course_type && CourseTypeLabels[recipe.course_type]?.label.toLowerCase().includes(query))
      );
    }

    // Apply filter
    if (filter === 'favorites') {
      result = result.filter((recipe) => recipe.favorite);
    } else if (filter === 'recent') {
      // Show recipes cooked in the last 30 days
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      result = result.filter((recipe) =>
        recipe.cook_history.some((h) => new Date(h.date).getTime() > thirtyDaysAgo)
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      // Always show favorites first within the sort
      if (a.favorite && !b.favorite) return -1;
      if (!a.favorite && b.favorite) return 1;

      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'difficulty':
          return a.difficulty.overall - b.difficulty.overall;
        case 'time': {
          const parseTime = (t: string) => {
            const hours = t.match(/(\d+)\s*h/)?.[1] || '0';
            const mins = t.match(/(\d+)\s*m/)?.[1] || '0';
            return parseInt(hours) * 60 + parseInt(mins);
          };
          return parseTime(a.total_time) - parseTime(b.total_time);
        }
        case 'recent':
          return new Date(b.modified_at).getTime() - new Date(a.modified_at).getTime();
        default:
          return 0;
      }
    });

    return result;
  }, [recipes, searchQuery, filter, sortBy, courseTypeFilter]);

  // Paginated recipes for display
  const displayedRecipes = useMemo(() => {
    return filteredRecipes.slice(0, displayCount);
  }, [filteredRecipes, displayCount]);

  const hasMoreRecipes = displayCount < filteredRecipes.length;

  // Get active course types for the filter UI
  const activeCourseTypes = useMemo(() => {
    return Object.entries(courseTypeCounts)
      .filter(([key, count]) => key !== 'all' && count > 0)
      .map(([key]) => key as CourseType);
  }, [courseTypeCounts]);

  function handleFavoriteToggle(recipeId: string, newState: boolean) {
    setRecipes((prev) =>
      prev.map((r) => (r.id === recipeId ? { ...r, favorite: newState } : r))
    );
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1
              style={{
                fontSize: '2rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                margin: 0,
              }}
            >
              {cookbook.title}
            </h1>
            <p style={{ color: 'var(--text-tertiary)', margin: '0.25rem 0 0' }}>
              {cookbook.description}
            </p>
          </div>
          <Button onClick={onAddRecipe}>+ Import Recipe</Button>
        </div>
      </header>

      {/* Search and Filters */}
      {recipes.length > 0 && (
        <Card style={{ marginBottom: '1.5rem', padding: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Search Input */}
            <div style={{ flex: '1 1 300px' }}>
              <input
                type="text"
                placeholder="Search recipes, ingredients, tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  border: '1px solid var(--input-border)',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  background: 'var(--input-bg)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            {/* Filter Buttons */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {(['all', 'favorites', 'recent'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    padding: '0.5rem 0.75rem',
                    border: filter === f ? '1px solid var(--accent-primary)' : '1px solid var(--border-secondary)',
                    borderRadius: '0.5rem',
                    background: filter === f ? 'var(--accent-light)' : 'var(--bg-secondary)',
                    color: filter === f ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    fontWeight: filter === f ? 500 : 400,
                  }}
                >
                  {f === 'all' && 'All'}
                  {f === 'favorites' && '❤️ Favorites'}
                  {f === 'recent' && '🕒 Recent'}
                </button>
              ))}
            </div>

            {/* Course Type Filter */}
            <select
              value={courseTypeFilter}
              onChange={(e) => setCourseTypeFilter(e.target.value as CourseType | 'all')}
              style={{
                padding: '0.5rem 0.75rem',
                border: '1px solid var(--input-border)',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                background: 'var(--input-bg)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Types ({courseTypeCounts.all || 0})</option>
              {activeCourseTypes.map((type) => (
                <option key={type} value={type}>
                  {CourseTypeLabels[type]?.icon} {CourseTypeLabels[type]?.label} ({courseTypeCounts[type] || 0})
                </option>
              ))}
              {courseTypeCounts.uncategorized > 0 && (
                <option value="uncategorized">Uncategorized ({courseTypeCounts.uncategorized})</option>
              )}
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              style={{
                padding: '0.5rem 0.75rem',
                border: '1px solid var(--input-border)',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                background: 'var(--input-bg)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
              }}
            >
              <option value="name">Sort: Name</option>
              <option value="difficulty">Sort: Difficulty</option>
              <option value="time">Sort: Time</option>
              <option value="recent">Sort: Recently Modified</option>
            </select>
          </div>

          {/* Results count */}
          <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {filteredRecipes.length} of {recipes.length} recipes
            {searchQuery && ` matching "${searchQuery}"`}
            {courseTypeFilter !== 'all' && ` in ${CourseTypeLabels[courseTypeFilter as CourseType]?.label || courseTypeFilter}`}
          </div>
        </Card>
      )}

      {recipes.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📝</div>
          <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', margin: '0 0 0.5rem' }}>
            No Recipes Yet
          </h2>
          <p style={{ color: 'var(--text-tertiary)', marginBottom: '1.5rem' }}>
            Import your first recipe to this cookbook
          </p>
          <Button onClick={onAddRecipe}>Import Recipe</Button>
        </Card>
      ) : filteredRecipes.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', margin: '0 0 0.5rem' }}>
            No Results Found
          </h2>
          <p style={{ color: 'var(--text-tertiary)', marginBottom: '1rem' }}>
            Try adjusting your search or filters
          </p>
          <Button variant="secondary" onClick={() => { setSearchQuery(''); setFilter('all'); setCourseTypeFilter('all'); }}>
            Clear Filters
          </Button>
        </Card>
      ) : (
        <div
          ref={listRef}
          onScroll={handleScroll}
          style={{
            display: 'grid',
            gap: '1rem',
            maxHeight: 'calc(100vh - 300px)',
            overflowY: 'auto',
          }}
        >
          {displayedRecipes.map((recipe) => (
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <h3
                      style={{
                        fontSize: '1.25rem',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        margin: 0,
                      }}
                    >
                      {recipe.name}
                    </h3>
                    {recipe.favorite && (
                      <span style={{ color: 'var(--error)', fontSize: '0.875rem' }}>❤️</span>
                    )}
                  </div>
                  <p
                    style={{
                      fontSize: '0.875rem',
                      color: 'var(--text-tertiary)',
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
                      color: 'var(--text-tertiary)',
                    }}
                  >
                    <span>⏱ {recipe.total_time}</span>
                    <span>📊 {recipe.steps.length} steps</span>
                    <span>🍽 {recipe.yield}</span>
                    {recipe.safe_temp && <span>🌡️ {recipe.safe_temp.value}{recipe.safe_temp.unit}</span>}
                    {recipe.cook_history.length > 0 && (
                      <span>🍳 Cooked {recipe.cook_history.length}x</span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginLeft: '1rem' }}>
                  <FavoriteButton
                    recipeId={recipe.id}
                    initialFavorite={recipe.favorite || false}
                    size="sm"
                    onToggle={(newState) => handleFavoriteToggle(recipe.id, newState)}
                  />
                  <DifficultyBadge score={recipe.difficulty} />
                </div>
              </div>
              {/* Course Type and Tags */}
              <div
                style={{
                  marginTop: '0.75rem',
                  display: 'flex',
                  gap: '0.5rem',
                  flexWrap: 'wrap',
                }}
              >
                {/* Course Type Badge */}
                {recipe.course_type && CourseTypeLabels[recipe.course_type] && (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.125rem 0.5rem',
                      background: 'var(--accent-light)',
                      borderRadius: '9999px',
                      color: 'var(--accent-primary)',
                      fontWeight: 500,
                    }}
                  >
                    {CourseTypeLabels[recipe.course_type].icon} {CourseTypeLabels[recipe.course_type].label}
                  </span>
                )}
                {/* Cuisine Badge */}
                {recipe.cuisine && (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.125rem 0.5rem',
                      background: 'var(--info-bg)',
                      borderRadius: '9999px',
                      color: 'var(--accent-primary)',
                    }}
                  >
                    {recipe.cuisine}
                  </span>
                )}
                {/* Tags */}
                {recipe.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.125rem 0.5rem',
                      background: 'var(--bg-tertiary)',
                      borderRadius: '9999px',
                      color: 'var(--text-tertiary)',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </Card>
          ))}

          {/* Load More / Pagination Indicator */}
          {hasMoreRecipes && (
            <div
              style={{
                padding: '1rem',
                textAlign: 'center',
                color: 'var(--text-tertiary)',
                fontSize: '0.875rem',
              }}
            >
              Showing {displayedRecipes.length} of {filteredRecipes.length} recipes. Scroll for more...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
