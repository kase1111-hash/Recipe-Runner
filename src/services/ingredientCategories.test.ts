import { describe, it, expect } from 'vitest';
import { categorizeIngredient } from './ingredientCategories';

describe('categorizeIngredient', () => {
  it('files peppercorn-style pepper under spices, not produce', () => {
    expect(categorizeIngredient('black pepper')).toBe('spices');
    expect(categorizeIngredient('black pepper, freshly ground')).toBe('spices');
    expect(categorizeIngredient('freshly ground black pepper')).toBe('spices');
    expect(categorizeIngredient('white pepper')).toBe('spices');
    expect(categorizeIngredient('whole black peppercorns')).toBe('spices');
    expect(categorizeIngredient('red pepper flakes')).toBe('spices');
    expect(categorizeIngredient('crushed red pepper')).toBe('spices');
    expect(categorizeIngredient('cayenne pepper')).toBe('spices');
    expect(categorizeIngredient('pepper')).toBe('spices');
    expect(categorizeIngredient('salt and pepper')).toBe('spices');
  });

  it('keeps fresh peppers in produce', () => {
    expect(categorizeIngredient('red bell pepper')).toBe('produce');
    expect(categorizeIngredient('green peppers')).toBe('produce');
    expect(categorizeIngredient('jalapeño')).toBe('produce');
    expect(categorizeIngredient('peppers')).toBe('produce');
    expect(categorizeIngredient('roasted red peppers')).toBe('produce');
  });

  it('treats "ground <spice>" as a spice, but ground meat as a protein', () => {
    expect(categorizeIngredient('ground cumin')).toBe('spices');
    expect(categorizeIngredient('ground cinnamon')).toBe('spices');
    expect(categorizeIngredient('ground ginger')).toBe('spices');
    expect(categorizeIngredient('ground beef')).toBe('proteins');
    expect(categorizeIngredient('lean ground turkey')).toBe('proteins');
  });

  it('treats powders, seasoned salts and dried herbs as spices', () => {
    expect(categorizeIngredient('garlic powder')).toBe('spices');
    expect(categorizeIngredient('onion powder')).toBe('spices');
    expect(categorizeIngredient('garlic salt')).toBe('spices');
    expect(categorizeIngredient('dried thyme')).toBe('spices');
    expect(categorizeIngredient('dried oregano')).toBe('spices');
    expect(categorizeIngredient('whole cloves')).toBe('spices');
  });

  it('keeps fresh aromatics and herbs in produce', () => {
    expect(categorizeIngredient('garlic')).toBe('produce');
    expect(categorizeIngredient('garlic cloves')).toBe('produce');
    expect(categorizeIngredient('ginger')).toBe('produce');
    expect(categorizeIngredient('fresh thyme')).toBe('produce');
    expect(categorizeIngredient('fresh oregano')).toBe('produce');
    expect(categorizeIngredient('oregano')).toBe('spices');
  });

  it('matches whole words only', () => {
    // 'egg' must not match eggplant
    expect(categorizeIngredient('eggplant')).toBe('produce');
    // 'butter' must not match butternut
    expect(categorizeIngredient('butternut squash')).toBe('produce');
    // 'can' must not match pecans / candied
    expect(categorizeIngredient('candied pecans')).toBe('pantry');
    // 'salt' must not match unsalted
    expect(categorizeIngredient('unsalted butter')).toBe('dairy');
    expect(categorizeIngredient('buttermilk')).toBe('dairy');
  });

  it('uses the head noun of compound names', () => {
    expect(categorizeIngredient('chicken broth')).toBe('pantry');
    expect(categorizeIngredient('egg noodles')).toBe('pantry');
    expect(categorizeIngredient('peanut butter')).toBe('pantry');
    expect(categorizeIngredient('sugar snap peas')).toBe('produce');
    expect(categorizeIngredient('green beans')).toBe('produce');
    expect(categorizeIngredient('cream cheese')).toBe('dairy');
    expect(categorizeIngredient('pepper jack cheese')).toBe('dairy');
  });

  it('accepts simple plurals', () => {
    expect(categorizeIngredient('onions')).toBe('produce');
    expect(categorizeIngredient('tomatoes')).toBe('produce');
    expect(categorizeIngredient('large eggs')).toBe('eggs');
    expect(categorizeIngredient('egg whites')).toBe('eggs');
  });

  it('puts canned goods in the pantry', () => {
    expect(categorizeIngredient('canned diced tomatoes')).toBe('pantry');
    expect(categorizeIngredient('1 can chickpeas')).toBe('pantry');
  });

  it('categorizes the sample Roast Chicken ingredients sensibly', () => {
    expect(categorizeIngredient('whole chicken')).toBe('proteins');
    expect(categorizeIngredient('unsalted butter')).toBe('dairy');
    expect(categorizeIngredient('fresh rosemary')).toBe('produce');
    expect(categorizeIngredient('lemon')).toBe('produce');
    expect(categorizeIngredient('kosher salt')).toBe('spices');
  });

  it('is case-insensitive and falls back to other', () => {
    expect(categorizeIngredient('Black Pepper')).toBe('spices');
    expect(categorizeIngredient('CHICKEN BREAST')).toBe('proteins');
    expect(categorizeIngredient('water')).toBe('other');
    expect(categorizeIngredient('')).toBe('other');
  });
});
