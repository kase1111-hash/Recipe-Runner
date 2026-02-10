# REFOCUS PLAN

**Goal:** Transform Recipe Runner from a broad demo into a deep, polished product by cutting peripheral features and investing in the core cooking executor.

**Outcome:** An app that does step-by-step recipe execution exceptionally — with working browser navigation, correct AI context, and tested core flows — before re-expanding scope.

---

## PHASE 1: CUT (Remove Peripheral Features)

**Objective:** Delete ~3,500 lines of code across 6 feature domains that dilute focus and introduce technical debt. Every removal is isolated — no feature depends on another being removed first, but doing them together is cleanest.

### 1A. Remove Inventory Manager

**Why:** Standalone pantry tracking app bolted onto a cooking executor. Shares no logic with the core flow. Has a React hooks violation (`inventory.ts:424`). Uses fragile localStorage for complex data.

**Files to delete:**
- `src/services/inventory.ts` (503 lines)
- `src/services/pantry.ts` (service, also used by CookCompletion + MealPlanGroceryList)
- `src/components/inventory/InventoryManager.tsx` (421 lines)
- `src/components/inventory/AddItemModal.tsx`
- `src/components/inventory/EditItemModal.tsx`
- `src/components/inventory/QuickAddModal.tsx`
- `src/components/inventory/InventoryItemRow.tsx`
- `src/components/inventory/inventoryConstants.ts`
- `src/components/inventory/inventoryConstants.test.ts`
- `src/components/inventory/index.ts`

**Files to edit:**

| File | Change |
|------|--------|
| `src/App.tsx` | Remove: `import { InventoryManager }` (line 12), `'inventory'` from AppView type (line 36), `handleOpenInventory` + `handleBackFromInventory` handlers (lines 330-336), inventory view render block (lines 494-498), `onOpenInventory` prop from CookbookLibrary (line 395) |
| `src/components/cookbook/CookbookLibrary.tsx` | Remove: `onOpenInventory` prop and its associated UI button |
| `src/components/recipe/CookCompletion.tsx` | Remove: `import { recordIngredientsUsed } from '../../services/pantry'` (line 7) and any call to `recordIngredientsUsed` |
| `src/components/mealplan/MealPlanGroceryList.tsx` | Remove: `import { isCommonlyStocked } from '../../services/pantry'` (line 12) and replace with inline logic or remove feature |

### 1B. Remove Cost Estimation

**Why:** Hardcoded grocery prices are immediately stale and location-dependent. Provides false confidence. 513 lines of code for fundamentally unreliable data.

**Files to delete:**
- `src/services/costEstimation.ts` (513 lines)
- `src/components/common/CostDisplay.tsx`

**Files to edit:**

| File | Change |
|------|--------|
| `src/components/common/index.ts` | Remove: `export { CostDisplay, CostBadge, RecipeCostBadge } from './CostDisplay'` (line 7) |
| `src/components/recipe/RecipeDetail.tsx` | Remove: `CostDisplay` from import on line 5, remove `<CostDisplay>` usage in JSX |

### 1C. Remove Nutrition Calculator

**Why:** Hardcoded per-100g values without reliable portion-weight mapping produce misleading numbers. Nutrition is a regulated domain — inaccurate displays are a liability.

**Files to delete:**
- `src/services/nutrition.ts` (361 lines)
- `src/components/common/NutritionDisplay.tsx`

**Files to edit:**

| File | Change |
|------|--------|
| `src/components/common/index.ts` | Remove: `export { NutritionDisplay, NutritionBadge } from './NutritionDisplay'` (line 6) |
| `src/components/recipe/RecipeDetail.tsx` | Remove: `NutritionDisplay` from import on line 5, remove `<NutritionDisplay>` usage in JSX |

### 1D. Remove Visual Generation Placeholder

**Why:** Default mode generates SVG placeholders. Adds complexity without value. The `visual_prompt` field stays in the data model (good design for future API integration), but the generation infrastructure goes.

