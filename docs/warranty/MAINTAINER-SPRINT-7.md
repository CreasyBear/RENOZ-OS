# Warranty Maintainer Sprint 7

This sprint continues warranty-domain ownership cleanup after service linkage, claims history, support handoff, lineage display, alert handling, and certificate status moved out of the warranty detail presenter. The target is notification settings ownership: expiry alert opt-out state should be explicit, testable, and mutation-safe.

Status: Closed after Issue 1.

## Business Value

Expiry reminders protect warranty follow-up windows. RENOZ operators need a clear, action-safe control for enabling or disabling reminders, with honest feedback while the opt-out mutation is pending and visible context for the last sent reminder.

## Workflow Spine

Warranty detail route
-> `WarrantyDetailContainer`
-> warranty read model and opt-out mutation
-> `WarrantyNotificationSettingsCard`
-> operator-visible enabled, disabled, updating, last-alert, and toggle states.

## Architecture Constraints

- Keep this sprint warranty-domain only.
- Do not change routes, hooks, server functions, schemas, database access, query keys, cache invalidation, alert rule construction, certificate handling, claims, extensions, activity loading, or service linkage.
- Preserve current notification settings copy, icon intent, checked semantics, pending disabled state, and opt-out callback contract.
- Treat this as a behavior-preserving notification-settings presentation extraction, with only the static duplicate toggle id remediated inside the new component.
- Add focused tests for active reminders, disabled reminders, opt-out toggle direction, opt-out removal direction, last-alert display, and pending mutation lockout.

## Issue Ledger

### 1. Warranty Notification Settings Boundary

Problem:

- `warranty-detail-view.tsx` still owns expiry notification settings presentation and the mutation-direction mapping between switch checked state and `expiryAlertOptOut`.
- The control carries operator trust risk: enabling reminders must remove the opt-out, disabling reminders must set it, and pending updates must prevent duplicate mutation intent.
- The sidebar can render in both mobile sheet and desktop aside, so a static toggle id is not a strong ownership pattern for this card.

Workflow protected:

Warranty detail route -> warranty read model -> notification settings card -> enabled/disabled/updating/last-alert/toggle states -> opt-out mutation callback.

Planned slice:

- Extract notification settings rendering into `WarrantyNotificationSettingsCard`.
- Preserve current copy, checked semantics, pending state, and callback behavior.
- Use a generated toggle id inside the card.
- Add focused tests for enabled, disabled, last-alert, pending, and toggle-direction behavior.

Out of scope:

- Changing opt-out mutation implementation.
- Changing alert rule construction or alert dismissal.
- Changing certificate, claims, extensions, lineage, service linkage, support handoff, or activity UI.

Closeout:

- Touched domains: warranty detail presentation, warranty notification settings presentation, warranty UI tests, and warranty sprint evidence.
- Workflow protected: warranty detail route -> `WarrantyDetailContainer` -> warranty read model and opt-out mutation -> `WarrantyNotificationSettingsCard` -> enabled/disabled/updating/last-alert/toggle states -> opt-out mutation callback.
- Business value protected: operators still get clear expiry reminder status, can intentionally disable reminders by setting opt-out, can intentionally enable reminders by removing opt-out, and cannot fire duplicate toggle intent while an update is pending.
- Architecture standards checked: route/container/hook/server/schema/database boundaries unchanged; opt-out mutation implementation unchanged; alert rule construction unchanged; notification settings rendering now lives in a focused warranty module.
- Tenant isolation and data integrity checked: no server query, tenant predicate, organization scope, database write, warranty mutation implementation, inventory transaction, finance artifact, support issue mutation, or serialized lineage persistence logic changed.
- Query/cache contract checked: no query key, invalidation, optimistic update, rollback, stale-time, or cache policy changed. The existing opt-out mutation and cache behavior are passed through unchanged.
- Smells removed: notification settings rendering removed from `warranty-detail-view.tsx`; switch checked-state to opt-out mutation-direction mapping now has focused component coverage; static sidebar toggle id replaced with a generated component-owned id; the page presenter is reduced to roughly 673 lines.
- Smells deferred: `warranty-detail-view.tsx` still owns header metrics, coverage timeline, purchased-via/owner/product/coverage-source sidebar summary cards, extension dialog wiring, certificate header-action wiring, and activity/system-history tabs; browser QA remains deferred because this was behavior-preserving extraction.
- Verification: focused notification settings component tests passed; targeted eslint passed; warranty suite passed 19 files / 80 tests; `tsc --noEmit` passed; `git diff --check` passed.
- Gates skipped: browser QA skipped because this extraction preserved visible copy, icon intent, switch semantics, pending disabled state, route behavior, server behavior, query/cache behavior, and mutation implementation.
- Goal adaptation: no standing goal text change. This continues the active maintainer goal by making warranty expiry reminder controls explicit, testable, and mutation-safe.
- Residual risk: warranty detail remains smaller but still owns header/coverage summary state, several sidebar summary cards, certificate action wiring, dialog wiring, and activity tabs. The next sprint should prioritize header/coverage summary extraction or sidebar summary-card ownership only if it removes meaningful cognitive load before behavior work.

