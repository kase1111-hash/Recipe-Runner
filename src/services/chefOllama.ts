// Chef Ollama - Context-Aware Cooking Assistant
// Error handling, substitutions, and recipe modifications

import type {
  ChefOllamaConfig,
  ChefOllamaContext,
  ChefOllamaMessage,
  QuickAction,
  Recipe,
  Ingredient,
} from '../types';
import { getPreferences } from '../db';

// ============================================
// System Prompts
// ============================================

const CHEF_OLLAMA_SYSTEM_PROMPT = `You are Chef Ollama, a friendly and knowledgeable cooking assistant for Recipe Runner.
You help users navigate cooking challenges in real-time.

Your capabilities:
- Ingredient substitutions with proper ratio adjustments
- Error recovery when things go wrong (burned, overcooked, wrong amounts)
- Technique explanations and visual descriptions
- Recipe modifications and scaling
- Timing adjustments based on equipment differences

Guidelines:
- Be concise and practical - users are actively cooking
- Provide specific measurements and times, not vague suggestions
- If recovery isn't possible, be honest but suggest alternatives
- Consider the user's current progress and available ingredients
- For substitutions, always provide the conversion ratio

Format responses clearly with:
- Direct answer first
- Brief explanation if needed
- Specific action steps when applicable`;

// ============================================
// Quick Action Prompts
// ============================================

const QUICK_ACTION_PROMPTS: Record<QuickAction, string> = {
  substitution: "I don't have an ingredient. Please suggest a substitute with the proper amount to use.",
  i_messed_up: "Something went wrong during cooking. Please help me assess if it's recoverable and what I should do.",
  what_should_this_look_like: "I'm not sure if my current result looks right. Please describe what I should be seeing at this step.",
  adjust_for_equipment: "I don't have the specified equipment. Please suggest how to modify the technique for what I have.",
  scale_recipe: "I need to adjust the serving size. Please recalculate the ingredients and note any steps that need modification.",
};

// ============================================
// Context Building
// ============================================

function buildContext(
  recipe: Recipe,
  currentStepIndex: number,
  checkedIngredients: string[]
): ChefOllamaContext {
  const currentStep = recipe.steps[currentStepIndex];
  const preferences = getPreferences();

  // Calculate times cooked from history
  const timesCoooked = recipe.cook_history.length;
  const lastCooked = recipe.cook_history.length > 0
    ? recipe.cook_history[recipe.cook_history.length - 1].date
    : undefined;

  // Get previous adjustments from cook history
  const previousAdjustments = recipe.cook_history
    .flatMap(h => h.adjustments)
    .slice(-5); // Last 5 adjustments

  return {
    system_context: {
      role: 'Chef Ollama - cooking assistant for Recipe Runner',
      capabilities: [
        'substitution suggestions',
        'error recovery',
        'technique explanation',
        'recipe modification',
        'timing adjustment',
      ],
    },
    recipe_context: {
      recipe_name: recipe.name,
      total_steps: recipe.steps.length,
      current_step: currentStepIndex + 1,
      current_step_title: currentStep?.title || '',
      current_step_instruction: currentStep?.instruction || '',
      ingredients: recipe.ingredients,
      checked_ingredients: checkedIngredients,
      safe_temp: recipe.safe_temp,
    },
    user_context: {
      times_cooked: timesCoooked,
      last_cooked: lastCooked,
      previous_adjustments: previousAdjustments,
      skill_level: preferences.skill_level,
    },
  };
}

