# Recipe Runner — Technical Specification v1.0

## Product Vision

Recipe Runner is a sequential process executor that treats recipes as programs for humans. It enforces linear execution, provides visual verification of each step, handles runtime errors through an embedded AI assistant, and manages a personal cookbook database.

**Core thesis:** Cooking failures are usually execution errors, not recipe errors. Recipe Runner catches exceptions in real-time and provides contextual recovery options.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         RECIPE RUNNER                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────┐ │
│  │  Cookbook   │    │   Recipe    │    │     Step Executor       │ │
│  │  Database   │───▶│  Selector   │───▶│  ┌─────────────────┐    │ │
│  │             │    │             │    │  │ Current Step    │    │ │
│  └─────────────┘    └─────────────┘    │  │ + Timer         │    │ │
│        │                               │  │ + Visual Prompt │    │ │
│        │                               │  └────────┬────────┘    │ │
│        ▼                               │           │             │ │
│  ┌─────────────┐                       │           ▼             │ │
│  │  Difficulty │                       │  ┌─────────────────┐    │ │
│  │  Ranking    │                       │  │  Chef Ollama    │    │ │
│  │  Engine     │                       │  │  (Error Handler)│    │ │
│  └─────────────┘                       │  └─────────────────┘    │ │
│                                        └─────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Feature Specifications

### 1. Cookbook Database

#### 1.1 Data Model

```
COOKBOOK
├── id: string (uuid)
├── title: string
├── description: string
├── author: string
├── category: enum [cooking, baking, herbalism, fermentation, preservation, craft]
├── cover_image: string (url or base64)
├── created_at: timestamp
├── modified_at: timestamp
└── recipes: Recipe[]

RECIPE
├── id: string (uuid)
├── cookbook_id: string (foreign key)
├── name: string
├── description: string
├── total_time: string
├── active_time: string
├── yield: string
├── difficulty: DifficultyScore
├── safe_temp: SafeTemp | null
├── equipment: string[]
├── tags: string[]
├── source: Source
├── ingredients: Ingredient[]
├── steps: Step[]
├── notes: string
├── created_at: timestamp
├── modified_at: timestamp
└── cook_history: CookHistory[]

INGREDIENT
├── item: string
├── amount: string
├── unit: string
├── prep: string | null
├── optional: boolean
└── substitutes: string[]

STEP
├── index: number
├── title: string
├── instruction: string
├── time_minutes: number
├── time_display: string
├── type: enum [active, passive]
├── tip: string | null
├── visual_prompt: string
├── temperature: Temperature | null
└── timer_default: number | null (seconds)

DIFFICULTY_SCORE
├── overall: number (1-5)
├── technique: number (1-5)
├── timing: number (1-5)
├── ingredients: number (1-5)
└── equipment: number (1-5)

COOK_HISTORY
├── date: timestamp
├── completed: boolean
├── notes: string
├── adjustments: string[]
└── rating: number (1-5)
```

#### 1.2 Storage Strategy

| Data Type | Storage | Sync |
|-----------|---------|------|
| Cookbooks | IndexedDB | Optional cloud |
| Recipes | IndexedDB | Optional cloud |
| User preferences | localStorage | Optional cloud |
| Cook history | IndexedDB | Optional cloud |
| Cached images | Cache API | Local only |

#### 1.3 Cookbook Operations

| Operation | Description |
|-----------|-------------|
| Create cookbook | New empty cookbook with metadata |
| Import cookbook | Parse PDF/URL/text into structured cookbook |
| Clone cookbook | Duplicate with new ID for modification |
| Export cookbook | JSON or PDF export |
| Archive cookbook | Soft delete, recoverable |
| Delete cookbook | Hard delete with confirmation |

---

### 2. Difficulty Ranking Engine

#### 2.1 Scoring Dimensions

**Technique Score (1-5)**
| Score | Criteria |
|-------|----------|
| 1 | No special techniques. Mix, pour, heat. |
| 2 | Basic techniques: sauté, simmer, fold |
| 3 | Intermediate: tempering, emulsification, reduction |
| 4 | Advanced: lamination, caramelization, spherification |
| 5 | Expert: multi-stage techniques, precise temp control |

**Timing Score (1-5)**
| Score | Criteria |
|-------|----------|
| 1 | Flexible timing, forgiving windows |
| 2 | Some time-sensitive steps |
| 3 | Multiple concurrent timers needed |
| 4 | Critical timing windows, sequence-dependent |
| 5 | Precision timing required, narrow margins |

