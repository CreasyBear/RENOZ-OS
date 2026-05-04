# Warranty Maintainer Sprint 11

This sprint continues warranty-domain ownership cleanup after quick-answer overview moved out of the warranty detail presenter. The target is activity tab ownership: warranty activity actions, warranty activity timeline props, canonical service-system history props, and the no-service-system state should be explicit, testable, and isolated from page orchestration.

Status: Closed after Issue 1.

## Business Value

Warranty operators need to log activity, schedule follow-ups, and inspect warranty or service-system history without confusing normal empty state with missing service-system lineage. The tab panels should preserve action safety and timeline context while the detail presenter continues to shrink.

## Workflow Spine

Warranty detail route
-> `WarrantyDetailContainer`
-> activity read models and activity action callbacks
-> `WarrantyActivityTabPanels`
-> operator-visible warranty activity actions, warranty timeline, system history timeline, or no-service-system state.

## Architecture Constraints

- Keep this sprint warranty-domain only.
- Do not change routes, hooks, server functions, schemas, database access, query keys, cache invalidation, coverage summary, quick-answer strip, notification settings, certificate handling, claims, extensions, service linkage, or activity fetch behavior.
- Preserve current tab values, activity action labels, action callbacks, timeline titles, timeline descriptions, view-all entity search, empty messages, loading/error propagation, and no-service-system copy.
- Treat this as a behavior-preserving activity-tab presentation extraction.
- Add focused tests for activity actions, warranty timeline props, system history timeline props, no-service-system state, and inactive-tab mount behavior.

## Issue Ledger

### 1. Warranty Activity Tab Panels Boundary

Problem:

- `warranty-detail-view.tsx` still owns warranty activity action rendering, timeline prop contracts, service-system history rendering, and no-service-system fallback copy.
- These states carry operator trust risk: a warranty without a linked service system should not look like an empty system history, and activity errors/loading should flow into the timeline unchanged.
- View-all activity feed search targets are only indirectly covered through the large page presenter.

Workflow protected:

Warranty detail route -> activity read models and action callbacks -> activity tab panels -> warranty activity or canonical service-system history display.

Planned slice:

- Extract warranty activity and system-history tab panels into `WarrantyActivityTabPanels`.
- Preserve tab values, action labels, callbacks, timeline copy, view-all search targets, error/loading propagation, and no-service-system fallback copy.
- Add focused tests for action callbacks, timeline prop contracts, no-service-system state, and inactive-tab mount behavior.

Out of scope:

- Changing activity fetch behavior.
- Changing tab list composition.
- Changing overview, claims, coverage summary, quick-answer strip, alerts, certificate status, notification settings, extensions, service linkage, sidebar traceability, or support handoff UI.
- Changing server read models, query keys, cache policy, tenant enforcement, or mutation behavior.

Closeout:

- Touched domains: warranty detail presentation, warranty activity tab presentation, warranty UI tests, and warranty sprint evidence.
- Workflow protected: warranty detail route -> `WarrantyDetailContainer` -> activity read models and action callbacks -> `WarrantyActivityTabPanels` -> warranty activity actions, warranty timeline, system history timeline, or no-service-system state.
- Business value protected: operators can still log warranty activity, schedule follow-ups, inspect warranty activity history, and distinguish "no linked service system" from an empty canonical system history.
- Architecture standards checked: route/container/hook/server/schema/database boundaries unchanged; activity fetch behavior unchanged; tab list composition unchanged; coverage summary, quick-answer strip, notification settings, certificate status, claims, extensions, service linkage, sidebar traceability, and support handoff behavior unchanged; activity tab rendering now lives in a focused warranty module.
- Tenant isolation and data integrity checked: no server query, tenant predicate, organization scope, database write, warranty mutation implementation, inventory transaction, finance artifact, support issue mutation, or serialized lineage persistence logic changed.
- Query/cache contract checked: no query key, invalidation, optimistic update, rollback, stale-time, or cache policy changed. Existing activity read models and callbacks are passed through unchanged.
- Smells removed: activity action rendering removed from `warranty-detail-view.tsx`; warranty and system timeline prop contracts removed from the page presenter; no-service-system fallback copy removed from the page presenter; activity feed search targets now have focused coverage; inactive-tab mount behavior is explicit; the page presenter is reduced to roughly 397 lines.
- Smells deferred: `warranty-detail-view.tsx` still owns entity header composition, tab list composition, certificate header-action wiring, and dialog wiring; browser QA remains deferred because this was behavior-preserving extraction.
- Verification: focused activity tab panel tests passed; targeted eslint passed; warranty suite passed 23 files / 93 tests; `tsc --noEmit` passed; `git diff --check` passed.
- Gates skipped: browser QA skipped because this extraction preserved action labels, callbacks, timeline copy, activity search targets, empty states, route behavior, server behavior, query/cache behavior, mutation behavior, and layout intent.
- Goal adaptation: no standing goal text change. This continues the active maintainer goal by making warranty activity and service-system history states explicit and testable.
- Residual risk: warranty detail is smaller but still owns entity header composition, tab list composition, certificate action wiring, and dialog wiring. The next sprint should prioritize certificate/header action wiring or dialog composition only if it protects a concrete operator workflow or planned behavior change.

