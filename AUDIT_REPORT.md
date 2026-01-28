# Recipe Runner - Software Audit Report

**Audit Date:** 2026-01-28
**Auditor:** Claude Code
**Codebase Version:** Commit 81056e5

---

## Executive Summary

Recipe Runner is a well-architected React/TypeScript application that implements a sequential recipe execution system. The codebase demonstrates good software engineering practices with proper separation of concerns, comprehensive type definitions, and thoughtful feature implementation. However, there are several areas requiring attention, particularly around test coverage, security considerations, and some edge cases in business logic.

**Overall Assessment:** ✅ Fit for Purpose with Recommendations

---

## Table of Contents

1. [Architecture & Code Quality](#1-architecture--code-quality)
2. [Database Layer](#2-database-layer)
3. [Service Layer](#3-service-layer)
4. [React Components](#4-react-components)
5. [Type System](#5-type-system)
6. [Security Assessment](#6-security-assessment)
7. [Test Coverage](#7-test-coverage)
8. [Fitness for Purpose](#8-fitness-for-purpose)
9. [Issues & Recommendations](#9-issues--recommendations)
10. [Conclusion](#10-conclusion)

---

## 1. Architecture & Code Quality

### Strengths ✅

- **Clean Separation of Concerns**: Clear division between database layer (`/db`), services (`/services`), components (`/components`), and types (`/types`)
- **Modern Stack**: React 19, TypeScript 5.9, Vite 7.2, Dexie.js for IndexedDB
- **Functional React Patterns**: Consistent use of hooks, no class components
- **Comprehensive Feature Set**: 15+ service modules covering recipe parsing, scaling, meal planning, inventory management, dietary adaptation, and AI assistance

### Code Organization

```
src/
├── components/     # 11+ component directories, well-organized by feature
├── services/       # 15 business logic modules
├── db/            # Single-file database layer (549 lines)
├── types/         # Centralized type definitions (359 lines)
├── contexts/      # React Context providers (Theme, Keyboard Shortcuts)
└── test/          # Test setup and configuration
```

### Areas for Improvement ⚠️

- **App.tsx complexity**: At 369 lines with 20+ handler functions, the main App component could benefit from state management refactoring (useReducer or dedicated state management)
- **Code duplication**: `parseAmount()` function is duplicated in `recipeScaling.ts`, `mealPlanning.ts`, and `inventory.ts`
- **Missing index files**: Component directories lack barrel exports, leading to verbose imports

---

## 2. Database Layer

**File:** `src/db/index.ts` (549 lines)

### Strengths ✅

- **Proper Schema Versioning**: Two versions defined with proper migration paths
- **Transaction Support**: Cascading deletes use transactions (`deleteCookbook`, `deleteBookshelf`)
- **Comprehensive Operations**: CRUD + pagination + filtering + favorites
- **Image Cache Optimization**: Converts base64 to Blob for efficient storage

### Issues Found ⚠️

| Issue | Severity | Location | Description |
|-------|----------|----------|-------------|
| Missing error handling | Medium | `createCookbook:57` | No try/catch for database operations |
| Pagination inefficiency | Low | `getRecipesPaginated:195-252` | Loads all records then slices in memory |
| Duplicate sorting | Low | `getRecipesPaginated:241-245` | Favorites sort applied after main sort |
| Missing indexes | Low | Schema | No index on `favorite` field despite filtering |

### Code Example - Missing Error Handling

```typescript
// Current (line 56-58)
export async function createCookbook(cookbook: Cookbook): Promise<string> {
  return await db.cookbooks.add(cookbook);  // Can throw on duplicate
}

// Recommended
export async function createCookbook(cookbook: Cookbook): Promise<string> {
  try {
    return await db.cookbooks.add(cookbook);
  } catch (error) {
    if (error instanceof Dexie.ConstraintError) {
      throw new Error(`Cookbook already exists: ${cookbook.id}`);
    }
    throw error;
  }
}
```

---

## 3. Service Layer

### 3.1 Recipe Scaling (`recipeScaling.ts`)

**Verdict:** ✅ Well Implemented

- Correctly handles non-linear scaling for yeast, eggs, salt, etc.
- Proper fraction formatting (1/2, 3/4, etc.)
- Good handling of "fixed items" like bay leaves

**Minor Issue:** `parseAmount` doesn't handle unicode fractions (½, ¼)

### 3.2 Recipe Parser (`recipeParser.ts`)

**Verdict:** ⚠️ Good with Caveats

- Comprehensive AI-powered parsing with Ollama integration
- Good fallback prompts for visual generation
- Proper confidence scoring

**Issues:**
1. **CORS limitation** (line 131): `fetchRecipeFromUrl` uses direct fetch which will fail due to browser CORS policies
2. **No retry logic**: Failed Ollama calls don't retry
3. **JSON extraction fragile** (line 228-243): Regex-based JSON extraction can fail on nested structures

### 3.3 Chef Ollama (`chefOllama.ts`)

**Verdict:** ✅ Good Implementation

- Excellent offline fallbacks with common substitution database
- Proper timeout handling with AbortController
- Context-aware prompts including user skill level

### 3.4 Meal Planning (`mealPlanning.ts`)

**Verdict:** ✅ Well Implemented

- Clean date utilities
- Proper aggregation of ingredients across recipes
- Good unit normalization

### 3.5 Inventory Service (`inventory.ts`)

**Verdict:** ✅ Good Implementation

- Comprehensive unit conversion tables
- Smart shopping list generation
- Low stock and expiration alerts

**Minor Issue:** Unit conversion table missing some common units (pinch, dash, bunch)

### 3.6 Document Parsing (`documentParsing.ts`)

**Verdict:** ✅ Good Implementation

- PDF.js integration for PDF parsing
- Tesseract.js for OCR
- Good progress reporting
- Helpful OCR text cleaning

### 3.7 Sharing Service (`sharing.ts`)

**Verdict:** ⚠️ Functional but Limited

- Share codes only work on same device (localStorage-based)
- No actual network sharing capability
- External QR code API dependency (privacy concern)

---

## 4. React Components

### 4.1 StepExecutor (`components/step/StepExecutor.tsx`)

**Verdict:** ✅ Well Implemented

- Good guard clause for empty steps array (line 29-36)
- Proper navigation logic
- Sticky header/footer for mobile usability

### 4.2 Timer (`components/common/Timer.tsx`)

**Verdict:** ✅ Excellent Implementation

- Handles page visibility changes correctly (line 159-175)
- Notification API integration
- Overtime tracking feature
- Sound alerts with Howler.js

**Minor Issue:** Timer sound file (`/timer-alert.mp3`) may not exist in public folder

### 4.3 App.tsx State Management

**Verdict:** ⚠️ Works but Could Be Improved

- 20+ handler functions managing view state
- All state in single component (tight coupling)
- `checkedIngredients` passed through multiple components

**Recommendation:** Consider useReducer or a simple state machine for view navigation.

---

## 5. Type System

**File:** `src/types/index.ts` (359 lines)

### Strengths ✅

- Comprehensive type coverage for all domain entities
- Good use of union types for enums (`StepType`, `TimerState`, etc.)
- Proper optional field annotations
- Rich metadata types (DifficultyScore, CourseType, DietaryPreferences)

### Issues Found ⚠️

| Issue | Location | Description |
|-------|----------|-------------|
| Inconsistent nullability | `Recipe.course_type` | `CourseType \| null` vs `undefined` |
| Missing readonly | Throughout | Mutable arrays/objects where immutable expected |
| Wide string types | `cuisine` field | Should be union of known cuisines |

---

## 6. Security Assessment

### 6.1 Input Validation

| Area | Status | Notes |
|------|--------|-------|
| User input sanitization | ⚠️ | AI-generated content rendered without sanitization |
| URL validation | ⚠️ | `fetchRecipeFromUrl` accepts any URL |
| File upload validation | ✅ | Proper file type checking in `documentParsing.ts` |

### 6.2 Data Storage

| Area | Status | Notes |
|------|--------|-------|
| Sensitive data in localStorage | ⚠️ | Ollama API endpoint stored in localStorage |
| Data encryption | ❌ | No encryption for stored data |
| Session management | N/A | No authentication system |

### 6.3 External Dependencies

| Area | Status | Notes |
|------|--------|-------|
| QR code API | ⚠️ | External `api.qrserver.com` receives share URLs |
| PDF.js worker | ⚠️ | Loaded from CDN (`cdnjs.cloudflare.com`) |
| Ollama endpoint | ✅ | Local by default (configurable) |

### 6.4 OWASP Top 10 Relevance

- **XSS Risk (Low):** React's JSX escaping provides baseline protection, but dangerously set innerHTML scenarios should be reviewed
- **Injection Risk (Low):** No direct SQL/command execution; AI prompts are constructed safely
- **SSRF Risk (Low):** URL fetching is user-initiated

### Security Recommendations

1. **Sanitize AI-generated content** before rendering (use DOMPurify)
2. **Bundle PDF.js worker** locally instead of CDN
3. **Add CSP headers** to prevent external script injection
4. **Consider self-hosted QR generation** library

---

## 7. Test Coverage

### Current State

| Metric | Value | Assessment |
|--------|-------|------------|
| Test files | 3 | ❌ Very Low |
| Components tested | 1 (ErrorBoundary) | ❌ Insufficient |
| Services tested | 1 (visualGeneration) | ❌ Insufficient |
| Total test lines | ~130 | ❌ Minimal |

### Test Files Found

1. `src/components/common/ErrorBoundary.test.tsx` - 5 tests
2. `src/services/visualGeneration.test.ts` - 3 tests
3. `src/components/inventory/inventoryConstants.test.ts` - 3 tests

### Missing Critical Tests

- **Database operations** - No tests for CRUD, transactions, migrations
- **Recipe scaling** - No tests for fraction parsing, non-linear scaling
- **Recipe parser** - No tests for AI response parsing, edge cases
- **Timer component** - No tests for state transitions, visibility handling
- **Meal planning** - No tests for date utilities, aggregation

### Test Infrastructure

- ✅ Vitest configured correctly
- ✅ Testing Library available
- ✅ fake-indexeddb for IndexedDB mocking
- ✅ LocalStorage mocked in setup

### Test Coverage Recommendations

**Priority 1 (Critical):**
- Database operations with transactions
- Recipe scaling calculations
- Timer state machine

**Priority 2 (High):**
- Recipe parser JSON extraction
- Meal planning aggregation
- Inventory unit conversion

**Priority 3 (Medium):**
- Component integration tests
- Keyboard shortcut handling
- Theme switching

---

## 8. Fitness for Purpose

### Core Requirements Analysis

Based on `Spec.md` stated goals:

| Feature | Implemented | Working | Notes |
|---------|-------------|---------|-------|
| Forced Linear Execution | ✅ | ✅ | Single step at a time |
| Grocery Checklist | ✅ | ✅ | Required before cooking |
| Mise en Place Mode | ✅ | ✅ | Prep phase implemented |
| Step Execution | ✅ | ✅ | Large text, clear instructions |
| Chef Ollama AI | ✅ | ✅ | With offline fallbacks |
| Smart Scaling | ✅ | ✅ | Non-linear ingredient handling |
| Visual Generation | ✅ | ⚠️ | Requires external API |
| Meal Planning | ✅ | ✅ | Weekly planning + grocery lists |
| Inventory Management | ✅ | ✅ | Tracking + low stock alerts |
| Recipe Import | ✅ | ⚠️ | URL import has CORS issues |
| Bookshelf Organization | ✅ | ✅ | Categories + favorites |
| Dietary Management | ✅ | ✅ | Restrictions + health conditions |

### User Experience Assessment

**Strengths:**
- Clean, focused UI for cooking mode
- Progress indicators throughout
- Timer with notifications and overtime tracking
- Keyboard shortcuts for power users

**Weaknesses:**
- No undo for accidental navigation
- No session recovery after browser crash
- No offline mode indicator

---

## 9. Issues & Recommendations

### Critical Issues 🔴

1. **Test Coverage < 5%**
   - Risk: Regressions undetected
   - Fix: Add tests for critical paths (see Section 7)

2. **URL Fetch CORS Failure**
   - Location: `recipeParser.ts:128`
   - Risk: Recipe URL import doesn't work
   - Fix: Implement proxy server or use browser extension

### High Priority Issues 🟠

3. **No Input Sanitization for AI Content**
   - Risk: Potential XSS if AI returns malicious content
   - Fix: Use DOMPurify before rendering AI responses

4. **External CDN Dependencies**
   - Location: `documentParsing.ts:8`
   - Risk: Availability dependency, potential supply chain attack
   - Fix: Bundle PDF.js worker locally

5. **Missing Database Error Handling**
   - Location: `db/index.ts` (multiple functions)
   - Fix: Add try/catch with meaningful error messages

### Medium Priority Issues 🟡

6. **Pagination Loads Full Dataset**
   - Location: `db/index.ts:195-252`
   - Risk: Performance degradation with large cookbooks
   - Fix: Use Dexie cursor-based pagination

7. **Duplicated Utility Functions**
   - Location: `parseAmount()` in 3 files
   - Fix: Extract to shared utility module

8. **App.tsx State Complexity**
   - Risk: Difficult to maintain and test
   - Fix: Extract view navigation to useReducer or state machine

### Low Priority Issues 🟢

9. **Missing Unicode Fraction Support**
   - Location: `recipeScaling.ts:parseAmount`
   - Fix: Add regex for ½, ¼, ¾, etc.

10. **Share Codes Local Only**
    - Feature works but misleading UX
    - Fix: Add clear messaging or implement backend sharing

---

## 10. Conclusion

### Summary

Recipe Runner is a **well-designed application** that fulfills its stated purpose of guiding users through recipes sequentially. The codebase demonstrates professional React patterns, comprehensive TypeScript usage, and thoughtful UX design.

### Key Strengths

1. Clean architecture with proper separation of concerns
2. Comprehensive type system
3. Thoughtful offline fallbacks for AI features
4. Good handling of edge cases in recipe scaling
5. Timer implementation with background state handling

### Key Weaknesses

1. Extremely low test coverage
2. Some security considerations unaddressed
3. CORS limitation breaks URL import feature
4. State management could be cleaner

### Fitness for Purpose Score

| Category | Score | Notes |
|----------|-------|-------|
| Functionality | 8/10 | All core features implemented |
| Code Quality | 7/10 | Good patterns, some duplication |
| Security | 6/10 | Basic protection, gaps identified |
| Testing | 2/10 | Critical weakness |
| Documentation | 8/10 | Good README and specs |
| **Overall** | **6.2/10** | Fit for purpose with caveats |

### Recommended Next Steps

1. **Immediate:** Add tests for critical business logic
2. **Short-term:** Fix CORS issue with proxy solution
3. **Medium-term:** Add input sanitization for AI content
4. **Long-term:** Refactor App.tsx state management

---

*This audit was performed by Claude Code on 2026-01-28. The findings are based on static code analysis and do not include runtime testing or penetration testing.*
