# Recipe Runner

**A sequential process executor for humans who think in parallel.**

Recipe Runner transforms traditional recipes and procedural instructions into a single-step-at-a-time guided experience. It forces linear execution of inherently sequential processes — something recipe books assume you'll do but never enforce.

## The Problem

Traditional recipes are formatted like source code but executed by humans who:
- Skip around the page
- Read bottom-to-top
- Get ahead of themselves
- Miss critical timing windows
- Don't know what "fold until just combined" actually looks like

The result: burnt food, missed steps, and the nagging feeling that cooking is harder than it should be.

## The Solution

Recipe Runner treats recipes as **programs for humans**:

1. **Grocery Checklist** — Forced completion before cooking begins. No starting until every ingredient is confirmed present.
2. **Single-Step Display** — One instruction at a time. Large text. No peeking ahead.
3. **Time & Type Per Step** — Active (you're doing something) vs Passive (oven/stovetop doing something). Plan your attention accordingly.
4. **Safe Temperatures** — Prominently displayed for food safety, with specific probe locations.
5. **Contextual Tips** — The stuff cookbooks bury in paragraphs nobody reads.
6. **AI-Generated Step Visuals** — What this step should look like when done correctly (see Roadmap).

---

## Current Features

### Recipe Selection
- Browse available recipes with metadata (time, servings, step count)
- Visual indicator for recipes requiring safe internal temperatures

### Grocery Mode
- Interactive checklist of all ingredients
- Progress bar showing completion
- Blocked progression until 100% checked
- Quantities and units clearly displayed

### Cooking Mode
- One step per screen
- Step title + detailed instruction
- Time estimate with active/passive indicator
- Optional tips (displayed only when relevant)
- Temperature card on final step for applicable recipes
- Linear navigation (previous/next)
- Progress indicator

---

## Roadmap

### Phase 1: Cookbook Architecture ✦ NEXT

Transform from single-recipe app to multi-cookbook library.

```
/cookbooks
  /traditional-american
    metadata.json
    /recipes
      roast-chicken.json
      meatloaf.json
  /herbalism
    metadata.json
    /recipes
      healing-salve.json
      fire-cider.json
  /fermentation
    metadata.json
    /recipes
      sourdough-starter.json
      kimchi.json
```

**Cookbook metadata structure:**
```json
{
  "id": "herbalism-basics",
  "title": "Kitchen Herbalism",
  "description": "Foundational preparations for home herbalists",
  "author": "...",
  "category": "herbalism",
  "recipeCount": 12,
  "tags": ["herbal", "remedies", "tinctures", "salves"]
}
```

**Extended recipe schema:**
```json
{
  "id": "healing-salve",
  "name": "All-Purpose Healing Salve",
  "cookbook": "herbalism-basics",
  "totalTime": "2 hours + 4 weeks infusion",
  "yield": "8 oz",
  "safeTemp": null,
  "shelf_life": "1 year",
  "equipment": [
    "double boiler",
    "cheesecloth",
    "8oz tin or jar"
  ],
  "ingredients": [...],
  "steps": [
    {
      "title": "Infuse the Oil",
      "instruction": "Combine dried herbs with carrier oil in a clean jar. Seal and place in a sunny window.",
      "time": "4 weeks",
      "type": "passive",
      "tip": "Shake daily. Oil should smell strongly of herbs when ready.",
      "visual_prompt": "A mason jar filled with golden-green oil and submerged dried herbs, sitting in bright window light. Oil is clear, not cloudy. Herbs are fully submerged with no air pockets."
    }
  ]
}
```

### Phase 2: AI Step Visualization ✦ CORE DIFFERENTIATOR

Each step includes a `visual_prompt` field — a detailed description of what successful completion looks like. On render, the app generates an image showing the expected outcome.

**Why this matters:**
- "Fold until just combined" means nothing to a novice
- "Reduce to a simmer" — what does that look like?
- "Salve should coat the back of a spoon" — show me

**Visual prompt examples:**

| Step | Visual Prompt |
|------|---------------|
| Cream butter and sugar | "A stand mixer bowl containing pale yellow, fluffy butter-sugar mixture with visible air pockets. Texture is light and increased in volume, not dense or greasy." |
| Reduce to simmer | "A stainless steel pot from above showing gentle, small bubbles breaking at the surface edges. Center is calm with slight movement. Steam rising but not rolling boil." |
| Fold in flour | "Wooden spoon mid-fold in a glass bowl. Batter shows visible streaks of flour not yet incorporated. Texture is loose, not dense or overworked." |
| Herbs fully wilted | "A sauté pan with dark green, collapsed leafy greens. No raw bright green visible. Leaves are soft and reduced to 1/4 original volume." |

**Implementation approach:**
- Store `visual_prompt` in recipe JSON
- Generate on-demand or pre-cache during recipe import
- Display below instruction text
- Allow regeneration if image doesn't match user's setup

**Non-food applications:**
- Herbal preparations (what does "infused oil ready to strain" look like?)
- Fermentation stages (what does "active sourdough starter" look like?)
- Craft processes (what does "leather properly burnished" look like?)
- Any procedural knowledge with visual checkpoints

### Phase 3: Recipe Import & AI Parsing

**Cookbook digitization pipeline:**

1. User uploads cookbook (PDF, images, or text)
2. AI extracts structured recipe data:
   - Ingredients with quantities/units
   - Steps with time estimates
   - Equipment requirements
   - Safe temperatures (if applicable)
3. AI generates `visual_prompt` for each step
4. User reviews/edits parsed recipe
5. Recipe saved to local cookbook

**Import sources:**
- PDF cookbooks
- Recipe website URLs
- Plain text paste
- Photo of cookbook page (OCR + parsing)

### Phase 4: Smart Features

**Timers**
- Automatic countdown timers for passive steps
- Notification when timer completes
- "Start timer" button appears on passive steps

**Scaling**
- Adjust serving size
- Automatic ingredient recalculation
- Flag steps that don't scale linearly ("still only need 1 egg")

**Substitutions**
- Common ingredient swaps
- Dietary restriction alternatives
- "I don't have X" suggestions

**Mise en Place Mode**
- Pre-cooking checklist
- "Prep all ingredients before starting"
- Combines all prep steps into a single pre-phase

---

## Technical Architecture

### Current Stack
- React (functional components + hooks)
- Inline styles (portable, no build dependencies)
- Local state management

### Planned Additions
- Local storage for cookbook persistence
- IndexedDB for larger cookbook libraries
- AI image generation API integration
- Service worker for offline support
- Optional cloud sync for cross-device access

### Data Flow
```
[Cookbook Library]
       ↓
[Recipe Selection]
       ↓
[Grocery Checklist] → blocked until complete
       ↓
[Step Executor] → one step at a time
       ↓         → AI visual per step
       ↓         → timer for passive steps
[Completion]
```

---

## Philosophy

### This is not just a recipe app

Recipe Runner is a **process executor for procedural knowledge**. Cooking is the first domain because:
- Everyone cooks (broad user base)
- Failure is immediate and obvious (fast feedback)
- Success is visceral and rewarding (motivation to continue)

But the architecture supports any sequential process:
- Herbalism and natural remedies
- Fermentation and preservation
- Woodworking and crafts
- Equipment maintenance
- Emergency procedures
- Educational lab work

### The visual generation thesis

Most procedural knowledge assumes visual familiarity the learner doesn't have. Cookbooks written by experts forget what it's like to not know what "properly proofed dough" looks like.

AI-generated step visuals democratize this tacit knowledge. Every step becomes visually verifiable, regardless of the user's prior experience.

### Why not video?

Videos require:
- Scrubbing to find the right moment
- Pausing at the right frame
- Matching your setup to the video's setup
- Linear time investment

AI-generated images provide:
- Instant "what done looks like" reference
- Adaptation to described equipment/ingredients
- No time commitment beyond glancing
- Regeneration if it doesn't match your context

---

## Recipe JSON Schema (Full)

```json
{
  "id": "unique-recipe-id",
  "name": "Human Readable Name",
  "cookbook": "parent-cookbook-id",
  "description": "Brief description of the dish/preparation",
  "totalTime": "1 hr 30 min",
  "activeTime": "30 min",
  "yield": "4 servings | 8 oz | 2 loaves",
  "safeTemp": {
    "value": 165,
    "unit": "°F",
    "location": "thickest part of thigh"
  },
  "equipment": [
    "roasting pan",
    "meat thermometer",
    "kitchen twine"
  ],
  "tags": ["dinner", "protein", "roasting"],
  "difficulty": "intermediate",
  "source": {
    "type": "book | url | original",
    "title": "The Joy of Cooking",
    "page": 427,
    "url": null
  },
  "ingredients": [
    {
      "item": "whole chicken",
      "amount": "4",
      "unit": "lb",
      "prep": "patted dry",
      "optional": false,
      "substitutes": ["two 2lb cornish hens"]
    }
  ],
  "steps": [
    {
      "title": "Short Step Name",
      "instruction": "Detailed instruction text. Be specific.",
      "time": "30 min",
      "type": "active | passive",
      "tip": "Optional contextual tip",
      "visual_prompt": "Detailed description of what successful completion looks like for AI image generation.",
      "temperature": {
        "value": 425,
        "unit": "°F",
        "target": "oven"
      },
      "timer": true
    }
  ],
  "notes": "Any additional notes about the recipe",
  "created": "2025-01-14T00:00:00Z",
  "modified": "2025-01-14T00:00:00Z"
}
```

---

## Contributing

This project is in active development. Core priorities:

1. **Cookbook data structure** — Finalize the multi-cookbook architecture
2. **Recipe parser** — AI-powered import from various formats
3. **Visual generation integration** — Connect step prompts to image generation
4. **Offline support** — Service worker + local persistence

---

## License

MIT — Use it, fork it, cook with it.

---

*Built for people who read recipes bottom-to-top and somehow still miss the "preheat oven" step.*
