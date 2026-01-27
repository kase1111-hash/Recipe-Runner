import { describe, it, expect } from 'vitest';
import { CATEGORY_LABELS, LOCATION_LABELS } from './inventoryConstants';

describe('inventoryConstants', () => {
  describe('CATEGORY_LABELS', () => {
    it('has labels for all expected categories', () => {
      const expectedCategories = [
        'spices',
        'oils',
        'condiments',
        'baking',
        'grains',
        'canned',
        'dairy',
        'produce',
        'proteins',
        'other',
      ];

      for (const category of expectedCategories) {
        expect(CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]).toBeDefined();
        expect(typeof CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]).toBe('string');
      }
    });

    it('has human-readable labels', () => {
      expect(CATEGORY_LABELS.spices).toBe('Spices & Seasonings');
      expect(CATEGORY_LABELS.dairy).toBe('Dairy & Eggs');
      expect(CATEGORY_LABELS.produce).toBe('Fresh Produce');
    });
  });

  describe('LOCATION_LABELS', () => {
    it('has labels for all storage locations', () => {
      expect(LOCATION_LABELS.pantry).toBe('Pantry');
      expect(LOCATION_LABELS.fridge).toBe('Refrigerator');
      expect(LOCATION_LABELS.freezer).toBe('Freezer');
    });

    it('has exactly three locations', () => {
      expect(Object.keys(LOCATION_LABELS)).toHaveLength(3);
    });
  });
});
