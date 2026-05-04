# Warranty Maintainer Sprint 9

This sprint continues warranty-domain ownership cleanup after sidebar traceability moved out of the warranty detail presenter. The target is coverage summary ownership: days-left, claim summary, covered-item count, and coverage timeline should be explicit, testable, and isolated from page orchestration.

Status: Closed after Issue 1.

## Business Value

Warranty operators need a quick read on coverage urgency, claim load, covered item count, and elapsed coverage before deciding whether to extend, investigate, or support a warranty. These metrics should remain honest when coverage is expired or claim summary data is unavailable.

## Workflow Spine

Warranty detail route
-> `WarrantyDetailContainer`
-> warranty read model and claim summary read model
-> `WarrantyCoverageSummary`
-> operator-visible days-left, claims, covered-items, and coverage progress states.

## Architecture Constraints

- Keep this sprint warranty-domain only.
- Do not change routes, hooks, server functions, schemas, database access, query keys, cache invalidation, alert handling, certificate handling, notification settings, claims history, extensions, activity loading, or service linkage behavior.
- Preserve current metric titles, values, icon intent, expiry date formatting, claim summary fallback, covered item count, progress calculation, progress label, and timeline copy.
- Treat this as a behavior-preserving coverage summary extraction.
- Add focused tests for progress calculation, expired state, unavailable claim summary state, covered-item count, and timeline display.

## Issue Ledger

### 1. Warranty Coverage Summary Boundary

Problem:

- `warranty-detail-view.tsx` still owns key metric rendering and coverage progress calculation.
- These values carry operator trust risk: expired coverage should read as expired, unavailable claim summary should not look like zero claims, and progress should clamp cleanly outside the warranty range.
- Coverage calculation lacks focused tests outside the full page presenter.

Workflow protected:

Warranty detail route -> warranty read model and claim summary read model -> coverage summary -> days-left/claims/covered-items/progress states.

Planned slice:

- Extract key metrics and coverage timeline into `WarrantyCoverageSummary`.
- Extract coverage progress calculation into a focused helper.
- Preserve current copy, date formatting, values, loading/unavailable behavior, and progress label.
- Add focused tests for calculation and presentation.

Out of scope:

- Changing claim summary fetch behavior.
- Changing alert rules, certificate status, notification settings, claims history, extensions, service linkage, sidebar traceability, support handoff, or activity UI.
- Changing server read models, query keys, cache policy, tenant enforcement, or mutation behavior.

Closeout:

- Touched domains: warranty detail presentation, warranty coverage summary presentation, warranty coverage calculation utility, warranty UI tests, and warranty sprint evidence.
- Workflow protected: warranty detail route -> `WarrantyDetailContainer` -> warranty read model and claim summary read model -> `WarrantyCoverageSummary` -> days-left, claims, covered-items, and coverage progress states.
- Business value protected: operators still get coverage urgency, claim load, covered item count, and elapsed coverage before acting; expired coverage still reads as expired, unavailable claim summary still avoids looking like zero claims, and progress clamps outside the warranty date range.
- Architecture standards checked: route/container/hook/server/schema/database boundaries unchanged; claim summary fetch behavior unchanged; alert, certificate, notification, claims history, extension, service linkage, sidebar traceability, support handoff, and activity behavior unchanged; coverage summary rendering now lives in a focused warranty module.
- Tenant isolation and data integrity checked: no server query, tenant predicate, organization scope, database write, warranty mutation implementation, inventory transaction, finance artifact, support issue mutation, or serialized lineage persistence logic changed.
- Query/cache contract checked: no query key, invalidation, optimistic update, rollback, stale-time, or cache policy changed. Existing warranty and claim summary read models are passed through unchanged.
- Smells removed: metric rendering removed from `warranty-detail-view.tsx`; coverage progress calculation removed from the page presenter; progress clamping and invalid-date behavior now have focused utility coverage; focused tests avoid the shared component barrel so unrelated server-only dependencies are not loaded into this UI test; the page presenter is reduced to roughly 493 lines.
- Smells deferred: `warranty-detail-view.tsx` still owns entity header composition, quick-answer strip, certificate header-action wiring, extension dialog wiring, and activity/system-history tabs; browser QA remains deferred because this was behavior-preserving extraction.
- Verification: focused coverage summary tests passed; targeted eslint passed; warranty suite passed 21 files / 86 tests; `tsc --noEmit` passed; `git diff --check` passed.
- Gates skipped: browser QA skipped because this extraction preserved visible metric copy, progress label, route behavior, server behavior, query/cache behavior, mutation behavior, and layout intent.
- Goal adaptation: no standing goal text change. This continues the active maintainer goal by making warranty coverage health explicit and testable.
- Residual risk: warranty detail remains smaller but still owns entity header composition, quick-answer strip, certificate action wiring, dialog wiring, and activity tabs. The next sprint should prioritize quick-answer/header ownership or activity tab ownership only if it protects a concrete operator workflow or planned behavior change.

