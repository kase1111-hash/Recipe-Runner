# PROJECT EVALUATION REPORT

**Primary Classification:** Feature Creep
**Secondary Tags:** Good Concept, Underdeveloped Core

---

## CONCEPT ASSESSMENT

**Problem Solved:** Traditional recipes present information as flat documents, but humans execute them as sequential procedures. Users skip steps, miss timing windows, and lack visual references for what "done" looks like. Recipe Runner enforces linear step-by-step execution and gates progression behind ingredient verification.

**User:** Home cooks ranging from beginners to intermediates who struggle with recipe execution, not recipe discovery. The pain is real — burnt food and missed steps are universal cooking failures.

**Competition:** Existing recipe apps (Paprika, Mela, CookPad, Whisk) focus on recipe *collection and discovery*, not *execution*. The step-by-step enforcement with a grocery gate is a genuine differentiator. The closest competitors are smart display integrations (Google Nest Hub cooking mode), but those lack the structured data model and AI error recovery.

**Value Prop:** "A step-by-step process executor that forces you to follow recipes correctly, with AI assistance when things go wrong."

**Verdict:** Sound. The core insight — that recipe failures are execution errors, not recipe errors — is valid and underserved. The "procedural knowledge executor" framing beyond cooking (herbalism, fermentation, woodworking) is ambitious but grounded. The grocery checklist gate and single-step display are genuinely useful mechanics that most apps skip.

---

## EXECUTION ASSESSMENT

### Architecture

The architecture is appropriate for what the app does today: a client-side SPA with local persistence. Key decisions:

- **useReducer state machine** (`src/App.tsx:96-189`) — Good choice for managing 13 distinct views. The reducer is clean and predictable. However, the entire app navigation is driven through a single flat reducer with no nested routing or URL state. This will not scale well if the app grows, and the back button doesn't work.
- **IndexedDB via Dexie** (`src/db/index.ts`) — Correct choice for structured recipe data. Schema versioning with migrations is properly implemented (v1 to v2). The `withErrorHandling` wrapper pattern is solid.
- **Inline styles everywhere** — Stated rationale is "portability," but this creates massive JSX blocks where style objects dwarf the actual component logic. Components like `MealPlanner.tsx` (580 lines) and `RecipeDetail.tsx` (552 lines) are inflated by verbose style objects. A CSS-in-JS library or even CSS modules would maintain portability while dramatically improving readability.
- **localStorage for complex data** — Inventory (`src/services/inventory.ts:52`), meal plans (`src/services/mealPlanning.ts:50`), cost/price data (`src/services/costEstimation.ts:53`) all use localStorage. This is fragile — localStorage has a ~5MB limit, no query capability, and no transactional safety. These should use the existing IndexedDB infrastructure that's already in place for cookbooks and recipes.

### Code Quality

- **Build:** Compiles successfully with Vite. No TypeScript errors. Bundle size is 1,094 KB (gzipped 319 KB) — large, primarily due to PDF.js and Tesseract.js being bundled monolithically. No code splitting.
- **Tests:** 81 tests across 7 files, all passing. Coverage is thin — only utility functions (`parseAmount`, `sanitize`), the database layer, error boundary, recipe scaling, visual generation config, and inventory constants are tested. Zero tests for any React component behavior, zero integration tests, zero tests for Chef Ollama, meal planning, dietary adaptation, nutrition, cost estimation, or the import pipeline.
- **Linting:** 24 errors, 9 warnings. Notable: a React hooks violation in `src/services/inventory.ts:424` (hook called inside a loop), `let` instead of `const` in multiple files, and an unused parameter in `recipeParser.ts:371`. These aren't showstoppers but indicate code that was shipped without CI gates.
- **Security:** DOMPurify integration for AI response sanitization (`src/services/utils/sanitize.ts`) is correct. No obvious XSS or injection vectors. The Ollama endpoint is user-configurable with a localhost default, which is appropriate.

### Tech Stack Appropriateness

The core stack (React + TypeScript + Vite + Dexie) is well-chosen. The dependency choices raise concerns:

- **Tesseract.js (7.0)** and **pdfjs-dist (5.4)** are heavyweight OCR/PDF libraries (~900KB combined) included for a feature (recipe import from images/PDFs) that is partially implemented and lightly used. These should be lazy-loaded.
- **Howler.js** for timer sounds is fine but adds weight for what could be a single `new Audio()` call.
- **No router** — The app manages 13 views through manual state without react-router or any URL-based navigation. Browser back/forward, deep linking, and bookmarking don't work.

