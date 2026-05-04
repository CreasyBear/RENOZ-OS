# Warranty Maintainer Sprint 6

This sprint continues warranty-domain ownership cleanup after service linkage, claims history, support handoff, lineage display, and alert handling moved out of the warranty detail presenter. The target is certificate status honesty: unavailable, loading, available, and missing certificate states should be explicit, testable, and action-safe.

Status: Closed after Issue 1.

## Business Value

Warranty certificates are operator-facing proof artifacts. RENOZ operators need to know whether a certificate exists, whether status is still loading, or whether certificate status is temporarily unavailable. A lookup failure must not read as "no certificate generated yet" because that sends the operator down the wrong workflow.

## Workflow Spine

Warranty detail route
-> `WarrantyDetailContainer`
-> `useWarrantyCertificate`
-> warranty certificate status read model
-> `WarrantyCertificateStatusCard`
-> operator-visible unavailable, loading, available, missing, and retry states.

## Architecture Constraints

- Keep this sprint warranty-domain only.
- Do not change routes, hooks, server functions, schemas, database access, query keys, cache invalidation, certificate generation, certificate regeneration, certificate download, claims, extensions, activity loading, or alert handling.
- Preserve current certificate status copy, retry behavior, and action-menu contract.
- Treat this as a behavior-preserving certificate-status presentation extraction.
- Add focused tests for unavailable, loading, available, and missing certificate states.

## Issue Ledger

### 1. Warranty Certificate Status Boundary

Problem:

- `warranty-detail-view.tsx` still owns certificate status presentation and the conditional decision between unavailable, loading, available, and missing states.
- Certificate status carries operator trust risk: a failed status lookup should not be represented as a missing generated certificate.
- Existing page-level query-normalization coverage checks this behavior through the whole detail view but does not give the status card focused ownership.

Workflow protected:

Warranty detail route -> certificate status read model -> certificate status card -> unavailable/loading/available/missing/retry display.

Planned slice:

- Extract certificate status rendering into `WarrantyCertificateStatusCard`.
- Preserve current copy and retry behavior.
- Add focused tests for unavailable, loading, available, and missing certificate states.

Out of scope:

- Changing certificate query normalization.
- Changing certificate generation, regeneration, or download actions.
- Changing header action availability.
- Changing claims, extensions, alerts, lineage, service linkage, support handoff, or activity UI.

Closeout:

- Touched domains: warranty detail presentation, warranty certificate status presentation, warranty UI tests, and warranty sprint evidence.
- Workflow protected: warranty detail route -> `WarrantyDetailContainer` -> `useWarrantyCertificate` -> certificate status read model -> `WarrantyCertificateStatusCard` -> unavailable/loading/available/missing/retry display.
- Business value protected: operators still see certificate lookup failures as temporarily unavailable, not as missing generated certificates; loading, available, and missing states keep their existing copy and action-menu contract.
- Architecture standards checked: route/container/hook/server/schema/database boundaries unchanged; certificate generation, regeneration, and download wiring unchanged; header action availability unchanged; certificate status rendering now lives in a focused warranty module.
- Tenant isolation and data integrity checked: no server query, tenant predicate, organization scope, database write, warranty mutation, inventory transaction, finance artifact, support issue mutation, or serialized lineage persistence logic changed.
- Query/cache contract checked: no query key, invalidation, optimistic update, rollback, stale-time, or cache policy changed. The existing certificate status read model is passed through unchanged.
- Smells removed: certificate status conditional rendering removed from `warranty-detail-view.tsx`; unavailable/loading/available/missing certificate states now have focused component coverage; the page presenter is reduced to roughly 754 lines.
- Smells deferred: `warranty-detail-view.tsx` still owns header metrics, coverage timeline, notification settings sidebar state, extension dialog wiring, and activity/system-history tabs; browser QA remains deferred because this was behavior-preserving extraction.
- Verification: focused certificate status component tests passed; targeted eslint passed; warranty suite passed 18 files / 77 tests; `tsc --noEmit` passed; `git diff --check` passed.
- Gates skipped: browser QA skipped because this extraction preserved copy, retry behavior, action-menu contract, route behavior, server behavior, query/cache behavior, and mutation behavior.
- Goal adaptation: no standing goal text change. This continues the active maintainer goal by making certificate state ownership explicit and testable inside the warranty domain.
- Residual risk: warranty detail remains an operator surface with header/coverage state, notification settings, dialog wiring, and activity tabs still local. The next sprint should prioritize header/coverage summary extraction or notification-settings ownership only if it protects a planned behavior change or operator-safe state.

## Sprint Closeout Audit

Completion audit:

- Objective: extract warranty certificate status presentation from the warranty detail presenter without changing behavior.
- Deliverables checked: sprint artifact, certificate status card module, warranty detail integration, focused component tests, targeted lint, warranty unit suite, typecheck, and diff whitespace gate.
- Evidence inspected: `src/components/domain/warranty/views/warranty-detail-view.tsx`, `src/components/domain/warranty/views/warranty-certificate-status-card.tsx`, `tests/unit/warranty/warranty-certificate-status-card.test.tsx`, and `docs/warranty/MAINTAINER-SPRINT-6.md`.

Touched domains: warranty detail presentation, warranty certificate status presentation, warranty UI tests, and maintainer sprint documentation.

Workflow protected: certificate status query result -> status card -> temporarily unavailable, checking, available, missing, and retry states.

Business value protected: RENOZ operators can trust certificate status messaging before deciding whether to retry a lookup, use the Actions menu, or generate a certificate.

Architecture standards checked:

- route/container boundary: no route, container, or tab behavior changed
- hook/server/schema/database boundary: no hooks, server functions, schemas, database reads, or side effects changed
- query/cache contract: no query keys, invalidation, mutation, optimistic update, or rollback behavior changed
- mutation behavior: certificate generation, regeneration, and download actions remain wired through existing header actions
- domain ownership: certificate status rendering now has a focused warranty module
- UI honesty: unavailable status continues to suppress "No certificate generated yet"

Smells removed:

- certificate status conditional rendering embedded in `warranty-detail-view.tsx`
- retry alert rendering embedded in the page presenter
- certificate status states lacked focused component coverage

Smells deferred:

- header metric and coverage timeline rendering still live in the page presenter
- notification settings still live in the sidebar presenter
- certificate header-action wiring still lives in the page presenter
- extension dialog wiring still lives in the page presenter
- activity/system-history tab composition still lives in the page presenter
- browser QA remains deferred until a visual or workflow behavior pass

Verification:

- `./node_modules/.bin/vitest run tests/unit/warranty/warranty-certificate-status-card.test.tsx` passed 1 file / 4 tests
- `./node_modules/.bin/eslint src/components/domain/warranty/views/warranty-detail-view.tsx src/components/domain/warranty/views/warranty-certificate-status-card.tsx tests/unit/warranty/warranty-certificate-status-card.test.tsx` passed
- `./node_modules/.bin/vitest run tests/unit/warranty` passed 18 files / 77 tests
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit` passed
- `git diff --check` passed

Gates skipped: browser QA skipped because this was a behavior-preserving extraction with focused unit coverage and no route, server, cache, mutation, or layout redesign.

Goal adaptations made or declined: declined goal changes. The standing product-owner goal remains correct; this sprint applies it to operator-safe warranty certificate status.

Residual risk: warranty detail is smaller but still owns header/coverage state, notification settings, certificate action wiring, dialog wiring, and activity tabs. Continue only with slices that protect real operator workflow clarity or prepare known behavior changes.