**Files to delete:**
- `src/services/visualGeneration.ts`
- `src/services/visualGeneration.test.ts`
- `src/components/step/StepVisual.tsx`
- `src/components/settings/VisualSettings.tsx`

**Files to edit:**

| File | Change |
|------|--------|
| `src/components/step/StepExecutor.tsx` | Remove: `import { StepVisual }` (line 3), `import { VisualSettings }` (line 4), `showVisualSettings` state (line 22), all `<StepVisual>` and `<VisualSettings>` JSX usage |
| `src/components/step/index.ts` | Remove: `export { StepVisual, StepVisualPreview } from './StepVisual'` (line 2) |
| `src/components/settings/index.ts` | Remove: `export { VisualSettings } from './VisualSettings'` (line 1) |

### 1E. Remove Side Dish Suggestions

**Why:** Algorithmically trivial (filter by course_type), occupies 380 lines, adds navigation complexity to the recipe detail view.

**Files to delete:**
- `src/services/sideDishSuggestions.ts` (380 lines)
- `src/components/recipe/SideDishSuggestions.tsx`

**Files to edit:**

| File | Change |
|------|--------|
| `src/components/recipe/RecipeDetail.tsx` | Remove: `import { SideDishSuggestions }` (line 7), remove `onSelectSideDish` prop, remove `<SideDishSuggestions>` JSX usage |
| `src/components/import/RecipeEditor.tsx` | Remove: `import { getRecommendedCourseTypes }` (line 11) and its usage. Replace with inline course type list or remove auto-suggestion |
| `src/App.tsx` | Remove: `handleSelectSideDish` handler (lines 350-356), `onSelectSideDish` prop from RecipeDetail (line 422) |

### 1F. Remove Meal Planning (Defer to v2)

**Why:** Full weekly calendar with meal slots is a separate product category. 1,006 lines across service + UI. Uses localStorage (should use IndexedDB). Deferred, not abandoned — will return in v2 after core is polished.

**Files to delete:**
- `src/services/mealPlanning.ts` (426 lines)
- `src/components/mealplan/MealPlanner.tsx` (580 lines)
- `src/components/mealplan/MealPlanGroceryList.tsx`
- `src/components/mealplan/index.ts`

**Files to edit:**

| File | Change |
|------|--------|
| `src/App.tsx` | Remove: `import { MealPlanner, MealPlanGroceryList }` (line 11), `'mealplanner'` and `'mealplangroceries'` from AppView (lines 34-35), `selectedMealPlanId` from state (line 49), `SELECT_MEAL_PLAN` action (line 69), all meal planner handlers (lines 314-328), both meal planner render blocks (lines 480-492), `onOpenMealPlanner` prop from CookbookLibrary (line 394) |
| `src/components/cookbook/CookbookLibrary.tsx` | Remove: `onOpenMealPlanner` prop and its associated UI button |

### 1G. Remove Dietary Adaptation (Defer to v2)

**Why:** Adapts recipes for 19 dietary restrictions and 11 health conditions using hardcoded substitution tables. This is health-critical domain logic that needs nutritionist validation, not code review. Deferred until users can provide feedback.

**Files to delete:**
- `src/services/dietaryAdaptation.ts` (412 lines)
- `src/components/recipe/DietaryWarnings.tsx`
- `src/components/settings/DietarySettings.tsx`

**Files to edit:**

| File | Change |
|------|--------|
| `src/components/recipe/RecipeDetail.tsx` | Remove: `import { DietaryWarnings }` (line 6), `<DietaryWarnings>` JSX usage |
| `src/components/recipe/index.ts` | Remove: `export { DietaryWarnings } from './DietaryWarnings'` (line 6) |
| `src/components/settings/index.ts` | Remove: `export { DietarySettings } from './DietarySettings'` (line 3) |
| `src/components/settings/GeneralSettings.tsx` | Remove: `import { DietarySettings }` (line 6), `<DietarySettings>` JSX usage |
| `src/types/index.ts` | Keep `DietaryRestriction`, `HealthCondition`, `DietaryPreferences`, `AdaptedRecipe`, `RecipeAdaptation` types — they're part of the data model and may be used in v2. Remove only if zero references remain after deletion |

