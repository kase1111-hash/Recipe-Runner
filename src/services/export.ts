// Recipe Export Service
// Phase 5 Feature - Export cookbooks and recipes

import type { Cookbook, Recipe, Ingredient } from '../types';
import { getRecipesByCookbook } from '../db';

// ============================================
// Types
// ============================================

export type ExportFormat = 'json' | 'markdown' | 'text';

export interface ExportOptions {
  format: ExportFormat;
  includeHistory?: boolean;
  includeNotes?: boolean;
}

// ============================================
// Shopping List Export
// ============================================

export interface ShoppingListOptions {
  includeChecked?: boolean;
  groupByCategory?: boolean;
  format: 'text' | 'markdown';
}

const SHOPPING_CATEGORIES: Record<string, string[]> = {
  'Produce': ['onion', 'garlic', 'tomato', 'pepper', 'lettuce', 'spinach', 'carrot', 'celery', 'potato', 'mushroom', 'lemon', 'lime', 'apple', 'banana', 'ginger', 'herb', 'basil', 'cilantro', 'parsley', 'thyme', 'rosemary'],
  'Meat & Seafood': ['chicken', 'beef', 'pork', 'fish', 'salmon', 'shrimp', 'turkey', 'lamb', 'bacon', 'sausage'],
  'Dairy & Eggs': ['milk', 'cream', 'butter', 'cheese', 'yogurt', 'sour cream', 'egg'],
  'Bakery': ['bread', 'tortilla', 'bun', 'roll'],
  'Pantry': ['flour', 'sugar', 'oil', 'vinegar', 'broth', 'stock', 'pasta', 'rice', 'can', 'sauce', 'honey', 'maple'],
  'Spices': ['salt', 'pepper', 'cumin', 'paprika', 'cinnamon', 'oregano', 'chili', 'curry', 'turmeric'],
  'Other': [],
};

function categorizeIngredient(item: string): string {
  const lower = item.toLowerCase();
  for (const [category, keywords] of Object.entries(SHOPPING_CATEGORIES)) {
    if (category === 'Other') continue;
    if (keywords.some(kw => lower.includes(kw))) {
      return category;
    }
  }
  return 'Other';
}

export function generateShoppingList(
  ingredients: Ingredient[],
  checkedItems: string[],
  options: ShoppingListOptions = { format: 'text' }
): string {
  const items = options.includeChecked
    ? ingredients
    : ingredients.filter(ing => !checkedItems.includes(ing.item));

  if (items.length === 0) {
    return 'All items checked off!';
  }

  if (options.groupByCategory) {
    const grouped: Record<string, Ingredient[]> = {};

    for (const item of items) {
      const category = categorizeIngredient(item.item);
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(item);
    }

    if (options.format === 'markdown') {
      let md = '# Shopping List\n\n';
      for (const [category, categoryItems] of Object.entries(grouped)) {
        if (categoryItems.length === 0) continue;
        md += `## ${category}\n`;
        for (const item of categoryItems) {
          md += `- [ ] ${item.amount} ${item.unit} ${item.item}${item.prep ? ` (${item.prep})` : ''}\n`;
        }
        md += '\n';
      }
      return md;
    } else {
      let text = 'SHOPPING LIST\n' + '='.repeat(40) + '\n\n';
      for (const [category, categoryItems] of Object.entries(grouped)) {
        if (categoryItems.length === 0) continue;
        text += `${category.toUpperCase()}\n`;
        text += '-'.repeat(20) + '\n';
        for (const item of categoryItems) {
          text += `• ${item.amount} ${item.unit} ${item.item}${item.prep ? ` (${item.prep})` : ''}\n`;
        }
        text += '\n';
      }
      return text;
    }
  }

  // Simple list
  if (options.format === 'markdown') {
    let md = '# Shopping List\n\n';
    for (const item of items) {
      md += `- [ ] ${item.amount} ${item.unit} ${item.item}${item.prep ? ` (${item.prep})` : ''}\n`;
    }
    return md;
  } else {
    let text = 'SHOPPING LIST\n' + '='.repeat(40) + '\n\n';
    for (const item of items) {
      text += `• ${item.amount} ${item.unit} ${item.item}${item.prep ? ` (${item.prep})` : ''}\n`;
    }
    return text;
  }
}

// ============================================
// Recipe Export
// ============================================

export function exportRecipeAsJSON(recipe: Recipe, options?: ExportOptions): string {
  const exportData = { ...recipe };

  if (!options?.includeHistory) {
    exportData.cook_history = [];
  }

  return JSON.stringify(exportData, null, 2);
}

