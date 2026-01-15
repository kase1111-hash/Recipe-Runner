// Pantry Memory Service
// Phase 5 Feature - Remember commonly-stocked items

// ============================================
// Types
// ============================================

export interface PantryItem {
  name: string;
  category: PantryCategory;
  lastUsed: string;  // ISO timestamp
  useCount: number;
  alwaysHave: boolean;  // User marked as always stocked
}

export type PantryCategory =
  | 'spices'
  | 'oils'
  | 'condiments'
  | 'baking'
  | 'grains'
  | 'canned'
  | 'dairy'
  | 'produce'
  | 'proteins'
  | 'other';

// ============================================
// Storage
// ============================================

const PANTRY_KEY = 'recipe_runner_pantry';

function loadPantry(): Map<string, PantryItem> {
  try {
    const stored = localStorage.getItem(PANTRY_KEY);
    if (stored) {
      const items: PantryItem[] = JSON.parse(stored);
      return new Map(items.map(item => [normalizeItemName(item.name), item]));
    }
  } catch {
    // Ignore parse errors
  }
  return new Map();
}

function savePantry(pantry: Map<string, PantryItem>): void {
  const items = Array.from(pantry.values());
  localStorage.setItem(PANTRY_KEY, JSON.stringify(items));
}

function normalizeItemName(name: string): string {
  return name.toLowerCase().trim();
}

// ============================================
// Category Detection
// ============================================

const CATEGORY_KEYWORDS: Record<PantryCategory, string[]> = {
  spices: ['salt', 'pepper', 'cumin', 'paprika', 'oregano', 'thyme', 'basil', 'cinnamon', 'nutmeg', 'garlic powder', 'onion powder', 'chili', 'cayenne', 'turmeric', 'ginger'],
  oils: ['olive oil', 'vegetable oil', 'canola oil', 'coconut oil', 'sesame oil', 'butter', 'ghee'],
  condiments: ['soy sauce', 'worcestershire', 'hot sauce', 'mustard', 'ketchup', 'mayo', 'vinegar', 'fish sauce'],
  baking: ['flour', 'sugar', 'baking powder', 'baking soda', 'yeast', 'vanilla', 'cocoa', 'chocolate chips', 'brown sugar', 'powdered sugar'],
  grains: ['rice', 'pasta', 'bread', 'oats', 'quinoa', 'couscous', 'noodles', 'tortilla'],
  canned: ['tomatoes', 'beans', 'broth', 'stock', 'coconut milk', 'chickpeas'],
  dairy: ['milk', 'cream', 'cheese', 'yogurt', 'sour cream', 'eggs'],
  produce: ['onion', 'garlic', 'lemon', 'lime', 'ginger', 'potato', 'carrot', 'celery'],
  proteins: ['chicken', 'beef', 'pork', 'fish', 'tofu', 'shrimp'],
  other: [],
};

function detectCategory(itemName: string): PantryCategory {
  const lower = itemName.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (category === 'other') continue;
    if (keywords.some(kw => lower.includes(kw))) {
      return category as PantryCategory;
    }
  }
  return 'other';
}

// ============================================
// Public API
// ============================================

/**
 * Record that an ingredient was used (checked off in grocery list)
 */
export function recordIngredientUsed(itemName: string): void {
  const pantry = loadPantry();
  const key = normalizeItemName(itemName);
  const existing = pantry.get(key);

  if (existing) {
    existing.lastUsed = new Date().toISOString();
    existing.useCount += 1;
  } else {
    pantry.set(key, {
      name: itemName,
      category: detectCategory(itemName),
      lastUsed: new Date().toISOString(),
      useCount: 1,
      alwaysHave: false,
    });
  }

  savePantry(pantry);
}

/**
 * Record multiple ingredients as used
 */
export function recordIngredientsUsed(itemNames: string[]): void {
  const pantry = loadPantry();
  const now = new Date().toISOString();

  for (const itemName of itemNames) {
    const key = normalizeItemName(itemName);
    const existing = pantry.get(key);

    if (existing) {
      existing.lastUsed = now;
      existing.useCount += 1;
    } else {
      pantry.set(key, {
        name: itemName,
        category: detectCategory(itemName),
        lastUsed: now,
        useCount: 1,
        alwaysHave: false,
      });
    }
  }

  savePantry(pantry);
}

/**
 * Mark an item as "always have" (commonly stocked)
 */
export function markAsAlwaysHave(itemName: string, alwaysHave: boolean = true): void {
  const pantry = loadPantry();
  const key = normalizeItemName(itemName);
  const existing = pantry.get(key);

  if (existing) {
    existing.alwaysHave = alwaysHave;
  } else {
    pantry.set(key, {
      name: itemName,
      category: detectCategory(itemName),
      lastUsed: new Date().toISOString(),
      useCount: 0,
      alwaysHave,
    });
  }

  savePantry(pantry);
}

/**
 * Check if an item is commonly stocked (frequently used or marked as always have)
 */
export function isCommonlyStocked(itemName: string): boolean {
  const pantry = loadPantry();
  const key = normalizeItemName(itemName);
  const item = pantry.get(key);

  if (!item) return false;
  if (item.alwaysHave) return true;

  // Consider commonly stocked if used 3+ times
  return item.useCount >= 3;
}

/**
 * Get all commonly stocked items
 */
export function getCommonlyStockedItems(): PantryItem[] {
  const pantry = loadPantry();
  return Array.from(pantry.values())
    .filter(item => item.alwaysHave || item.useCount >= 3)
    .sort((a, b) => b.useCount - a.useCount);
}

/**
 * Get all pantry items
 */
export function getAllPantryItems(): PantryItem[] {
  const pantry = loadPantry();
  return Array.from(pantry.values())
    .sort((a, b) => b.useCount - a.useCount);
}

/**
 * Get items by category
 */
export function getPantryItemsByCategory(category: PantryCategory): PantryItem[] {
  const pantry = loadPantry();
  return Array.from(pantry.values())
    .filter(item => item.category === category)
    .sort((a, b) => b.useCount - a.useCount);
}

/**
 * Get suggested items to auto-check based on pantry memory
 */
export function getSuggestedAutoCheck(ingredients: string[]): string[] {
  return ingredients.filter(ing => isCommonlyStocked(ing));
}

/**
 * Remove an item from pantry memory
 */
export function removeFromPantry(itemName: string): void {
  const pantry = loadPantry();
  const key = normalizeItemName(itemName);
  pantry.delete(key);
  savePantry(pantry);
}

/**
 * Clear all pantry data
 */
export function clearPantry(): void {
  localStorage.removeItem(PANTRY_KEY);
}

/**
 * Get pantry stats
 */
export function getPantryStats(): { totalItems: number; alwaysHave: number; categories: Record<PantryCategory, number> } {
  const pantry = loadPantry();
  const items = Array.from(pantry.values());

  const categories: Record<PantryCategory, number> = {
    spices: 0,
    oils: 0,
    condiments: 0,
    baking: 0,
    grains: 0,
    canned: 0,
    dairy: 0,
    produce: 0,
    proteins: 0,
    other: 0,
  };

  for (const item of items) {
    categories[item.category]++;
  }

  return {
    totalItems: items.length,
    alwaysHave: items.filter(i => i.alwaysHave).length,
    categories,
  };
}
