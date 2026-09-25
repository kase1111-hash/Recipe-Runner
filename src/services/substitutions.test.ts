import { describe, it, expect } from 'vitest';
import { findSubstitutions, filterByDietary } from './substitutions';
import type { Ingredient } from '../types';

function ing(item: string): Ingredient {
  return { item, amount: '1', unit: '', prep: null, optional: false, substitutes: [] };
}

function subsFor(item: string): string[] | null {
  const result = findSubstitutions(ing(item));
  return result ? result.substitutes.map((s) => s.substitute) : null;
}

describe('findSubstitutions', () => {
  it('finds direct matches', () => {
    expect(subsFor('butter')).toContain('coconut oil');
    expect(subsFor('Eggs')).toContain('flax eggs');
    expect(findSubstitutions(ing('milk'))?.category).toBe('Dairy');
  });

  it('matches keys as whole words within longer names', () => {
    expect(subsFor('unsalted butter')).toContain('coconut oil');
    expect(subsFor('whole milk')).toContain('oat milk');
    expect(subsFor('yellow onion')).toContain('shallots');
    expect(subsFor('extra-virgin olive oil')).toContain('avocado oil');
  });

  it('does not match inside other words', () => {
    // 'butter' is not in butternut; 'egg' is not in eggplant
    expect(findSubstitutions(ing('butternut squash'))).toBeNull();
    expect(findSubstitutions(ing('eggplant'))).toBeNull();
    // 'milk' is part of buttermilk, which has its own entry
    expect(subsFor('buttermilk')).toContain('milk + lemon juice');
  });

  it('does not match when the key only modifies a different ingredient', () => {
    expect(findSubstitutions(ing('egg noodles'))).toBeNull();
    expect(findSubstitutions(ing('sugar snap peas'))).toBeNull();
    expect(findSubstitutions(ing('milk chocolate chips'))).toBeNull();
    expect(findSubstitutions(ing('garlic powder'))).toBeNull();
    expect(findSubstitutions(ing('mustard seeds'))).toBeNull();
  });

  it('does not match an ingredient that is merely part of a longer key', () => {
    // Previously "rice" matched 'rice vinegar' via key.includes(item)
    expect(findSubstitutions(ing('rice'))).toBeNull();
    expect(findSubstitutions(ing('brown rice'))).toBeNull();
    expect(findSubstitutions(ing('vinegar'))).toBeNull();
  });

  it('prefers the longest matching key', () => {
    expect(subsFor('light brown sugar')).toContain('white sugar + molasses');
    expect(subsFor('reduced-fat cream cheese')).toContain('cashew cream cheese');
    expect(subsFor('egg whites')).toEqual(['aquafaba']);
    expect(subsFor('large eggs')).toContain('flax eggs');
    expect(subsFor('seasoned rice vinegar')).toContain('apple cider vinegar');
  });

  it('allows form words and prep notes after the ingredient', () => {
    expect(subsFor('garlic cloves')).toContain('garlic powder');
    expect(subsFor('cloves garlic')).toContain('garlic powder');
    expect(subsFor('fresh basil leaves')).toContain('dried basil');
    expect(subsFor('butter, softened')).toContain('coconut oil');
    expect(subsFor('large eggs (room temperature)')).toContain('flax eggs');
    expect(subsFor('olive oil for frying')).toContain('avocado oil');
  });

  it('resolves bare herb names to their fresh entries, but not dried ones', () => {
    expect(subsFor('thyme')).toContain('dried thyme');
    expect(subsFor('Parsley')).toContain('dried parsley');
    expect(findSubstitutions(ing('dried thyme'))).toBeNull();
  });

  it('returns null for unknown or empty ingredients', () => {
    expect(findSubstitutions(ing('dragon fruit'))).toBeNull();
    expect(findSubstitutions(ing(''))).toBeNull();
  });

  it('keeps the original ingredient on the result', () => {
    const original = ing('unsalted butter');
    expect(findSubstitutions(original)?.original).toBe(original);
  });
});

describe('filterByDietary', () => {
  it('keeps only substitutes carrying every requested tag', () => {
    const subs = findSubstitutions(ing('butter'))!.substitutes;
    const vegan = filterByDietary(subs, ['vegan']);
    expect(vegan.length).toBeGreaterThan(0);
    expect(vegan.every((s) => s.dietaryTags?.includes('vegan'))).toBe(true);
    expect(filterByDietary(subs, [])).toBe(subs);
  });
});