## Sprint Closeout Audit

Completion audit:

- Objective: extract warranty coverage metrics and timeline from the warranty detail presenter without changing displayed coverage semantics.
- Deliverables checked: sprint artifact, coverage summary component, coverage progress utility, warranty detail integration, focused component/utility tests, targeted lint, warranty unit suite, typecheck, and diff whitespace gate.
- Evidence inspected: `src/components/domain/warranty/views/warranty-detail-view.tsx`, `src/components/domain/warranty/views/warranty-coverage-summary.tsx`, `src/components/domain/warranty/views/warranty-coverage-summary-utils.ts`, `tests/unit/warranty/warranty-coverage-summary.test.tsx`, and `docs/warranty/MAINTAINER-SPRINT-9.md`.

Touched domains: warranty detail presentation, warranty coverage summary presentation, warranty coverage calculation utility, warranty UI tests, and maintainer sprint documentation.

Workflow protected: warranty and claim summary read models -> coverage summary -> days-left metric, claims metric, covered-items metric, and coverage timeline progress.

Business value protected: RENOZ operators can trust the warranty coverage health summary before extending, investigating, or supporting a warranty.

Architecture standards checked:

- route/container boundary: no route, container, or tab behavior changed
- hook/server/schema/database boundary: no hooks, server functions, schemas, database reads, or side effects changed
- query/cache contract: no query keys, invalidation, mutation, optimistic update, or rollback behavior changed
- mutation behavior: no mutation behavior touched
- domain ownership: coverage summary rendering and progress calculation now have focused warranty modules
- UI honesty: expired coverage renders `Expired`, unavailable claim summary renders `—`, and progress clamps between 0 and 100

Smells removed:

- key metric rendering embedded in `warranty-detail-view.tsx`
- coverage progress calculation embedded in `warranty-detail-view.tsx`
- progress clamping and invalid-date behavior lacked focused coverage
- focused UI test initially pulled the shared barrel; the component now imports `MetricCard` directly to avoid unrelated server dependency loading

Smells deferred:

- entity header composition still lives in the page presenter
- quick-answer strip still lives in the page presenter
- certificate header-action wiring still lives in the page presenter
- extension dialog wiring still lives in the page presenter
- activity/system-history tab composition still lives in the page presenter
- browser QA remains deferred until a visual or workflow behavior pass

Verification:

- `./node_modules/.bin/vitest run tests/unit/warranty/warranty-coverage-summary.test.tsx` passed 1 file / 4 tests
- `./node_modules/.bin/eslint src/components/domain/warranty/views/warranty-detail-view.tsx src/components/domain/warranty/views/warranty-coverage-summary.tsx src/components/domain/warranty/views/warranty-coverage-summary-utils.ts tests/unit/warranty/warranty-coverage-summary.test.tsx` passed
- `./node_modules/.bin/vitest run tests/unit/warranty` passed 21 files / 86 tests
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit` passed
- `git diff --check` passed

Gates skipped: browser QA skipped because this was a behavior-preserving extraction with focused unit coverage and no route, server, cache, mutation, or layout redesign.

Goal adaptations made or declined: declined goal changes. The standing product-owner goal remains correct; this sprint applies it to warranty coverage health and operator-safe summary states.

Residual risk: warranty detail is down to roughly 493 lines but still owns entity header composition, quick-answer strip, certificate action wiring, dialog wiring, and activity tabs. Further extraction should be selected only where it protects operator workflow clarity or prepares a concrete behavior change.
