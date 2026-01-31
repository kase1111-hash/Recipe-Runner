# Recipe Runner

A sequential process executor that treats recipes as "programs for humans." The app enforces linear execution of cooking steps, displaying one instruction at a time with large text, mandatory grocery verification, and time estimates.

## Tech Stack

- **Frontend**: React 19 + TypeScript 5.9 (strict mode)
- **Build**: Vite 7.2
- **Database**: IndexedDB via Dexie.js (local persistence)
- **Testing**: Vitest + React Testing Library
- **Optional AI**: Ollama (local LLM), Stable Diffusion (visual generation)

## Quick Commands

```bash
npm install          # Install dependencies
npm run dev          # Dev server at http://localhost:5173
npm run build        # TypeScript compile + production build
npm run lint         # ESLint check
npm run test         # Vitest watch mode
npm run test:run     # Single test run (CI)
npm run test:coverage # Coverage report
```

## Project Structure

```
src/
├── App.tsx                    # Main app with useReducer state management
├── components/
│   ├── common/                # Reusable UI (Button, Card, Timer, ErrorBoundary)
│   ├── step/                  # Step execution (StepExecutor, StepVisual)
│   ├── recipe/                # Recipe views (RecipeList, GroceryChecklist, RecipeScaler)
│   ├── cookbook/              # Cookbook management
│   ├── import/                # Recipe import/editor
│   ├── mealplan/              # Meal planning
│   ├── inventory/             # Pantry tracking
│   ├── chef-ollama/           # AI assistant
│   └── settings/              # User preferences
├── services/                  # Business logic
│   ├── recipeParser.ts        # AI recipe extraction
│   ├── visualGeneration.ts    # Image generation
│   ├── chefOllama.ts          # Local LLM integration
│   ├── recipeScaling.ts       # Serving adjustments
│   ├── mealPlanning.ts        # Meal plans + shopping lists
│   ├── dietaryAdaptation.ts   # Allergy/restriction handling
│   └── utils/                 # parseAmount, sanitize
├── db/index.ts                # Dexie.js database + CRUD
├── contexts/                  # ThemeContext, KeyboardShortcuts
└── types/index.ts             # All TypeScript interfaces
```

## Key Types

```typescript
interface Recipe {
  id: string;
  cookbook_id: string;
  name: string;
  ingredients: Ingredient[];    // {item, amount, unit, prep, optional, substitutes}
  steps: Step[];                // {title, instruction, time_minutes, type, tip, visual_prompt}
  difficulty: DifficultyScore;
  safe_temp?: SafeTemp;
  // ... more fields
}

interface Step {
  index: number;
  title: string;
  instruction: string;
  time_minutes: number;
  type: 'active' | 'passive';
  tip?: string;
  visual_prompt: string;
}
```

## App State & Views

The app uses `useReducer` with these views:
- `library` - Browse bookshelves
- `bookshelf` - Browse cookbooks in a shelf
- `cookbook` - Browse recipes in a cookbook
- `detail` - Recipe metadata view
- `groceries` - Ingredient checklist (mandatory gate)
- `miseenplace` - Pre-cook prep checklist
- `cooking` - Step-by-step execution
- `complete` - Post-cook summary
- `mealplanner` - Weekly meal planning
- `inventory` - Pantry management
- `import` / `edit` - Recipe creation/editing

## Development Guidelines

1. **Components**: Use functional components with hooks, inline styles (CSS-in-JS)
2. **Types**: All interfaces in `src/types/index.ts`, strict TypeScript enabled
3. **Services**: Business logic separated from components
4. **Database**: Dexie.js async CRUD with try/catch error handling
5. **Security**: DOMPurify for HTML sanitization, no raw innerHTML
6. **Testing**: Tests colocated with source (`.test.ts` / `.test.tsx`)

## Testing

```bash
npm run test:run    # Run all tests once
```

Tests use:
- `fake-indexeddb` for IndexedDB mocking
- `@testing-library/react` for component tests
- `jsdom` environment

Key test files:
- `src/services/utils/parseAmount.test.ts`
- `src/services/utils/sanitize.test.ts`
- `src/components/common/ErrorBoundary.test.tsx`
- `src/db/index.test.ts`

## Core Flow

1. User selects a recipe from cookbook
2. **Grocery Checklist** - Must verify 100% of ingredients before proceeding
3. **Mise en Place** - Optional prep checklist
4. **Step Executor** - One step at a time, with timer support
5. **Completion** - Summary and notes

## Key Services

| Service | Purpose |
|---------|---------|
| `recipeParser` | Parse recipes from PDF/URL/text using AI |
| `visualGeneration` | Generate step images via Stable Diffusion |
| `chefOllama` | Local LLM for cooking questions |
| `recipeScaling` | Adjust quantities for different servings |
| `dietaryAdaptation` | Handle allergies and dietary restrictions |

## Documentation

- `README.md` - Project overview
- `Spec.md` - Detailed feature specifications
- `PHASES.md` - 10-phase development roadmap
- `CONTRIBUTING.md` - Contributing guidelines
- `SECURITY.md` - Security practices
