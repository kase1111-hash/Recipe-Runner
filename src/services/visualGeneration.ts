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
 * Routes to the appropriate API based on user settings
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

  // Get settings to determine which API to use
  const settings = getVisualSettings();

  // Enhance the prompt for better results
  const enhancedPrompt = enhanceVisualPrompt(visual_prompt, style);

  // Generate image using selected provider
  const imageData = await generateImage(enhancedPrompt, settings);

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
 * Route image generation to the appropriate API based on settings
 */
async function generateImage(prompt: string, settings: VisualSettings): Promise<string> {
  switch (settings.apiProvider) {
    case 'openai':
      return await generateWithOpenAI(prompt, { type: 'openai', apiKey: settings.apiKey });
    case 'stability':
      return await generateWithStabilityAI(prompt, { type: 'stability', apiKey: settings.apiKey });
    case 'sdwebui':
      return await generateWithSDWebUI(prompt, settings.sdwebuiEndpoint || 'http://localhost:7860');
    case 'placeholder':
    default:
      // Default to placeholder mode - works without any external services
      return generatePlaceholderImage(prompt);
  }
}

/**
 * Generate a placeholder image with styled visual description
 * Works without any external services - perfect for demos and development
 */
function generatePlaceholderImage(prompt: string): string {
  // Extract a shorter description for display (first 100 chars)
  const shortPrompt = prompt.length > 120 ? prompt.substring(0, 117) + '...' : prompt;

  // Split prompt into lines for better display
  const words = shortPrompt.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).length > 35) {
      if (currentLine) lines.push(currentLine.trim());
      currentLine = word;
    } else {
      currentLine += ' ' + word;
    }
  }
  if (currentLine.trim()) lines.push(currentLine.trim());

  // Limit to 5 lines
  const displayLines = lines.slice(0, 5);
  if (lines.length > 5) {
    displayLines[4] = displayLines[4].substring(0, 30) + '...';
  }

  // Create text elements for each line
  const textElements = displayLines.map((line, i) =>
    `<text x="256" y="${180 + i * 28}" text-anchor="middle" fill="#6b7280" font-size="16" font-family="system-ui, sans-serif">${escapeXml(line)}</text>`
  ).join('\n    ');

  // Generate a pleasant gradient based on prompt hash
  const hash = simpleHash(prompt);
  const hue1 = hash % 360;
  const hue2 = (hash + 40) % 360;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:hsl(${hue1}, 25%, 95%);stop-opacity:1" />
      <stop offset="100%" style="stop-color:hsl(${hue2}, 30%, 90%);stop-opacity:1" />
    </linearGradient>
    <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
      <path d="M 32 0 L 0 0 0 32" fill="none" stroke="rgba(0,0,0,0.03)" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <rect width="512" height="512" fill="url(#grid)"/>
  <circle cx="256" cy="100" r="40" fill="hsl(${hue1}, 40%, 80%)" opacity="0.7"/>
  <text x="256" y="108" text-anchor="middle" fill="hsl(${hue1}, 50%, 40%)" font-size="32">👁️</text>
  <rect x="40" y="140" width="432" height="${displayLines.length * 28 + 40}" rx="12" fill="white" opacity="0.7"/>
  <text x="256" y="165" text-anchor="middle" fill="#374151" font-size="12" font-weight="600" font-family="system-ui, sans-serif">VISUAL REFERENCE</text>
    ${textElements}
  <text x="256" y="480" text-anchor="middle" fill="#9ca3af" font-size="11" font-family="system-ui, sans-serif">Configure AI image generation in Settings</text>
</svg>`;

  // Convert SVG to base64 data URI
  const base64 = btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${base64}`;
}

