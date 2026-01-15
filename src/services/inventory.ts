// Inventory Tracking Service
// Phase 7 Feature - Track pantry quantities and auto-generate shopping lists

import type { Recipe, Ingredient } from '../types';
import { type PantryCategory, detectCategory } from './pantry';

// ============================================
// Types
// ============================================

export interface InventoryItem {
  id: string;
  name: string;
  category: PantryCategory;
  quantity: number;
  unit: string;
  lowThreshold: number;  // Alert when below this amount
  expirationDate?: string;  // ISO date string
  location?: 'pantry' | 'fridge' | 'freezer';
  notes?: string;
  lastUpdated: string;
  lastPurchased?: string;
  averagePrice?: number;  // Average price per unit
}

export interface ShoppingListItem {
  ingredientName: string;
  neededAmount: number;
  neededUnit: string;
  haveAmount: number;
  haveUnit: string;
  shortfall: number;
  recipes: string[];  // Which recipes need this
  estimatedCost?: number;
  priority: 'high' | 'medium' | 'low';
}

export interface InventoryStats {
  totalItems: number;
  lowStockItems: number;
  expiringItems: number;
  totalValue: number;
  byCategory: Record<PantryCategory, number>;
  byLocation: Record<string, number>;
}

// ============================================
// Storage
// ============================================

const INVENTORY_KEY = 'recipe_runner_inventory';

function loadInventory(): Map<string, InventoryItem> {
  try {
    const stored = localStorage.getItem(INVENTORY_KEY);
    if (stored) {
      const items: InventoryItem[] = JSON.parse(stored);
      return new Map(items.map(item => [normalizeItemName(item.name), item]));
    }
  } catch {
    // Ignore parse errors
  }
  return new Map();
}

function saveInventory(inventory: Map<string, InventoryItem>): void {
  const items = Array.from(inventory.values());
  localStorage.setItem(INVENTORY_KEY, JSON.stringify(items));
}

function normalizeItemName(name: string): string {
  return name.toLowerCase().trim();
}

