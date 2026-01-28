// Dietary Adaptation Service
// Modifies recipes based on dietary restrictions, health conditions, and goals

import type {
  Recipe,
  Ingredient,
  DietaryPreferences,
  DietaryRestriction,
  HealthCondition,
  RecipeAdaptation,
  AdaptedRecipe,
} from '../types';
import { getPreferences } from '../db';
import { sanitizeAiResponse } from './utils';

// ============================================
// Dietary Preferences Storage
// ============================================

const DIETARY_PREFS_KEY = 'recipe_runner_dietary_preferences';

const defaultDietaryPreferences: DietaryPreferences = {
  enabled: false,
  restrictions: [],
  healthConditions: [],
  allergies: [],
  weightGoal: null,
  calorieTarget: null,
  proteinTarget: null,
  customNotes: '',
};

export function getDietaryPreferences(): DietaryPreferences {
  try {
    const stored = localStorage.getItem(DIETARY_PREFS_KEY);
    if (stored) {
      return { ...defaultDietaryPreferences, ...JSON.parse(stored) };
    }
  } catch {
    // Ignore parse errors
  }
  return defaultDietaryPreferences;
}

export function saveDietaryPreferences(prefs: Partial<DietaryPreferences>): DietaryPreferences {
  const current = getDietaryPreferences();
  const updated = { ...current, ...prefs };
  localStorage.setItem(DIETARY_PREFS_KEY, JSON.stringify(updated));
  return updated;
}

// ============================================
// Dietary Labels & Descriptions
// ============================================

export const DIETARY_RESTRICTION_INFO: Record<DietaryRestriction, { label: string; description: string; avoids: string[] }> = {
  'vegetarian': { label: 'Vegetarian', description: 'No meat or fish', avoids: ['meat', 'poultry', 'fish', 'seafood', 'gelatin'] },
  'vegan': { label: 'Vegan', description: 'No animal products', avoids: ['meat', 'poultry', 'fish', 'seafood', 'dairy', 'eggs', 'honey', 'gelatin'] },
  'pescatarian': { label: 'Pescatarian', description: 'Fish but no meat', avoids: ['meat', 'poultry'] },
  'kosher': { label: 'Kosher', description: 'Jewish dietary laws', avoids: ['pork', 'shellfish', 'mixing meat and dairy'] },
  'halal': { label: 'Halal', description: 'Islamic dietary laws', avoids: ['pork', 'alcohol', 'non-halal meat'] },
  'gluten-free': { label: 'Gluten-Free', description: 'No gluten-containing grains', avoids: ['wheat', 'barley', 'rye', 'flour', 'bread', 'pasta'] },
  'dairy-free': { label: 'Dairy-Free', description: 'No milk products', avoids: ['milk', 'cheese', 'butter', 'cream', 'yogurt'] },
  'nut-free': { label: 'Nut-Free', description: 'No tree nuts or peanuts', avoids: ['peanuts', 'almonds', 'walnuts', 'cashews', 'pecans', 'hazelnuts'] },
  'egg-free': { label: 'Egg-Free', description: 'No eggs', avoids: ['eggs', 'mayonnaise'] },
  'soy-free': { label: 'Soy-Free', description: 'No soy products', avoids: ['soy', 'tofu', 'tempeh', 'soy sauce', 'edamame'] },
  'shellfish-free': { label: 'Shellfish-Free', description: 'No shellfish', avoids: ['shrimp', 'crab', 'lobster', 'clams', 'mussels', 'oysters'] },
  'low-sodium': { label: 'Low Sodium', description: 'Reduced salt intake', avoids: ['high-sodium foods', 'excessive salt'] },
  'low-sugar': { label: 'Low Sugar', description: 'Reduced sugar intake', avoids: ['added sugars', 'high-sugar foods'] },
  'low-carb': { label: 'Low Carb', description: 'Reduced carbohydrates', avoids: ['bread', 'pasta', 'rice', 'potatoes', 'sugar'] },
  'keto': { label: 'Keto', description: 'Very low carb, high fat', avoids: ['grains', 'sugar', 'high-carb vegetables', 'most fruits'] },
  'paleo': { label: 'Paleo', description: 'No processed foods or grains', avoids: ['grains', 'legumes', 'dairy', 'processed foods', 'refined sugar'] },
  'whole30': { label: 'Whole30', description: '30-day clean eating', avoids: ['sugar', 'alcohol', 'grains', 'legumes', 'soy', 'dairy'] },
  'fodmap': { label: 'Low FODMAP', description: 'For digestive issues', avoids: ['garlic', 'onion', 'wheat', 'certain fruits', 'lactose'] },
  'diabetic-friendly': { label: 'Diabetic Friendly', description: 'Blood sugar conscious', avoids: ['high glycemic foods', 'added sugars'] },
};