### Phase 1 Totals

| Metric | Value |
|--------|-------|
| Files deleted | ~25 |
| Lines removed | ~3,500 |
| Lint errors resolved | 8+ (inventory hooks violation, unused vars) |
| App views remaining | 10 → likely 8 after removing inventory + meal planner views |
| Test files affected | 2 deleted (inventoryConstants.test.ts, visualGeneration.test.ts) |

### Verification

After all Phase 1 removals:
1. `npm run build` must succeed with 0 errors
2. `npm run lint` should have fewer than 16 errors (down from 24)
3. `npx vitest run` must pass (79 tests, down from 81 — 2 test files removed)
4. Manual smoke test: library → cookbook → recipe detail → groceries → cooking → completion

---

## PHASE 2: FIX (Resolve Critical Bugs and Tech Debt)

**Objective:** Fix the bugs and structural issues identified in the evaluation before adding anything new.

### 2A. Fix Chef Ollama Step Index Bug

**Problem:** `src/App.tsx:512` passes `currentStepIndex={0}` to `ChefOllamaChat`. When a user asks for help on step 5, Chef Ollama thinks they're on step 1 and provides wrong advice.

**Root cause:** ChefOllamaChat is rendered at the App level, but step index is local state inside StepExecutor. The `onOpenChef` callback has no way to pass the current step index back to App.

**Fix:**

1. Add `chefStepIndex` to `AppState`:
   ```typescript
   interface AppState {
     // ... existing
     chefStepIndex: number;
   }
   ```

2. Add step index to `OPEN_CHEF` action:
   ```typescript
   | { type: 'OPEN_CHEF'; initialMessage?: string; stepIndex?: number }
   ```

3. Update reducer:
   ```typescript
   case 'OPEN_CHEF':
     return {
       ...state,
       showChefOllama: true,
       chefInitialMessage: action.initialMessage,
       chefStepIndex: action.stepIndex ?? 0,
     };
   ```

4. Change `onOpenChef` prop signature in `StepExecutorProps`:
   ```typescript
   onOpenChef: (stepIndex?: number) => void;
   ```

5. In StepExecutor, pass current step when opening chef:
   ```typescript
   onOpenChef={() => onOpenChef(currentStepIndex)}
   ```

6. In App.tsx, update handler:
   ```typescript
   const handleOpenChef = useCallback((stepIndex?: number) => {
     dispatch({ type: 'OPEN_CHEF', stepIndex });
   }, []);
   ```

7. Pass correct index to ChefOllamaChat:
   ```typescript
   <ChefOllamaChat
     recipe={state.selectedRecipe}
     currentStepIndex={state.chefStepIndex}
     // ...
   />
   ```

**Verification:** Open Chef Ollama on step 3 of any recipe. The context banner should show "Step 3" and AI responses should reference the correct step instruction.

### 2B. Fix All Lint Errors

**Problem:** 24 lint errors and 9 warnings. After Phase 1 removes ~8 errors from deleted files, fix the remaining ~16.

**Known remaining errors after Phase 1:**
- `src/db/index.ts:304` — `let` should be `const` (prefer-const)
- `src/db/index.ts:309` — `let` should be `const` (prefer-const)
- `src/services/recipeParser.ts:282` — `let` should be `const` (prefer-const)
- `src/services/recipeParser.ts:371` — unused `_onProgress` parameter
- `src/types/index.ts:166` — react-refresh warning (exports non-components alongside components)
- Various other `prefer-const` and minor issues

