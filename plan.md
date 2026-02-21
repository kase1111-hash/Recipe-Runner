# Implementation Plan: Fix All 14 Security Audit Findings

## Overview
Fix all findings from the agentic security audit across 14 items (3 critical, 3 high, 4 medium, 4 low). Total estimated effort: ~12 hours. One new dependency needed (`qrcode`). No architectural changes.

---

## Execution Order (dependency-aware)

### Phase 1: Quick wins (F-04, F-05, F-12, F-14) — ~1 hour

**Step 1 — F-04: Replace `Math.random()` with `crypto.getRandomValues()`**
- File: `src/services/sharing.ts` (lines 89-100)
- Replace `generateShareCode()` and `generateId()` with crypto-secure versions
- No new deps

**Step 2 — F-05: Add Content-Security-Policy header**
- File: `index.html`
- Add `<meta http-equiv="Content-Security-Policy" ...>` after `<title>`
- CSP allows: `'self'`, `unsafe-inline` for styles, `data:` and `blob:` for images, `localhost:11434` for connect-src, `blob:` for workers

**Step 3 — F-12: Add secret patterns to .gitignore**
- File: `.gitignore`
- Add `.env*`, `*.pem`, `*.key`, `credentials.*`, `secrets.*`

**Step 4 — F-14: Add safety comments to innerHTML usage**
- File: `src/services/utils/sanitize.ts` (lines 39, 61)
- Add `// SAFE:` comments explaining why each usage is secure

### Phase 2: Critical fixes (F-01, F-02, F-03) — ~4 hours

**Step 5 — F-01: Remove third-party CORS proxies**
- File: `src/services/recipeParser.ts` (lines 129-174)
- Delete `CORS_PROXIES` array
- Simplify `fetchWithCorsProxy()` to only attempt direct fetch
- Update error message to suggest text/file import as alternative

**Step 6 — F-02: Bundle PDF.js worker locally**
- File: `src/services/documentParsing.ts` (lines 8-40)
- File: `vite.config.ts` (add worker config)
- Remove all CDN URLs and fallback loop
- Import worker source via Vite's `?url` import and set `GlobalWorkerOptions.workerSrc`
- This also resolves F-13 (no SRI needed when bundled locally)

**Step 7 — F-03: Validate Ollama endpoint**
- File: `src/services/utils/sanitize.ts` — add `validateOllamaEndpoint()` function
- File: `src/services/utils/index.ts` — export it
- File: `src/components/settings/GeneralSettings.tsx` (lines 232-253) — add validation + warning UI for non-local endpoints
- File: `src/db/index.ts` (in `getPreferences()`) — validate endpoint on read, reset to default if invalid

### Phase 3: High-severity fixes (F-06) — ~2 hours

**Step 8 — F-06: Mitigate prompt injection**
- File: `src/services/recipeParser.ts`
  - Wrap user content in `<user_content>` delimiters (line 303)
  - Add input length cap (50KB)
  - Add safe temperature validation post-parsing (reject < 130°F)
  - Add food safety minimum temps to the extraction prompt

### Phase 4: Medium fixes (F-07, F-08, F-09, F-10) — ~4 hours

**Step 9 — F-08: Add file size validation**
- File: `src/components/import/RecipeImport.tsx` (lines 73-84)
- Add `MAX_FILE_SIZE = 10 * 1024 * 1024` check in `handleFileSelect()` and `handleFileImport()`

**Step 10 — F-07: Replace external QR code API with local generation**
- Install `qrcode` package
- File: `src/services/sharing.ts` (lines 334-349) — replace `generateQRCodeUrl()` with local canvas generation
- File: `src/components/common/ShareModal.tsx` — update to handle async QR generation

**Step 11 — F-09: Add localStorage schema validation**
- File: `src/db/index.ts` — add `validatePreferences()` type guard before using parsed data
- File: `src/services/sharing.ts` — add `validateShareableRecipe()` and `validateShareableCookbook()` guards

**Step 12 — F-10: Add image cache size limits and cleanup**
- File: `src/db/index.ts`
  - Add `IMAGE_CACHE_MAX_SIZE` (100 MB) and `IMAGE_CACHE_MAX_AGE_DAYS` (30)
  - Add `cleanupOldImages()` helper
  - Check cache size in `cacheStepImage()` before inserting
  - Run cleanup in `initializeDatabase()` on startup

### Phase 5: Low-severity (F-11) — ~15 min

**Step 13 — F-11: Pin exact dependency versions**
- File: `package.json`
- Remove `^` from all production dependency versions (use current resolved versions from lock file)

---

## Files Modified (summary)

| File | Findings |
|------|----------|
| `src/services/sharing.ts` | F-04, F-07 |
| `index.html` | F-05 |
| `.gitignore` | F-12 |
| `src/services/utils/sanitize.ts` | F-03, F-14 |
| `src/services/utils/index.ts` | F-03 |
| `src/services/recipeParser.ts` | F-01, F-06 |
| `src/services/documentParsing.ts` | F-02 |
| `vite.config.ts` | F-02 |
| `src/components/settings/GeneralSettings.tsx` | F-03 |
| `src/db/index.ts` | F-03, F-09, F-10 |
| `src/components/import/RecipeImport.tsx` | F-08 |
| `src/components/common/ShareModal.tsx` | F-07 |
| `package.json` | F-07, F-11 |

## New Dependencies
- `qrcode` — client-side QR code generation (replaces external API)

## Testing Strategy
- Run `npm run build` after each phase to catch type errors
- Run `npm run test:run` to ensure existing tests pass
- Manual verification of CSP in browser dev tools
- Verify Ollama endpoint validation accepts `localhost` and warns on external URLs