**Ingredients Score (1-5)**
| Score | Criteria |
|-------|----------|
| 1 | Common pantry staples |
| 2 | Standard grocery items |
| 3 | Some specialty ingredients |
| 4 | Multiple specialty/seasonal items |
| 5 | Rare, hard-to-source, or prep-intensive |

**Equipment Score (1-5)**
| Score | Criteria |
|-------|----------|
| 1 | Basic pots, pans, utensils |
| 2 | Standard kitchen equipment |
| 3 | Some specialized tools (thermometer, scale) |
| 4 | Multiple specialized tools |
| 5 | Professional equipment required |

**Overall Score Calculation:**
```
overall = round(
  (technique × 0.35) + 
  (timing × 0.25) + 
  (ingredients × 0.20) + 
  (equipment × 0.20)
)
```

#### 2.2 Difficulty Labels

| Score | Label | Color | Description |
|-------|-------|-------|-------------|
| 1 | Beginner | #4CAF50 | Anyone can do this |
| 2 | Easy | #8BC34A | Some cooking experience helpful |
| 3 | Intermediate | #FFC107 | Comfortable home cook |
| 4 | Advanced | #FF9800 | Experienced cook, focused attention |
| 5 | Expert | #F44336 | Significant skill required |

#### 2.3 AI-Assisted Scoring

When importing recipes, Chef Ollama analyzes:
- Step instructions for technique keywords
- Time constraints and concurrent operations
- Ingredient list against common pantry database
- Equipment mentions

User can override AI scores after cooking.

---

### 3. Step Timer System

#### 3.1 Timer States

```
TIMER_STATE
├── idle: Timer not started
├── running: Counting down
├── paused: Stopped, time remaining
├── complete: Reached zero
└── overtime: Counting up past zero
```

#### 3.2 Timer Interface

```
┌─────────────────────────────────────────┐
│              STEP TIMER                 │
├─────────────────────────────────────────┤
│                                         │
│            ┌───────────┐                │
│            │   12:34   │  ← Main display│
│            └───────────┘                │
│                                         │
│     [−1m]  [−10s]  [+10s]  [+1m]        │
│                                         │
│         [ ▶ START ]  [ ↺ RESET ]        │
│                                         │
│     ○ Alert: Sound  ○ Vibrate  ○ Both   │
│                                         │
└─────────────────────────────────────────┘
```

#### 3.3 Timer Features

| Feature | Description |
|---------|-------------|
| Default time | Pre-populated from step `timer_default` |
| Adjustable | ±10 sec, ±1 min buttons |
| Manual entry | Tap display to enter custom time |
| Persistent | Continues when navigating away from step |
| Multi-timer | Support concurrent timers for complex recipes |
| Alerts | Sound, vibration, or both |
| Overtime tracking | Counts up after zero, shows +XX:XX in red |
| History | Log actual time vs estimated for future reference |

#### 3.4 Timer Behavior

| Event | Behavior |
|-------|----------|
| Step has `timer_default` | Timer pre-populated, not auto-started |
| User starts timer | Countdown begins, persists across navigation |
| Timer reaches zero | Alert fires, switches to overtime mode |
| User navigates away | Timer continues, indicator shown in header |
| Recipe completed | All timers cleared |
| App backgrounded | Timer continues, notification on complete |

---

### 4. Chef Ollama — Error Handling Assistant

#### 4.1 Overview

Chef Ollama is a context-aware AI assistant embedded in the cooking interface. It has full awareness of:
- Current recipe and all steps
- Current step being executed
- Ingredient list and checked items
- User's cook history with this recipe
- Common cooking errors and recoveries

#### 4.2 Interface