**Fix:** Run `npm run lint`, fix each error. Then add lint to the build command in `package.json`:
```json
"build": "eslint . && tsc -b && vite build"
```

**Verification:** `npm run lint` exits with 0 errors, 0 warnings.

### 2C. Add URL-Based Routing

**Problem:** Browser back button doesn't work. No deep linking. No bookmarkable URLs. The app manages 13 (now ~8) views through a flat state machine with no URL reflection.

**Approach:** Custom History API wrapper (~200 lines). No new dependency needed.

**Implementation:**

1. Create `src/hooks/useRouter.ts`:
   - Map each AppView to a URL path
   - On view change, call `window.history.pushState()`
   - On `popstate` event (back/forward), dispatch the appropriate action
   - On initial load, parse URL and hydrate state (deep linking)

2. URL structure:
   ```
   /                               → library
   /bookshelf                      → bookshelf
   /cookbook/:cookbookId            → cookbook (recipe list)
   /cookbook/:cookbookId/:recipeId  → detail
   /cook/:cookbookId/:recipeId     → groceries/miseenplace/cooking/complete
   ```
   Note: The cooking sub-flow (groceries → mise en place → cooking → complete) shares a single URL base because it's a linear progression. The specific sub-step doesn't need a distinct URL — back button returns to recipe detail.

3. Wire into App.tsx:
   ```typescript
   function App() {
     const [state, dispatch] = useReducer(appReducer, initialState);
     useRouter(state, dispatch);
     // ... rest unchanged
   }
   ```

4. Update `vite.config.ts` for SPA fallback in preview mode.

**Verification:**
- Navigate library → cookbook → recipe → cooking. Press browser back 3 times. Should return to library.
- Copy a recipe detail URL. Open in new tab. Should load directly to that recipe.
- Refresh page during cooking. Should return to recipe detail (not lose context).

---

## PHASE 3: DEEPEN (Invest in Core Experience)

**Objective:** Make the core cooking flow best-in-class. This is the product.

### 3A. Session Persistence (Resume Interrupted Cooks)

**Problem:** If the user closes the tab during step 5 of 12, they lose all progress. No cooking session is saved.

**Implementation:**
- Use the existing `CookingSession` type and `saveCookingSession`/`getCookingSession` from `src/db/index.ts` — the infrastructure is already built but not wired up
- Save session state on every step change (current step, checked ingredients, active timers)
- On app load, check for active sessions and offer to resume
- On cooking completion, delete the session

**Files affected:**
- `src/components/step/StepExecutor.tsx` — save session on step change
- `src/App.tsx` — check for active sessions on init, show resume prompt

### 3B. Test the Core Cooking Flow

**Problem:** Zero tests for the primary product path: grocery checklist → mise en place → step executor → cook completion. These are the most important components and they have no test coverage.

**Tests to write:**

| Test File | Coverage Target |
|-----------|----------------|
| `src/components/recipe/GroceryChecklist.test.tsx` | Ingredient checking, progress calculation, 100% gate enforcement, Chef Ollama integration |
| `src/components/recipe/MiseEnPlace.test.tsx` | Prep step rendering, completion flow |
| `src/components/step/StepExecutor.test.tsx` | Step navigation, timer integration, Chef Ollama button, first/last step edge cases, empty steps guard |
| `src/components/recipe/CookCompletion.test.tsx` | Rating submission, cook history recording, cook-again flow |
| `src/services/chefOllama.test.ts` | Context building, quick action prompts, offline fallback substitutions, message formatting |

**Target:** 40+ new tests covering the core cooking path.

### 3C. Lazy-Load Heavy Dependencies

**Problem:** 1.1MB bundle includes Tesseract.js (~600KB) and PDF.js (~300KB) eagerly, even though recipe import is used infrequently.

**Fix:**
- Dynamic `import()` for `tesseract.js` and `pdfjs-dist` inside `src/services/documentParsing.ts`
- Show a loading spinner while the import modules load
- Vite will automatically code-split these into separate chunks