## Sprint Closeout Audit

Completion audit:

- Objective: extract warranty notification settings presentation from the warranty detail presenter without changing opt-out mutation behavior.
- Deliverables checked: sprint artifact, notification settings card module, warranty detail integration, focused component tests, targeted lint, warranty unit suite, typecheck, and diff whitespace gate.
- Evidence inspected: `src/components/domain/warranty/views/warranty-detail-view.tsx`, `src/components/domain/warranty/views/warranty-notification-settings-card.tsx`, `tests/unit/warranty/warranty-notification-settings-card.test.tsx`, and `docs/warranty/MAINTAINER-SPRINT-7.md`.

Touched domains: warranty detail presentation, warranty notification settings presentation, warranty UI tests, and maintainer sprint documentation.

Workflow protected: warranty read model -> notification settings card -> enabled reminders, disabled reminders, pending update, last-alert display, and opt-out callback intent.

Business value protected: RENOZ operators can trust the expiry reminder control before deciding whether a warranty should keep receiving reminder alerts.

Architecture standards checked:

- route/container boundary: no route, container, or tab behavior changed
- hook/server/schema/database boundary: no hooks, server functions, schemas, database reads, or side effects changed
- query/cache contract: no query keys, invalidation, mutation, optimistic update, or rollback behavior changed
- mutation behavior: `onToggleOptOut(true)` remains the disable-reminders path and `onToggleOptOut(false)` remains the enable-reminders path
- domain ownership: notification settings rendering now has a focused warranty module
- UI honesty: pending updates still disable the switch and show "Updating..."

Smells removed:

- notification settings rendering embedded in `warranty-detail-view.tsx`
- switch checked-state to opt-out value mapping lacked focused coverage
- static duplicate `opt-out-toggle` id in a sidebar rendered through both mobile sheet and desktop aside

Smells deferred:

- header metric and coverage timeline rendering still live in the page presenter
- purchased-via, owner, product, and coverage-source summary cards still live in the sidebar presenter
- certificate header-action wiring still lives in the page presenter
- extension dialog wiring still lives in the page presenter
- activity/system-history tab composition still lives in the page presenter
- browser QA remains deferred until a visual or workflow behavior pass

Verification:

- `./node_modules/.bin/vitest run tests/unit/warranty/warranty-notification-settings-card.test.tsx` passed 1 file / 3 tests
- `./node_modules/.bin/eslint src/components/domain/warranty/views/warranty-detail-view.tsx src/components/domain/warranty/views/warranty-notification-settings-card.tsx tests/unit/warranty/warranty-notification-settings-card.test.tsx` passed
- `./node_modules/.bin/vitest run tests/unit/warranty` passed 19 files / 80 tests
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit` passed
- `git diff --check` passed

Gates skipped: browser QA skipped because this was a behavior-preserving extraction with focused unit coverage and no route, server, cache, mutation implementation, or layout redesign.

Goal adaptations made or declined: declined goal changes. The standing product-owner goal remains correct; this sprint applies it to operator-safe warranty reminder controls.

Residual risk: warranty detail is down to roughly 673 lines but still owns header/coverage state, sidebar summary cards, certificate action wiring, dialog wiring, and activity tabs. Further extraction should be selected only where it protects operator workflow clarity or prepares a concrete behavior change.
