// Weekly Meal Planner Component
// Phase 6 Feature - Plan meals for the week

import { useState, useEffect, useMemo } from 'react';
import { Button, Card } from '../common';
import {
  type MealPlan,
  type MealType,
  type PlannedMeal,
  getWeekDates,
  formatDateKey,
  formatDayName,
  formatDateDisplay,
  createWeeklyPlan,
  getMealPlan,
  getActiveMealPlan,
  setActiveMealPlan,
  getAllMealPlans,
  addMealToPlan,
  removeMealFromPlan,
  getPlanStats,
} from '../../services/mealPlanning';
import { getAllCookbooks, getRecipesByCookbook } from '../../db';
import type { Recipe, Cookbook } from '../../types';

interface MealPlannerProps {
  onBack: () => void;
  onViewGroceryList: (planId: string) => void;
}

const MEAL_TYPES: { type: MealType; label: string; icon: string }[] = [
  { type: 'breakfast', label: 'Breakfast', icon: '🌅' },
  { type: 'lunch', label: 'Lunch', icon: '☀️' },
  { type: 'dinner', label: 'Dinner', icon: '🌙' },
  { type: 'snack', label: 'Snack', icon: '🍎' },
];

export function MealPlanner({ onBack, onViewGroceryList }: MealPlannerProps) {
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [allPlans, setAllPlans] = useState<MealPlan[]>([]);
  const [showPlanSelector, setShowPlanSelector] = useState(false);
  const [showRecipePicker, setShowRecipePicker] = useState<{
    date: string;
    mealType: MealType;
  } | null>(null);
  const [cookbooks, setCookbooks] = useState<Cookbook[]>([]);
  const [selectedCookbook, setSelectedCookbook] = useState<string | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  // Load active plan and all plans
  useEffect(() => {
    const activePlan = getActiveMealPlan();
    if (activePlan) {
      setPlan(activePlan);
    }
    setAllPlans(getAllMealPlans());
  }, []);

  // Load cookbooks
  useEffect(() => {
    getAllCookbooks().then(setCookbooks);
  }, []);

  // Load recipes when cookbook selected
  useEffect(() => {
    if (selectedCookbook) {
      getRecipesByCookbook(selectedCookbook).then(setRecipes);
    }
  }, [selectedCookbook]);

  const weekDates = useMemo(() => {
    if (!plan) return [];
    return getWeekDates(new Date(plan.startDate + 'T00:00:00'));
  }, [plan]);

  const stats = useMemo(() => {
    if (!plan) return null;
    return getPlanStats(plan);
  }, [plan]);

  const handleCreatePlan = () => {
    const newPlan = createWeeklyPlan();
    setActiveMealPlan(newPlan.id);
    setPlan(newPlan);
    setAllPlans(getAllMealPlans());
  };

  const handleSelectPlan = (planId: string) => {
    const selected = getMealPlan(planId);
    if (selected) {
      setActiveMealPlan(planId);
      setPlan(selected);
    }
    setShowPlanSelector(false);
  };

  const handleAddMeal = (date: string, mealType: MealType) => {
    setShowRecipePicker({ date, mealType });
    if (cookbooks.length > 0 && !selectedCookbook) {
      setSelectedCookbook(cookbooks[0].id);
    }
  };

  const handleSelectRecipe = (recipe: Recipe) => {
    if (!plan || !showRecipePicker) return;

    addMealToPlan(
      plan.id,
      showRecipePicker.date,
      recipe,
      showRecipePicker.mealType,
      1
    );

    // Refresh plan
    const updated = getMealPlan(plan.id);
    if (updated) setPlan(updated);
    setShowRecipePicker(null);
  };

  const handleRemoveMeal = (date: string, mealId: string) => {
    if (!plan) return;
    removeMealFromPlan(plan.id, date, mealId);
    const updated = getMealPlan(plan.id);
    if (updated) setPlan(updated);
  };

  const getMealsForDay = (date: string): PlannedMeal[] => {
    if (!plan) return [];
    const day = plan.days.find(d => d.date === date);
    return day?.meals || [];
  };

  if (!plan) {
    return (
      <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        <header style={{ marginBottom: '2rem' }}>
          <Button variant="ghost" onClick={onBack} style={{ marginBottom: '1rem' }}>
            ← Back
          </Button>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#111827', margin: '0 0 0.5rem' }}>
            Meal Planning
          </h1>
          <p style={{ color: '#6b7280', margin: 0 }}>Plan your weekly meals</p>
        </header>

        <Card style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📅</div>
          <h2 style={{ fontSize: '1.5rem', color: '#111827', margin: '0 0 0.5rem' }}>
            No Active Meal Plan
          </h2>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
            Create a weekly plan to organize your cooking
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button onClick={handleCreatePlan}>Create This Week's Plan</Button>
            {allPlans.length > 0 && (
              <Button variant="secondary" onClick={() => setShowPlanSelector(true)}>
                Load Previous Plan
              </Button>
            )}
          </div>
        </Card>

        {/* Plan Selector Modal */}
        {showPlanSelector && (
          <PlanSelectorModal
            plans={allPlans}
            onSelect={handleSelectPlan}
            onClose={() => setShowPlanSelector(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem' }}>
        <Button variant="ghost" onClick={onBack} style={{ marginBottom: '1rem' }}>
          ← Back
        </Button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#111827', margin: '0 0 0.25rem' }}>
              {plan.name}
            </h1>
            <p style={{ color: '#6b7280', margin: 0 }}>
              {formatDateDisplay(new Date(plan.startDate + 'T00:00:00'))} -{' '}
              {formatDateDisplay(new Date(plan.endDate + 'T00:00:00'))}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button variant="secondary" size="sm" onClick={() => setShowPlanSelector(true)}>
              Switch Plan
            </Button>
            <Button size="sm" onClick={() => onViewGroceryList(plan.id)}>
              🛒 Grocery List
            </Button>
          </div>
        </div>
      </header>

      {/* Stats */}
      {stats && stats.totalMeals > 0 && (
        <Card style={{ marginBottom: '1.5rem', padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>{stats.totalMeals}</div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Meals Planned</div>
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>{stats.uniqueRecipes}</div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Unique Recipes</div>
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>{stats.daysPlanned}/7</div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Days Planned</div>
            </div>
          </div>
        </Card>
      )}

      {/* Week Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '0.5rem',
          overflowX: 'auto',
        }}
      >
        {weekDates.map((date) => {
          const dateKey = formatDateKey(date);
          const meals = getMealsForDay(dateKey);
          const isToday = formatDateKey(new Date()) === dateKey;

          return (
            <Card
              key={dateKey}
              style={{
                minWidth: '140px',
                padding: '0.75rem',
                border: isToday ? '2px solid #2563eb' : undefined,
              }}
            >
              <div
                style={{
                  textAlign: 'center',
                  marginBottom: '0.75rem',
                  paddingBottom: '0.5rem',
                  borderBottom: '1px solid #e5e7eb',
                }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: isToday ? '#2563eb' : '#6b7280' }}>
                  {formatDayName(date)}
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827' }}>
                  {date.getDate()}
                </div>
              </div>

              {/* Meals by type */}
              {MEAL_TYPES.map(({ type, label, icon }) => {
                const mealOfType = meals.filter(m => m.mealType === type);
                return (
                  <div key={type} style={{ marginBottom: '0.5rem' }}>
                    <div
                      style={{
                        fontSize: '0.625rem',
                        color: '#9ca3af',
                        marginBottom: '0.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                      }}
                    >
                      <span>{icon}</span> {label}
                    </div>
                    {mealOfType.length > 0 ? (
                      mealOfType.map((meal) => (
                        <div
                          key={meal.id}
                          style={{
                            fontSize: '0.75rem',
                            padding: '0.25rem 0.5rem',
                            background: '#f3f4f6',
                            borderRadius: '0.25rem',
                            marginBottom: '0.25rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <span style={{ color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {meal.recipeName}
                          </span>
                          <button
                            onClick={() => handleRemoveMeal(dateKey, meal.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#9ca3af',
                              cursor: 'pointer',
                              padding: '0 0.25rem',
                              fontSize: '0.875rem',
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))
                    ) : (
                      <button
                        onClick={() => handleAddMeal(dateKey, type)}
                        style={{
                          width: '100%',
                          padding: '0.25rem',
                          background: 'none',
                          border: '1px dashed #d1d5db',
                          borderRadius: '0.25rem',
                          color: '#9ca3af',
                          fontSize: '0.625rem',
                          cursor: 'pointer',
                        }}
                      >
                        + Add
                      </button>
                    )}
                  </div>
                );
              })}
            </Card>
          );
        })}
      </div>

      {/* Recipe Picker Modal */}
      {showRecipePicker && (
        <RecipePickerModal
          cookbooks={cookbooks}
          selectedCookbook={selectedCookbook}
          onSelectCookbook={setSelectedCookbook}
          recipes={recipes}
          onSelectRecipe={handleSelectRecipe}
          onClose={() => setShowRecipePicker(null)}
          mealType={showRecipePicker.mealType}
        />
      )}

      {/* Plan Selector Modal */}
      {showPlanSelector && (
        <PlanSelectorModal
          plans={allPlans}
          onSelect={handleSelectPlan}
          onClose={() => setShowPlanSelector(false)}
          onCreate={handleCreatePlan}
        />
      )}
    </div>
  );
}

// ============================================
// Recipe Picker Modal
// ============================================

interface RecipePickerModalProps {
  cookbooks: Cookbook[];
  selectedCookbook: string | null;
  onSelectCookbook: (id: string) => void;
  recipes: Recipe[];
  onSelectRecipe: (recipe: Recipe) => void;
  onClose: () => void;
  mealType: MealType;
}

function RecipePickerModal({
  cookbooks,
  selectedCookbook,
  onSelectCookbook,
  recipes,
  onSelectRecipe,
  onClose,
  mealType,
}: RecipePickerModalProps) {
  const mealLabel = MEAL_TYPES.find(m => m.type === mealType)?.label || mealType;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
    >
      <Card style={{ maxWidth: '500px', width: '100%', maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: '#111827' }}>
              Add {mealLabel}
            </h3>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: '#6b7280', cursor: 'pointer' }}
            >
              ×
            </button>
          </div>

          {/* Cookbook selector */}
          <div style={{ marginTop: '0.75rem' }}>
            <select
              value={selectedCookbook || ''}
              onChange={(e) => onSelectCookbook(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
              }}
            >
              <option value="">Select a cookbook...</option>
              {cookbooks.map((cb) => (
                <option key={cb.id} value={cb.id}>{cb.title}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '0.5rem' }}>
          {recipes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
              {selectedCookbook ? 'No recipes in this cookbook' : 'Select a cookbook'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {recipes.map((recipe) => (
                <button
                  key={recipe.id}
                  onClick={() => onSelectRecipe(recipe)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem',
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, color: '#111827' }}>{recipe.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      {recipe.total_time} • {recipe.yield}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

// ============================================
// Plan Selector Modal
// ============================================

interface PlanSelectorModalProps {
  plans: MealPlan[];
  onSelect: (planId: string) => void;
  onClose: () => void;
  onCreate?: () => void;
}

function PlanSelectorModal({ plans, onSelect, onClose, onCreate }: PlanSelectorModalProps) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
    >
      <Card style={{ maxWidth: '400px', width: '100%', maxHeight: '70vh', overflow: 'hidden' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: '#111827' }}>
              Meal Plans
            </h3>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: '#6b7280', cursor: 'pointer' }}
            >
              ×
            </button>
          </div>
        </div>

        <div style={{ overflow: 'auto', padding: '0.5rem', maxHeight: '50vh' }}>
          {onCreate && (
            <button
              onClick={() => { onCreate(); onClose(); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                width: '100%',
                padding: '0.75rem',
                background: '#eff6ff',
                border: '1px dashed #2563eb',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                marginBottom: '0.5rem',
                color: '#2563eb',
                fontWeight: 500,
              }}
            >
              + Create New Plan
            </button>
          )}

          {plans.map((p) => {
            const stats = getPlanStats(p);
            return (
              <button
                key={p.id}
                onClick={() => onSelect(p.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '0.75rem',
                  background: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  marginBottom: '0.5rem',
                  textAlign: 'left',
                }}
              >
                <div>
                  <div style={{ fontWeight: 500, color: '#111827' }}>{p.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    {stats.totalMeals} meals planned
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
