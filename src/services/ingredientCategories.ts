// Ingredient Categorization Service
// Shared by the grocery checklist and mise en place views. Matching is on
// whole words (so "egg" never matches "eggplant", "can" never matches
// "pecans", "butter" never matches "butternut"), with spice-form overrides
// checked first so "black pepper" or "ground cumin" land in spices rather
// than produce/proteins.

export type IngredientCategory =
  | 'produce'
  | 'proteins'
  | 'eggs'
  | 'dairy'
  | 'pantry'
  | 'spices'
  | 'other';

// Forms that are always a dried spice/seasoning, whatever the base word
// would otherwise suggest ("black pepper" is not a bell pepper, "ground
// ginger" is not fresh ginger, "dried thyme" is not a fresh herb)
const SPICE_FORM_OVERRIDES: RegExp[] = [
  /\bpeppercorns?\b/,
  /\b(?:black|white)\s+pepper\b/,
  /\bred\s+pepper\s+flakes?\b/,
  /\bcrushed\s+red\s+pepper\b/,
  /\b(?:chili|chile|chilli|pepper)\s+flakes?\b/,
  /\bcayenne\b/,
  /\blemon\s+pepper\b/,
  /\bground\s+(?:pepper|cumin|cinnamon|ginger|nutmeg|cloves?|coriander|cardamom|allspice|turmeric|mustard|fennel|mace|sage|thyme|chipotle|ancho|paprika)\b/,
  /\bwhole\s+(?:cloves|allspice|nutmeg)\b/,
  /\b(?:garlic|onion|ginger|chili|chile|chilli|curry|mustard|chipotle|ancho)\s+powder\b/,
  /\bfive[\s-]spice\b/,
  /\b(?:garlic|onion|celery|seasoned)\s+salt\b/,
  /\bdried\s+(?:herbs?|basil|oregano|thyme|rosemary|parsley|dill|sage|tarragon|marjoram|mint|chives|cilantro|coriander|bay\s+lea(?:f|ves)|chilis?|chilies|chiles)\b/,
];

// Fresh herbs are produce even when the bare name (e.g. "oregano") defaults to
// the spice rack
const FRESH_HERB_OVERRIDE =
  /\bfresh\s+(?:herbs?|basil|oregano|thyme|rosemary|parsley|dill|sage|tarragon|marjoram|mint|chives|cilantro|coriander)\b/;

// Canned/jarred goods live in the pantry regardless of what's inside
const PANTRY_FORM_OVERRIDE = /\b(?:canned|jarred|cans?|tins?|tinned)\b/;