/**
 * Simple hash function for generating consistent colors from prompts
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Escape special XML characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
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

async function generateWithOpenAI(prompt: string, apiConfig: ExternalImageAPIConfig): Promise<string> {
  if (!apiConfig.apiKey) {
    throw new Error('OpenAI API key required. Go to Settings > Visual Generation and enter your API key.');
  }

  try {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiConfig.apiKey}`,
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
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `Status ${response.status}`;

      if (response.status === 401) {
        throw new Error('Invalid OpenAI API key. Please check your API key in Settings.');
      }
      if (response.status === 429) {
        throw new Error('OpenAI rate limit exceeded. Please wait and try again, or check your billing.');
      }
      if (response.status === 400) {
        throw new Error(`OpenAI rejected the prompt: ${errorMessage}`);
      }
      throw new Error(`OpenAI API error: ${errorMessage}`);
    }

    const data = await response.json();
    if (!data.data?.[0]?.b64_json) {
      throw new Error('No image data returned from OpenAI');
    }
    return `data:image/png;base64,${data.data[0].b64_json}`;
  } catch (err) {
    if (err instanceof Error && err.message.includes('fetch')) {
      throw new Error('Cannot connect to OpenAI. Check your internet connection.');
    }
    throw err;
  }
}

async function generateWithStabilityAI(prompt: string, apiConfig: ExternalImageAPIConfig): Promise<string> {
  if (!apiConfig.apiKey) {
    throw new Error('Stability AI API key required. Go to Settings > Visual Generation and enter your API key.');
  }

  try {
    const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiConfig.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        text_prompts: [{ text: prompt, weight: 1 }],
        cfg_scale: 7,
        height: 1024,
        width: 1024,
        samples: 1,
        steps: 30,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || `Status ${response.status}`;

      if (response.status === 401) {
        throw new Error('Invalid Stability AI API key. Please check your API key in Settings.');
      }
      if (response.status === 402) {
        throw new Error('Stability AI credits exhausted. Please add credits to your account.');
      }
      if (response.status === 429) {
        throw new Error('Stability AI rate limit exceeded. Please wait and try again.');
      }
      throw new Error(`Stability AI error: ${errorMessage}`);
    }

    const data = await response.json();
    if (!data.artifacts?.[0]?.base64) {
      throw new Error('No image data returned from Stability AI');
    }
    return `data:image/png;base64,${data.artifacts[0].base64}`;
  } catch (err) {
    if (err instanceof Error && err.message.includes('fetch')) {
      throw new Error('Cannot connect to Stability AI. Check your internet connection.');
    }
    throw err;
  }
}

/**
 * Generate image using Stable Diffusion WebUI (AUTOMATIC1111) API
 * Runs locally on port 7860 by default
 */
async function generateWithSDWebUI(prompt: string, endpoint: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000); // 2 minute timeout for local generation

  try {
    // Add negative prompt to avoid common issues
    const negativePrompt = 'blurry, low quality, distorted, deformed, ugly, bad anatomy, watermark, text, signature';

    const response = await fetch(`${endpoint}/sdapi/v1/txt2img`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: prompt,
        negative_prompt: negativePrompt,
        steps: 25,
        width: 512,
        height: 512,
        cfg_scale: 7,
        sampler_name: 'DPM++ 2M Karras',
        batch_size: 1,
        n_iter: 1,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');

      if (response.status === 404) {
        throw new Error(`SD WebUI API not found at ${endpoint}. Make sure the API is enabled (--api flag).`);
      }
      if (response.status === 503) {
        throw new Error('SD WebUI is busy generating another image. Please wait and try again.');
      }
      throw new Error(`SD WebUI error (${response.status}): ${errorText || 'Unknown error'}`);
    }

    const data = await response.json();

    if (!data.images || !data.images[0]) {
      throw new Error('No image data returned from SD WebUI');
    }

    return `data:image/png;base64,${data.images[0]}`;
  } catch (err) {
    if (err instanceof Error) {
      if (err.name === 'AbortError') {
        throw new Error(`Generation timed out after 2 minutes. The model may be loading or your GPU may be slow.`);
      }
      if (err.message.includes('fetch') || err.message.includes('Failed to fetch')) {
        throw new Error(`Cannot connect to SD WebUI at ${endpoint}. Make sure it's running with --api flag.`);
      }
      throw err;
    }
    throw new Error(`SD WebUI generation failed: ${String(err)}`);
  } finally {
    clearTimeout(timeout);
  }
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

  // Get settings to determine which API to use
  const settings = getVisualSettings();

  // Enhance the prompt for better results
  const enhancedPrompt = enhanceVisualPrompt(visual_prompt, style);

  // Generate new image using selected provider
  const imageData = await generateImage(enhancedPrompt, settings);

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
  apiProvider: 'placeholder' | 'sdwebui' | 'openai' | 'stability';
  apiKey?: string;
  sdwebuiEndpoint?: string;
}

const VISUAL_SETTINGS_KEY = 'recipe_runner_visual_settings';

const defaultVisualSettings: VisualSettings = {
  enabled: true,
  style: 'realistic',
  autoGenerate: true,
  prefetchEnabled: true,
  prefetchCount: 2,
  apiProvider: 'placeholder',  // Default to placeholder - works without any external services
  sdwebuiEndpoint: 'http://localhost:7860',
};

export function getVisualSettings(): VisualSettings {
  try {
    const stored = localStorage.getItem(VISUAL_SETTINGS_KEY);
    if (stored) {
      const parsed = { ...defaultVisualSettings, ...JSON.parse(stored) };
      // Auto-migrate from old providers that don't work out of the box to 'placeholder'
      if (parsed.apiProvider === 'local') {
        parsed.apiProvider = 'placeholder';
        localStorage.setItem(VISUAL_SETTINGS_KEY, JSON.stringify(parsed));
      }
      return parsed;
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
