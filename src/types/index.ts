// Recipe Runner Data Models
// Based on Spec.md v1.0

// ============================================
// Core Types
// ============================================

export type RecipeCategory =
  | 'cooking'
  | 'baking'
  | 'herbalism'
  | 'fermentation'
  | 'preservation'
  | 'craft';

export type StepType = 'active' | 'passive';

export type TimerState = 'idle' | 'running' | 'paused' | 'complete' | 'overtime';

export type SourceType = 'book' | 'url' | 'original';

// ============================================
// Difficulty Scoring
// ============================================

export interface DifficultyScore {
  overall: number;     // 1-5
  technique: number;   // 1-5
  timing: number;      // 1-5
  ingredients: number; // 1-5
  equipment: number;   // 1-5
}

export const DifficultyLabels: Record<number, { label: string; color: string; description: string }> = {
  1: { label: 'Beginner', color: '#4CAF50', description: 'Anyone can do this' },
  2: { label: 'Easy', color: '#8BC34A', description: 'Some cooking experience helpful' },
  3: { label: 'Intermediate', color: '#FFC107', description: 'Comfortable home cook' },
  4: { label: 'Advanced', color: '#FF9800', description: 'Experienced cook, focused attention' },
  5: { label: 'Expert', color: '#F44336', description: 'Significant skill required' },
};

// ============================================
// Temperature Types
// ============================================

export interface Temperature {
  value: number;
  unit: '°F' | '°C';
  target?: string;  // e.g., "oven", "oil", "internal"
}

export interface SafeTemp {
  value: number;
  unit: '°F' | '°C';
  location: string;  // e.g., "thickest part of thigh"
}

// ============================================
// Recipe Components
// ============================================

export interface Ingredient {
  item: string;
  amount: string;
  unit: string;
  prep?: string | null;
  optional: boolean;
  substitutes: string[];
}

export interface Step {
  index: number;
  title: string;
  instruction: string;
  time_minutes: number;
  time_display: string;
  type: StepType;
  tip?: string | null;
  visual_prompt: string;
  temperature?: Temperature | null;
  timer_default?: number | null;  // seconds
}

export interface Source {
  type: SourceType;
  title?: string;
  page?: number;
  url?: string;
}

export interface CookHistory {
  date: string;  // ISO timestamp
  completed: boolean;
  notes: string;
  adjustments: string[];
  rating: number;  // 1-5
}

// ============================================
// Main Data Models
// ============================================

export interface Recipe {
  id: string;
  cookbook_id: string;
  name: string;
  description: string;
  total_time: string;
  active_time: string;
  yield: string;
  difficulty: DifficultyScore;
  safe_temp?: SafeTemp | null;
  equipment: string[];
  tags: string[];
  source: Source;
  ingredients: Ingredient[];
  steps: Step[];
  notes: string;
  created_at: string;
  modified_at: string;
  cook_history: CookHistory[];
  favorite?: boolean;  // Phase 10 - Favorites/bookmarking
}

export interface Cookbook {
  id: string;
  title: string;
  description: string;
  author: string;
  category: RecipeCategory;
  cover_image?: string;  // URL or base64
  created_at: string;
  modified_at: string;
}

// ============================================
// App State Types
// ============================================

export interface TimerInstance {
  id: string;
  stepIndex: number;
  recipeId: string;
  totalSeconds: number;
  remainingSeconds: number;
  state: TimerState;
  alertType: 'sound' | 'vibrate' | 'both';
}

export interface CookingSession {
  recipeId: string;
  cookbookId: string;
  currentStepIndex: number;
  checkedIngredients: string[];  // ingredient item names
  activeTimers: TimerInstance[];
  startedAt: string;
  notes: string;
}

// ============================================
// Chef Ollama Types
// ============================================

export interface ChefOllamaConfig {
  endpoint: string;
  model: string;
  temperature: number;
  max_tokens: number;
  timeout_ms: number;
}

export interface ChefOllamaMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChefOllamaContext {
  system_context: {
    role: string;
    capabilities: string[];
  };
  recipe_context: {
    recipe_name: string;
    total_steps: number;
    current_step: number;
    current_step_title: string;
    current_step_instruction: string;
    ingredients: Ingredient[];
    checked_ingredients: string[];
    safe_temp?: SafeTemp | null;
  };
  user_context: {
    times_cooked: number;
    last_cooked?: string;
    previous_adjustments: string[];
    skill_level: string;
  };
}

export type QuickAction =
  | 'substitution'
  | 'i_messed_up'
  | 'what_should_this_look_like'
  | 'adjust_for_equipment'
  | 'scale_recipe';

// ============================================
// Visual Generation Types
// ============================================

export interface VisualGenerationRequest {
  recipe_id: string;
  step_index: number;
  visual_prompt: string;
  style?: 'realistic' | 'illustrated';
}

export interface VisualGenerationResult {
  recipe_id: string;
  step_index: number;
  image_url: string;
  cached: boolean;
  version: number;
}

// ============================================
// User Preferences
// ============================================

export interface UserPreferences {
  ollama_config: ChefOllamaConfig;
  timer_alert_type: 'sound' | 'vibrate' | 'both';
  skill_level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  dark_mode: boolean;
  auto_generate_visuals: boolean;
}

// ============================================
// Dietary Preferences & Restrictions
// ============================================

export type DietaryRestriction =
  | 'vegetarian'
  | 'vegan'
  | 'pescatarian'
  | 'kosher'
  | 'halal'
  | 'gluten-free'
  | 'dairy-free'
  | 'nut-free'
  | 'egg-free'
  | 'soy-free'
  | 'shellfish-free'
  | 'low-sodium'
  | 'low-sugar'
  | 'low-carb'
  | 'keto'
  | 'paleo'
  | 'whole30'
  | 'fodmap'
  | 'diabetic-friendly';

export type HealthCondition =
  | 'celiac'
  | 'crohns'
  | 'ibs'
  | 'gerd'
  | 'lactose-intolerant'
  | 'diabetes-type1'
  | 'diabetes-type2'
  | 'heart-disease'
  | 'high-cholesterol'
  | 'high-blood-pressure'
  | 'kidney-disease';

export type WeightGoal = 'lose' | 'maintain' | 'gain';

export interface DietaryPreferences {
  enabled: boolean;
  restrictions: DietaryRestriction[];
  healthConditions: HealthCondition[];
  allergies: string[];  // Custom allergies not in standard list
  weightGoal: WeightGoal | null;
  calorieTarget: number | null;  // Daily calorie target
  proteinTarget: number | null;  // Grams per day
  customNotes: string;  // Any other dietary notes
}

export interface AdaptedRecipe extends Recipe {
  originalRecipe: Recipe;
  adaptations: RecipeAdaptation[];
  adaptedFor: DietaryPreferences;
}

export interface RecipeAdaptation {
  type: 'ingredient_swap' | 'ingredient_remove' | 'instruction_change' | 'portion_adjust' | 'warning';
  original: string;
  adapted: string;
  reason: string;
}
