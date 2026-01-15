// Social Sharing Service
// Phase 7 Feature - Share cookbooks and recipes with others

import type { Recipe, Cookbook } from '../types';
import { exportRecipe, type ExportFormat } from './export';

// ============================================
// Types
// ============================================

export interface ShareableRecipe {
  id: string;
  recipe: Recipe;
  shareCode: string;
  createdAt: string;
  expiresAt?: string;
  viewCount: number;
  isPublic: boolean;
}

export interface ShareableCookbook {
  id: string;
  cookbook: Cookbook;
  recipes: Recipe[];
  shareCode: string;
  createdAt: string;
  expiresAt?: string;
  viewCount: number;
  isPublic: boolean;
}

export interface ShareLink {
  url: string;
  shareCode: string;
  expiresAt?: string;
  type: 'recipe' | 'cookbook';
}

export interface ShareOptions {
  expiresInDays?: number;  // undefined = never expires
  isPublic?: boolean;
}

// ============================================
// Storage
// ============================================

const SHARED_RECIPES_KEY = 'recipe_runner_shared_recipes';
const SHARED_COOKBOOKS_KEY = 'recipe_runner_shared_cookbooks';

function loadSharedRecipes(): Map<string, ShareableRecipe> {
  try {
    const stored = localStorage.getItem(SHARED_RECIPES_KEY);
    if (stored) {
      const items: ShareableRecipe[] = JSON.parse(stored);
      return new Map(items.map(item => [item.shareCode, item]));
    }
  } catch {
    // Ignore parse errors
  }
  return new Map();
}

function saveSharedRecipes(recipes: Map<string, ShareableRecipe>): void {
  localStorage.setItem(SHARED_RECIPES_KEY, JSON.stringify(Array.from(recipes.values())));
}

function loadSharedCookbooks(): Map<string, ShareableCookbook> {
  try {
    const stored = localStorage.getItem(SHARED_COOKBOOKS_KEY);
    if (stored) {
      const items: ShareableCookbook[] = JSON.parse(stored);
      return new Map(items.map(item => [item.shareCode, item]));
    }
  } catch {
    // Ignore parse errors
  }
  return new Map();
}

function saveSharedCookbooks(cookbooks: Map<string, ShareableCookbook>): void {
  localStorage.setItem(SHARED_COOKBOOKS_KEY, JSON.stringify(Array.from(cookbooks.values())));
}

// ============================================
// Share Code Generation
// ============================================

function generateShareCode(length: number = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function generateId(): string {
  return `share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// Recipe Sharing
// ============================================

export function shareRecipe(recipe: Recipe, options: ShareOptions = {}): ShareLink {
  const recipes = loadSharedRecipes();
  const shareCode = generateShareCode();
  const now = new Date();

  let expiresAt: string | undefined;
  if (options.expiresInDays) {
    const expDate = new Date(now);
    expDate.setDate(expDate.getDate() + options.expiresInDays);
    expiresAt = expDate.toISOString();
  }

  const shareable: ShareableRecipe = {
    id: generateId(),
    recipe,
    shareCode,
    createdAt: now.toISOString(),
    expiresAt,
    viewCount: 0,
    isPublic: options.isPublic ?? true,
  };

  recipes.set(shareCode, shareable);
  saveSharedRecipes(recipes);

  // In a real app, this would be a server URL
  // For local demo, we use a data URL scheme
  const baseUrl = window.location.origin;

  return {
    url: `${baseUrl}/share/recipe/${shareCode}`,
    shareCode,
    expiresAt,
    type: 'recipe',
  };
}

export function getSharedRecipe(shareCode: string): ShareableRecipe | undefined {
  const recipes = loadSharedRecipes();
  const recipe = recipes.get(shareCode);

  if (!recipe) return undefined;

  // Check expiration
  if (recipe.expiresAt && new Date(recipe.expiresAt) < new Date()) {
    recipes.delete(shareCode);
    saveSharedRecipes(recipes);
    return undefined;
  }

  // Increment view count
  recipe.viewCount++;
  saveSharedRecipes(recipes);

  return recipe;
}

export function unshareRecipe(shareCode: string): boolean {
  const recipes = loadSharedRecipes();
  const deleted = recipes.delete(shareCode);
  if (deleted) {
    saveSharedRecipes(recipes);
  }
  return deleted;
}

export function getMySharedRecipes(): ShareableRecipe[] {
  const recipes = loadSharedRecipes();
  return Array.from(recipes.values())
    .filter(r => !r.expiresAt || new Date(r.expiresAt) > new Date())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// ============================================
// Cookbook Sharing
// ============================================

export function shareCookbook(cookbook: Cookbook, recipes: Recipe[], options: ShareOptions = {}): ShareLink {
  const cookbooks = loadSharedCookbooks();
  const shareCode = generateShareCode(10);
  const now = new Date();

  let expiresAt: string | undefined;
  if (options.expiresInDays) {
    const expDate = new Date(now);
    expDate.setDate(expDate.getDate() + options.expiresInDays);
    expiresAt = expDate.toISOString();
  }

  const shareable: ShareableCookbook = {
    id: generateId(),
    cookbook,
    recipes,
    shareCode,
    createdAt: now.toISOString(),
    expiresAt,
    viewCount: 0,
    isPublic: options.isPublic ?? true,
  };

  cookbooks.set(shareCode, shareable);
  saveSharedCookbooks(cookbooks);

  const baseUrl = window.location.origin;

  return {
    url: `${baseUrl}/share/cookbook/${shareCode}`,
    shareCode,
    expiresAt,
    type: 'cookbook',
  };
}

export function getSharedCookbook(shareCode: string): ShareableCookbook | undefined {
  const cookbooks = loadSharedCookbooks();
  const cookbook = cookbooks.get(shareCode);

  if (!cookbook) return undefined;

  // Check expiration
  if (cookbook.expiresAt && new Date(cookbook.expiresAt) < new Date()) {
    cookbooks.delete(shareCode);
    saveSharedCookbooks(cookbooks);
    return undefined;
  }

  // Increment view count
  cookbook.viewCount++;
  saveSharedCookbooks(cookbooks);

  return cookbook;
}

export function unshareCookbook(shareCode: string): boolean {
  const cookbooks = loadSharedCookbooks();
  const deleted = cookbooks.delete(shareCode);
  if (deleted) {
    saveSharedCookbooks(cookbooks);
  }
  return deleted;
}

export function getMySharedCookbooks(): ShareableCookbook[] {
  const cookbooks = loadSharedCookbooks();
  return Array.from(cookbooks.values())
    .filter(c => !c.expiresAt || new Date(c.expiresAt) > new Date())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// ============================================
// Social Media Sharing
// ============================================

export interface SocialShareOptions {
  title: string;
  text: string;
  url?: string;
}

export function canNativeShare(): boolean {
  return 'share' in navigator;
}

export async function nativeShare(options: SocialShareOptions): Promise<boolean> {
  if (!canNativeShare()) return false;

  try {
    await navigator.share({
      title: options.title,
      text: options.text,
      url: options.url,
    });
    return true;
  } catch {
    return false;
  }
}

export function generateShareText(recipe: Recipe): string {
  const parts = [
    `Check out this recipe: ${recipe.name}`,
    recipe.description,
    `Serves ${recipe.yield} | ${recipe.total_time}`,
    `#RecipeRunner #Cooking`,
  ];
  return parts.filter(Boolean).join('\n\n');
}