**Expected result:** Main bundle drops to ~200KB. Import flow loads additional ~900KB on demand.

### 3D. Grocery List Export

**Problem:** The grocery checklist is a killer feature but only exists inside the app. Users can't take it to the store.

**Implementation:**
- Add "Export Shopping List" button to GroceryChecklist
- Formats: plain text (copy to clipboard), share via Web Share API (mobile)
- Group by category (produce, dairy, meat, etc.) using ingredient categorization
- Include quantities and units

**Files affected:**
- `src/components/recipe/GroceryChecklist.tsx` — add export button and formatting logic

---

## PHASE 4: POLISH (Production Readiness)

### 4A. Error Boundary Coverage
- Wrap each major view in its own ErrorBoundary (currently only one at the top level)
- Add recovery actions: "Go Back to Library" instead of just "Reload"

### 4B. Loading States
- Add skeleton loading for cookbook library and recipe lists
- Add loading indicator for database operations
- Add loading indicator for Chef Ollama responses (already partially done)

### 4C. Mobile Optimization
- Test and fix touch interactions for step navigation (swipe between steps)
- Ensure timer notifications work on mobile browsers
- Test grocery checklist checkbox sizing on small screens

### 4D. Offline Indicator
- Show connection status when Chef Ollama is unavailable
- Indicate that the app works fully offline (except AI features)

---

## EXECUTION ORDER

```
Phase 1: CUT          ──── 1 session ────  Remove ~3,500 lines, verify build/tests
Phase 2A: Fix Chef    ──── 1 session ────  Fix step index bug
Phase 2B: Fix Lint    ──── 1 session ────  Zero lint errors, add to build gate
Phase 2C: Add Routing ──── 1-2 sessions ── History API wrapper + deep linking
Phase 3B: Core Tests  ──── 1-2 sessions ── 40+ tests for cooking flow
Phase 3A: Sessions    ──── 1 session ────  Resume interrupted cooks
Phase 3C: Lazy Load   ──── 1 session ────  Code-split heavy deps
Phase 3D: Grocery Export── 1 session ────  Shopping list export
Phase 4: Polish       ──── 1-2 sessions ── Error boundaries, loading, mobile
```

**Total:** 9-12 focused sessions.

**Checkpoint after Phase 2:** The app should have fewer views, zero lint errors, working browser navigation, correct Chef Ollama context, and a clean build. This is the "solid foundation" milestone.

**Checkpoint after Phase 3:** The app should have comprehensive test coverage for its core flow, session persistence, a smaller bundle, and grocery export. This is the "production-ready core" milestone.

---

## WHAT COMES BACK IN v2

After the core is polished, these features can return with proper foundations:

| Feature | Condition for Return |
|---------|---------------------|
| Meal Planning | Migrated to IndexedDB, tested, URL-routed |
| Dietary Adaptation | Reviewed by nutritionist or clearly labeled as "suggestions only" |
| Nutrition Display | Connected to a real nutrition API (USDA FoodData Central) |
| Cost Estimation | Connected to a real pricing API or user-entered prices only |
| Side Dish Suggestions | After course_type is consistently populated on imported recipes |
| Visual Generation | After integration with a real image API (DALL-E, Stable Diffusion API) |
| Inventory Tracking | After user research validates demand within the cooking executor context |

---

## SUCCESS METRICS

After completing all 4 phases:

| Metric | Before | After |
|--------|--------|-------|
| Source lines | ~8,800 | ~5,300 |
| App views | 13 | 8 |
| Lint errors | 24 | 0 |
| Test count | 81 | 120+ |
| Core flow test coverage | 0% | >80% |
| Bundle size (gzip) | 319 KB | ~100 KB main + 220 KB lazy |
| Browser back button | Broken | Works |
| Deep linking | None | Full |
| Interrupted cook resume | No | Yes |
| Chef Ollama step context | Wrong (always step 1) | Correct |