export const HEALTH_CONDITION_INFO: Record<HealthCondition, { label: string; description: string; considerations: string[] }> = {
  'celiac': { label: 'Celiac Disease', description: 'Autoimmune gluten intolerance', considerations: ['Strict gluten-free', 'Check cross-contamination', 'Read all labels'] },
  'crohns': { label: "Crohn's Disease", description: 'Inflammatory bowel disease', considerations: ['Low fiber during flares', 'Avoid trigger foods', 'Small frequent meals'] },
  'ibs': { label: 'IBS', description: 'Irritable bowel syndrome', considerations: ['Low FODMAP helpful', 'Identify triggers', 'Limit fatty foods'] },
  'gerd': { label: 'GERD/Acid Reflux', description: 'Gastroesophageal reflux', considerations: ['Avoid acidic foods', 'No spicy foods', 'Smaller portions'] },
  'lactose-intolerant': { label: 'Lactose Intolerant', description: 'Cannot digest lactose', considerations: ['Dairy-free alternatives', 'Lactase supplements', 'Hard cheeses may be OK'] },
  'diabetes-type1': { label: 'Type 1 Diabetes', description: 'Insulin-dependent diabetes', considerations: ['Count carbs carefully', 'Balance meals', 'Avoid sugar spikes'] },
  'diabetes-type2': { label: 'Type 2 Diabetes', description: 'Insulin-resistant diabetes', considerations: ['Low glycemic foods', 'Portion control', 'Limit refined carbs'] },
  'heart-disease': { label: 'Heart Disease', description: 'Cardiovascular condition', considerations: ['Low sodium', 'Limit saturated fat', 'High fiber'] },
  'high-cholesterol': { label: 'High Cholesterol', description: 'Elevated blood cholesterol', considerations: ['Limit saturated fat', 'No trans fats', 'Increase fiber'] },
  'high-blood-pressure': { label: 'High Blood Pressure', description: 'Hypertension', considerations: ['Very low sodium', 'DASH diet friendly', 'Potassium-rich foods'] },
  'kidney-disease': { label: 'Kidney Disease', description: 'Renal condition', considerations: ['Limit protein', 'Low sodium', 'Monitor potassium/phosphorus'] },
};

// ============================================
// Adaptation Prompt Building
// ============================================

