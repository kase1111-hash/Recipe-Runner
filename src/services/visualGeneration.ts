// AI Visual Generation Service
// Phase 2 Core Feature - Step Visualization
// Phase 8 Enhancement - Image caching, versioning, and prefetching

import {
  getCachedStepImage,
  cacheStepImage,
  getNextImageVersion,
  getStepImageVersions,
  getCachedStepImageByVersion,
} from '../db';
import type { VisualGenerationRequest, VisualGenerationResult, Step } from '../types';

// ============================================
// Configuration
// ============================================

interface VisualGenerationConfig {
  endpoint: string;
  model: string;
  width: number;
  height: number;
  timeout_ms: number;
}

const defaultConfig: VisualGenerationConfig = {
  endpoint: 'http://localhost:11434',  // Ollama endpoint
  model: 'stable-diffusion',           // or other vision model
  width: 512,
  height: 512,
  timeout_ms: 30000,
};

let config = { ...defaultConfig };

export function configureVisualGeneration(newConfig: Partial<VisualGenerationConfig>): void {
  config = { ...config, ...newConfig };
}

// ============================================
// Visual Prompt Enhancement
// ============================================

/**
 * Enhances a visual prompt for better image generation results
 * Adds style descriptors and quality modifiers
 */
export function enhanceVisualPrompt(prompt: string, style: 'realistic' | 'illustrated' = 'realistic'): string {
  const styleModifiers = {
    realistic: 'realistic photograph, high quality, natural lighting, sharp focus, kitchen setting',
    illustrated: 'clean illustration, instructional diagram style, clear lines, educational visual',
  };

  const qualityModifiers = 'detailed, clear, well-lit, professional food photography style';

  return `${prompt}. ${styleModifiers[style]}, ${qualityModifiers}`;
}

// ============================================
// Image Generation
// ============================================

/**
 * Generates an image for a recipe step using the visual prompt
 * First checks cache, then generates if needed
 */
export async function generateStepVisual(
  request: VisualGenerationRequest
): Promise<VisualGenerationResult> {
  const { recipe_id, step_index, visual_prompt, style = 'realistic' } = request;

  // Check cache first
  const cached = await getCachedStepImage(recipe_id, step_index);
  if (cached) {
    return {
      recipe_id,
      step_index,
      image_url: cached,
      cached: true,
      version: 1,
    };
  }

  // Enhance the prompt for better results
  const enhancedPrompt = enhanceVisualPrompt(visual_prompt, style);

  // Try Ollama with vision model first
  const imageData = await generateWithOllama(enhancedPrompt);

  // Cache the result
  await cacheStepImage(recipe_id, step_index, imageData);

  return {
    recipe_id,
    step_index,
    image_url: imageData,
    cached: false,
    version: 1,
  };
}

/**
 * Generate image using Ollama's API (if vision model available)
 */
async function generateWithOllama(prompt: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeout_ms);

  try {
    const response = await fetch(`${config.endpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.model,
        prompt: `Generate an image: ${prompt}`,
        stream: false,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Ollama request failed (${response.status}): ${errorText || 'Unknown error'}`);
    }

    const data = await response.json();

    // If the model returns image data
    if (data.images && data.images[0]) {
      return `data:image/png;base64,${data.images[0]}`;
    }

    // Otherwise throw with details
    throw new Error(`No image data in response. Model "${config.model}" may not support image generation. Response: ${JSON.stringify(data).slice(0, 200)}`);
  } catch (err) {
    if (err instanceof Error) {
      if (err.name === 'AbortError') {
        throw new Error(`Request timed out after ${config.timeout_ms / 1000}s. Is Ollama running at ${config.endpoint}?`);
      }
      if (err.message.includes('fetch')) {
        throw new Error(`Cannot connect to Ollama at ${config.endpoint}. Make sure Ollama is running (ollama serve).`);
      }
      throw err;
    }
    throw new Error(`Image generation failed: ${String(err)}`);
  } finally {
    clearTimeout(timeout);
  }
}

// ============================================
// Batch Generation
// ============================================

/**
 * Pre-generate visuals for all steps in a recipe
 * Useful for caching before cooking starts
 */
export async function pregenerateRecipeVisuals(
  recipeId: string,
  steps: Step[],
  onProgress?: (completed: number, total: number) => void
): Promise<void> {
  const total = steps.length;
  let completed = 0;

  for (const step of steps) {
    await generateStepVisual({
      recipe_id: recipeId,
      step_index: step.index,
      visual_prompt: step.visual_prompt,
    });

    completed++;
    onProgress?.(completed, total);
  }
}

// ============================================
// Alternative Image Generation APIs
// ============================================

/**
 * Configuration for external image generation services
 * User can configure these in preferences
 */
export interface ExternalImageAPIConfig {
  type: 'openai' | 'stability' | 'replicate' | 'custom';
  apiKey?: string;
  endpoint?: string;
  model?: string;
}

/**
 * Generate image using external API (for future implementation)
 */
export async function generateWithExternalAPI(
  prompt: string,
  apiConfig: ExternalImageAPIConfig
): Promise<string> {
  switch (apiConfig.type) {
    case 'openai':
      return await generateWithOpenAI(prompt, apiConfig);
    case 'stability':
      return await generateWithStabilityAI(prompt, apiConfig);
    default:
      throw new Error(`Unsupported API type: ${apiConfig.type}`);
  }
}