export function exportRecipeAsMarkdown(recipe: Recipe, options?: ExportOptions): string {
  let md = `# ${recipe.name}\n\n`;

  if (recipe.description) {
    md += `${recipe.description}\n\n`;
  }

  md += `**Yield:** ${recipe.yield}  \n`;
  md += `**Total Time:** ${recipe.total_time}  \n`;
  md += `**Active Time:** ${recipe.active_time}  \n`;
  md += `**Difficulty:** ${recipe.difficulty.overall}/5\n\n`;

  if (recipe.safe_temp) {
    md += `**Safe Temperature:** ${recipe.safe_temp.value}${recipe.safe_temp.unit}`;
    if (recipe.safe_temp.location) {
      md += ` (${recipe.safe_temp.location})`;
    }
    md += '\n\n';
  }

  // Equipment
  if (recipe.equipment.length > 0) {
    md += `## Equipment\n\n`;
    for (const eq of recipe.equipment) {
      md += `- ${eq}\n`;
    }
    md += '\n';
  }

  // Ingredients
  md += `## Ingredients\n\n`;
  for (const ing of recipe.ingredients) {
    md += `- ${ing.amount} ${ing.unit} ${ing.item}`;
    if (ing.prep) md += `, ${ing.prep}`;
    if (ing.optional) md += ' *(optional)*';
    md += '\n';
  }
  md += '\n';

  // Steps
  md += `## Instructions\n\n`;
  for (const step of recipe.steps) {
    md += `### ${step.index + 1}. ${step.title}\n\n`;
    md += `${step.instruction}\n\n`;
    if (step.time_display) {
      md += `*Time: ${step.time_display} (${step.type})*\n\n`;
    }
    if (step.tip) {
      md += `> **Tip:** ${step.tip}\n\n`;
    }
  }

  // Notes
  if (options?.includeNotes && recipe.notes) {
    md += `## Notes\n\n${recipe.notes}\n\n`;
  }

  // Tags
  if (recipe.tags.length > 0) {
    md += `---\n\n*Tags: ${recipe.tags.join(', ')}*\n`;
  }

  return md;
}

export function exportRecipeAsText(recipe: Recipe): string {
  let text = `${'='.repeat(50)}\n`;
  text += `${recipe.name.toUpperCase()}\n`;
  text += `${'='.repeat(50)}\n\n`;

  if (recipe.description) {
    text += `${recipe.description}\n\n`;
  }

  text += `Yield: ${recipe.yield}\n`;
  text += `Total Time: ${recipe.total_time}\n`;
  text += `Active Time: ${recipe.active_time}\n`;
  text += `Difficulty: ${recipe.difficulty.overall}/5\n\n`;

  // Equipment
  if (recipe.equipment.length > 0) {
    text += `EQUIPMENT\n${'-'.repeat(30)}\n`;
    for (const eq of recipe.equipment) {
      text += `• ${eq}\n`;
    }
    text += '\n';
  }

  // Ingredients
  text += `INGREDIENTS\n${'-'.repeat(30)}\n`;
  for (const ing of recipe.ingredients) {
    text += `• ${ing.amount} ${ing.unit} ${ing.item}`;
    if (ing.prep) text += `, ${ing.prep}`;
    if (ing.optional) text += ' (optional)';
    text += '\n';
  }
  text += '\n';

  // Steps
  text += `INSTRUCTIONS\n${'-'.repeat(30)}\n\n`;
  for (const step of recipe.steps) {
    text += `${step.index + 1}. ${step.title.toUpperCase()}\n`;
    text += `   ${step.instruction}\n`;
    if (step.time_display) {
      text += `   [${step.time_display} - ${step.type}]\n`;
    }
    if (step.tip) {
      text += `   TIP: ${step.tip}\n`;
    }
    text += '\n';
  }

  return text;
}

export function exportRecipe(recipe: Recipe, options: ExportOptions = { format: 'json' }): string {
  switch (options.format) {
    case 'markdown':
      return exportRecipeAsMarkdown(recipe, options);
    case 'text':
      return exportRecipeAsText(recipe);
    case 'json':
    default:
      return exportRecipeAsJSON(recipe, options);
  }
}

// ============================================
// Cookbook Export
// ============================================

export async function exportCookbookAsJSON(
  cookbook: Cookbook,
  options?: ExportOptions
): Promise<string> {
  const recipes = await getRecipesByCookbook(cookbook.id);

  const exportData = {
    cookbook: {
      title: cookbook.title,
      description: cookbook.description,
      author: cookbook.author,
      category: cookbook.category,
      created_at: cookbook.created_at,
    },
    recipes: recipes.map(recipe => {
      const r = { ...recipe };
      if (!options?.includeHistory) {
        r.cook_history = [];
      }
      return r;
    }),
    exported_at: new Date().toISOString(),
    version: '1.0',
  };

  return JSON.stringify(exportData, null, 2);
}

export async function exportCookbookAsMarkdown(
  cookbook: Cookbook,
  options?: ExportOptions
): Promise<string> {
  const recipes = await getRecipesByCookbook(cookbook.id);

  let md = `# ${cookbook.title}\n\n`;
  md += `*${cookbook.description}*\n\n`;
  md += `**Author:** ${cookbook.author}  \n`;
  md += `**Category:** ${cookbook.category}  \n`;
  md += `**Recipes:** ${recipes.length}\n\n`;
  md += '---\n\n';

  for (const recipe of recipes) {
    md += exportRecipeAsMarkdown(recipe, options);
    md += '\n---\n\n';
  }

  return md;
}

export async function exportCookbook(
  cookbook: Cookbook,
  options: ExportOptions = { format: 'json' }
): Promise<string> {
  switch (options.format) {
    case 'markdown':
      return await exportCookbookAsMarkdown(cookbook, options);
    case 'json':
    default:
      return await exportCookbookAsJSON(cookbook, options);
  }
}

// ============================================
// Download Helpers
// ============================================

export function downloadAsFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

export function copyToClipboard(content: string): Promise<void> {
  return navigator.clipboard.writeText(content);
}

export function shareContent(title: string, text: string): Promise<void> {
  if (navigator.share) {
    return navigator.share({ title, text });
  }
  return copyToClipboard(text);
}
