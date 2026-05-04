# Warranty Maintainer Sprint 5

This sprint continues warranty-domain ownership cleanup after service linkage, claims history, support handoff, and lineage display moved out of the warranty detail presenter. The target is alert honesty: expired, expiring-soon, and expiry-alert opt-out states should be explicit, testable, and action-safe.

Status: Closed after Issue 1.

## Business Value

Warranty alerts tell operators when a battery warranty needs immediate attention, whether extension is still available, and whether expiry reminders are disabled. If these alerts are wrong or buried in page orchestration, operators can miss extension windows or confuse unavailable warranty state with normal coverage.

## Workflow Spine

Warranty detail route
-> `WarrantyDetailContainer`
-> warranty read model and expiry calculation
-> `buildWarrantyAlerts`
-> `WarrantyAlerts`
-> operator-visible extension, review-claims, enable-alerts, and dismiss actions.

## Architecture Constraints

- Keep this sprint warranty-domain only.
- Do not change routes, hooks, server functions, schemas, database access, query keys, cache invalidation, mutations, certificates, claims, extensions, or activity loading.
- Preserve current alert copy, ID rules, tone mapping, action labels, dismissal behavior, and action side effects.
- Treat this as a behavior-preserving alert-rule and presentation extraction.
- Add focused tests for expired grace-period extension, expired beyond grace-period review, expiring soon extension, alerts-disabled enablement, and alert action/dismiss behavior.

## Issue Ledger

### 1. Warranty Alert Honesty Boundary

Problem:

- `warranty-detail-view.tsx` still owns alert construction, alert action mapping, and alert rendering.
- The rule set carries operator-facing warranty risk: expired state, extension grace period, expiring-soon state, and disabled expiry reminders.
- Existing page-level tests do not directly cover the alert rule matrix or action routing.

Workflow protected:

Warranty detail route -> warranty read model -> expiry days/status/opt-out -> alert rules -> alert presentation/action routing.

Planned slice:

- Extract alert rule construction into `buildWarrantyAlerts`.
- Extract alert rendering into `WarrantyAlerts`.
- Preserve current copy, alert IDs, tones, labels, dismissal behavior, and action effects.
- Add focused tests for the alert rule matrix and presentation actions.

Out of scope:

- Changing expiry calculation.
- Changing warranty extension mutation behavior.
- Changing expiry alert opt-out mutation behavior.
- Changing claim tabs, certificate state, lineage display, support handoff, service linkage, or activity UI.

Closeout:

- Touched domains: warranty detail UI, warranty alert rule construction, warranty alert presentation, warranty component tests, warranty alert utility tests, and warranty sprint evidence.
- Workflow protected: warranty detail route -> `WarrantyDetailContainer` -> warranty read model and expiry calculation -> `buildWarrantyAlerts` -> `WarrantyAlerts` -> operator-visible extension, review-claims, enable-alerts, and dismiss actions.
- Business value protected: operators still see the same expired, grace-period, expiring-soon, and expiry-alert-disabled messages while the rule matrix is now explicit and testable outside the page presenter.
- Architecture standards checked: route/container/hook/server/schema/database boundaries unchanged; extension and opt-out mutation wiring unchanged; alert dismissal hook unchanged; alert ID generation preserved; alert rules and rendering now live in focused warranty modules.
- Tenant isolation and data integrity checked: no server query, tenant predicate, organization scope, database write, warranty mutation, inventory transaction, finance artifact, support issue mutation, or serialized lineage persistence logic changed.
- Query/cache contract checked: no query key, invalidation, optimistic update, rollback, stale-time, or cache policy changed.
- Smells removed: alert rule construction removed from `warranty-detail-view.tsx`; alert rendering removed from the presenter; expired grace-period, expired beyond grace-period, expiring-soon, and alert opt-out states now have focused utility coverage; extend/review/enable/dismiss routing now has focused component coverage.
- Smells deferred: `warranty-detail-view.tsx` remains sizeable and still owns header metrics, coverage timeline, certificate sidebar state, extension dialog wiring, and activity/system-history tabs; browser QA remains deferred because this was behavior-preserving extraction.
- Verification: focused alert utility/component tests passed; targeted eslint passed; warranty suite passed 17 files / 73 tests; `tsc --noEmit` passed; `git diff --check` passed.
- Gates skipped: browser QA skipped because this extraction preserved alert copy, IDs, tones, labels, dismissal behavior, and action effects while changing code ownership and tests.
- Goal adaptation: no standing goal text change. This continues the active maintainer goal by protecting operator-safe warranty alert states and shrinking the monolithic warranty detail presenter.
- Residual risk: warranty detail is down to roughly 774 lines but still owns header metrics, coverage timeline, certificate sidebar state, extension dialog wiring, and activity tabs. The next sprint should prioritize certificate-state ownership or header/coverage summary extraction if continuing warranty.

