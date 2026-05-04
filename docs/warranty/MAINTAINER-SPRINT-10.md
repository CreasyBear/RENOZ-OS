# Warranty Maintainer Sprint 10

This sprint continues warranty-domain ownership cleanup after coverage summary moved out of the warranty detail presenter. The target is overview quick-answer ownership: expiry urgency, service linkage state, policy, and expiry date should be explicit, testable, and isolated from page orchestration.

Status: Closed after Issue 1.

## Business Value

The quick-answer strip is the first compact warranty truth operators see in the overview tab. It tells them whether coverage is urgent or expired, whether the warranty is linked to the service-system record, which policy applies, and when coverage ends. That summary should stay honest while the page presenter continues to shrink.

## Workflow Spine

Warranty detail route
-> `WarrantyDetailContainer`
-> warranty read model
-> `WarrantyQuickAnswerStrip`
-> operator-visible expiry urgency, service linkage, policy, and expiry date.

## Architecture Constraints

- Keep this sprint warranty-domain only.
- Do not change routes, hooks, server functions, schemas, database access, query keys, cache invalidation, coverage summary, notification settings, certificate handling, claims, extensions, activity loading, or service linkage behavior.
- Preserve current quick-answer copy, expiry badge thresholds, service linkage labels, policy copy, expiry date formatting, and layout intent.
- Treat this as a behavior-preserving quick-answer presentation extraction.
- Add focused tests for linked context, expired coverage, pending review context, and urgent day-count display.

## Issue Ledger

### 1. Warranty Quick Answer Boundary

Problem:

- `warranty-detail-view.tsx` still owns the overview quick-answer strip and local expiry badge helper.
- The quick-answer strip carries operator trust risk: expired state, urgent day counts, service linkage status, policy, and expiry date are all decision inputs.
- The service linkage presentation and expiry badge thresholds are only indirectly covered through the large page presenter.

Workflow protected:

Warranty detail route -> warranty read model -> quick-answer strip -> expiry urgency, service linkage, policy, and expiry date display.

Planned slice:

- Extract quick-answer rendering into `WarrantyQuickAnswerStrip`.
- Move the local expiry badge helper into the component boundary.
- Preserve current copy, date formatting, badge thresholds, service linkage labels, and layout.
- Add focused tests for linked, expired, pending review, and urgent day-count states.

Out of scope:

- Changing service linkage presentation rules.
- Changing coverage summary, alerts, certificate status, notification settings, claims history, extensions, sidebar traceability, support handoff, or activity UI.
- Changing server read models, query keys, cache policy, tenant enforcement, or mutation behavior.

Closeout:

- Touched domains: warranty detail presentation, warranty overview quick-answer presentation, warranty UI tests, and warranty sprint evidence.
- Workflow protected: warranty detail route -> `WarrantyDetailContainer` -> warranty read model -> `WarrantyQuickAnswerStrip` -> expiry urgency, service linkage, policy, and expiry date display.
- Business value protected: operators still get a compact overview of coverage urgency, service-system linkage, policy, and expiry date before reading deeper warranty sections.
- Architecture standards checked: route/container/hook/server/schema/database boundaries unchanged; service linkage presentation rules unchanged; coverage summary, notification settings, certificate status, claims history, extensions, sidebar traceability, support handoff, and activity behavior unchanged; quick-answer rendering now lives in a focused warranty module.
- Tenant isolation and data integrity checked: no server query, tenant predicate, organization scope, database write, warranty mutation implementation, inventory transaction, finance artifact, support issue mutation, or serialized lineage persistence logic changed.
- Query/cache contract checked: no query key, invalidation, optimistic update, rollback, stale-time, or cache policy changed. Existing warranty read model data is passed through unchanged.
- Smells removed: quick-answer rendering removed from `warranty-detail-view.tsx`; local expiry badge helper removed from the page presenter; service linkage presentation lookup removed from the page presenter; linked, expired, pending-review, and urgent day-count states now have focused component coverage; the page presenter is reduced to roughly 452 lines.
- Smells deferred: `warranty-detail-view.tsx` still owns entity header composition, certificate header-action wiring, extension dialog wiring, and activity/system-history tabs; browser QA remains deferred because this was behavior-preserving extraction.
- Verification: focused quick-answer component tests passed; targeted eslint passed; warranty suite passed 22 files / 89 tests; `tsc --noEmit` passed; `git diff --check` passed.
- Gates skipped: browser QA skipped because this extraction preserved visible copy, badge thresholds, service linkage labels, date formatting, route behavior, server behavior, query/cache behavior, mutation behavior, and layout intent.
- Goal adaptation: no standing goal text change. This continues the active maintainer goal by making warranty overview truth explicit and testable.
- Residual risk: warranty detail remains smaller but still owns entity header composition, certificate action wiring, dialog wiring, and activity tabs. The next sprint should prioritize activity tab ownership or certificate action/header wiring only if it protects a concrete operator workflow or planned behavior change.