export function shareToTwitter(text: string, url?: string): void {
  const params = new URLSearchParams({
    text,
    ...(url && { url }),
  });
  window.open(`https://twitter.com/intent/tweet?${params}`, '_blank', 'width=600,height=400');
}

export function shareToFacebook(url: string): void {
  const params = new URLSearchParams({ u: url });
  window.open(`https://www.facebook.com/sharer/sharer.php?${params}`, '_blank', 'width=600,height=400');
}

export function shareToPinterest(url: string, description: string, imageUrl?: string): void {
  const params = new URLSearchParams({
    url,
    description,
    ...(imageUrl && { media: imageUrl }),
  });
  window.open(`https://pinterest.com/pin/create/button/?${params}`, '_blank', 'width=600,height=400');
}

export function shareViaEmail(recipe: Recipe): void {
  const subject = encodeURIComponent(`Recipe: ${recipe.name}`);
  const body = encodeURIComponent(exportRecipe(recipe, { format: 'text' }));
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

// ============================================
// Export for Sharing
// ============================================

export function getRecipeShareData(recipe: Recipe, format: ExportFormat = 'json'): string {
  return exportRecipe(recipe, { format });
}

// ============================================
// QR Code Generation (simple text-based)
// ============================================

export function generateQRCodeUrl(data: string): string {
  // Using a public QR code API for simplicity
  // In production, you'd use a library like qrcode-generator
  const encoded = encodeURIComponent(data);
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encoded}`;
}

export function getRecipeQRCode(shareCode: string): string {
  const url = `${window.location.origin}/share/recipe/${shareCode}`;
  return generateQRCodeUrl(url);
}

export function getCookbookQRCode(shareCode: string): string {
  const url = `${window.location.origin}/share/cookbook/${shareCode}`;
  return generateQRCodeUrl(url);
}

// ============================================
// Import from Share
// ============================================

export function importFromShareCode(shareCode: string): { type: 'recipe'; data: Recipe } | { type: 'cookbook'; data: { cookbook: Cookbook; recipes: Recipe[] } } | null {
  // Try recipe first
  const sharedRecipe = getSharedRecipe(shareCode);
  if (sharedRecipe) {
    return { type: 'recipe', data: sharedRecipe.recipe };
  }

  // Try cookbook
  const sharedCookbook = getSharedCookbook(shareCode);
  if (sharedCookbook) {
    return {
      type: 'cookbook',
      data: {
        cookbook: sharedCookbook.cookbook,
        recipes: sharedCookbook.recipes,
      },
    };
  }

  return null;
}

// ============================================
// Cleanup
// ============================================

export function cleanupExpiredShares(): number {
  const now = new Date();
  let cleaned = 0;

  // Clean recipes
  const recipes = loadSharedRecipes();
  for (const [code, recipe] of recipes) {
    if (recipe.expiresAt && new Date(recipe.expiresAt) < now) {
      recipes.delete(code);
      cleaned++;
    }
  }
  saveSharedRecipes(recipes);

  // Clean cookbooks
  const cookbooks = loadSharedCookbooks();
  for (const [code, cookbook] of cookbooks) {
    if (cookbook.expiresAt && new Date(cookbook.expiresAt) < now) {
      cookbooks.delete(code);
      cleaned++;
    }
  }
  saveSharedCookbooks(cookbooks);

  return cleaned;
}
