// Recipe Import & AI Parsing Service
// Phase 3 Core Feature - Cookbook Digitization

import { v4 as uuid } from 'uuid';
import { getPreferences } from '../db';
import type {
  Recipe,
  Ingredient,
  Step,
  DifficultyScore,
  Source,
  SafeTemp,
  CourseType,
} from '../types';

// ============================================
// Types
// ============================================

export type ImportSource = 'url' | 'text' | 'pdf' | 'image';

export interface ParsedRecipe {
  name: string;
  description: string;
  total_time: string;
  active_time: string;
  yield: string;
  safe_temp?: SafeTemp | null;
  equipment: string[];
  tags: string[];
  course_type?: CourseType | null;  // Recipe classification
  cuisine?: string | null;  // Cuisine type (e.g., "Italian", "Asian")
  ingredients: Ingredient[];
  steps: Step[];
  notes: string;
  source: Source;
  confidence: number; // 0-1 confidence score
}

export interface ParseProgress {
  stage: 'fetching' | 'extracting' | 'structuring' | 'generating_prompts' | 'complete' | 'error';
  message: string;
  progress: number; // 0-100
}

// ============================================
// Parsing Prompts
// ============================================

const RECIPE_EXTRACTION_PROMPT = `You are a recipe extraction assistant. Parse the following content and extract a structured recipe.

Return a JSON object with this exact structure:
{
  "name": "Recipe name",
  "description": "Brief description of the dish",
  "total_time": "Total time (e.g., '1 hr 30 min')",
  "active_time": "Hands-on time (e.g., '20 min')",
  "yield": "Servings or amount (e.g., '4 servings' or '2 loaves')",
  "safe_temp": { "value": 165, "unit": "°F", "location": "thickest part" } or null,
  "equipment": ["list", "of", "equipment"],
  "tags": ["dinner", "protein", etc],
  "ingredients": [
    {
      "item": "ingredient name",
      "amount": "1",
      "unit": "cup",
      "prep": "diced" or null,
      "optional": false,
      "substitutes": []
    }
  ],
  "steps": [
    {
      "title": "Short step name (2-4 words)",
      "instruction": "Detailed instruction",
      "time_minutes": 10,
      "time_display": "10 min",
      "type": "active" or "passive"
    }
  ],
  "notes": "Any additional notes"
}

Important:
- Extract ALL ingredients with proper amounts and units
- Break down instructions into discrete, actionable steps
- Identify active vs passive time for each step
- Include safe internal temperatures for meat/poultry
- Be thorough but concise

Content to parse:
`;

const VISUAL_PROMPT_GENERATION = `You are a visual description assistant for cooking steps. For each step, generate a detailed visual prompt that describes what successful completion looks like.

The visual prompt should:
- Describe the expected visual appearance in detail
- Include colors, textures, and visual cues
- Mention container/equipment if relevant
- Be specific enough for image generation
- Focus on what "done correctly" looks like

For each step, return a visual_prompt string.

Example:
Step: "Cream butter and sugar until light and fluffy"
Visual prompt: "A stand mixer bowl viewed from above containing pale yellow, fluffy butter-sugar mixture with visible air pockets throughout. Texture is light and airy, volume has increased noticeably. No visible sugar granules. Mixture holds soft peaks on the paddle attachment."

Now generate visual prompts for these steps:
`;

const DIFFICULTY_ASSESSMENT_PROMPT = `Assess the difficulty of this recipe on a 1-5 scale for each dimension:

- technique: 1 (basic mix/pour) to 5 (expert multi-stage techniques)
- timing: 1 (flexible) to 5 (precision timing required)
- ingredients: 1 (pantry staples) to 5 (rare/hard to source)
- equipment: 1 (basic pots/pans) to 5 (professional equipment)

Return JSON: { "technique": N, "timing": N, "ingredients": N, "equipment": N }

Recipe:
`;

// ============================================
// URL Fetching
// ============================================