function contextToSystemMessage(context: ChefOllamaContext): string {
  return `${CHEF_OLLAMA_SYSTEM_PROMPT}

Current Recipe Context:
- Recipe: ${context.recipe_context.recipe_name}
- Step ${context.recipe_context.current_step} of ${context.recipe_context.total_steps}: ${context.recipe_context.current_step_title}
- Current instruction: ${context.recipe_context.current_step_instruction}
- Ingredients: ${context.recipe_context.ingredients.map(i => `${i.amount} ${i.unit} ${i.item}`).join(', ')}
- User has: ${context.recipe_context.checked_ingredients.join(', ') || 'ingredients not yet checked'}
${context.recipe_context.safe_temp ? `- Safe temperature: ${context.recipe_context.safe_temp.value}${context.recipe_context.safe_temp.unit} at ${context.recipe_context.safe_temp.location}` : ''}

User Context:
- Skill level: ${context.user_context.skill_level}
- Times cooked this recipe: ${context.user_context.times_cooked}
${context.user_context.previous_adjustments.length > 0 ? `- Previous adjustments: ${context.user_context.previous_adjustments.join(', ')}` : ''}`;
}

// ============================================
// Ollama Communication
// ============================================

async function sendToOllama(
  messages: ChefOllamaMessage[],
  config: ChefOllamaConfig
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeout_ms);

  try {
    const response = await fetch(`${config.endpoint}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.model,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        stream: false,
        options: {
          temperature: config.temperature,
          num_predict: config.max_tokens,
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Ollama request failed: ${response.status}`);
    }

    const data = await response.json();
    return data.message?.content || data.response || '';
  } finally {
    clearTimeout(timeout);
  }
}

// ============================================
// Main Chat Interface
// ============================================

export interface ChatResult {
  response: string;
  suggestedActions?: Array<{
    type: 'update_recipe' | 'just_this_time' | 'save_as_variant';
    label: string;
    modification?: Partial<Recipe>;
  }>;
}

/**
 * Send a message to Chef Ollama with full recipe context
 */
export async function chatWithChef(
  message: string,
  recipe: Recipe,
  currentStepIndex: number,
  checkedIngredients: string[],
  conversationHistory: ChefOllamaMessage[] = []
): Promise<ChatResult> {
  const preferences = getPreferences();
  const config = preferences.ollama_config;
  const context = buildContext(recipe, currentStepIndex, checkedIngredients);

  const messages: ChefOllamaMessage[] = [
    { role: 'system', content: contextToSystemMessage(context) },
    ...conversationHistory,
    { role: 'user', content: message },
  ];

  try {
    const response = await sendToOllama(messages, config);

    // Parse response for suggested actions
    const suggestedActions = parseActionsFromResponse(response);

    return {
      response,
      suggestedActions,
    };
  } catch (error) {
    console.error('Chef Ollama error:', error);

    // Fallback to offline substitution database
    if (message.toLowerCase().includes("don't have") || message.toLowerCase().includes('substitute')) {
      const fallbackResponse = getOfflineSubstitution(message, recipe.ingredients);
      return { response: fallbackResponse };
    }

    return {
      response: "I'm having trouble connecting. Please check that Ollama is running locally, or try again in a moment.",
    };
  }
}

/**
 * Execute a quick action with predefined prompts
 */
export async function executeQuickAction(
  action: QuickAction,
  additionalContext: string,
  recipe: Recipe,
  currentStepIndex: number,
  checkedIngredients: string[]
): Promise<ChatResult> {
  const prompt = `${QUICK_ACTION_PROMPTS[action]}\n\nContext: ${additionalContext}`;
  return chatWithChef(prompt, recipe, currentStepIndex, checkedIngredients);
}

// ============================================
// Response Parsing
// ============================================

function parseActionsFromResponse(response: string): ChatResult['suggestedActions'] {
  const actions: ChatResult['suggestedActions'] = [];

  // Look for modification suggestions in the response
  if (
    response.toLowerCase().includes('substitute') ||
    response.toLowerCase().includes('instead of') ||
    response.toLowerCase().includes('use ')
  ) {
    actions.push(
      { type: 'just_this_time', label: 'Just This Time' },
      { type: 'update_recipe', label: 'Update Recipe' }
    );
  }

  if (
    response.toLowerCase().includes('variation') ||
    response.toLowerCase().includes('version')
  ) {
    actions.push({ type: 'save_as_variant', label: 'Save as Variant' });
  }

  return actions.length > 0 ? actions : undefined;
}

// ============================================
// Offline Fallbacks
// ============================================

