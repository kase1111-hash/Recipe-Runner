// AI Visual Generation Service
// Phase 2 Core Feature - Step Visualization

import { getCachedStepImage, cacheStepImage } from '../db';
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

  try {
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
  } catch (error) {
    // Fallback: return a placeholder or description
    console.warn('Visual generation failed, using placeholder:', error);
    return {
      recipe_id,
      step_index,
      image_url: createPlaceholderImage(visual_prompt),
      cached: false,
      version: 0,
    };
  }
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
      throw new Error(`Ollama request failed: ${response.status}`);
    }

    const data = await response.json();

    // If the model returns image data
    if (data.images && data.images[0]) {
      return `data:image/png;base64,${data.images[0]}`;
    }

    // Otherwise fall back to placeholder
    throw new Error('No image data in response');
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Creates a styled placeholder SVG with the visual description
 */
function createPlaceholderImage(description: string): string {
  // Truncate long descriptions
  const maxLength = 100;
  const shortDesc = description.length > maxLength
    ? description.substring(0, maxLength) + '...'
    : description;

  // Create an SVG placeholder
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="512" height="384" viewBox="0 0 512 384">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#f8f9fa"/>
          <stop offset="100%" style="stop-color:#e9ecef"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>
      <rect x="20" y="20" width="472" height="344" rx="12" fill="white" stroke="#dee2e6" stroke-width="2"/>
      <text x="256" y="160" text-anchor="middle" font-family="system-ui, sans-serif" font-size="48" fill="#6c757d">👁️</text>
      <text x="256" y="210" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14" font-weight="600" fill="#495057">Visual Reference</text>
      <foreignObject x="40" y="230" width="432" height="120">
        <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: system-ui, sans-serif; font-size: 12px; color: #6c757d; text-align: center; line-height: 1.5; padding: 8px;">
          ${shortDesc}
        </div>
      </foreignObject>
    </svg>
  `;

  return `data:image/svg+xml;base64,${btoa(svg)}`;
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