```
┌─────────────────────────────────────────┐
│  👨‍🍳 Chef Ollama                    [×] │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ Chef: I see you're on step 3,  │    │
│  │ seasoning the chicken. What's  │    │
│  │ going on?                      │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ You: I only have dried thyme,  │    │
│  │ not fresh. How much do I use?  │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ Chef: For dried thyme, use 1/3 │    │
│  │ the amount — so about 2 tsp    │    │
│  │ instead of 2 tbsp fresh.       │    │
│  │                                │    │
│  │ [Update Recipe] [Just This Time]│    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ Quick actions:                 │    │
│  │ [Substitution] [I messed up]   │    │
│  │ [What should this look like?]  │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────────┐│
│  │ Type a message...            [Send]││
│  └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

#### 4.3 Context Injection

Every Chef Ollama request includes:

```json
{
  "system_context": {
    "role": "Chef Ollama - cooking assistant for Recipe Runner",
    "capabilities": [
      "substitution suggestions",
      "error recovery",
      "technique explanation", 
      "recipe modification",
      "timing adjustment"
    ]
  },
  "recipe_context": {
    "recipe_name": "Classic Roast Chicken",
    "total_steps": 7,
    "current_step": 3,
    "current_step_title": "Season the Bird",
    "current_step_instruction": "...",
    "ingredients": [...],
    "checked_ingredients": [...],
    "safe_temp": { "value": 165, "unit": "°F" }
  },
  "user_context": {
    "times_cooked": 2,
    "last_cooked": "2025-01-10",
    "previous_adjustments": ["used olive oil instead of butter"],
    "skill_level": "intermediate"
  },
  "user_message": "I only have dried thyme, not fresh. How much do I use?"
}
```

#### 4.4 Quick Actions

| Action | Trigger | Behavior |
|--------|---------|----------|
| Substitution | "I don't have X" | Suggest alternatives with ratio adjustments |
| I messed up | "I burned/overcooked/forgot X" | Triage: recoverable? Restart step? Adapt? |
| What should this look like? | Visual uncertainty | Generate/describe expected appearance |
| Adjust for equipment | "I don't have a X" | Modify technique for available tools |
| Scale recipe | "I need to make X servings" | Recalculate ingredients, flag non-linear items |

#### 4.5 Recipe Modification Flow

When Chef Ollama suggests a change, user can:

1. **Just this time** — Apply temporarily, don't save
2. **Update recipe** — Permanently modify the recipe
3. **Save as variant** — Create new recipe version

```
┌─────────────────────────────────────────┐
│  Save Modification                      │
├─────────────────────────────────────────┤
│                                         │
│  Change: "Use 2 tsp dried thyme         │
│          instead of 2 tbsp fresh"       │
│                                         │
│  ○ Just this time                       │
│  ○ Update "Classic Roast Chicken"       │
│  ○ Save as "Roast Chicken (dried herbs)"│
│                                         │
│  [ Cancel ]              [ Save ]       │
│                                         │
└─────────────────────────────────────────┘
```

#### 4.6 Error Recovery Patterns

| Error Type | Detection | Recovery |
|------------|-----------|----------|
| Burned component | User reports | Assess severity, suggest restart or workaround |
| Missing ingredient | Checklist gap | Substitution or recipe modification |
| Wrong amount added | User reports | Dilution, compensation, or restart |
| Overcooked | User reports + timer overtime | Sauce/moisture recovery options |
| Undercooked | User reports | Continue cooking with new time estimate |
| Temperature wrong | User reports | Adjust time, suggest technique modification |
| Equipment failure | User reports | Alternative method or abort with save state |

#### 4.7 Ollama Integration

**Local deployment (default):**
```
Ollama running locally → localhost:11434
Model: llama3.1:8b or mistral:7b (configurable)
Context window: 8k tokens
```

**API configuration:**
```json
{
  "ollama": {
    "endpoint": "http://localhost:11434",
    "model": "llama3.1:8b",
    "temperature": 0.7,
    "max_tokens": 500,
    "timeout_ms": 30000
  }
}
```

**Fallback options:**
1. Local Ollama (preferred)
2. Remote Ollama server (user-configured)
3. OpenAI-compatible API (user-configured)
4. Offline mode (pre-cached common substitutions)

---

### 5. Grocery Checklist

#### 5.1 Features

| Feature | Description |
|---------|-------------|
| Ingredient list | All ingredients with amounts/units |
| Check-off | Tap to mark as acquired |
| Progress gate | Cannot proceed to cooking until 100% |
| Missing item flow | "I don't have this" → Chef Ollama substitution |
| Shopping list export | Share/copy unchecked items |
| Pantry memory | Remember commonly-stocked items |

#### 5.2 Missing Ingredient Flow

```
User unchecks "fresh thyme"
         │
         ▼
┌─────────────────────────────┐
│  Missing: fresh thyme       │
├─────────────────────────────┤
│                             │
│  [ ] I'll get it later      │
│  [ ] Find a substitute      │
│  [ ] Skip this ingredient   │
│                             │
└─────────────────────────────┘
         │
         ▼ (if "Find a substitute")
         │
    Chef Ollama opens with context:
    "I need a substitute for fresh thyme 
     in Classic Roast Chicken"
```

---

### 6. Step Executor

#### 6.1 Step Display

```
┌─────────────────────────────────────────────────────────────────┐
│  [← Prev]     Step 3 of 7     [👨‍🍳 Help]     [Next →]           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │                   SEASON THE BIRD                       │   │
│  │                                                         │   │
│  │              ⏱ 5 min  •  Active                        │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │  Gently loosen the skin over the breast meat with      │   │
│  │  your fingers. Spread half the herb butter under the   │   │
│  │  skin directly on the meat. Rub remaining butter all   │   │
│  │  over the outside of the chicken.                      │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  💡 Be gentle - you don't want to tear the skin.       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                     TIMER                               │   │
│  │                                                         │   │
│  │                     05:00                               │   │
│  │                                                         │   │
│  │        [−1m]  [−10s]    [+10s]  [+1m]                   │   │
│  │                                                         │   │
│  │              [ ▶ START TIMER ]                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  🌡️ Final temp: 165°F at thickest part of thigh        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 6.2 Step Navigation Rules

