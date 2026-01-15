# Recipe Runner — 10-Phase Development Guide

This guide breaks down the Recipe Runner project into 10 manageable development phases. Each phase builds on the previous one, delivering incremental value while establishing the foundation for future features.

---

## Phase 1: Core Application Shell & Single Recipe Execution

**Goal:** Build the foundational React application with basic step-by-step recipe execution.

### Deliverables
- [x] React project setup with functional components and hooks
- [x] Basic app shell with navigation structure
- [x] Single hardcoded recipe for testing
- [x] Step Executor component displaying one step at a time
- [x] Linear navigation (previous/next buttons)
- [x] Progress indicator showing current step position
- [x] Step display showing title, instruction, time, and type (active/passive)
- [x] Basic responsive layout (mobile-first)

### Technical Requirements
- React 18+ initialization
- Inline styles for portability
- Local state management with useState/useReducer
- Basic component structure: `App`, `StepExecutor`, `StepDisplay`, `Navigation`

### Exit Criteria
- User can navigate through all steps of a single recipe
- Each step displays correctly with all metadata
- Navigation respects linear progression rules

---

## Phase 2: Grocery Checklist & Progress Gate

**Goal:** Implement the pre-cooking ingredient verification system.

### Deliverables
- [ ] Grocery Checklist component with all ingredients
- [ ] Interactive check-off functionality
- [ ] Progress bar showing completion percentage
- [ ] Gate: Block cooking mode until 100% ingredients checked
- [ ] Clear display of quantities, units, and prep instructions
- [ ] "Start Cooking" button that activates only at 100%

### Technical Requirements
- Ingredient data structure with item, amount, unit, prep, optional fields
- State management for checked/unchecked ingredients
- Conditional rendering for progression gate

### Exit Criteria
- User must check all ingredients before proceeding
- Visual feedback shows progress toward completion
- Clear transition from grocery mode to cooking mode

---

## Phase 3: Recipe Data Model & Multiple Recipes

**Goal:** Establish the full recipe JSON schema and support multiple recipes.

### Deliverables
- [ ] Complete Recipe JSON schema implementation
- [ ] Recipe Selection screen with browse functionality
- [ ] Recipe metadata display (time, servings, step count, difficulty)
- [ ] Safe temperature indicator on recipe cards
- [ ] 3-5 sample recipes with varied complexity
- [ ] Equipment list display on recipe detail screen

### Technical Requirements
```
Recipe structure:
├── id, name, description
├── totalTime, activeTime, yield
├── safeTemp (optional)
├── equipment[]
├── tags[]
├── difficulty
├── ingredients[]
└── steps[]
```

### Exit Criteria
- Multiple recipes can be browsed and selected
- Recipe detail view shows all metadata
- Selected recipe flows into grocery checklist

---

## Phase 4: Timer System

**Goal:** Implement the step timer with full functionality.

### Deliverables
- [ ] Timer component with countdown display
- [ ] Timer states: idle, running, paused, complete, overtime
- [ ] Adjustment buttons (±10 sec, ±1 min)
- [ ] Manual time entry option
- [ ] Persistent timer across step navigation
- [ ] Visual indicator in header when timer running
- [ ] Alert system (sound notification on completion)
- [ ] Overtime tracking (counts up past zero, red display)

### Technical Requirements
- Timer state machine
- Background timer persistence
- Howler.js or Web Audio API for alerts
- setInterval with cleanup on unmount

### Exit Criteria
- Timer works across step navigation
- Alerts fire when timer completes
- Overtime clearly indicated
- Multiple concurrent timers supported

---

## Phase 5: Cookbook Database & Persistence

**Goal:** Implement local storage for cookbooks and recipes.

### Deliverables
- [ ] IndexedDB setup with Dexie.js
- [ ] Cookbook data model (id, title, description, author, category, recipes)
- [ ] CRUD operations for cookbooks
- [ ] CRUD operations for recipes
- [ ] Cookbook Library view (browse all cookbooks)
- [ ] Cookbook Detail view (browse recipes in cookbook)
- [ ] Data persistence across browser sessions
- [ ] LocalStorage for user preferences

### Technical Requirements
```
Database schema:
├── cookbooks table
├── recipes table (with cookbook_id foreign key)
├── user_preferences table
└── cook_history table
```

### Exit Criteria
- Cookbooks and recipes persist across sessions
- User can create, edit, and delete cookbooks
- User can add and remove recipes from cookbooks

---

## Phase 6: Difficulty Ranking Engine

**Goal:** Implement automated and manual difficulty scoring for recipes.

### Deliverables
- [ ] DifficultyScore data structure (overall, technique, timing, ingredients, equipment)
- [ ] Scoring algorithm implementation
- [ ] Visual difficulty labels with color coding
- [ ] Difficulty display on recipe cards
- [ ] Manual difficulty override in recipe edit mode
- [ ] Sorting/filtering recipes by difficulty

### Scoring Weights
```
overall = round(
  (technique × 0.35) +
  (timing × 0.25) +
  (ingredients × 0.20) +
  (equipment × 0.20)
)
```

### Difficulty Labels
| Score | Label | Color |
|-------|-------|-------|
| 1 | Beginner | #4CAF50 |
| 2 | Easy | #8BC34A |
| 3 | Intermediate | #FFC107 |
| 4 | Advanced | #FF9800 |
| 5 | Expert | #F44336 |

### Exit Criteria
- All recipes display calculated difficulty
- Users can filter by difficulty level
- Manual overrides are persisted

---

## Phase 7: Chef Ollama Integration (AI Assistant)

**Goal:** Integrate local LLM for context-aware cooking assistance.