### Stability

The app builds and runs. Tests pass. But the lint errors (particularly the hooks violation) and the Vite warning about mixed static/dynamic imports of `db/index.ts` suggest a codebase that's been extended rapidly without pause for cleanup.

**Verdict:** Execution is competent but stretched thin. The core cooking flow (library → recipe → groceries → steps → completion) is well-built. The surrounding features (inventory, meal planning, cost estimation, nutrition, dietary adaptation) are implemented to a "demo-able" level but lack the depth, testing, and polish to be production-grade. The codebase carries the signatures of AI-assisted rapid development: consistent style, comprehensive type definitions, but shallow integration testing and mechanical feature coverage.

---

## SCOPE ANALYSIS

**Core Feature:** Step-by-step recipe execution with grocery verification gate.

**Supporting:**
- Cookbook library and recipe browsing (`src/components/cookbook/`)
- Recipe data model with difficulty scoring (`src/types/index.ts`)
- Timer system for passive steps (`src/components/common/Timer.tsx`)
- Cook history tracking (`CookHistory` type, `CookCompletion.tsx`)
- Chef Ollama AI assistant for error recovery (`src/services/chefOllama.ts`)
- Recipe import from text/PDF/URL (`src/components/import/`)
- Mise en place pre-cooking checklist (`src/components/recipe/MiseEnPlace.tsx`)

**Nice-to-Have:**
- Recipe scaling with non-linear adjustments (`src/services/recipeScaling.ts`) — 426 lines of solid logic, well-tested (17 tests)
- Ingredient substitution database (`src/services/substitutions.ts`) — 424 lines, hardcoded but useful
- Dark mode (`src/contexts/ThemeContext.tsx`)
- Favorites/bookmarking (`src/db/index.ts:386-411`)
- Bookshelf organization (`src/components/cookbook/BookshelfView.tsx`)
- Recipe export as JSON/Markdown/text (`src/services/export.ts`)

**Distractions:**
- Nutritional calculation engine (`src/services/nutrition.ts`) — 361 lines of hardcoded nutrition data per 100g. Inaccurate by nature (no portion-weight mapping is reliable without a real API). Not connected to the core cooking flow. Adds perceived value but is fundamentally unreliable.
- Cost estimation service (`src/services/costEstimation.ts`) — 513 lines. Hardcoded grocery prices that are immediately stale and location-dependent. This is a feature that *looks* useful but provides bad data without a real pricing API.
- Side dish suggestions (`src/services/sideDishSuggestions.ts`) — 380 lines. Auto-suggests companions based on course type. Algorithmically trivial (filter by course_type + cuisine), but occupies significant code surface.
- AI step visual generation infrastructure (`src/services/visualGeneration.ts`) — Placeholder/SVG mode by default. The visual_prompt field exists on every step, but actual image generation requires external Stable Diffusion setup. This is roadmap masquerading as a shipped feature.

**Wrong Product:**
- Pantry inventory manager (`src/services/inventory.ts` + `src/components/inventory/`) — 503 lines of service code + 421 lines of UI. Tracks quantities, expiration dates, storage locations, purchase history. This is a standalone inventory management app bolted onto a cooking executor. It has its own data model, its own localStorage persistence, and its own full CRUD UI. It shares almost no logic with the cooking flow.
- Weekly meal planner (`src/services/mealPlanning.ts` + `src/components/mealplan/`) — 426 lines of service + 580 lines of UI. Full weekly calendar with meal slots, aggregated shopping lists, serving adjustments. This is a meal planning app — a distinct product category with different user behaviors, different usage patterns, and different competitive landscape.
- Dietary adaptation engine (`src/services/dietaryAdaptation.ts`) — 412 lines. Adapts recipes for 19 different dietary restrictions and 11 health conditions. This is genuinely complex domain logic that needs nutritionist review, not hardcoded substitution tables.

**Scope Verdict:** Feature Creep. The core cooking executor (steps + grocery gate + timers + chef AI) is approximately 30% of the codebase. The remaining 70% is distributed across 6+ secondary feature domains (inventory, meal planning, nutrition, cost, dietary, visuals) that each individually need more depth but collectively dilute focus. The project is trying to be a recipe executor, a pantry tracker, a meal planner, a nutritional calculator, a cost estimator, and a dietary advisor simultaneously.

---

## TECHNICAL DEBT INVENTORY