const COMMON_SUBSTITUTIONS: Record<string, { substitute: string; ratio: string; notes: string }[]> = {
  'butter': [
    { substitute: 'coconut oil', ratio: '1:1', notes: 'Works well in baking' },
    { substitute: 'olive oil', ratio: '3/4 cup per 1 cup butter', notes: 'For savory dishes' },
    { substitute: 'applesauce', ratio: '1/2 cup per 1 cup butter', notes: 'For baking, reduces fat' },
  ],
  'eggs': [
    { substitute: 'flax egg', ratio: '1 tbsp ground flax + 3 tbsp water per egg', notes: 'Let sit 5 minutes' },
    { substitute: 'banana', ratio: '1/4 cup mashed per egg', notes: 'Adds sweetness' },
    { substitute: 'applesauce', ratio: '1/4 cup per egg', notes: 'For baking' },
  ],
  'milk': [
    { substitute: 'almond milk', ratio: '1:1', notes: 'May slightly alter taste' },
    { substitute: 'oat milk', ratio: '1:1', notes: 'Good for baking' },
    { substitute: 'water + butter', ratio: '1 cup water + 1 tbsp butter per cup milk', notes: 'In a pinch' },
  ],
  'fresh thyme': [
    { substitute: 'dried thyme', ratio: '1 tsp dried per 1 tbsp fresh', notes: 'Standard fresh to dried ratio' },
    { substitute: 'oregano', ratio: '1:1', notes: 'Similar flavor profile' },
  ],
  'fresh herbs': [
    { substitute: 'dried herbs', ratio: '1/3 the amount', notes: 'Dried are more concentrated' },
  ],
  'buttermilk': [
    { substitute: 'milk + lemon juice', ratio: '1 cup milk + 1 tbsp lemon juice', notes: 'Let sit 5 minutes' },
    { substitute: 'milk + vinegar', ratio: '1 cup milk + 1 tbsp white vinegar', notes: 'Let sit 5 minutes' },
  ],
  'heavy cream': [
    { substitute: 'coconut cream', ratio: '1:1', notes: 'For whipping' },
    { substitute: 'milk + butter', ratio: '3/4 cup milk + 1/4 cup melted butter', notes: 'Not for whipping' },
  ],
};

function getOfflineSubstitution(message: string, ingredients: Ingredient[]): string {
  const messageLower = message.toLowerCase();

  // Try to find the ingredient being asked about
  for (const ingredient of ingredients) {
    const itemLower = ingredient.item.toLowerCase();

    if (messageLower.includes(itemLower)) {
      // Check for exact match in substitutions
      if (COMMON_SUBSTITUTIONS[itemLower]) {
        const subs = COMMON_SUBSTITUTIONS[itemLower];
        const subList = subs
          .map(s => `• ${s.substitute}: ${s.ratio} (${s.notes})`)
          .join('\n');
        return `For ${ingredient.item}, you can use:\n\n${subList}`;
      }

      // Check for partial matches
      for (const [key, subs] of Object.entries(COMMON_SUBSTITUTIONS)) {
        if (itemLower.includes(key) || key.includes(itemLower)) {
          const subList = subs
            .map(s => `• ${s.substitute}: ${s.ratio} (${s.notes})`)
            .join('\n');
          return `For ${ingredient.item}, you can use:\n\n${subList}`;
        }
      }

      // Check ingredient's built-in substitutes
      if (ingredient.substitutes.length > 0) {
        return `The recipe suggests: ${ingredient.substitutes.join(' or ')}`;
      }
    }
  }

  return "I don't have an offline substitution for that ingredient. Please check that Ollama is running for more detailed suggestions.";
}

// ============================================
// Connection Testing
// ============================================

export async function testOllamaConnection(): Promise<{ connected: boolean; models?: string[]; error?: string }> {
  const preferences = getPreferences();

  try {
    const response = await fetch(`${preferences.ollama_config.endpoint}/api/tags`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const models = data.models?.map((m: { name: string }) => m.name) || [];

    return { connected: true, models };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
