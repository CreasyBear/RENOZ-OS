# Reliability Standards

This document defines non-negotiable reliability rules for Renoz v3 to reduce user frustration and prevent regression from ad-hoc or bulk-generated code.

**Status:** Active  
**Scope:** All domains, routes, wizards, dialogs, forms, and data mutations.

---

## 1. User-Facing Reliability Rules

### 1.1 Edit Flow Consistency
- Each entity must use one primary edit model:
- Route-driven edit (`/entity/$id/edit`) **or**
- Dialog/sheet edit (in-place), but not both as first-class patterns.
- If both exist, one must be explicitly labeled as secondary (e.g. "Quick Edit").
- Clicking `Edit` must always result in visible UI within one interaction.

### 1.2 No Silent Failure
- Blocked actions must show explicit feedback (`toast`, inline alert, disabled reason).
- URL/search-driven states that cannot be fulfilled must be resolved (clean URL + message).
- Never leave user in a state where URL changed but no UI appeared.

### 1.3 Deterministic Async UX
- Long-running actions must expose pending state.
- Pending state must always have completion paths: success, error, cancel.
- Avoid indefinite "Saving..." indicators.

### 1.4 Draft Safety
- Restore/discard must be idempotent.
- Restore/discard must not immediately re-trigger autosave.
- Draft state must not block forward navigation or submit.

---

## 2. Engineering Reliability Rules

See also: `docs/reliability/MUTATION-CONTRACT-STANDARD.md` for mutation-specific implementation requirements.
See also: `docs/reliability/ROUTE-INTENT-PATTERN.md` for URL-state dialog/tab intent orchestration.

### 2.1 Route Mountability Contract
- Nested route children are only allowed under routes that intentionally render `<Outlet />`.
- Detail routes should be leaf routes unless they intentionally host child routes.
- Flat routes (`$id_.*`) are preferred for detail-adjacent operations that should render independently.

### 2.2 Route Source of Truth
- `src/routeTree.gen.ts` must reflect the real filesystem.
- Route file moves/renames are incomplete until route tree is synced.
- Path literals in code should match generated route IDs and param names.

### 2.3 Side-Effect Discipline
- No `navigate`, `toast`, mutation, or state writes in render branches.
- Side effects must live in handlers/effects with idempotent guards.

### 2.4 Form Contract (TanStack Form)
- Single submit path per form.
- Submit gating must be explicit (step-based forms/wizards).
- Form helper wrappers must not recursively call overridden methods.

### 2.5 Mutation + Cache Contract
- Every mutation must define invalidation/refetch for:
- detail view
- list view (if visible in same session)
- Any optimistic update requires rollback logic.

---

## 3. Anti-Patterns (Prohibited)

- URL changes without mounted UI.
- Render-time redirects/toasts.
- Multiple competing edit entry paradigms without clear hierarchy.
- Draft implementation duplicated per form with divergent behavior.
- Opaque `catch` that logs only and leaves user blocked.
- Route files under `src/routes` that are not routes and not excluded by naming convention.

---

## 4. PR Reliability Checklist (Required)

- [ ] Entry action leads to visible UI (detail -> edit/create/view).
- [ ] Blocked action paths show explicit feedback.
- [ ] Dialog/sheet close behavior resolves URL/search state correctly.
- [ ] No render-time side effects introduced.
- [ ] Draft restore/discard/save behavior tested manually.
- [ ] Submit path tested for success + validation + server error.
- [ ] Mutation invalidation/refetch verified.
- [ ] Route tree alignment verified after route changes.

---

## 5. Severity Model

- `P0`: Users are blocked from completing core workflow.
- `P1`: Users can proceed but with broken/confusing behavior.
- `P2`: Inconsistent UX likely to generate support burden.
- `P3`: Developer debt that increases near-term regression risk.

---

## 6. Definition of Done (Reliability)

A change is reliability-complete only when:
- User can complete core workflow from all documented entry points.
- No silent no-op paths remain.
- Route mounting is deterministic.
- Draft/submit flows are stable under interruption.
- Findings are recorded in the domain tracker with disposition.
