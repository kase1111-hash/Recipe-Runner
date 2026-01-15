// Ingredient Substitutions Service
// Phase 4 Smart Feature - Common ingredient swaps

import type { Ingredient } from '../types';

// ============================================
// Types
// ============================================

export interface Substitution {
  substitute: string;
  ratio: string;
  notes: string;
  dietaryTags?: DietaryTag[];
}

export type DietaryTag =
  | 'vegan'
  | 'vegetarian'
  | 'dairy-free'
  | 'gluten-free'
  | 'nut-free'
  | 'egg-free'
  | 'low-sodium'
  | 'low-sugar'
  | 'keto';

export interface SubstitutionResult {
  original: Ingredient;
  substitutes: Substitution[];
  category: string;
}

// ============================================
// Substitution Database
// ============================================

const SUBSTITUTIONS: Record<string, { category: string; subs: Substitution[] }> = {
  // Dairy
  'butter': {
    category: 'Dairy',
    subs: [
      { substitute: 'coconut oil', ratio: '1:1', notes: 'Works well for baking, adds slight coconut flavor', dietaryTags: ['vegan', 'dairy-free'] },
      { substitute: 'olive oil', ratio: '3/4 cup per 1 cup butter', notes: 'Best for savory dishes', dietaryTags: ['vegan', 'dairy-free'] },
      { substitute: 'applesauce', ratio: '1/2 cup per 1 cup butter', notes: 'For baking, reduces fat content', dietaryTags: ['vegan', 'dairy-free', 'low-sugar'] },
      { substitute: 'avocado', ratio: '1:1', notes: 'Creamy texture, subtle flavor', dietaryTags: ['vegan', 'dairy-free'] },
      { substitute: 'Greek yogurt', ratio: '1/2 cup per 1 cup butter', notes: 'For baking, adds moisture', dietaryTags: ['vegetarian'] },
      { substitute: 'margarine', ratio: '1:1', notes: 'Check label for dairy content', dietaryTags: ['dairy-free'] },
    ],
  },
  'milk': {
    category: 'Dairy',
    subs: [
      { substitute: 'oat milk', ratio: '1:1', notes: 'Creamy, great for baking', dietaryTags: ['vegan', 'dairy-free', 'nut-free'] },
      { substitute: 'almond milk', ratio: '1:1', notes: 'Lighter, slight nutty flavor', dietaryTags: ['vegan', 'dairy-free'] },
      { substitute: 'coconut milk', ratio: '1:1', notes: 'Richer, adds coconut flavor', dietaryTags: ['vegan', 'dairy-free', 'nut-free'] },
      { substitute: 'soy milk', ratio: '1:1', notes: 'Protein-rich, neutral flavor', dietaryTags: ['vegan', 'dairy-free', 'nut-free'] },
      { substitute: 'cashew milk', ratio: '1:1', notes: 'Creamy and mild', dietaryTags: ['vegan', 'dairy-free'] },
      { substitute: 'water + butter', ratio: '1 cup water + 1 tbsp butter', notes: 'In a pinch for cooking' },
    ],
  },
  'heavy cream': {
    category: 'Dairy',
    subs: [
      { substitute: 'coconut cream', ratio: '1:1', notes: 'Great for whipping, coconut flavor', dietaryTags: ['vegan', 'dairy-free'] },
      { substitute: 'cashew cream', ratio: '1:1', notes: 'Blend soaked cashews with water', dietaryTags: ['vegan', 'dairy-free'] },
      { substitute: 'silken tofu', ratio: '1:1 blended', notes: 'For creamy sauces', dietaryTags: ['vegan', 'dairy-free'] },
      { substitute: 'milk + butter', ratio: '3/4 cup milk + 1/4 cup melted butter', notes: 'Not for whipping' },
      { substitute: 'evaporated milk', ratio: '1:1', notes: 'Lighter option' },
    ],
  },
  'sour cream': {
    category: 'Dairy',
    subs: [
      { substitute: 'Greek yogurt', ratio: '1:1', notes: 'Tangier, higher protein', dietaryTags: ['vegetarian'] },
      { substitute: 'coconut cream + lemon', ratio: '1 cup + 1 tbsp lemon juice', notes: 'Let sit 5 min', dietaryTags: ['vegan', 'dairy-free'] },
      { substitute: 'cashew sour cream', ratio: '1:1', notes: 'Blend cashews, lemon, vinegar', dietaryTags: ['vegan', 'dairy-free'] },
      { substitute: 'cottage cheese blended', ratio: '1:1', notes: 'Blend until smooth', dietaryTags: ['vegetarian'] },
    ],
  },
  'buttermilk': {
    category: 'Dairy',
    subs: [
      { substitute: 'milk + lemon juice', ratio: '1 cup milk + 1 tbsp lemon juice', notes: 'Let sit 5-10 minutes' },
      { substitute: 'milk + vinegar', ratio: '1 cup milk + 1 tbsp white vinegar', notes: 'Let sit 5-10 minutes' },
      { substitute: 'plain yogurt + milk', ratio: '3/4 cup yogurt + 1/4 cup milk', notes: 'Stir well' },
      { substitute: 'oat milk + lemon', ratio: '1 cup + 1 tbsp lemon juice', notes: 'Vegan option, let sit 5 min', dietaryTags: ['vegan', 'dairy-free'] },
    ],
  },
  'cream cheese': {
    category: 'Dairy',
    subs: [
      { substitute: 'cashew cream cheese', ratio: '1:1', notes: 'Blend cashews with lemon and salt', dietaryTags: ['vegan', 'dairy-free'] },
      { substitute: 'cottage cheese blended', ratio: '1:1', notes: 'Blend until very smooth', dietaryTags: ['vegetarian'] },
      { substitute: 'Greek yogurt + butter', ratio: '1 cup + 2 tbsp butter', notes: 'Blend together' },
      { substitute: 'silken tofu', ratio: '1:1 blended', notes: 'Add lemon juice and salt', dietaryTags: ['vegan', 'dairy-free'] },
    ],
  },
  'cheese': {
    category: 'Dairy',
    subs: [
      { substitute: 'nutritional yeast', ratio: '2-3 tbsp per 1/4 cup cheese', notes: 'Adds cheesy, nutty flavor', dietaryTags: ['vegan', 'dairy-free'] },
      { substitute: 'cashew cheese', ratio: '1:1', notes: 'Many store-bought options', dietaryTags: ['vegan', 'dairy-free'] },
      { substitute: 'tofu (firm)', ratio: '1:1 crumbled', notes: 'For ricotta-style applications', dietaryTags: ['vegan', 'dairy-free'] },
    ],
  },

  // Eggs
  'egg': {
    category: 'Eggs',
    subs: [
      { substitute: 'flax egg', ratio: '1 tbsp ground flax + 3 tbsp water per egg', notes: 'Let sit 5 minutes, works in baking', dietaryTags: ['vegan', 'egg-free'] },
      { substitute: 'chia egg', ratio: '1 tbsp chia + 3 tbsp water per egg', notes: 'Let sit 5 minutes', dietaryTags: ['vegan', 'egg-free'] },
      { substitute: 'mashed banana', ratio: '1/4 cup per egg', notes: 'Adds sweetness and moisture', dietaryTags: ['vegan', 'egg-free'] },
      { substitute: 'applesauce', ratio: '1/4 cup per egg', notes: 'For baking, adds moisture', dietaryTags: ['vegan', 'egg-free'] },
      { substitute: 'silken tofu', ratio: '1/4 cup blended per egg', notes: 'For dense baked goods', dietaryTags: ['vegan', 'egg-free'] },
      { substitute: 'aquafaba', ratio: '3 tbsp per egg', notes: 'Chickpea liquid, great for meringue', dietaryTags: ['vegan', 'egg-free'] },
      { substitute: 'commercial egg replacer', ratio: 'Follow package directions', notes: 'Bob\'s Red Mill, JUST Egg, etc.', dietaryTags: ['vegan', 'egg-free'] },
    ],
  },
  'eggs': {
    category: 'Eggs',
    subs: [
      { substitute: 'flax eggs', ratio: '1 tbsp ground flax + 3 tbsp water per egg', notes: 'Let sit 5 minutes', dietaryTags: ['vegan', 'egg-free'] },
      { substitute: 'chia eggs', ratio: '1 tbsp chia + 3 tbsp water per egg', notes: 'Let sit 5 minutes', dietaryTags: ['vegan', 'egg-free'] },
      { substitute: 'mashed banana', ratio: '1/4 cup per egg', notes: 'Adds sweetness', dietaryTags: ['vegan', 'egg-free'] },
      { substitute: 'applesauce', ratio: '1/4 cup per egg', notes: 'For baking', dietaryTags: ['vegan', 'egg-free'] },
    ],
  },
  'egg white': {
    category: 'Eggs',
    subs: [
      { substitute: 'aquafaba', ratio: '2 tbsp per white', notes: 'Chickpea liquid, whips like whites', dietaryTags: ['vegan', 'egg-free'] },
    ],
  },
  'egg yolk': {
    category: 'Eggs',
    subs: [
      { substitute: 'soy lecithin', ratio: '1/2 tsp per yolk', notes: 'For emulsification', dietaryTags: ['vegan', 'egg-free'] },
    ],
  },

  // Flour & Grains
  'all-purpose flour': {
    category: 'Flour',
    subs: [
      { substitute: 'whole wheat flour', ratio: '3/4 cup per 1 cup', notes: 'Denser result, more fiber' },
      { substitute: 'almond flour', ratio: '1:1', notes: 'For low-carb, denser result', dietaryTags: ['gluten-free', 'keto'] },
      { substitute: 'oat flour', ratio: '1:1', notes: 'Grind oats, slightly sweet', dietaryTags: ['gluten-free'] },
      { substitute: 'gluten-free flour blend', ratio: '1:1', notes: 'Check binding needs', dietaryTags: ['gluten-free'] },
      { substitute: 'coconut flour', ratio: '1/4 cup per 1 cup', notes: 'Absorbs liquid, add more eggs/liquid', dietaryTags: ['gluten-free', 'keto'] },
      { substitute: 'rice flour', ratio: '7/8 cup per 1 cup', notes: 'Lighter texture', dietaryTags: ['gluten-free'] },
    ],
  },
  'bread crumbs': {
    category: 'Flour',
    subs: [
      { substitute: 'crushed crackers', ratio: '1:1', notes: 'Saltines, Ritz, etc.' },
      { substitute: 'rolled oats', ratio: '1:1 pulsed', notes: 'Pulse in food processor', dietaryTags: ['gluten-free'] },
      { substitute: 'crushed cornflakes', ratio: '1:1', notes: 'Extra crispy', dietaryTags: ['gluten-free'] },
      { substitute: 'almond meal', ratio: '1:1', notes: 'Low-carb option', dietaryTags: ['gluten-free', 'keto'] },
      { substitute: 'crushed pork rinds', ratio: '1:1', notes: 'Keto-friendly, savory', dietaryTags: ['gluten-free', 'keto'] },
    ],
  },

  // Sweeteners
  'sugar': {
    category: 'Sweeteners',
    subs: [
      { substitute: 'honey', ratio: '3/4 cup per 1 cup, reduce liquid', notes: 'Adds moisture, reduce oven temp 25°F' },
      { substitute: 'maple syrup', ratio: '3/4 cup per 1 cup, reduce liquid', notes: 'Distinct flavor' },
      { substitute: 'coconut sugar', ratio: '1:1', notes: 'Lower glycemic, caramel flavor' },
      { substitute: 'stevia', ratio: '1 tsp per 1 cup sugar', notes: 'Very concentrated, adjust to taste', dietaryTags: ['keto', 'low-sugar'] },
      { substitute: 'erythritol', ratio: '1:1', notes: 'Keto-friendly, slight cooling effect', dietaryTags: ['keto', 'low-sugar'] },
      { substitute: 'monk fruit sweetener', ratio: '1:1', notes: 'Zero calorie option', dietaryTags: ['keto', 'low-sugar'] },
    ],
  },
  'brown sugar': {
    category: 'Sweeteners',
    subs: [
      { substitute: 'white sugar + molasses', ratio: '1 cup + 1-2 tbsp molasses', notes: 'Mix well' },
      { substitute: 'coconut sugar', ratio: '1:1', notes: 'Similar caramel flavor' },
      { substitute: 'maple syrup', ratio: '3/4 cup, reduce liquid', notes: 'Different but delicious' },
    ],
  },
  'honey': {
    category: 'Sweeteners',
    subs: [
      { substitute: 'maple syrup', ratio: '1:1', notes: 'Different flavor profile', dietaryTags: ['vegan'] },
      { substitute: 'agave nectar', ratio: '1:1', notes: 'Neutral flavor', dietaryTags: ['vegan'] },
      { substitute: 'date syrup', ratio: '1:1', notes: 'Rich, caramel flavor', dietaryTags: ['vegan'] },
      { substitute: 'corn syrup', ratio: '1:1', notes: 'Less sweet' },
    ],
  },

  // Herbs & Spices
  'fresh thyme': {
    category: 'Herbs',
    subs: [
      { substitute: 'dried thyme', ratio: '1 tsp dried per 1 tbsp fresh', notes: 'Standard fresh to dried ratio' },
      { substitute: 'fresh oregano', ratio: '1:1', notes: 'Similar Mediterranean flavor' },
      { substitute: 'fresh rosemary', ratio: '1/2 the amount', notes: 'Stronger flavor' },
    ],
  },
  'fresh rosemary': {
    category: 'Herbs',
    subs: [
      { substitute: 'dried rosemary', ratio: '1 tsp dried per 1 tbsp fresh', notes: 'Crush dried before using' },
      { substitute: 'fresh thyme', ratio: '1:1', notes: 'More delicate flavor' },
      { substitute: 'fresh sage', ratio: '1:1', notes: 'Earthy alternative' },
    ],
  },
  'fresh basil': {
    category: 'Herbs',
    subs: [
      { substitute: 'dried basil', ratio: '1 tsp dried per 1 tbsp fresh', notes: 'Less aromatic' },
      { substitute: 'fresh oregano', ratio: '1:1', notes: 'For Italian dishes' },
      { substitute: 'fresh spinach + mint', ratio: '1:1 mixed', notes: 'For pesto' },
    ],
  },
  'fresh parsley': {
    category: 'Herbs',
    subs: [
      { substitute: 'dried parsley', ratio: '1 tsp dried per 1 tbsp fresh', notes: 'Much less flavor' },
      { substitute: 'fresh cilantro', ratio: '1:1', notes: 'Different flavor, same freshness' },
      { substitute: 'fresh chervil', ratio: '1:1', notes: 'Delicate, similar appearance' },
    ],
  },
  'fresh cilantro': {
    category: 'Herbs',
    subs: [
      { substitute: 'fresh parsley + lime', ratio: '1:1 + squeeze of lime', notes: 'For those who taste soap' },
      { substitute: 'fresh Thai basil', ratio: '1:1', notes: 'Different but works in Asian dishes' },
      { substitute: 'culantro', ratio: '1/2 the amount', notes: 'Stronger cilantro flavor' },
    ],
  },
  'garlic': {
    category: 'Aromatics',
    subs: [
      { substitute: 'garlic powder', ratio: '1/8 tsp per clove', notes: 'Less pungent' },
      { substitute: 'garlic paste', ratio: '1/2 tsp per clove', notes: 'Convenient option' },
      { substitute: 'shallots', ratio: '1:1 minced', notes: 'Milder, sweeter' },
      { substitute: 'garlic scapes', ratio: '2:1', notes: 'Milder garlic flavor' },
    ],
  },
  'onion': {
    category: 'Aromatics',
    subs: [
      { substitute: 'shallots', ratio: '3 shallots per medium onion', notes: 'Milder, sweeter' },
      { substitute: 'leeks', ratio: '1:1 white part only', notes: 'More delicate' },
      { substitute: 'onion powder', ratio: '1 tbsp per medium onion', notes: 'For flavor only' },
      { substitute: 'scallions', ratio: '1/2 cup per medium onion', notes: 'Milder' },
    ],
  },

  // Oils & Fats
  'vegetable oil': {
    category: 'Oils',
    subs: [
      { substitute: 'canola oil', ratio: '1:1', notes: 'Neutral flavor' },
      { substitute: 'sunflower oil', ratio: '1:1', notes: 'Light flavor' },
      { substitute: 'melted coconut oil', ratio: '1:1', notes: 'Adds slight coconut flavor', dietaryTags: ['vegan'] },
      { substitute: 'avocado oil', ratio: '1:1', notes: 'High smoke point' },
      { substitute: 'applesauce', ratio: '1:1', notes: 'For baking, reduces fat', dietaryTags: ['vegan'] },
    ],
  },
  'olive oil': {
    category: 'Oils',
    subs: [
      { substitute: 'avocado oil', ratio: '1:1', notes: 'Higher smoke point' },
      { substitute: 'vegetable oil', ratio: '1:1', notes: 'More neutral flavor' },
      { substitute: 'melted butter', ratio: '1:1', notes: 'For finishing, not frying' },
      { substitute: 'walnut oil', ratio: '1:1', notes: 'Nutty flavor, don\'t heat' },
    ],
  },

  // Leavening
  'baking powder': {
    category: 'Leavening',
    subs: [
      { substitute: 'baking soda + cream of tartar', ratio: '1/4 tsp soda + 1/2 tsp cream of tartar per 1 tsp', notes: 'Homemade baking powder' },
      { substitute: 'baking soda + lemon juice', ratio: '1/4 tsp soda + 1/2 tsp lemon juice per 1 tsp', notes: 'Works in a pinch' },
      { substitute: 'self-rising flour', ratio: 'Replace all-purpose with self-rising', notes: 'Omit salt and baking powder' },
    ],
  },
  'baking soda': {
    category: 'Leavening',
    subs: [
      { substitute: 'baking powder', ratio: '3 tsp per 1 tsp soda', notes: 'Less effective, omit salt' },
    ],
  },
  'yeast': {
    category: 'Leavening',
    subs: [
      { substitute: 'baking powder', ratio: '1 tsp per 1/4 oz yeast', notes: 'For quick breads, different texture' },
      { substitute: 'sourdough starter', ratio: '1 cup per 1/4 oz yeast', notes: 'Reduce liquid, longer rise' },
    ],
  },

  // Condiments & Sauces
  'soy sauce': {
    category: 'Condiments',
    subs: [
      { substitute: 'tamari', ratio: '1:1', notes: 'Gluten-free option', dietaryTags: ['gluten-free'] },
      { substitute: 'coconut aminos', ratio: '1:1', notes: 'Sweeter, less sodium', dietaryTags: ['gluten-free', 'low-sodium'] },
      { substitute: 'Worcestershire sauce', ratio: '1:1', notes: 'Different flavor, works in a pinch' },
      { substitute: 'fish sauce + water', ratio: '1/2 fish sauce + 1/2 water', notes: 'Strong umami' },
    ],
  },
  'worcestershire sauce': {
    category: 'Condiments',
    subs: [
      { substitute: 'soy sauce + vinegar + sugar', ratio: '1 tbsp + 1 tsp + pinch', notes: 'Mix together' },
      { substitute: 'balsamic vinegar', ratio: '1:1', notes: 'Sweeter option' },
      { substitute: 'coconut aminos + vinegar', ratio: '2 parts aminos + 1 part vinegar', notes: 'Vegan option', dietaryTags: ['vegan'] },
    ],
  },
  'mayonnaise': {
    category: 'Condiments',
    subs: [
      { substitute: 'Greek yogurt', ratio: '1:1', notes: 'Tangier, less fat', dietaryTags: ['vegetarian'] },
      { substitute: 'avocado', ratio: '1:1 mashed', notes: 'Creamy, healthy fat', dietaryTags: ['vegan', 'egg-free'] },
      { substitute: 'hummus', ratio: '1:1', notes: 'For sandwiches', dietaryTags: ['vegan', 'egg-free'] },
      { substitute: 'vegan mayo', ratio: '1:1', notes: 'Many store-bought options', dietaryTags: ['vegan', 'egg-free'] },
    ],
  },
  'mustard': {
    category: 'Condiments',
    subs: [
      { substitute: 'horseradish', ratio: '1:1', notes: 'More heat, less tang' },
      { substitute: 'wasabi', ratio: '1/4 the amount', notes: 'Very hot, use sparingly' },
      { substitute: 'turmeric + vinegar', ratio: '1/4 tsp + 1 tsp', notes: 'For color and tang' },
    ],
  },

  // Vinegars
  'white wine vinegar': {
    category: 'Vinegar',
    subs: [
      { substitute: 'champagne vinegar', ratio: '1:1', notes: 'Milder option' },
      { substitute: 'rice vinegar', ratio: '1:1', notes: 'Slightly sweeter' },
      { substitute: 'lemon juice', ratio: '1:1', notes: 'For acidity' },
      { substitute: 'apple cider vinegar', ratio: '1:1', notes: 'More fruity' },
    ],
  },
  'balsamic vinegar': {
    category: 'Vinegar',
    subs: [
      { substitute: 'red wine vinegar + sugar', ratio: '1 tbsp + 1/2 tsp sugar', notes: 'Mix together' },
      { substitute: 'sherry vinegar', ratio: '1:1', notes: 'Similar sweetness' },
      { substitute: 'pomegranate molasses', ratio: '1:1', notes: 'Similar sweetness and color' },
    ],
  },
  'rice vinegar': {
    category: 'Vinegar',
    subs: [
      { substitute: 'apple cider vinegar', ratio: '1:1', notes: 'More acidic, slightly sweeter' },
      { substitute: 'white wine vinegar', ratio: '1:1', notes: 'More acidic' },
      { substitute: 'lemon juice', ratio: '1:1', notes: 'Fresh alternative' },
    ],
  },
};