| Issue | Location | Severity |
|-------|----------|----------|
| React hooks violation (hook in loop) | `src/services/inventory.ts:424` | High |
| No URL routing (back button broken) | `src/App.tsx` (entire navigation) | High |
| Complex data in localStorage (5MB limit, no queries) | `inventory.ts`, `mealPlanning.ts`, `costEstimation.ts` | Medium |
| 1.1MB bundle, no code splitting | `vite.config.ts` | Medium |
| 24 lint errors shipped | Multiple files | Medium |
| Mixed static/dynamic imports of db module | `src/data/sampleCookbook.ts` → `src/db/index.ts` | Low |
| Inline styles inflating component sizes | All components | Low |
| Hardcoded nutrition/price databases | `nutrition.ts`, `costEstimation.ts` | Design flaw |
| 7 test files covering only utilities and DB | `src/test/` | Coverage gap |
| Chef Ollama always passes `currentStepIndex={0}` | `src/App.tsx:512` | Bug |

---

## RECOMMENDATIONS

### CUT

- **Pantry Inventory Manager** — `src/services/inventory.ts`, `src/components/inventory/` (924 lines). This is a separate product. It doesn't enhance the core cooking flow. Users who want pantry tracking already use dedicated apps (AnyList, OurGroceries). Remove it entirely or extract to a separate project.
- **Cost Estimation** — `src/services/costEstimation.ts` (513 lines). Hardcoded prices are worse than no prices. They create false confidence. Remove until a real pricing API is available.
- **Nutritional Calculator** — `src/services/nutrition.ts` (361 lines). Same problem as cost estimation: hardcoded per-100g values without reliable portion mapping produce misleading numbers. Nutrition data is a regulated domain — inaccurate displays can have health consequences for users with dietary restrictions.
- **Visual Generation Placeholder** — `src/services/visualGeneration.ts`. The default mode generates SVG placeholders. This adds complexity without value. Keep the `visual_prompt` field in the data model (it's a good design), but remove the generation infrastructure until a real image API is integrated.

### DEFER

- **Meal Planning** — Promising feature but needs its own product focus. Move to a v2 milestone after the core executor is polished. It currently uses localStorage and would benefit from the IndexedDB infrastructure.
- **Dietary Adaptation** — Genuinely useful but needs expert review. The hardcoded substitution tables for 19 diets and 11 health conditions are a liability without nutritionist validation. Defer until the core product has users who can provide feedback.
- **Side Dish Suggestions** — Low-value feature that can be deferred. The algorithm is trivial (filter by course type) and the UX adds navigation complexity.
- **Code Splitting** — The 1.1MB bundle includes Tesseract.js and PDF.js. These should be dynamically imported only when the user enters the import flow.

### DOUBLE DOWN

- **Step Executor** — This is the product. The single-step display, timer integration, and progress tracking are the core differentiator. Invest in: session persistence (resume interrupted cooks), step-level notes, better timer UX (multiple concurrent timers visible), and voice readback of instructions.
- **Chef Ollama Integration** — The AI error recovery concept is strong. Fix the bug where `currentStepIndex` is always 0 (`src/App.tsx:512`). Add actual step-context awareness. This is the feature that makes Recipe Runner defensible.
- **Grocery Checklist Gate** — The forced ingredient verification is a killer feature. Enhance it: integrate with Chef Ollama for substitution suggestions (partially done), add "shop this list" export, and remember previously purchased items.
- **Recipe Import Pipeline** — This is the growth engine. Users need to get their recipes *into* the system. The PDF/OCR/URL import infrastructure is built. Focus on reliability and user experience of the import-edit-save flow.
- **Testing** — 81 tests covering utilities and DB is a start. The cooking flow (groceries → mise en place → steps → completion) has zero test coverage. This is the core product path and should be the most tested code.

---

## FINAL VERDICT

**Refocus.**

Recipe Runner has a sound concept, a competent core implementation, and a clear differentiator (step-by-step execution with grocery gating and AI error recovery). But the project has diluted its focus by building surface-level implementations of 6+ secondary features instead of deepening the core experience.

The current state is a demo that shows breadth — "look at everything it can do." What it needs is a product that shows depth — "look at how well it does the one thing that matters."

**Next Step:** Delete the inventory manager and cost estimation service (1,437 lines). Use the freed focus to fix the `currentStepIndex` bug in Chef Ollama, add URL-based routing, migrate remaining localStorage data to IndexedDB, and write integration tests for the cooking flow. The app should do one thing exceptionally before it does six things adequately.
