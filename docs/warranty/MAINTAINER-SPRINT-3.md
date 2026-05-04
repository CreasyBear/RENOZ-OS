# Warranty Maintainer Sprint 3

This sprint continues warranty-domain ownership cleanup after service linkage and claims history moved out of the warranty detail presenter. The target is support issue handoff: a warranty should carry the right customer, product, entitlement, order, shipment, and serial context into support issue creation.

Status: Closed after Issue 1.

## Business Value

Support issue handoff is where warranty context becomes operational support work. For RENOZ operators, losing customer, entitlement, shipment, order, product, or serial context here creates duplicate lookup work and risks breaking battery lineage from warranty entitlement to support diagnosis and remedy.

## Workflow Spine

Warranty detail route
-> `WarrantyDetailContainer`
-> warranty read model
-> `WarrantySupportActions`
-> `/support/issues/new` search schema
-> support issue intake anchor resolution.

## Architecture Constraints

- Keep this sprint warranty-domain only, with read-only awareness of the support issue intake schema.
- Do not change routes, hooks, server functions, schemas, database access, query keys, cache invalidation, mutations, support issue creation behavior, certificates, claims, extensions, or activity loading.
- Preserve current copy, link target, button styling, and search anchor fields.
- Treat this as a behavior-preserving presentational extraction.
- Add focused tests for complete entitlement-backed handoff and legacy/manual warranty handoff.

## Issue Ledger

### 1. Support Issue Handoff Boundary

Problem:

- `warranty-detail-view.tsx` still owns the support issue creation link and its cross-domain anchor payload.
- That payload carries the warranty-to-support spine: customer, warranty, entitlement, product, order, shipment, and serial context.
- The target support route has an explicit search schema, but the source handoff is not isolated or tested.

Workflow protected:

Warranty detail route -> warranty read model -> support action link -> `/support/issues/new` search anchors -> support issue intake anchor resolution.

Planned slice:

- Extract the support action into `WarrantySupportActions`.
- Preserve the current link target, copy, icon, and search fields.
- Add focused tests for entitlement-backed warranties and legacy/manual warranties without source entitlement or serial number.

Out of scope:

- Changing support issue intake route behavior.
- Changing issue anchor resolution or validation.
- Changing support issue creation mutations.
- Changing warranty details, covered-items, claims, certificate, extension, service linkage, or activity UI.

Closeout:

- Touched domains: warranty detail UI, warranty support action presentation, warranty-to-support issue search anchors, warranty component tests, support anchor validation evidence, and warranty sprint evidence.
- Workflow protected: warranty detail route -> `WarrantyDetailContainer` -> warranty read model -> `WarrantySupportActions` -> `/support/issues/new` search schema -> support issue intake anchor resolution.
- Business value protected: operators still launch support issue creation with warranty, customer, entitlement, product, order, shipment, and serial context when present, reducing duplicate lookup work and preserving battery lineage context from warranty to support.
- Architecture standards checked: route/container/hook/server/schema/database boundaries unchanged; support issue search schema unchanged; issue anchor resolution unchanged; support action rendering now lives in a focused warranty component; the anchor payload is directly covered by tests.
- Tenant isolation and data integrity checked: no server query, tenant predicate, organization scope, database write, support issue mutation, warranty mutation, inventory transaction, finance artifact, or serialized lineage persistence logic changed.
- Query/cache contract checked: no query key, invalidation, optimistic update, rollback, stale-time, or cache policy changed.
- Smells removed: support action link and cross-domain anchor payload removed from `warranty-detail-view.tsx`; entitlement-backed and legacy/manual warranty handoffs now have focused coverage; support route search schema was checked as the receiving contract.
- Smells deferred: `warranty-detail-view.tsx` remains large and still owns warranty details field mapping, covered-items rendering, alert lifecycle, certificate dialog wiring, extension dialog wiring, and activity/system-history tabs; browser QA remains deferred because this was behavior-preserving extraction.
- Verification: focused support-actions tests passed; targeted eslint passed; warranty suite plus support anchor validation passed 15 files / 69 tests; `tsc --noEmit` passed; `git diff --check` passed.
- Gates skipped: browser QA skipped because this extraction preserved copy, target route, button styling, and search anchor behavior while changing code ownership and tests.
- Goal adaptation: no standing goal text change. This continues the active maintainer goal by protecting a warranty-to-support workflow and shrinking the monolithic warranty detail presenter.
- Residual risk: warranty detail is down to roughly 1,032 lines but still owns warranty field mapping, covered-items lineage display, alerts, certificate state, extension wiring, and activity tabs. The next warranty sprint should prioritize either warranty details/covered-items ownership or alert/certificate honesty based on product risk.