| Rule | Behavior |
|------|----------|
| Linear progression | Next step only after current viewed |
| Back navigation | Always allowed |
| Skip prevention | No "jump to step X" |
| Timer warning | Alert if navigating with active timer |
| Completion | Final step shows "Done" action |

---

### 7. AI Visual Generation

#### 7.1 Visual Prompt Structure

Each step contains a `visual_prompt` field:

```json
{
  "title": "Cream Butter and Sugar",
  "instruction": "Beat softened butter with sugars until light and fluffy, about 3 minutes.",
  "visual_prompt": "A stand mixer bowl viewed from above containing pale yellow, fluffy butter-sugar mixture. Texture is light and airy with visible air pockets throughout. Volume has increased noticeably from starting ingredients. No visible sugar granules. Mixture holds soft peaks on the paddle attachment. Bowl sides are clean. Kitchen lighting, realistic photo style."
}
```

#### 7.2 Generation Trigger

| Trigger | Behavior |
|---------|----------|
| Step load | Check cache for existing image |
| Cache miss | Generate on-demand |
| User request | "Show me what this looks like" via Chef Ollama |
| Regenerate | User can request new image if first doesn't match their setup |

#### 7.3 Image Caching

```
/cache
  /images
    /{recipe_id}
      /{step_index}_v{version}.webp
```

---

## User Interface Specifications

### Navigation Flow

```
[App Launch]
     │
     ▼
[Cookbook Library] ──────────────────────────────────┐
     │                                               │
     ▼                                               │
[Cookbook View] ─── [Add Recipe] ─── [Import]        │
     │                                               │
     ▼                                               │
[Recipe Detail] ─── [Edit Recipe]                    │
     │                                               │
     ▼                                               │
[Grocery Checklist] ─── [Missing Item] ─── [Chef Ollama]
     │                                               │
     ▼ (100% checked)                                │
     │                                               │
[Step Executor] ◀───────────────────────────────────┘
     │
     ├─── [Timer]
     │
     ├─── [Chef Ollama] ─── [Substitution]
     │                  ─── [Error Recovery]
     │                  ─── [Recipe Modification]
     │
     ▼
[Completion] ─── [Rate & Note] ─── [Cookbook Library]
```

### Responsive Breakpoints

| Breakpoint | Target | Layout |
|------------|--------|--------|
| < 480px | Phone portrait | Single column, large touch targets |
| 480-768px | Phone landscape / small tablet | Single column, compact timer |
| 768-1024px | Tablet | Two column (step + timer side-by-side) |
| > 1024px | Desktop | Three column (nav + step + chat) |

---

## Technical Requirements

### Dependencies

| Package | Purpose |
|---------|---------|
| React 18+ | UI framework |
| IndexedDB (Dexie.js) | Local database |
| Ollama.js | LLM communication |
| Howler.js | Timer audio alerts |
| date-fns | Time formatting |
| uuid | ID generation |

### API Endpoints (if using remote Ollama)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/chat` | POST | Chef Ollama conversation |
| `/api/v1/generate-image` | POST | Step visualization |
| `/api/v1/parse-recipe` | POST | Import recipe from text/URL |

### Performance Targets

| Metric | Target |
|--------|--------|
| Initial load | < 2s |
| Step navigation | < 100ms |
| Chef Ollama response | < 5s (local), < 10s (remote) |
| Image generation | < 15s |
| Offline support | Full functionality except AI features |

---

## Data Privacy

| Data Type | Storage | Transmission |
|-----------|---------|--------------|
| Recipes | Local only (default) | Optional sync |
| Cook history | Local only | Never transmitted |
| Chat logs | Local only | Sent to Ollama only |
| Images | Cached locally | Generated locally or user-configured endpoint |

---

## Future Considerations

### Phase 2+

- Voice control ("Hey Chef, what's next?")
- Smart display integration (show current step on kitchen screen)
- Meal planning (weekly cookbook scheduling)
- Inventory tracking (automatic grocery list based on pantry state)
- Social sharing (share cookbook with family)
- Nutritional calculation
- Cost estimation

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-01-14 | Initial specification |

---

*Spec authored for Recipe Runner — Process execution for humans who read recipes bottom-to-top.*