function buildAdaptationPrompt(recipe: Recipe, prefs: DietaryPreferences): string {
  const restrictions = prefs.restrictions.map(r => DIETARY_RESTRICTION_INFO[r].label).join(', ');
  const conditions = prefs.healthConditions.map(c => HEALTH_CONDITION_INFO[c].label).join(', ');
  const allergies = prefs.allergies.join(', ');

  let prompt = `You are a professional nutritionist and chef. Adapt the following recipe for someone with these dietary needs:

`;

  if (prefs.restrictions.length > 0) {
    prompt += `DIETARY RESTRICTIONS: ${restrictions}\n`;
    prefs.restrictions.forEach(r => {
      prompt += `  - ${DIETARY_RESTRICTION_INFO[r].label}: Avoid ${DIETARY_RESTRICTION_INFO[r].avoids.join(', ')}\n`;
    });
  }

  if (prefs.healthConditions.length > 0) {
    prompt += `\nHEALTH CONDITIONS: ${conditions}\n`;
    prefs.healthConditions.forEach(c => {
      prompt += `  - ${HEALTH_CONDITION_INFO[c].label}: ${HEALTH_CONDITION_INFO[c].considerations.join('; ')}\n`;
    });
  }

  if (prefs.allergies.length > 0) {
    prompt += `\nALLERGIES (CRITICAL - must completely avoid): ${allergies}\n`;
  }

  if (prefs.weightGoal) {
    const goalText = prefs.weightGoal === 'lose' ? 'Weight Loss (reduce calories, increase protein)' :
                     prefs.weightGoal === 'gain' ? 'Weight Gain (increase calories and protein)' :
                     'Weight Maintenance';
    prompt += `\nWEIGHT GOAL: ${goalText}\n`;
    if (prefs.calorieTarget) prompt += `  Target calories per serving: ~${Math.round(prefs.calorieTarget / 3)} cal\n`;
    if (prefs.proteinTarget) prompt += `  Protein goal: High protein preferred\n`;
  }

  if (prefs.customNotes) {
    prompt += `\nADDITIONAL NOTES: ${prefs.customNotes}\n`;
  }

  prompt += `
RECIPE TO ADAPT:
Name: ${recipe.name}
Yield: ${recipe.yield}

INGREDIENTS:
${recipe.ingredients.map(i => `- ${i.amount} ${i.unit} ${i.item}${i.prep ? ` (${i.prep})` : ''}`).join('\n')}

INSTRUCTIONS:
${recipe.steps.map((s, i) => `${i + 1}. ${s.instruction}`).join('\n')}

Please provide your response in this EXACT JSON format:
{
  "canAdapt": true/false,
  "warning": "Any important warnings for this person (or null if none)",
  "adaptedIngredients": [
    {"original": "original ingredient line", "adapted": "new ingredient line or REMOVE", "reason": "why this change"}
  ],
  "instructionChanges": [
    {"stepNumber": 1, "change": "description of any instruction modifications"}
  ],
  "portionNote": "any notes about serving size adjustments (or null)",
  "nutritionNotes": "brief notes about the nutritional impact of changes"
}

Only include ingredients that need changes. If an ingredient is fine as-is, don't include it.
If the recipe CANNOT be safely adapted (e.g., main ingredient is an allergen), set canAdapt to false and explain in warning.
Be specific with substitutions - give exact amounts and brands if helpful.`;

  return prompt;
}

// ============================================
// Ollama Communication
// ============================================

async function sendToOllama(prompt: string): Promise<string> {
  const preferences = getPreferences();
  const config = preferences.ollama_config;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeout_ms * 2); // Double timeout for complex task

  try {
    const response = await fetch(`${config.endpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.3, // Lower temperature for more consistent JSON
          num_predict: 2000,
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Ollama request failed: ${response.status}`);
    }

    const data = await response.json();
    return data.response || '';
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Recipe adaptation timed out. Make sure Ollama is running.');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

// ============================================
// Response Parsing
// ============================================

interface AdaptationResponse {
  canAdapt: boolean;
  warning: string | null;
  adaptedIngredients: Array<{ original: string; adapted: string; reason: string }>;
  instructionChanges: Array<{ stepNumber: number; change: string }>;
  portionNote: string | null;
  nutritionNotes: string | null;
}

function parseAdaptationResponse(responseText: string): AdaptationResponse {
  // Try to extract JSON from the response
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Could not parse adaptation response');
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      canAdapt: parsed.canAdapt ?? true,
      warning: parsed.warning || null,
      adaptedIngredients: parsed.adaptedIngredients || [],
      instructionChanges: parsed.instructionChanges || [],
      portionNote: parsed.portionNote || null,
      nutritionNotes: parsed.nutritionNotes || null,
    };
  } catch {
    throw new Error('Invalid JSON in adaptation response');
  }
}

// ============================================
// Recipe Adaptation
// ============================================

/**
 * Adapt a recipe based on the user's dietary preferences
 */
