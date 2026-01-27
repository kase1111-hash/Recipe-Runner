import { type PantryCategory } from '../../services/pantry';

export const CATEGORY_LABELS: Record<PantryCategory, string> = {
  spices: 'Spices & Seasonings',
  oils: 'Oils & Fats',
  condiments: 'Condiments & Sauces',
  baking: 'Baking Supplies',
  grains: 'Grains & Pasta',
  canned: 'Canned Goods',
  dairy: 'Dairy & Eggs',
  produce: 'Fresh Produce',
  proteins: 'Proteins',
  other: 'Other',
};

export const LOCATION_LABELS: Record<string, string> = {
  pantry: 'Pantry',
  fridge: 'Refrigerator',
  freezer: 'Freezer',
};
