// Meal Planning Service
// Phase 6 Feature - Weekly cookbook scheduling

import { v4 as uuid } from 'uuid';
import { getRecipe } from '../db';
import type { Recipe } from '../types';

// ============================================
// Types
// ============================================

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface PlannedMeal {
  id: string;
  recipeId: string;
  recipeName: string;
  mealType: MealType;
  servings: number;  // How many servings to make
  notes?: string;
}

export interface MealPlanDay {
  date: string;  // ISO date string (YYYY-MM-DD)
  meals: PlannedMeal[];
}

export interface MealPlan {
  id: string;
  name: string;
  startDate: string;  // ISO date string
  endDate: string;    // ISO date string
  days: MealPlanDay[];
  createdAt: string;
  modifiedAt: string;
}

export interface AggregatedIngredient {
  item: string;
  totalAmount: number;
  unit: string;
  recipes: string[];  // Recipe names that use this ingredient
}

// ============================================
// Storage
// ============================================

const MEAL_PLANS_KEY = 'recipe_runner_meal_plans';
const ACTIVE_PLAN_KEY = 'recipe_runner_active_meal_plan';

function loadMealPlans(): MealPlan[] {
  try {
    const stored = localStorage.getItem(MEAL_PLANS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return [];
}

function saveMealPlans(plans: MealPlan[]): void {
  localStorage.setItem(MEAL_PLANS_KEY, JSON.stringify(plans));
}

// ============================================
// Date Utilities
// ============================================

export function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function parseDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00');
}

export function getWeekDates(startDate: Date): Date[] {
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    dates.push(date);
  }
  return dates;
}