const CATEGORY_KEYWORDS: Record<Exclude<IngredientCategory, 'other'>, string[]> = {
  produce: [
    'onion', 'green onion', 'shallot', 'scallion', 'leek', 'garlic', 'tomato',
    'lettuce', 'spinach', 'kale', 'arugula', 'cabbage', 'carrot', 'celery',
    'potato', 'sweet potato', 'yam', 'mushroom', 'lemon', 'lime', 'orange',
    'apple', 'pear', 'banana', 'berry', 'berries', 'strawberries', 'blueberries',
    'raspberries', 'cherries', 'grape', 'peach', 'mango', 'pineapple', 'avocado',
    'broccoli', 'cauliflower', 'cucumber', 'zucchini', 'squash', 'butternut squash',
    'pumpkin', 'eggplant', 'corn', 'pea', 'snap peas', 'green bean', 'asparagus',
    'beet', 'radish', 'ginger', 'herb', 'basil', 'cilantro', 'parsley', 'thyme',
    'rosemary', 'dill', 'mint', 'chives', 'sage', 'tarragon',
    // Fresh peppers (bare "pepper" defaults to the spice)
    'peppers', 'bell pepper', 'red pepper', 'green pepper', 'yellow pepper',
    'orange pepper', 'sweet pepper', 'chili pepper', 'chile pepper', 'hot pepper',
    'jalapeno', 'jalapeño', 'poblano', 'serrano', 'habanero',
  ],
  proteins: [
    'chicken', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'cod', 'tilapia',
    'shrimp', 'prawn', 'scallop', 'crab', 'lobster', 'anchovy', 'anchovies',
    'turkey', 'lamb', 'veal', 'duck', 'tofu', 'tempeh', 'seitan', 'sausage',
    'bacon', 'ham', 'prosciutto', 'pancetta', 'chorizo', 'steak', 'meat',
  ],
  eggs: ['egg', 'egg white', 'egg yolk'],
  dairy: [
    'milk', 'buttermilk', 'cream', 'heavy cream', 'sour cream', 'whipping cream',
    'half-and-half', 'butter', 'cheese', 'cream cheese', 'parmesan', 'mozzarella',
    'cheddar', 'ricotta', 'feta', 'gouda', 'yogurt', 'ghee',
  ],
  pantry: [
    'flour', 'sugar', 'brown sugar', 'powdered sugar', 'oil', 'olive oil', 'vinegar',
    'broth', 'stock', 'pasta', 'spaghetti', 'noodles', 'rice', 'bread',
    'breadcrumbs', 'bread crumbs', 'panko', 'sauce', 'soy sauce', 'tomato paste',
    'honey', 'maple syrup', 'syrup', 'corn syrup', 'molasses', 'vanilla',
    'extract', 'baking soda', 'baking powder', 'yeast', 'cornstarch', 'cocoa',
    'chocolate', 'chocolate chips', 'oats', 'beans', 'lentils', 'chickpeas',
    'nuts', 'almonds', 'walnuts', 'pecans', 'peanuts', 'cashews', 'raisins',
    'soup', 'wine', 'mustard', 'ketchup', 'mayonnaise', 'jam', 'curry paste',
    'coconut milk', 'coconut cream', 'peanut butter', 'almond butter',
    'cream of tartar', 'gelatin', 'sesame seeds',
  ],
  spices: [
    'salt', 'pepper', 'cumin', 'paprika', 'cinnamon', 'oregano', 'chili', 'curry',
    'curry powder', 'turmeric', 'coriander', 'nutmeg', 'allspice', 'cardamom',
    'bay leaf', 'bay leaves', 'garam masala', 'seasoning', 'spice', 'saffron',
    'star anise', 'sumac', 'herbes de provence', 'mustard seed', 'fennel seed',
    'celery seed',
  ],
};

// Category order doubles as the final tie-breaker
const CATEGORY_ORDER = Object.keys(CATEGORY_KEYWORDS) as Exclude<IngredientCategory, 'other'>[];

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Whole-word match that also accepts a simple plural ("onions", "tomatoes")
const KEYWORD_PATTERNS = CATEGORY_ORDER.flatMap((category) =>
  CATEGORY_KEYWORDS[category].map((keyword) => ({
    category,
    keyword,
    pattern: new RegExp(`\\b${escapeRegExp(keyword)}(?:e?s)?\\b`, 'g'),
  }))
);

/**
 * Categorize an ingredient by its name (e.g. "black pepper", "chicken broth").
 *
 * Spice/pantry form overrides win outright. Otherwise the keyword that ends
 * furthest right wins, since English ingredient names put the head noun
 * last: "chicken broth" is broth (pantry), "garlic butter" is butter (dairy),
 * "egg noodles" is noodles (pantry). Ties go to the longer keyword, so
 * "peanut butter" beats "butter" and "bell pepper" beats "pepper".
 */
export function categorizeIngredient(item: string): IngredientCategory {
  const text = item.toLowerCase();

  if (FRESH_HERB_OVERRIDE.test(text)) return 'produce';
  if (SPICE_FORM_OVERRIDES.some((re) => re.test(text))) return 'spices';
  if (PANTRY_FORM_OVERRIDE.test(text)) return 'pantry';

  let best: { category: IngredientCategory; end: number; length: number } | null = null;
  for (const { category, keyword, pattern } of KEYWORD_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const end = match.index + match[0].length;
      if (
        !best ||
        end > best.end ||
        (end === best.end && keyword.length > best.length)
      ) {
        best = { category, end, length: keyword.length };
      }
    }
  }

  return best ? best.category : 'other';
}
