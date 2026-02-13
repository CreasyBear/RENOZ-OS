# Lint Audit Report

**Project:** renoz-v3  
**Scope:** `src/`  
**Date:** 2026-02-13 (Errors reduced to 93 via Phase 1 fixes + config downgrades)  
**Linter:** ESLint 9.x (flat config) + TypeScript ESLint + React + React Hooks + React Refresh

---

## Executive Summary

| Metric | Count |
|--------|-------|
| **Total problems** | 917 |
| **Errors** | 93 (reduced from 548, 2026-02-13) |
| **Warnings** | 369 |
| **Auto-fixable** | 1 |

---

## Rule Breakdown (by count)

| Rule | Count | Severity | Category |
|------|-------|----------|----------|
| `@typescript-eslint/no-explicit-any` | 267 | warning | TypeScript |
| `react-refresh/only-export-components` | 0 | error | React Refresh |
| `react/no-unescaped-entities` | 97 | error | React |
| `react-hooks/exhaustive-deps` | 72 | warning | React Hooks |
| `no-undef` | 60 | error | Core |
| `@typescript-eslint/no-unused-vars` | 55 | error | TypeScript |
| `react-hooks/rules-of-hooks` | 30 | error | React Hooks |
| `no-case-declarations` | 16 | error | Core |
| `no-useless-escape` | 12 | error | Core |
| `@typescript-eslint/no-empty-object-type` | 7+ | error | TypeScript |
| `no-redeclare` | 3 | error | Core |
| `no-restricted-imports` | 4 | error | Architecture |
| `react-hooks/set-state-in-effect` | ~25 | error | React Hooks |
| `react-hooks/static-components` | ~15 | error | React Hooks |
| `react-hooks/use-memo` | ~6 | error | React Hooks |
| `react-hooks/incompatible-library` | ~15 | warning | React Compiler |
| `react-hooks/preserve-manual-memoization` | ~20 | error | React Compiler |
| `react-hooks/purity` | ~5 | error | React Compiler |
| `react-hooks/use-memo` (complex deps) | ~6 | error | React Hooks |

---

## Rule Details & Fix Strategies

### 1. `@typescript-eslint/no-explicit-any` (267 warnings)

**Cause:** Use of `any` type.  
**Fix:** Replace with proper types, `unknown`, or `Record<string, unknown>` where appropriate.  
**Effort:** Medium–high (requires domain knowledge).

---

### 2. `react-refresh/only-export-components` (0 errors — remediated 2026-02-13)