## Sprint Closeout Audit

Completion audit:

- Objective: extract warranty overview quick-answer presentation from the warranty detail presenter without changing the visible summary.
- Deliverables checked: sprint artifact, quick-answer strip component, warranty detail integration, focused component tests, targeted lint, warranty unit suite, typecheck, and diff whitespace gate.
- Evidence inspected: `src/components/domain/warranty/views/warranty-detail-view.tsx`, `src/components/domain/warranty/views/warranty-quick-answer-strip.tsx`, `tests/unit/warranty/warranty-quick-answer-strip.test.tsx`, and `docs/warranty/MAINTAINER-SPRINT-10.md`.

Touched domains: warranty detail presentation, warranty overview quick-answer presentation, warranty UI tests, and maintainer sprint documentation.

Workflow protected: warranty read model -> quick-answer strip -> expiry urgency badge, service linkage label, policy label, and formatted expiry date.

Business value protected: RENOZ operators can trust the first compact overview row before deciding whether to extend, investigate, or inspect warranty lineage.

Architecture standards checked:

- route/container boundary: no route, container, or tab behavior changed
- hook/server/schema/database boundary: no hooks, server functions, schemas, database reads, or side effects changed
- query/cache contract: no query keys, invalidation, mutation, optimistic update, or rollback behavior changed
- mutation behavior: no mutation behavior touched
- domain ownership: quick-answer rendering and expiry badge thresholding now have a focused warranty module
- UI honesty: expired coverage renders `Expired`, urgent day counts remain visible, and service linkage labels still come from the existing presentation utility

Smells removed:

- quick-answer strip embedded in `warranty-detail-view.tsx`
- local expiry badge helper embedded in `warranty-detail-view.tsx`
- service linkage presentation lookup embedded in the page presenter for the quick-answer strip
- quick-answer states lacked focused component coverage

Smells deferred:

- entity header composition still lives in the page presenter
- certificate header-action wiring still lives in the page presenter
- extension dialog wiring still lives in the page presenter
- activity/system-history tab composition still lives in the page presenter
- browser QA remains deferred until a visual or workflow behavior pass

Verification:

- `./node_modules/.bin/vitest run tests/unit/warranty/warranty-quick-answer-strip.test.tsx` passed 1 file / 3 tests
- `./node_modules/.bin/eslint src/components/domain/warranty/views/warranty-detail-view.tsx src/components/domain/warranty/views/warranty-quick-answer-strip.tsx tests/unit/warranty/warranty-quick-answer-strip.test.tsx` passed
- `./node_modules/.bin/vitest run tests/unit/warranty` passed 22 files / 89 tests
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit` passed
- `git diff --check` passed

Gates skipped: browser QA skipped because this was a behavior-preserving extraction with focused unit coverage and no route, server, cache, mutation, or layout redesign.

Goal adaptations made or declined: declined goal changes. The standing product-owner goal remains correct; this sprint applies it to warranty overview truth and operator-safe summary states.

Residual risk: warranty detail is down to roughly 452 lines but still owns entity header composition, certificate action wiring, dialog wiring, and activity tabs. Further extraction should be selected only where it protects operator workflow clarity or prepares a concrete behavior change.
