// Sample recipe following the Recipe Runner schema
export const sampleRecipe = {
  id: "classic-roast-chicken",
  name: "Classic Roast Chicken",
  description: "A perfectly roasted whole chicken with crispy skin and juicy meat. The ultimate comfort food that fills your kitchen with amazing aromas.",
  totalTime: "1 hr 30 min",
  activeTime: "20 min",
  yield: "4 servings",
  safeTemp: {
    value: 165,
    unit: "°F",
    location: "thickest part of thigh"
  },
  equipment: [
    "roasting pan",
    "meat thermometer",
    "kitchen twine",
    "cutting board"
  ],
  tags: ["dinner", "protein", "roasting", "classic"],
  difficulty: "intermediate",
  ingredients: [
    {
      item: "whole chicken",
      amount: "4",
      unit: "lb",
      prep: "patted dry, giblets removed",
      optional: false
    },
    {
      item: "unsalted butter",
      amount: "4",
      unit: "tbsp",
      prep: "softened",
      optional: false
    },
    {
      item: "fresh thyme",
      amount: "2",
      unit: "tbsp",
      prep: "chopped",
      optional: false
    },
    {
      item: "fresh rosemary",
      amount: "1",
      unit: "tbsp",
      prep: "chopped",
      optional: false
    },
    {
      item: "garlic",
      amount: "4",
      unit: "cloves",
      prep: "minced",
      optional: false
    },
    {
      item: "lemon",
      amount: "1",
      unit: "whole",
      prep: "halved",
      optional: false
    },
    {
      item: "kosher salt",
      amount: "2",
      unit: "tsp",
      prep: null,
      optional: false
    },
    {
      item: "black pepper",
      amount: "1",
      unit: "tsp",
      prep: "freshly ground",
      optional: false
    },
    {
      item: "olive oil",
      amount: "1",
      unit: "tbsp",
      prep: null,
      optional: false
    }
  ],
  steps: [
    {
      title: "Preheat Oven",
      instruction: "Position a rack in the center of the oven. Preheat the oven to 425°F (220°C). Allow at least 15 minutes for the oven to fully preheat.",
      time: "15 min",
      type: "passive",
      tip: "A fully preheated oven is essential for crispy skin. Don't rush this step."
    },
    {
      title: "Prepare Herb Butter",
      instruction: "In a small bowl, combine the softened butter with chopped thyme, rosemary, and minced garlic. Mix until well combined. Season with a pinch of salt and pepper.",
      time: "5 min",
      type: "active",
      tip: "Make sure the butter is soft enough to mix easily but not melted."
    },
    {
      title: "Prep the Chicken",
      instruction: "Remove the chicken from the refrigerator 30 minutes before cooking. Pat the chicken completely dry inside and out with paper towels. Dry skin = crispy skin.",
      time: "5 min",
      type: "active",
      tip: "Moisture is the enemy of crispy skin. Be thorough with the paper towels."
    },
    {
      title: "Season the Bird",
      instruction: "Gently loosen the skin over the breast meat by sliding your fingers underneath. Spread half the herb butter directly under the skin on the breast meat. Rub the remaining butter all over the outside of the chicken.",
      time: "5 min",
      type: "active",
      tip: "Be gentle when loosening the skin - you don't want to tear it."
    },
    {
      title: "Stuff and Truss",
      instruction: "Season the cavity with salt and pepper. Place the lemon halves and any remaining garlic inside the cavity. Tie the legs together with kitchen twine and tuck the wing tips under the body.",
      time: "5 min",
      type: "active",
      tip: "Trussing helps the chicken cook evenly and keeps a compact shape."
    },
    {
      title: "Final Seasoning",
      instruction: "Drizzle olive oil over the chicken and season generously all over with kosher salt and black pepper. Place the chicken breast-side up in the roasting pan.",
      time: "2 min",
      type: "active",
      tip: "Don't be shy with the salt - much of it will form the delicious crispy skin."
    },
    {
      title: "Roast",
      instruction: "Place the roasting pan in the preheated oven. Roast for 50-60 minutes, or until the skin is golden brown and crispy. Do not open the oven door during the first 45 minutes.",
      time: "55 min",
      type: "passive",
      tip: "Every time you open the oven door, you lose heat and extend cooking time."
    },
    {
      title: "Check Temperature",
      instruction: "Insert a meat thermometer into the thickest part of the thigh, avoiding the bone. The chicken is done when it reaches 165°F (74°C). If not done, continue roasting and check every 5 minutes.",
      time: "2 min",
      type: "active",
      tip: "The temperature will rise a few degrees during resting, so 160°F is also acceptable."
    },
    {
      title: "Rest",
      instruction: "Transfer the chicken to a cutting board and tent loosely with aluminum foil. Let rest for 10-15 minutes. This allows the juices to redistribute throughout the meat.",
      time: "15 min",
      type: "passive",
      tip: "Resting is crucial - cutting too soon will cause all the juices to run out."
    },
    {
      title: "Carve and Serve",
      instruction: "Remove the twine. Carve the chicken by first removing the legs and thighs, then slicing the breast meat. Serve immediately with pan juices drizzled over the top.",
      time: "5 min",
      type: "active",
      tip: "Save the carcass for making chicken stock!"
    }
  ]
};