async function generateWithOpenAI(prompt: string, config: ExternalImageAPIConfig): Promise<string> {
  if (!config.apiKey) throw new Error('OpenAI API key required');

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: '1024x1024',
      response_format: 'b64_json',
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return `data:image/png;base64,${data.data[0].b64_json}`;
}

async function generateWithStabilityAI(prompt: string, config: ExternalImageAPIConfig): Promise<string> {
  if (!config.apiKey) throw new Error('Stability AI API key required');

  const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text_prompts: [{ text: prompt }],
      cfg_scale: 7,
      height: 1024,
      width: 1024,
      samples: 1,
    }),
  });

  if (!response.ok) {
    throw new Error(`Stability AI API error: ${response.status}`);
  }

  const data = await response.json();
  return `data:image/png;base64,${data.artifacts[0].base64}`;
}

// ============================================
// Phase 8: Regeneration with Versioning
// ============================================

/**
 * Regenerate a new version of a step visual
 * Stores the new version alongside existing versions
 */
export async function regenerateStepVisual(
  request: VisualGenerationRequest
): Promise<VisualGenerationResult> {
  const { recipe_id, step_index, visual_prompt, style = 'realistic' } = request;

  // Get the next version number
  const nextVersion = await getNextImageVersion(recipe_id, step_index);

  // Enhance the prompt for better results
  const enhancedPrompt = enhanceVisualPrompt(visual_prompt, style);

  // Generate new image - let errors propagate
  const imageData = await generateWithOllama(enhancedPrompt);

  // Cache with new version
  await cacheStepImage(recipe_id, step_index, imageData, nextVersion);

  return {
    recipe_id,
    step_index,
    image_url: imageData,
    cached: false,
    version: nextVersion,
  };
}

/**
 * Get all generated versions for a step
 */
export async function getStepVisualVersions(
  recipeId: string,
  stepIndex: number
): Promise<Array<{ version: number; image_url: string; created_at: string }>> {
  const versions = await getStepImageVersions(recipeId, stepIndex);
  return versions.map(v => ({
    version: v.version,
    image_url: v.image_data,
    created_at: v.created_at,
  }));
}

/**
 * Get a specific version of a step visual
 */
export async function getStepVisualByVersion(
  recipeId: string,
  stepIndex: number,
  version: number
): Promise<VisualGenerationResult | null> {
  const imageData = await getCachedStepImageByVersion(recipeId, stepIndex, version);
  if (!imageData) return null;

  return {
    recipe_id: recipeId,
    step_index: stepIndex,
    image_url: imageData,
    cached: true,
    version,
  };
}

// ============================================
// Phase 8: Prefetching
// ============================================

/**
 * Prefetch visuals for upcoming steps
 * Generates images in the background for smoother UX
 */
export async function prefetchUpcomingSteps(
  recipeId: string,
  steps: Step[],
  currentStepIndex: number,
  prefetchCount: number = 2
): Promise<void> {
  const upcomingSteps = steps.slice(
    currentStepIndex + 1,
    currentStepIndex + 1 + prefetchCount
  );

  // Generate in parallel but don't wait for completion
  for (const step of upcomingSteps) {
    if (step.visual_prompt) {
      // Fire and forget - cache in background
      generateStepVisual({
        recipe_id: recipeId,
        step_index: step.index,
        visual_prompt: step.visual_prompt,
      }).catch(err => {
        console.warn(`Prefetch failed for step ${step.index}:`, err);
      });
    }
  }
}

/**
 * Check if a step visual is cached
 */
export async function isStepVisualCached(
  recipeId: string,
  stepIndex: number
): Promise<boolean> {
  const cached = await getCachedStepImage(recipeId, stepIndex);
  return cached !== null;
}

/**
 * Get cache status for all steps in a recipe
 */
export async function getRecipeVisualCacheStatus(
  recipeId: string,
  steps: Step[]
): Promise<Map<number, boolean>> {
  const status = new Map<number, boolean>();

  for (const step of steps) {
    if (step.visual_prompt) {
      const isCached = await isStepVisualCached(recipeId, step.index);
      status.set(step.index, isCached);
    }
  }

  return status;
}

// ============================================
// Visual Settings (localStorage)
// ============================================

export interface VisualSettings {
  enabled: boolean;
  style: 'realistic' | 'illustrated';
  autoGenerate: boolean;
  prefetchEnabled: boolean;
  prefetchCount: number;
  apiProvider: 'local' | 'openai' | 'stability';
  apiKey?: string;
}

const VISUAL_SETTINGS_KEY = 'recipe_runner_visual_settings';

const defaultVisualSettings: VisualSettings = {
  enabled: true,
  style: 'realistic',
  autoGenerate: true,
  prefetchEnabled: true,
  prefetchCount: 2,
  apiProvider: 'local',
};

export function getVisualSettings(): VisualSettings {
  try {
    const stored = localStorage.getItem(VISUAL_SETTINGS_KEY);
    if (stored) {
      return { ...defaultVisualSettings, ...JSON.parse(stored) };
    }
  } catch {
    // Ignore parse errors
  }
  return defaultVisualSettings;
}

export function saveVisualSettings(settings: Partial<VisualSettings>): VisualSettings {
  const current = getVisualSettings();
  const updated = { ...current, ...settings };
  localStorage.setItem(VISUAL_SETTINGS_KEY, JSON.stringify(updated));
  return updated;
}

export function resetVisualSettings(): VisualSettings {
  localStorage.removeItem(VISUAL_SETTINGS_KEY);
  return defaultVisualSettings;
}