export function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function formatDayName(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

export function formatDateDisplay(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ============================================
// Meal Plan CRUD
// ============================================

export function createMealPlan(name: string, startDate: Date, days: number = 7): MealPlan {
  const now = new Date().toISOString();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + days - 1);

  const planDays: MealPlanDay[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    planDays.push({
      date: formatDateKey(date),
      meals: [],
    });
  }

  const plan: MealPlan = {
    id: uuid(),
    name,
    startDate: formatDateKey(startDate),
    endDate: formatDateKey(endDate),
    days: planDays,
    createdAt: now,
    modifiedAt: now,
  };

  const plans = loadMealPlans();
  plans.push(plan);
  saveMealPlans(plans);

  return plan;
}

export function getMealPlan(id: string): MealPlan | undefined {
  const plans = loadMealPlans();
  return plans.find(p => p.id === id);
}

export function getAllMealPlans(): MealPlan[] {
  return loadMealPlans().sort((a, b) =>
    new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  );
}

export function updateMealPlan(id: string, updates: Partial<MealPlan>): MealPlan | undefined {
  const plans = loadMealPlans();
  const index = plans.findIndex(p => p.id === id);

  if (index === -1) return undefined;

  plans[index] = {
    ...plans[index],
    ...updates,
    modifiedAt: new Date().toISOString(),
  };

  saveMealPlans(plans);
  return plans[index];
}

export function deleteMealPlan(id: string): boolean {
  const plans = loadMealPlans();
  const filtered = plans.filter(p => p.id !== id);

  if (filtered.length === plans.length) return false;

  saveMealPlans(filtered);

  // Clear active plan if it was deleted
  if (getActiveMealPlanId() === id) {
    clearActiveMealPlan();
  }

  return true;
}

// ============================================
// Active Plan Management
// ============================================

export function setActiveMealPlan(planId: string): void {
  localStorage.setItem(ACTIVE_PLAN_KEY, planId);
}

export function getActiveMealPlanId(): string | null {
  return localStorage.getItem(ACTIVE_PLAN_KEY);
}

export function getActiveMealPlan(): MealPlan | undefined {
  const id = getActiveMealPlanId();
  if (!id) return undefined;
  return getMealPlan(id);
}

export function clearActiveMealPlan(): void {
  localStorage.removeItem(ACTIVE_PLAN_KEY);
}

// ============================================
// Meal Management
// ============================================

export function addMealToPlan(
  planId: string,
  date: string,
  recipe: Recipe,
  mealType: MealType,
  servings: number = 1,
  notes?: string
): PlannedMeal | undefined {
  const plan = getMealPlan(planId);
  if (!plan) return undefined;

  const dayIndex = plan.days.findIndex(d => d.date === date);
  if (dayIndex === -1) return undefined;

  const meal: PlannedMeal = {
    id: uuid(),
    recipeId: recipe.id,
    recipeName: recipe.name,
    mealType,
    servings,
    notes,
  };

  plan.days[dayIndex].meals.push(meal);
  updateMealPlan(planId, { days: plan.days });

  return meal;
}

export function removeMealFromPlan(planId: string, date: string, mealId: string): boolean {
  const plan = getMealPlan(planId);
  if (!plan) return false;

  const dayIndex = plan.days.findIndex(d => d.date === date);
  if (dayIndex === -1) return false;

  const mealIndex = plan.days[dayIndex].meals.findIndex(m => m.id === mealId);
  if (mealIndex === -1) return false;

  plan.days[dayIndex].meals.splice(mealIndex, 1);
  updateMealPlan(planId, { days: plan.days });

  return true;
}

export function updateMealInPlan(
  planId: string,
  date: string,
  mealId: string,
  updates: Partial<PlannedMeal>
): boolean {
  const plan = getMealPlan(planId);
  if (!plan) return false;

  const dayIndex = plan.days.findIndex(d => d.date === date);
  if (dayIndex === -1) return false;

  const mealIndex = plan.days[dayIndex].meals.findIndex(m => m.id === mealId);
  if (mealIndex === -1) return false;

  plan.days[dayIndex].meals[mealIndex] = {
    ...plan.days[dayIndex].meals[mealIndex],
    ...updates,
  };

  updateMealPlan(planId, { days: plan.days });
  return true;
}

// ============================================
// Grocery List Generation
// ============================================

function normalizeUnit(unit: string): string {
  const unitMap: Record<string, string> = {
    'tbsp': 'tablespoon',
    'tablespoons': 'tablespoon',
    'tsp': 'teaspoon',
    'teaspoons': 'teaspoon',
    'cups': 'cup',
    'oz': 'ounce',
    'ounces': 'ounce',
    'lbs': 'pound',
    'lb': 'pound',
    'pounds': 'pound',
    'g': 'gram',
    'grams': 'gram',
    'kg': 'kilogram',
    'ml': 'milliliter',
    'l': 'liter',
  };

  const lower = unit.toLowerCase().trim();
  return unitMap[lower] || lower;
}

function parseAmount(amount: string): number {
  let value = 0;
  const parts = amount.trim().split(/\s+/);

  for (const part of parts) {
    if (part.includes('/')) {
      const [num, denom] = part.split('/').map(Number);
      if (denom) value += num / denom;
    } else {
      const num = parseFloat(part);
      if (!isNaN(num)) value += num;
    }
  }

  return value || 1;
}

export async function generateGroceryListFromPlan(planId: string): Promise<AggregatedIngredient[]> {
  const plan = getMealPlan(planId);
  if (!plan) return [];

  const ingredientMap = new Map<string, AggregatedIngredient>();

  for (const day of plan.days) {
    for (const meal of day.meals) {
      const recipe = await getRecipe(meal.recipeId);
      if (!recipe) continue;

      const scaleFactor = meal.servings;

      for (const ing of recipe.ingredients) {
        const key = `${ing.item.toLowerCase()}_${normalizeUnit(ing.unit)}`;
        const amount = parseAmount(ing.amount) * scaleFactor;

        if (ingredientMap.has(key)) {
          const existing = ingredientMap.get(key)!;
          existing.totalAmount += amount;
          if (!existing.recipes.includes(recipe.name)) {
            existing.recipes.push(recipe.name);
          }
        } else {
          ingredientMap.set(key, {
            item: ing.item,
            totalAmount: amount,
            unit: normalizeUnit(ing.unit),
            recipes: [recipe.name],
          });
        }
      }
    }
  }

  return Array.from(ingredientMap.values()).sort((a, b) =>
    a.item.localeCompare(b.item)
  );
}

// ============================================
// Plan Statistics
// ============================================

export function getPlanStats(plan: MealPlan): {
  totalMeals: number;
  mealsByType: Record<MealType, number>;
  uniqueRecipes: number;
  daysPlanned: number;
} {
  const mealsByType: Record<MealType, number> = {
    breakfast: 0,
    lunch: 0,
    dinner: 0,
    snack: 0,
  };

  const recipeIds = new Set<string>();
  let totalMeals = 0;
  let daysPlanned = 0;

  for (const day of plan.days) {
    if (day.meals.length > 0) {
      daysPlanned++;
    }
    for (const meal of day.meals) {
      totalMeals++;
      mealsByType[meal.mealType]++;
      recipeIds.add(meal.recipeId);
    }
  }

  return {
    totalMeals,
    mealsByType,
    uniqueRecipes: recipeIds.size,
    daysPlanned,
  };
}

// ============================================
// Quick Actions
// ============================================

export function createWeeklyPlan(name?: string): MealPlan {
  const startDate = getWeekStart();
  const planName = name || `Week of ${formatDateDisplay(startDate)}`;
  return createMealPlan(planName, startDate, 7);
}

export function duplicatePlan(planId: string, newStartDate?: Date): MealPlan | undefined {
  const source = getMealPlan(planId);
  if (!source) return undefined;

  const startDate = newStartDate || getWeekStart();
  const newPlan = createMealPlan(
    `${source.name} (Copy)`,
    startDate,
    source.days.length
  );

  // Copy meals with new IDs
  const updatedDays = newPlan.days.map((day, index) => ({
    ...day,
    meals: source.days[index]?.meals.map(meal => ({
      ...meal,
      id: uuid(),
    })) || [],
  }));

  updateMealPlan(newPlan.id, { days: updatedDays });
  return getMealPlan(newPlan.id);
}