## Sprint Closeout Audit

Completion audit:

- Objective: extract warranty activity and system-history tab panels from the warranty detail presenter without changing activity behavior.
- Deliverables checked: sprint artifact, activity tab panels component, warranty detail integration, focused component tests, targeted lint, warranty unit suite, typecheck, and diff whitespace gate.
- Evidence inspected: `src/components/domain/warranty/views/warranty-detail-view.tsx`, `src/components/domain/warranty/views/warranty-activity-tab-panels.tsx`, `tests/unit/warranty/warranty-activity-tab-panels.test.tsx`, and `docs/warranty/MAINTAINER-SPRINT-11.md`.

Touched domains: warranty detail presentation, warranty activity tab presentation, warranty UI tests, and maintainer sprint documentation.

Workflow protected: activity read models and callbacks -> activity tab panels -> log activity, schedule follow-up, warranty timeline, system history timeline, and no-service-system state.

Business value protected: RENOZ operators can safely use warranty activity history and canonical system history without confusing missing linkage with a normal empty timeline.

Architecture standards checked:

- route/container boundary: no route, container, or tab list behavior changed
- hook/server/schema/database boundary: no hooks, server functions, schemas, database reads, or side effects changed
- query/cache contract: no query keys, invalidation, mutation, optimistic update, or rollback behavior changed
- mutation behavior: no mutation behavior touched
- domain ownership: activity tab presentation now has a focused warranty module
- UI honesty: no linked service system renders the existing no-system message instead of a system history timeline

Smells removed:

- warranty activity action buttons embedded in `warranty-detail-view.tsx`
- warranty activity timeline prop contract embedded in the page presenter
- system history timeline prop contract embedded in the page presenter
- no-service-system fallback embedded in the page presenter
- activity view-all search targets lacked focused coverage

Smells deferred:

- entity header composition still lives in the page presenter
- tab list composition still lives in the page presenter
- certificate header-action wiring still lives in the page presenter
- claim, approval, and extension dialog composition still lives in the page presenter
- browser QA remains deferred until a visual or workflow behavior pass

Verification:

- `./node_modules/.bin/vitest run tests/unit/warranty/warranty-activity-tab-panels.test.tsx` passed 1 file / 4 tests
- `./node_modules/.bin/eslint src/components/domain/warranty/views/warranty-detail-view.tsx src/components/domain/warranty/views/warranty-activity-tab-panels.tsx tests/unit/warranty/warranty-activity-tab-panels.test.tsx` passed
- `./node_modules/.bin/vitest run tests/unit/warranty` passed 23 files / 93 tests
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit` passed
- `git diff --check` passed

Gates skipped: browser QA skipped because this was a behavior-preserving extraction with focused unit coverage and no route, server, cache, mutation, or layout redesign.

Goal adaptations made or declined: declined goal changes. The standing product-owner goal remains correct; this sprint applies it to warranty activity history and canonical service-system history.

Residual risk: warranty detail is down to roughly 397 lines but still owns entity header composition, tab list composition, certificate action wiring, and dialog wiring. Further extraction should be selected only where it protects operator workflow clarity or prepares a concrete behavior change.