## Sprint Closeout Audit

Completion audit:

- Objective: extract the warranty support issue handoff from the warranty detail presenter without changing behavior.
- Deliverables checked: sprint artifact, support-actions component module, warranty detail integration, focused component tests, targeted lint, warranty/support unit gates, typecheck, and diff whitespace gate.
- Evidence inspected: `src/components/domain/warranty/views/warranty-detail-view.tsx`, `src/components/domain/warranty/views/warranty-support-actions.tsx`, `tests/unit/warranty/warranty-support-actions.test.tsx`, `src/routes/_authenticated/support/issues/new.tsx`, `src/lib/schemas/support/issues.ts`, `tests/unit/support/issue-anchor-validation.test.ts`, and `docs/warranty/MAINTAINER-SPRINT-3.md`.

Touched domains: warranty detail presentation, warranty support handoff presentation, support issue intake search-anchor contract, warranty UI tests, and maintainer sprint documentation.

Workflow protected: warranty read model -> support action link -> support issue creation search anchors -> issue intake anchor resolution.

Business value protected: RENOZ operators retain the same context-rich handoff from warranty to support issue creation, including entitlement-backed order/shipment/serial context when available and clean fallback for legacy/manual warranties.

Architecture standards checked:

- route/container boundary: no route, container, or tab behavior changed
- hook/server/schema/database boundary: no hooks, server functions, schemas, database reads, or side effects changed
- query/cache contract: no query keys, invalidation, mutation, optimistic update, or rollback behavior changed
- cross-domain contract: receiving support issue search schema accepts the source anchors carried by `WarrantySupportActions`
- domain ownership: support handoff display now has a focused warranty view module
- UI honesty: legacy/manual warranties do not invent entitlement, order, shipment, or serial anchors

Smells removed:

- support issue link embedded in `warranty-detail-view.tsx`
- cross-domain search payload embedded in `warranty-detail-view.tsx`
- warranty-to-support handoff lacked focused coverage

Smells deferred:

- warranty details field mapping still lives in the page presenter
- covered-items rendering still lives in the page presenter
- warranty alert construction still lives in the page presenter
- certificate and extension dialog wiring still lives in the page presenter
- activity/system-history tab composition still lives in the page presenter
- browser QA remains deferred until a visual or workflow behavior pass

Verification:

- `./node_modules/.bin/vitest run tests/unit/warranty/warranty-support-actions.test.tsx` passed 1 file / 2 tests
- `./node_modules/.bin/eslint src/components/domain/warranty/views/warranty-detail-view.tsx src/components/domain/warranty/views/warranty-support-actions.tsx tests/unit/warranty/warranty-support-actions.test.tsx` passed
- `./node_modules/.bin/vitest run tests/unit/warranty tests/unit/support/issue-anchor-validation.test.ts` passed 15 files / 69 tests
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit` passed
- `git diff --check` passed

Gates skipped: browser QA skipped because this was a behavior-preserving extraction with focused unit coverage and no route, server, cache, mutation, or layout redesign.

Goal adaptations made or declined: declined goal changes. The standing product-owner goal remains correct; this sprint applies it to warranty-to-support modularity and serialized context continuity.

Residual risk: warranty detail remains a large operator surface. Warranty details/covered-items extraction is the next likely structural slice because it contains commercial lineage, entitlement source, and serial display that should be easier to test independently.