### Deliverables
- [ ] Ollama.js integration
- [ ] Chef Ollama chat interface component
- [ ] Context injection (current recipe, step, ingredients, history)
- [ ] Quick action buttons (Substitution, I messed up, What should this look like?)
- [ ] Substitution suggestion flow
- [ ] Error recovery guidance
- [ ] Recipe modification flow (Just this time / Update recipe / Save as variant)
- [ ] Fallback mode for offline (pre-cached common substitutions)

### Technical Requirements
```json
{
  "ollama": {
    "endpoint": "http://localhost:11434",
    "model": "llama3.1:8b",
    "temperature": 0.7,
    "max_tokens": 500
  }
}
```

### Context Payload Structure
- System context (role, capabilities)
- Recipe context (name, steps, ingredients, current step)
- User context (cook history, skill level, previous adjustments)
- User message

### Exit Criteria
- Chef Ollama responds with recipe-aware context
- Substitution suggestions include ratio adjustments
- Recipe modifications can be saved or applied temporarily

---

## Phase 8: AI Visual Generation

**Goal:** Generate step completion visuals using AI image generation.

### Deliverables
- [ ] Visual prompt field in step schema
- [ ] Image generation API integration
- [ ] Image caching system (Cache API)
- [ ] Display generated image below step instruction
- [ ] Regenerate button for alternative images
- [ ] Loading state during generation
- [ ] Fallback placeholder when generation unavailable

### Visual Prompt Structure
```json
{
  "visual_prompt": "A stand mixer bowl viewed from above containing
   pale yellow, fluffy butter-sugar mixture. Texture is light and
   airy with visible air pockets throughout..."
}
```

### Cache Structure
```
/cache/images/{recipe_id}/{step_index}_v{version}.webp
```

### Exit Criteria
- Each step can display a generated visual
- Images are cached to avoid regeneration
- Users can request alternative images

---

## Phase 9: Recipe Import & Parsing

**Goal:** Enable importing recipes from various external formats.

### Deliverables
- [ ] Import modal with source selection
- [ ] Plain text paste import
- [ ] URL import (recipe websites)
- [ ] PDF import with text extraction
- [ ] Image/OCR import for cookbook pages
- [ ] AI-powered parsing to structured recipe format
- [ ] Auto-generation of visual_prompt for each step
- [ ] Review/edit screen before saving
- [ ] AI-assisted difficulty scoring on import

### Import Flow
```
Upload/Paste Source
       ↓
  AI Extraction
       ↓
 Structured Recipe
       ↓
  User Review/Edit
       ↓
  Save to Cookbook
```

### Exit Criteria
- Recipes can be imported from text, URL, PDF, and images
- Parsed recipes include all required fields
- User can review and correct before saving

---

## Phase 10: Smart Features & Polish

**Goal:** Add quality-of-life features and application polish.

### Deliverables
- [ ] Recipe scaling (adjust servings, recalculate ingredients)
- [ ] Non-linear scaling warnings ("still only need 1 egg")
- [ ] Common substitution database
- [ ] Dietary restriction alternatives
- [ ] Mise en Place mode (consolidated prep phase)
- [ ] Cook history tracking (date, notes, rating, adjustments)
- [ ] Shopping list export (share/copy unchecked items)
- [ ] Pantry memory (remember commonly-stocked items)
- [ ] Offline support via Service Worker
- [ ] Temperature unit toggle (°F/°C)
- [ ] Responsive polish for all breakpoints
- [ ] Keyboard shortcuts for navigation
- [ ] Final performance optimization

### Responsive Breakpoints
| Breakpoint | Target | Layout |
|------------|--------|--------|
| < 480px | Phone portrait | Single column |
| 480-768px | Phone landscape | Compact timer |
| 768-1024px | Tablet | Two column |
| > 1024px | Desktop | Three column |

### Exit Criteria
- Scaling works correctly with warnings for non-linear items
- Cook history is tracked and accessible
- Application works offline for core features
- Performance meets targets (< 2s load, < 100ms navigation)

---

## Phase Summary

| Phase | Focus | Key Deliverable |
|-------|-------|-----------------|
| 1 | Core Shell | Single-step recipe execution |
| 2 | Grocery Gate | Ingredient checklist with progress blocking |
| 3 | Data Model | Multiple recipes with full schema |
| 4 | Timers | Full timer system with alerts |
| 5 | Persistence | IndexedDB cookbook database |
| 6 | Difficulty | Scoring engine with visual labels |
| 7 | AI Assistant | Chef Ollama integration |
| 8 | Visuals | AI-generated step images |
| 9 | Import | Multi-format recipe import |
| 10 | Polish | Scaling, history, offline, optimization |

---

## Dependencies Graph

```
Phase 1 (Core Shell)
    │
    ├──▶ Phase 2 (Grocery Gate)
    │         │
    │         ├──▶ Phase 3 (Data Model)
    │         │         │
    │         │         ├──▶ Phase 5 (Persistence)
    │         │         │         │
    │         │         │         ├──▶ Phase 6 (Difficulty)
    │         │         │         │
    │         │         │         └──▶ Phase 9 (Import)
    │         │         │
    │         │         └──▶ Phase 7 (AI Assistant)
    │         │                   │
    │         │                   └──▶ Phase 8 (Visuals)
    │         │
    │         └──▶ Phase 4 (Timers)
    │
    └──▶ Phase 10 (Polish) ◀── All phases feed into final polish
```

---

## Getting Started

Begin with **Phase 1** to establish the core application structure. Each subsequent phase can be tackled in relative order, though Phases 4 (Timers) and 5 (Persistence) can be developed in parallel after Phase 3 is complete.

The AI-dependent phases (7, 8, 9) require local Ollama installation or API configuration, so ensure infrastructure is ready before beginning those phases.

---

*This guide transforms Recipe Runner from concept to fully-featured application through incremental, testable milestones.*