## Sprint Closeout Audit

Completion audit:

- Objective: extract warranty alert rule construction and alert presentation from the warranty detail presenter without changing behavior.
- Deliverables checked: sprint artifact, alert utility module, alert component module, warranty detail integration, focused utility tests, focused component tests, targeted lint, warranty unit suite, typecheck, and diff whitespace gate.
- Evidence inspected: `src/components/domain/warranty/views/warranty-detail-view.tsx`, `src/components/domain/warranty/views/warranty-alerts-utils.ts`, `src/components/domain/warranty/views/warranty-alerts.tsx`, `tests/unit/warranty/warranty-alerts-utils.test.ts`, `tests/unit/warranty/warranty-alerts.test.tsx`, and `docs/warranty/MAINTAINER-SPRINT-5.md`.

Touched domains: warranty detail presentation, warranty alert rules, warranty alert presentation, warranty UI tests, and maintainer sprint documentation.

Workflow protected: warranty read model and expiry calculation -> alert rules -> visible alerts -> extend warranty, review claims, enable alerts, or dismiss.

Business value protected: RENOZ operators retain honest expiry and opt-out warnings so extension windows and disabled reminders remain visible and action-safe.

Architecture standards checked:

- route/container boundary: no route, container, or tab behavior changed
- hook/server/schema/database boundary: no hooks, server functions, schemas, database reads, or side effects changed
- query/cache contract: no query keys, invalidation, mutation, optimistic update, or rollback behavior changed
- mutation behavior: extension dialog opening and expiry-alert opt-out callback behavior preserved
- domain ownership: alert rules and alert rendering now have focused warranty modules
- UI honesty: expired grace-period, expired beyond grace-period, expiring-soon, and disabled-alert states have focused rule coverage

Smells removed:

- alert rule construction embedded in `warranty-detail-view.tsx`
- alert rendering embedded in `warranty-detail-view.tsx`
- alert action mapping embedded in alert objects inside the page presenter
- operator-facing alert rule matrix lacked focused coverage

Smells deferred:

- header metric and coverage timeline rendering still live in the page presenter
- certificate sidebar state still lives in the page presenter
- certificate and extension dialog wiring still lives in the page presenter
- activity/system-history tab composition still lives in the page presenter
- browser QA remains deferred until a visual or workflow behavior pass

Verification:

- `./node_modules/.bin/vitest run tests/unit/warranty/warranty-alerts-utils.test.ts tests/unit/warranty/warranty-alerts.test.tsx` passed 2 files / 6 tests
- `./node_modules/.bin/eslint src/components/domain/warranty/views/warranty-detail-view.tsx src/components/domain/warranty/views/warranty-alerts.tsx src/components/domain/warranty/views/warranty-alerts-utils.ts tests/unit/warranty/warranty-alerts.test.tsx tests/unit/warranty/warranty-alerts-utils.test.ts` passed
- `./node_modules/.bin/vitest run tests/unit/warranty` passed 17 files / 73 tests
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit` passed
- `git diff --check` passed

Gates skipped: browser QA skipped because this was a behavior-preserving extraction with focused unit coverage and no route, server, cache, mutation, or layout redesign.

Goal adaptations made or declined: declined goal changes. The standing product-owner goal remains correct; this sprint applies it to operator-safe warranty alert states.

Residual risk: warranty detail remains an operator surface with header/coverage state, certificate state, dialog wiring, and activity tabs still local. Further extraction should be chosen only where it protects operator trust or future behavior changes.