**Cause:** Files export both components and non-components (constants, functions, column configs). Fast Refresh expects component-only files.  
**Fix:** See [STANDARDS.md §12 React Refresh (Fast Refresh)](../STANDARDS.md#12-react-refresh-fast-refresh) for the authoritative pattern, file conventions, and migration guidance.  
**Effort:** Medium (mechanical refactor).

---

### 3. `react/no-unescaped-entities` (97 errors)

**Cause:** Raw `"` and `'` in JSX text.  
**Fix:** Replace `"` with `&quot;` or `{'"'}`; replace `'` with `&apos;` or `{"'"}`.  
**Effort:** Low (search/replace).

---

### 4. `react-hooks/exhaustive-deps` (72 warnings)

**Cause:** Missing or incorrect dependency arrays in `useEffect`, `useMemo`, `useCallback`.  
**Fix:** Add missing deps, wrap expressions in `useMemo` when used as deps, or add `// eslint-disable-next-line` with justification.  
**Effort:** Medium (requires understanding of each hook).

---

### 5. `no-undef` (60 errors)

**Cause:** `prompt`, `confirm`, `MediaRecorder`, `Node` used but not declared.  
**Fix:** Add to ESLint `globals` in `eslint.config.js` (browser APIs) or import/type where needed.  
**Effort:** Low (config change + a few imports).

---

### 6. `@typescript-eslint/no-unused-vars` (55 errors)

**Cause:** Unused variables, catch params, destructured values.  
**Fix:** Remove or prefix with `_` (e.g. `_err`, `_error`).  
**Effort:** Low.

---

### 7. `react-hooks/rules-of-hooks` (30 errors)

**Cause:** Hooks called conditionally, after early return, or in wrong order.  
**Fix:** Move hooks to top level, ensure unconditional call order.  
**Effort:** Medium (can require structural changes).

---

### 8. `no-case-declarations` (16 errors)

**Cause:** Lexical declarations (`const`, `let`) in `switch` case without block.  
**Fix:** Wrap case body in `{}`.  
**Effort:** Low.

---

### 9. `no-useless-escape` (12 errors)

**Cause:** Unnecessary escapes in regex or strings.  
**Fix:** Remove redundant backslashes.  
**Effort:** Low.

---

### 10. `@typescript-eslint/no-empty-object-type` (7+ errors)

**Cause:** Use of `{}` type.  
**Fix:** Replace with `object`, `Record<string, unknown>`, or `Record<string, T>`.  
**Effort:** Low.

---

### 11. `no-redeclare` (3 errors)

**Cause:** Duplicate declarations of same identifier.  
**Fix:** Remove or rename duplicate.  
**Effort:** Low.

---

### 12. `no-restricted-imports` (4 errors)

**Cause:** `PageLayout` imported in domain components; architecture rule requires routes to own layout.  
**Fix:** Move `PageLayout` usage to route files; domain components return content only.  
**Effort:** Medium (requires route refactor).

**Affected files:**
- `communications-container.tsx`
- `duplicates-container.tsx`
- `segments-container.tsx`
- `schedule-calendar-container.tsx`

---

### 13. `react-hooks/set-state-in-effect` (~25 errors)

**Cause:** Synchronous `setState` in `useEffect` body.  
**Fix:** Use derived state, `useMemo`, or event handlers; or move sync logic out of effect.  
**Effort:** Medium–high (requires React patterns review).

---

### 14. `react-hooks/static-components` (~15 errors)

**Cause:** Components created during render (e.g. `const Icon = getIcon(...)` then `<Icon />`).  
**Fix:** Move component creation outside render; use a map of component references or render a wrapper element.  
**Effort:** Medium.

---

### 15. `react-hooks/use-memo` (complex deps) (~6 errors)

**Cause:** `form.watch("field")` in dependency array; linter expects simple expressions.  
**Fix:** Extract to variables: `const subject = form.watch("subject"); const body = form.watch("bodyHtml");` then use `[subject, body]` in deps.  
**Effort:** Low.

---

### 16. `react-hooks/incompatible-library` (~15 warnings)

**Cause:** TanStack Table `useReactTable` and TanStack Virtual `useVirtualizer` return non-memoizable values.  
**Fix:** Consider disabling or downgrading this rule for these libraries; or document as known limitation.  
**Effort:** Config-only.

---

### 17. `react-hooks/preserve-manual-memoization` (~20 errors)

**Cause:** React Compiler inferred dependencies differ from manual `useMemo`/`useCallback` deps.  
**Fix:** Align manual deps with inferred deps, or remove manual memoization where safe.  
**Effort:** Medium.

---

### 18. `react-hooks/purity` (~5 errors)

**Cause:** Impure calls during render (e.g. `Date.now()`).  
**Fix:** Move to `useMemo` with deps, or compute in event handler.  
**Effort:** Low (isolated fixes).

---

## Recommended Fix Order

| Phase | Rules | Effort | Risk |
|-------|-------|--------|------|
| **1. Config** | Add `prompt`, `confirm`, `MediaRecorder`, `Node` to globals | Low | None |
| **2. Quick wins** | `no-undef` (remaining), `no-unused-vars`, `no-case-declarations`, `no-useless-escape`, `no-redeclare`, `react/no-unescaped-entities` | Low | Low |
| **3. Simple fixes** | `react-hooks/use-memo` (form.watch), `@typescript-eslint/no-empty-object-type` | Low | Low |
| **4. Architecture** | `no-restricted-imports` (PageLayout) | Medium | Medium |
| **5. React Refresh** | `react-refresh/only-export-components` | Medium | Low |
| **6. Hooks** | `react-hooks/rules-of-hooks`, `react-hooks/set-state-in-effect`, `react-hooks/static-components` | Medium–High | Medium |
| **7. Deps & purity** | `react-hooks/exhaustive-deps`, `react-hooks/purity`, `react-hooks/preserve-manual-memoization` | Medium | Medium |
| **8. Types** | `@typescript-eslint/no-explicit-any` | High | Low |

---

## Config Decisions Needed

1. **Browser globals:** Add `prompt`, `confirm`, `MediaRecorder`, `Node` to ESLint globals? (Recommended: yes.)
2. **react-refresh/only-export-components:** Enforce strictly or relax for column/config files?
3. **react-hooks/incompatible-library:** Downgrade to warning or disable for TanStack Table/Virtual?
4. **@typescript-eslint/no-explicit-any:** Keep as warning or upgrade to error?

---

## Files by Directory (high-impact areas)

- `src/components/domain/communications/` — many
- `src/components/domain/customers/` — many
- `src/components/domain/dashboard/` — many
- `src/components/domain/jobs/projects/` — many
- `src/components/domain/financial/` — several
- `src/components/domain/inventory/` — several
- `src/components/domain/invoices/` — several
- `src/server/functions/` — several
- `src/routes/` — scattered

---

## Auto-fix

```bash
npm run lint -- --fix
```

Only 1 item is currently auto-fixable; most fixes require manual changes.

---

## Appendix: Raw Rule Counts (from grep)

```
267  @typescript-eslint/no-explicit-any
  0  react-refresh/only-export-components (remediated 2026-02-13)
 97  react/no-unescaped-entities
 72  react-hooks/exhaustive-deps
 60  no-undef
 55  @typescript-eslint/no-unused-vars
 30  react-hooks/rules-of-hooks
 16  no-case-declarations
 12  no-useless-escape
  7  @typescript-eslint/no-empty-object-type
  3  no-redeclare
```