export async function adaptRecipe(recipe: Recipe): Promise<AdaptedRecipe> {
  const prefs = getDietaryPreferences();

  if (!prefs.enabled || (prefs.restrictions.length === 0 && prefs.healthConditions.length === 0 && prefs.allergies.length === 0 && !prefs.weightGoal)) {
    // No adaptations needed - return original
    return {
      ...recipe,
      originalRecipe: recipe,
      adaptations: [],
      adaptedFor: prefs,
    };
  }

  const prompt = buildAdaptationPrompt(recipe, prefs);
  const rawResponseText = await sendToOllama(prompt);
  // Sanitize AI response to prevent XSS
  const responseText = sanitizeAiResponse(rawResponseText);
  const response = parseAdaptationResponse(responseText);

  if (!response.canAdapt) {
    throw new Error(response.warning || 'This recipe cannot be safely adapted for your dietary needs.');
  }

  // Build adaptations list
  const adaptations: RecipeAdaptation[] = [];

  if (response.warning) {
    adaptations.push({
      type: 'warning',
      original: '',
      adapted: response.warning,
      reason: 'Important dietary consideration',
    });
  }

  // Apply ingredient adaptations
  const adaptedIngredients = recipe.ingredients.map(ing => {
    const adaptation = response.adaptedIngredients.find(a =>
      a.original.toLowerCase().includes(ing.item.toLowerCase()) ||
      ing.item.toLowerCase().includes(a.original.toLowerCase().split(' ').pop() || '')
    );

    if (adaptation) {
      if (adaptation.adapted.toUpperCase() === 'REMOVE') {
        adaptations.push({
          type: 'ingredient_remove',
          original: `${ing.amount} ${ing.unit} ${ing.item}`,
          adapted: 'Removed',
          reason: adaptation.reason,
        });
        return null; // Will be filtered out
      } else {
        adaptations.push({
          type: 'ingredient_swap',
          original: `${ing.amount} ${ing.unit} ${ing.item}`,
          adapted: adaptation.adapted,
          reason: adaptation.reason,
        });

        // Parse the adapted ingredient
        const parts = adaptation.adapted.match(/^([\d./]+)\s*(\w+)?\s+(.+)$/);
        if (parts) {
          return {
            ...ing,
            amount: parts[1],
            unit: parts[2] || ing.unit,
            item: parts[3],
          };
        }
        return { ...ing, item: adaptation.adapted };
      }
    }
    return ing;
  }).filter((ing): ing is Ingredient => ing !== null);

  // Apply instruction changes
  const adaptedSteps = recipe.steps.map((step, idx) => {
    const change = response.instructionChanges.find(c => c.stepNumber === idx + 1);
    if (change) {
      adaptations.push({
        type: 'instruction_change',
        original: step.instruction,
        adapted: change.change,
        reason: 'Dietary adaptation',
      });
      return {
        ...step,
        instruction: `${step.instruction}\n\n⚠️ ADAPTATION: ${change.change}`,
      };
    }
    return step;
  });

  if (response.portionNote) {
    adaptations.push({
      type: 'portion_adjust',
      original: recipe.yield,
      adapted: response.portionNote,
      reason: 'Dietary goals',
    });
  }

  return {
    ...recipe,
    ingredients: adaptedIngredients,
    steps: adaptedSteps,
    originalRecipe: recipe,
    adaptations,
    adaptedFor: prefs,
  };
}

/**
 * Check if a recipe needs adaptation warnings (quick check without AI)
 */
export function getRecipeWarnings(recipe: Recipe): string[] {
  const prefs = getDietaryPreferences();
  const warnings: string[] = [];

  if (!prefs.enabled) return warnings;

  const ingredientText = recipe.ingredients.map(i => i.item.toLowerCase()).join(' ');

  // Check allergies (critical)
  prefs.allergies.forEach(allergy => {
    if (ingredientText.includes(allergy.toLowerCase())) {
      warnings.push(`⚠️ ALLERGY ALERT: Contains ${allergy}`);
    }
  });

  // Check restrictions
  prefs.restrictions.forEach(restriction => {
    const avoids = DIETARY_RESTRICTION_INFO[restriction].avoids;
    avoids.forEach(avoid => {
      if (ingredientText.includes(avoid.toLowerCase())) {
        warnings.push(`Contains ${avoid} (not ${DIETARY_RESTRICTION_INFO[restriction].label})`);
      }
    });
  });

  return [...new Set(warnings)]; // Remove duplicates
}

/**
 * Check if adaptation is available (Ollama running)
 */
export async function isAdaptationAvailable(): Promise<boolean> {
  const preferences = getPreferences();
  const config = preferences.ollama_config;

  try {
    const response = await fetch(`${config.endpoint}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
