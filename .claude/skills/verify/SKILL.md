---
name: verify
description: Build, launch, and drive Recipe Runner to verify changes end-to-end in a real browser.
---

# Verifying Recipe Runner

React 19 + Vite SPA, IndexedDB (Dexie) persistence, no backend. The surface is the browser at http://localhost:5173.

## Launch

```bash
npm install
npm run dev &        # Vite dev server on :5173, ready in ~2s
```

`npm run build` runs eslint + tsc + vite build in one script — a lint error fails the build.

## Drive (headless Chromium + Playwright)

Playwright is not a project dependency — install it in the scratchpad, not the repo.
The pre-installed browser lives at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`
(the bare `/opt/pw-browsers/chromium` path is a directory of marker files, not the binary):

```js
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
```

## Flows worth driving

- **Library** (`/`): seeded "Classic American Cooking" cookbook appears after first load (IndexedDB seed).
- **Global search**: `input[aria-label="Search all recipes"]` on the library; results are buttons in a dropdown.
- **Cooking flow**: recipe detail → "Start Cooking" → grocery checklist (`/groceries`) — check every ingredient (`getByRole('checkbox')`, labelled with amount + item; optional ingredients don't block) → "Start Cooking →" → mise en place (`/prep`) → "✓ Start Cooking!" or "Skip to Cooking" → step executor (`/cooking`). ArrowLeft/ArrowRight navigate steps.
- **Timers**: a started timer keeps running as a compact "Step N · Title" row after moving to another step and still rings. Use `page.clock.install()` + `page.clock.runFor(ms)` to fast-forward; the countdown is deadline-based, so the fake clock drives it. The alarm is `/timer-alert.wav` (must be served as `audio/wav`).
- **Resume**: Exit (or browser Back) from cooking and re-entering through groceries → prep resumes at the same step with grocery checks kept.
- **New cookbook**: "+ New Cookbook" on the library opens a dialog (Name/Description/Category/Author) and opens the created cookbook.
- **Manual recipe**: cookbook → "+ Import Recipe" → "✍️ Enter Manually" opens the editor without Ollama.
- **Share links**: Share → Copy Link gives `/shared#<payload>` (recipe packed into the fragment). Open it in a fresh browser context to verify the recipient side ("Save to my cookbook").
- **Shopping list**: "Add to Shopping List" on recipe detail; "🛒 Shopping" button on library header; view at `/shopping`.
- **Dark mode**: theme toggle in library header; assert computed colors, not just classes — the bug class here is hardcoded hex slipping past CSS variables.

## Gotchas

- Console always logs a CSP `frame-ancestors`-via-`<meta>` warning from index.html — pre-existing, ignore it.
- IndexedDB persists per browser context; use a fresh Playwright context for clean-slate runs.
- Escape: closes the shortcut help / topmost dialog first, only blurs a focused text field, and is inert mid-cook and in the editor.
- Chef Ollama isn't running in the sandbox: expect `ERR_CONNECTION_REFUSED` console errors when Chef opens; its offline substitution fallback should still answer.
- Worktrees under `.claude/worktrees/` are picked up by `eslint .` (and so `npm run build`) — lint `src` while they exist.
- Deep links (`/cookbook/<id>/<recipeId>`) must survive reload; cold deep links into `/cooking` intentionally downgrade to the recipe detail (grocery gate).