async function fetchRecipeFromUrl(url: string): Promise<string> {
  try {
    // Use a CORS proxy or server-side fetch in production
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }

    const html = await response.text();

    // Extract text content from HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Remove scripts, styles, and navigation
    const elementsToRemove = doc.querySelectorAll('script, style, nav, header, footer, aside, .ad, .advertisement');
    elementsToRemove.forEach(el => el.remove());

    // Try to find recipe-specific content
    const recipeSelectors = [
      '[itemtype*="Recipe"]',
      '.recipe',
      '.recipe-content',
      'article',
      'main',
      '.post-content',
    ];

    let content = '';
    for (const selector of recipeSelectors) {
      const element = doc.querySelector(selector);
      if (element && element.textContent) {
        content = element.textContent;
        break;
      }
    }

    // Fallback to body content
    if (!content) {
      content = doc.body?.textContent || '';
    }

    // Clean up whitespace
    content = content.replace(/\s+/g, ' ').trim();

    // Limit content length for API
    if (content.length > 15000) {
      content = content.substring(0, 15000);
    }

    return content;
  } catch (error) {
    throw new Error(`Failed to fetch recipe from URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ============================================
// AI Parsing with Ollama
// ============================================

async function callOllama(prompt: string, systemPrompt?: string): Promise<string> {
  const preferences = getPreferences();
  const config = preferences.ollama_config;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeout_ms * 2); // Double timeout for parsing

  try {
    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await fetch(`${config.endpoint}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.model,
        messages,
        stream: false,
        options: {
          temperature: 0.3, // Lower temperature for more consistent parsing
          num_predict: 4000, // Allow longer responses for full recipes
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

function extractJSON(text: string): unknown {
  // Try to find JSON in the response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      // Try to fix common JSON issues
      let fixed = jsonMatch[0]
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']')
        .replace(/'/g, '"');
      return JSON.parse(fixed);
    }
  }
  throw new Error('No valid JSON found in response');
}

// ============================================
// Main Parsing Functions
// ============================================

export async function parseRecipeFromText(
  text: string,
  onProgress?: (progress: ParseProgress) => void
): Promise<ParsedRecipe> {
  onProgress?.({ stage: 'extracting', message: 'Analyzing recipe content...', progress: 10 });

  // Extract structured recipe data
  const extractionPrompt = RECIPE_EXTRACTION_PROMPT + text;
  const extractionResult = await callOllama(extractionPrompt);

  onProgress?.({ stage: 'structuring', message: 'Structuring recipe data...', progress: 40 });

  let parsed: ParsedRecipe;
  try {
    const extracted = extractJSON(extractionResult) as Partial<ParsedRecipe>;

    // Normalize and validate the parsed data
    parsed = {
      name: extracted.name || 'Untitled Recipe',
      description: extracted.description || '',
      total_time: extracted.total_time || 'Unknown',
      active_time: extracted.active_time || 'Unknown',
      yield: extracted.yield || 'Unknown',
      safe_temp: extracted.safe_temp || null,
      equipment: Array.isArray(extracted.equipment) ? extracted.equipment : [],
      tags: Array.isArray(extracted.tags) ? extracted.tags : [],
      ingredients: normalizeIngredients(extracted.ingredients || []),
      steps: normalizeSteps(extracted.steps || []),
      notes: extracted.notes || '',
      source: { type: 'original' },
      confidence: 0.8,
    };
  } catch (error) {
    throw new Error(`Failed to parse recipe data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  onProgress?.({ stage: 'generating_prompts', message: 'Generating visual prompts...', progress: 60 });

  // Generate visual prompts for each step
  parsed.steps = await generateVisualPrompts(parsed.steps, onProgress);

  onProgress?.({ stage: 'complete', message: 'Recipe parsed successfully!', progress: 100 });

  return parsed;
}

export async function parseRecipeFromUrl(
  url: string,
  onProgress?: (progress: ParseProgress) => void
): Promise<ParsedRecipe> {
  onProgress?.({ stage: 'fetching', message: 'Fetching recipe from URL...', progress: 5 });

  const content = await fetchRecipeFromUrl(url);

  if (!content || content.length < 100) {
    throw new Error('Could not extract recipe content from URL');
  }

  const parsed = await parseRecipeFromText(content, onProgress);

  // Set the source
  parsed.source = {
    type: 'url',
    url: url,
  };

  return parsed;
}

// ============================================
// Visual Prompt Generation
// ============================================

async function generateVisualPrompts(
  steps: Step[],
  _onProgress?: (progress: ParseProgress) => void
): Promise<Step[]> {
  const stepsText = steps
    .map((s, i) => `Step ${i + 1}: "${s.title}" - ${s.instruction}`)
    .join('\n');

  const prompt = VISUAL_PROMPT_GENERATION + stepsText + '\n\nReturn a JSON array of visual_prompt strings, one for each step:';

  try {
    const result = await callOllama(prompt);
    const prompts = extractJSON(result) as string[];

    if (Array.isArray(prompts)) {
      return steps.map((step, i) => ({
        ...step,
        visual_prompt: prompts[i] || generateDefaultVisualPrompt(step),
      }));
    }
  } catch (error) {
    console.warn('Failed to generate visual prompts, using defaults:', error);
  }

  // Fallback: generate basic prompts
  return steps.map(step => ({
    ...step,
    visual_prompt: generateDefaultVisualPrompt(step),
  }));
}

function generateDefaultVisualPrompt(step: Step): string {
  return `${step.title}: ${step.instruction.substring(0, 100)}. Kitchen setting, realistic photo style, showing the expected result of this cooking step.`;
}

// ============================================
// Difficulty Assessment
// ============================================

export async function assessDifficulty(recipe: ParsedRecipe): Promise<DifficultyScore> {
  const recipeText = `
Recipe: ${recipe.name}
Ingredients: ${recipe.ingredients.map(i => `${i.amount} ${i.unit} ${i.item}`).join(', ')}
Equipment: ${recipe.equipment.join(', ')}
Steps: ${recipe.steps.map(s => s.instruction).join(' ')}
  `;

  const prompt = DIFFICULTY_ASSESSMENT_PROMPT + recipeText;

  try {
    const result = await callOllama(prompt);
    const scores = extractJSON(result) as Record<string, number>;

    const technique = Math.min(5, Math.max(1, scores.technique || 3));
    const timing = Math.min(5, Math.max(1, scores.timing || 3));
    const ingredients = Math.min(5, Math.max(1, scores.ingredients || 3));
    const equipment = Math.min(5, Math.max(1, scores.equipment || 3));

    const overall = Math.round(
      technique * 0.35 +
      timing * 0.25 +
      ingredients * 0.20 +
      equipment * 0.20
    );

    return { overall, technique, timing, ingredients, equipment };
  } catch (error) {
    console.warn('Failed to assess difficulty, using defaults:', error);
    return { overall: 3, technique: 3, timing: 3, ingredients: 3, equipment: 3 };
  }
}

// ============================================
// Data Normalization
// ============================================

function normalizeIngredients(ingredients: unknown[]): Ingredient[] {
  return ingredients.map((ing: unknown) => {
    const i = ing as Record<string, unknown>;
    return {
      item: String(i.item || i.name || 'Unknown'),
      amount: String(i.amount || i.quantity || ''),
      unit: String(i.unit || ''),
      prep: i.prep ? String(i.prep) : null,
      optional: Boolean(i.optional),
      substitutes: Array.isArray(i.substitutes) ? i.substitutes.map(String) : [],
    };
  });
}

function normalizeSteps(steps: unknown[]): Step[] {
  return steps.map((step: unknown, index: number) => {
    const s = step as Record<string, unknown>;
    const timeMinutes = parseTimeToMinutes(s.time_minutes || s.time || s.time_display);

    return {
      index,
      title: String(s.title || `Step ${index + 1}`),
      instruction: String(s.instruction || s.instructions || s.text || ''),
      time_minutes: timeMinutes,
      time_display: formatMinutes(timeMinutes),
      type: (s.type === 'passive' ? 'passive' : 'active') as 'active' | 'passive',
      tip: s.tip ? String(s.tip) : null,
      visual_prompt: String(s.visual_prompt || ''),
      temperature: s.temperature ? {
        value: Number((s.temperature as Record<string, unknown>).value) || 0,
        unit: (String((s.temperature as Record<string, unknown>).unit) || '°F') as '°F' | '°C',
        target: (s.temperature as Record<string, unknown>).target ? String((s.temperature as Record<string, unknown>).target) : undefined,
      } : null,
      timer_default: s.timer_default ? Number(s.timer_default) : (timeMinutes > 0 ? timeMinutes * 60 : null),
    };
  });
}

function parseTimeToMinutes(time: unknown): number {
  if (typeof time === 'number') return time;
  if (typeof time !== 'string') return 0;

  const hourMatch = time.match(/(\d+)\s*h/i);
  const minMatch = time.match(/(\d+)\s*m/i);

  let minutes = 0;
  if (hourMatch) minutes += parseInt(hourMatch[1]) * 60;
  if (minMatch) minutes += parseInt(minMatch[1]);

  // If no units, assume minutes
  if (!hourMatch && !minMatch) {
    const num = parseInt(time);
    if (!isNaN(num)) minutes = num;
  }

  return minutes;
}

function formatMinutes(minutes: number): string {
  if (minutes === 0) return '';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours} hr`;
  return `${hours} hr ${mins} min`;
}

// ============================================
// Create Recipe from Parsed Data
// ============================================

export function createRecipeFromParsed(
  parsed: ParsedRecipe,
  cookbookId: string,
  difficulty?: DifficultyScore
): Recipe {
  const now = new Date().toISOString();

  return {
    id: uuid(),
    cookbook_id: cookbookId,
    name: parsed.name,
    description: parsed.description,
    total_time: parsed.total_time,
    active_time: parsed.active_time,
    yield: parsed.yield,
    difficulty: difficulty || { overall: 3, technique: 3, timing: 3, ingredients: 3, equipment: 3 },
    safe_temp: parsed.safe_temp,
    equipment: parsed.equipment,
    tags: parsed.tags,
    course_type: parsed.course_type,
    cuisine: parsed.cuisine,
    source: parsed.source,
    ingredients: parsed.ingredients,
    steps: parsed.steps,
    notes: parsed.notes,
    created_at: now,
    modified_at: now,
    cook_history: [],
  };
}