// ============================================
// Lookup Functions
// ============================================

export function findSubstitutions(ingredient: Ingredient): SubstitutionResult | null {
  const itemLower = ingredient.item.toLowerCase().trim();

  // Direct match
  if (SUBSTITUTIONS[itemLower]) {
    return {
      original: ingredient,
      substitutes: SUBSTITUTIONS[itemLower].subs,
      category: SUBSTITUTIONS[itemLower].category,
    };
  }

  // Partial match
  for (const [key, data] of Object.entries(SUBSTITUTIONS)) {
    if (itemLower.includes(key) || key.includes(itemLower)) {
      return {
        original: ingredient,
        substitutes: data.subs,
        category: data.category,
      };
    }
  }

  return null;
}

export function filterByDietary(
  substitutes: Substitution[],
  tags: DietaryTag[]
): Substitution[] {
  if (tags.length === 0) return substitutes;

  return substitutes.filter(sub => {
    if (!sub.dietaryTags) return false;
    return tags.every(tag => sub.dietaryTags!.includes(tag));
  });
}

export function getAllSubstitutionCategories(): string[] {
  const categories = new Set<string>();
  for (const data of Object.values(SUBSTITUTIONS)) {
    categories.add(data.category);
  }
  return Array.from(categories).sort();
}

export function getSubstitutionsByCategory(category: string): Record<string, Substitution[]> {
  const result: Record<string, Substitution[]> = {};

  for (const [key, data] of Object.entries(SUBSTITUTIONS)) {
    if (data.category === category) {
      result[key] = data.subs;
    }
  }

  return result;
}