function generateId(): string {
  return `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Re-export detectCategory from pantry for use here
export { detectCategory };

// ============================================
// Unit Conversion
// ============================================

const UNIT_CONVERSIONS: Record<string, Record<string, number>> = {
  // Volume conversions (base: ml)
  'ml': { 'ml': 1, 'l': 0.001, 'cup': 0.00423, 'tablespoon': 0.0676, 'tbsp': 0.0676, 'teaspoon': 0.203, 'tsp': 0.203 },
  'l': { 'ml': 1000, 'l': 1, 'cup': 4.23, 'tablespoon': 67.6, 'tbsp': 67.6, 'teaspoon': 203, 'tsp': 203 },
  'cup': { 'ml': 237, 'l': 0.237, 'cup': 1, 'tablespoon': 16, 'tbsp': 16, 'teaspoon': 48, 'tsp': 48 },
  'tablespoon': { 'ml': 14.8, 'l': 0.0148, 'cup': 0.0625, 'tablespoon': 1, 'tbsp': 1, 'teaspoon': 3, 'tsp': 3 },
  'tbsp': { 'ml': 14.8, 'l': 0.0148, 'cup': 0.0625, 'tablespoon': 1, 'tbsp': 1, 'teaspoon': 3, 'tsp': 3 },
  'teaspoon': { 'ml': 4.93, 'l': 0.00493, 'cup': 0.0208, 'tablespoon': 0.333, 'tbsp': 0.333, 'teaspoon': 1, 'tsp': 1 },
  'tsp': { 'ml': 4.93, 'l': 0.00493, 'cup': 0.0208, 'tablespoon': 0.333, 'tbsp': 0.333, 'teaspoon': 1, 'tsp': 1 },

  // Weight conversions (base: g)
  'g': { 'g': 1, 'kg': 0.001, 'oz': 0.0353, 'ounce': 0.0353, 'lb': 0.00220, 'pound': 0.00220 },
  'kg': { 'g': 1000, 'kg': 1, 'oz': 35.3, 'ounce': 35.3, 'lb': 2.20, 'pound': 2.20 },
  'oz': { 'g': 28.35, 'kg': 0.0284, 'oz': 1, 'ounce': 1, 'lb': 0.0625, 'pound': 0.0625 },
  'ounce': { 'g': 28.35, 'kg': 0.0284, 'oz': 1, 'ounce': 1, 'lb': 0.0625, 'pound': 0.0625 },
  'lb': { 'g': 454, 'kg': 0.454, 'oz': 16, 'ounce': 16, 'lb': 1, 'pound': 1 },
  'pound': { 'g': 454, 'kg': 0.454, 'oz': 16, 'ounce': 16, 'lb': 1, 'pound': 1 },
};

function normalizeUnit(unit: string): string {
  const unitMap: Record<string, string> = {
    'tablespoons': 'tablespoon',
    'teaspoons': 'teaspoon',
    'cups': 'cup',
    'ounces': 'ounce',
    'pounds': 'pound',
    'grams': 'g',
    'kilograms': 'kg',
    'liters': 'l',
    'milliliters': 'ml',
  };
  const lower = unit.toLowerCase().trim();
  return unitMap[lower] || lower;
}

function canConvert(fromUnit: string, toUnit: string): boolean {
  const from = normalizeUnit(fromUnit);
  const to = normalizeUnit(toUnit);
  return UNIT_CONVERSIONS[from]?.[to] !== undefined;
}

function convertAmount(amount: number, fromUnit: string, toUnit: string): number {
  const from = normalizeUnit(fromUnit);
  const to = normalizeUnit(toUnit);

  if (from === to) return amount;

  const conversion = UNIT_CONVERSIONS[from]?.[to];
  if (conversion !== undefined) {
    return amount * conversion;
  }

  return amount; // Can't convert, return as-is
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

// ============================================
// Inventory CRUD
// ============================================

export function addInventoryItem(item: Omit<InventoryItem, 'id' | 'lastUpdated'>): InventoryItem {
  const inventory = loadInventory();
  const key = normalizeItemName(item.name);

  const newItem: InventoryItem = {
    ...item,
    id: generateId(),
    lastUpdated: new Date().toISOString(),
  };

  inventory.set(key, newItem);
  saveInventory(inventory);
  return newItem;
}

export function updateInventoryItem(name: string, updates: Partial<InventoryItem>): InventoryItem | undefined {
  const inventory = loadInventory();
  const key = normalizeItemName(name);
  const existing = inventory.get(key);

  if (!existing) return undefined;

  const updated: InventoryItem = {
    ...existing,
    ...updates,
    lastUpdated: new Date().toISOString(),
  };

  inventory.set(key, updated);
  saveInventory(inventory);
  return updated;
}

export function removeInventoryItem(name: string): boolean {
  const inventory = loadInventory();
  const key = normalizeItemName(name);
  const deleted = inventory.delete(key);
  if (deleted) {
    saveInventory(inventory);
  }
  return deleted;
}

export function getInventoryItem(name: string): InventoryItem | undefined {
  const inventory = loadInventory();
  return inventory.get(normalizeItemName(name));
}

export function getAllInventoryItems(): InventoryItem[] {
  const inventory = loadInventory();
  return Array.from(inventory.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function getInventoryByCategory(category: PantryCategory): InventoryItem[] {
  return getAllInventoryItems().filter(item => item.category === category);
}

export function getInventoryByLocation(location: 'pantry' | 'fridge' | 'freezer'): InventoryItem[] {
  return getAllInventoryItems().filter(item => item.location === location);
}

// ============================================
// Quantity Management
// ============================================

export function adjustQuantity(name: string, change: number): InventoryItem | undefined {
  const inventory = loadInventory();
  const key = normalizeItemName(name);
  const existing = inventory.get(key);

  if (!existing) return undefined;

  const newQuantity = Math.max(0, existing.quantity + change);
  return updateInventoryItem(name, { quantity: newQuantity });
}

export function setQuantity(name: string, quantity: number): InventoryItem | undefined {
  return updateInventoryItem(name, { quantity: Math.max(0, quantity) });
}

export function useIngredient(name: string, amount: number, unit: string): InventoryItem | undefined {
  const item = getInventoryItem(name);
  if (!item) return undefined;

  let amountToDeduct = amount;
  if (canConvert(unit, item.unit)) {
    amountToDeduct = convertAmount(amount, unit, item.unit);
  }

  return adjustQuantity(name, -amountToDeduct);
}

export function recordPurchase(name: string, quantity: number, price?: number): InventoryItem | undefined {
  const item = getInventoryItem(name);
  if (!item) return undefined;

  const updates: Partial<InventoryItem> = {
    quantity: item.quantity + quantity,
    lastPurchased: new Date().toISOString(),
  };

  if (price !== undefined) {
    // Calculate running average price
    if (item.averagePrice !== undefined) {
      updates.averagePrice = (item.averagePrice + price / quantity) / 2;
    } else {
      updates.averagePrice = price / quantity;
    }
  }

  return updateInventoryItem(name, updates);
}

// ============================================
// Smart Shopping List
// ============================================

export function generateShoppingList(recipes: Recipe[]): ShoppingListItem[] {
  const inventory = loadInventory();
  const shoppingMap = new Map<string, ShoppingListItem>();

  for (const recipe of recipes) {
    for (const ingredient of recipe.ingredients) {
      const key = normalizeItemName(ingredient.item);
      const neededAmount = parseAmount(ingredient.amount);
      const neededUnit = normalizeUnit(ingredient.unit);

      const inventoryItem = inventory.get(key);
      let haveAmount = 0;
      let haveUnit = neededUnit;

      if (inventoryItem) {
        haveAmount = inventoryItem.quantity;
        haveUnit = inventoryItem.unit;

        // Try to convert to same units for comparison
        if (canConvert(haveUnit, neededUnit)) {
          haveAmount = convertAmount(inventoryItem.quantity, haveUnit, neededUnit);
          haveUnit = neededUnit;
        }
      }

      const existing = shoppingMap.get(key);
      if (existing) {
        existing.neededAmount += neededAmount;
        existing.shortfall = Math.max(0, existing.neededAmount - haveAmount);
        if (!existing.recipes.includes(recipe.name)) {
          existing.recipes.push(recipe.name);
        }
      } else {
        const shortfall = Math.max(0, neededAmount - haveAmount);
        shoppingMap.set(key, {
          ingredientName: ingredient.item,
          neededAmount,
          neededUnit,
          haveAmount,
          haveUnit,
          shortfall,
          recipes: [recipe.name],
          estimatedCost: inventoryItem?.averagePrice ? shortfall * inventoryItem.averagePrice : undefined,
          priority: determinePriority(ingredient, shortfall),
        });
      }
    }
  }

  // Filter to only items we need to buy
  return Array.from(shoppingMap.values())
    .filter(item => item.shortfall > 0)
    .sort((a, b) => {
      // Sort by priority, then by name
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.ingredientName.localeCompare(b.ingredientName);
    });
}

function determinePriority(ingredient: Ingredient, shortfall: number): 'high' | 'medium' | 'low' {
  if (ingredient.optional) return 'low';
  if (shortfall > 0 && !ingredient.substitutes?.length) return 'high';
  return 'medium';
}

export function getSmartShoppingList(recipe: Recipe): ShoppingListItem[] {
  return generateShoppingList([recipe]);
}

// ============================================
// Low Stock & Expiration Alerts
// ============================================

export function getLowStockItems(): InventoryItem[] {
  return getAllInventoryItems().filter(item => item.quantity <= item.lowThreshold);
}

export function getExpiringItems(daysAhead: number = 7): InventoryItem[] {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() + daysAhead);

  return getAllInventoryItems()
    .filter(item => {
      if (!item.expirationDate) return false;
      return new Date(item.expirationDate) <= cutoffDate;
    })
    .sort((a, b) => {
      if (!a.expirationDate || !b.expirationDate) return 0;
      return new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
    });
}

export function getExpiredItems(): InventoryItem[] {
  const today = new Date();
  return getAllInventoryItems()
    .filter(item => {
      if (!item.expirationDate) return false;
      return new Date(item.expirationDate) < today;
    });
}

// ============================================
// Statistics
// ============================================

export function getInventoryStats(): InventoryStats {
  const items = getAllInventoryItems();

  const byCategory: Record<PantryCategory, number> = {
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

  const byLocation: Record<string, number> = {
    pantry: 0,
    fridge: 0,
    freezer: 0,
    unspecified: 0,
  };

  let totalValue = 0;

  for (const item of items) {
    byCategory[item.category]++;
    byLocation[item.location || 'unspecified']++;
    if (item.averagePrice) {
      totalValue += item.quantity * item.averagePrice;
    }
  }

  return {
    totalItems: items.length,
    lowStockItems: getLowStockItems().length,
    expiringItems: getExpiringItems().length,
    totalValue,
    byCategory,
    byLocation,
  };
}

// ============================================
// Bulk Operations
// ============================================

export function deductIngredientsForRecipe(recipe: Recipe): void {
  for (const ingredient of recipe.ingredients) {
    useIngredient(ingredient.item, parseAmount(ingredient.amount), ingredient.unit);
  }
}

export function addItemsFromGroceryList(items: ShoppingListItem[]): void {
  for (const item of items) {
    const existing = getInventoryItem(item.ingredientName);
    if (existing) {
      recordPurchase(item.ingredientName, item.shortfall);
    } else {
      addInventoryItem({
        name: item.ingredientName,
        category: detectCategory(item.ingredientName),
        quantity: item.shortfall,
        unit: item.neededUnit,
        lowThreshold: Math.ceil(item.shortfall * 0.25), // 25% as low threshold
        location: 'pantry',
      });
    }
  }
}

export function clearInventory(): void {
  localStorage.removeItem(INVENTORY_KEY);
}

// ============================================
// Quick Add Common Items
// ============================================

export const COMMON_PANTRY_ITEMS: Array<{ name: string; unit: string; defaultQuantity: number; category: PantryCategory }> = [
  // Spices
  { name: 'Salt', unit: 'oz', defaultQuantity: 26, category: 'spices' },
  { name: 'Black Pepper', unit: 'oz', defaultQuantity: 4, category: 'spices' },
  { name: 'Garlic Powder', unit: 'oz', defaultQuantity: 3, category: 'spices' },
  { name: 'Paprika', unit: 'oz', defaultQuantity: 2, category: 'spices' },
  { name: 'Cumin', unit: 'oz', defaultQuantity: 2, category: 'spices' },
  { name: 'Italian Seasoning', unit: 'oz', defaultQuantity: 2, category: 'spices' },

  // Oils
  { name: 'Olive Oil', unit: 'ml', defaultQuantity: 500, category: 'oils' },
  { name: 'Vegetable Oil', unit: 'ml', defaultQuantity: 500, category: 'oils' },
  { name: 'Butter', unit: 'oz', defaultQuantity: 16, category: 'oils' },

  // Baking
  { name: 'All-Purpose Flour', unit: 'lb', defaultQuantity: 5, category: 'baking' },
  { name: 'Sugar', unit: 'lb', defaultQuantity: 4, category: 'baking' },
  { name: 'Brown Sugar', unit: 'lb', defaultQuantity: 2, category: 'baking' },
  { name: 'Baking Powder', unit: 'oz', defaultQuantity: 8, category: 'baking' },
  { name: 'Baking Soda', unit: 'oz', defaultQuantity: 16, category: 'baking' },
  { name: 'Vanilla Extract', unit: 'oz', defaultQuantity: 4, category: 'baking' },

  // Grains
  { name: 'Rice', unit: 'lb', defaultQuantity: 5, category: 'grains' },
  { name: 'Pasta', unit: 'lb', defaultQuantity: 2, category: 'grains' },

  // Condiments
  { name: 'Soy Sauce', unit: 'oz', defaultQuantity: 10, category: 'condiments' },
  { name: 'Vinegar', unit: 'oz', defaultQuantity: 16, category: 'condiments' },

  // Canned
  { name: 'Chicken Broth', unit: 'oz', defaultQuantity: 32, category: 'canned' },
  { name: 'Canned Tomatoes', unit: 'oz', defaultQuantity: 28, category: 'canned' },
];

export function addCommonPantryItems(): void {
  for (const item of COMMON_PANTRY_ITEMS) {
    const existing = getInventoryItem(item.name);
    if (!existing) {
      addInventoryItem({
        name: item.name,
        category: item.category,
        quantity: item.defaultQuantity,
        unit: item.unit,
        lowThreshold: Math.ceil(item.defaultQuantity * 0.2),
        location: 'pantry',
      });
    }
  }
}
