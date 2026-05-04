# Warranty Maintainer Sprint 8

This sprint continues warranty-domain ownership cleanup after notification settings moved out of the warranty detail presenter. The target is sidebar traceability context: purchased-via, owner snapshot, product/serial, and coverage-source summary cards should be explicit, testable, and isolated from the page presenter.

Status: Closed after Issue 1.

## Business Value

Warranty operators need quick traceability before acting: who purchased the product, who owns it, which battery asset is covered, and whether coverage came from delivery entitlement or legacy/manual registration. If this context is buried in page orchestration, future warranty behavior changes become harder to review safely.

## Workflow Spine

Warranty detail route
-> `WarrantyDetailContainer`
-> warranty read model
-> `WarrantySidebarSummaryCards`
-> operator-visible customer, owner, product, serial, delivery-entitlement, or legacy/manual context.

## Architecture Constraints

- Keep this sprint warranty-domain only.
- Do not change routes, hooks, server functions, schemas, database access, query keys, cache invalidation, notification settings, alert handling, certificate handling, claims, extensions, activity loading, or service linkage behavior.
- Preserve current sidebar copy, route targets, link search params, owner fallback, serial fallback, delivery entitlement details, and legacy/manual coverage details.
- Treat this as a behavior-preserving sidebar summary extraction.
- Add focused tests for linked customer/product/serial anchors, owner/address display, delivery entitlement context, and legacy/manual fallback context.

## Issue Ledger

### 1. Warranty Sidebar Summary Boundary

Problem:

- `warranty-detail-view.tsx` still owns four sidebar summary cards that carry traceability context for customer, owner, product, serial, and coverage source.
- These cards are not just decoration; they help operators decide whether warranty, support, and entitlement context is trustworthy before acting.
- Route link targets and serial browser search params lack focused tests outside the large page presenter.

Workflow protected:

Warranty detail route -> warranty read model -> sidebar summary cards -> customer/product/serial anchors and delivery/manual coverage context.

Planned slice:

- Extract purchased-via, owner snapshot, product, and coverage-source cards into `WarrantySidebarSummaryCards`.
- Preserve copy, fallbacks, route targets, params, and search params.
- Add focused tests for linked traceability context and legacy/manual fallback context.

Out of scope:

- Changing service-system linkage card.
- Changing notification settings, certificate status, claims, extensions, alerts, support handoff, or activity UI.
- Changing server read models, query keys, cache policy, tenant enforcement, or mutation behavior.

Closeout:

- Touched domains: warranty detail presentation, warranty sidebar traceability presentation, warranty UI tests, and warranty sprint evidence.
- Workflow protected: warranty detail route -> `WarrantyDetailContainer` -> warranty read model -> `WarrantySidebarSummaryCards` -> customer, owner, product, serial, delivery-entitlement, or legacy/manual context.
- Business value protected: operators still get customer, warranty number, owner, product, serialized battery anchor, and coverage source context before acting on a warranty, while the route/search anchors are now directly covered.
- Architecture standards checked: route/container/hook/server/schema/database boundaries unchanged; service linkage, notification settings, certificate status, claims, extensions, alerts, and activity behavior unchanged; sidebar traceability rendering now lives in a focused warranty module.
- Tenant isolation and data integrity checked: no server query, tenant predicate, organization scope, database write, warranty mutation implementation, inventory transaction, finance artifact, support issue mutation, or serialized lineage persistence logic changed.
- Query/cache contract checked: no query key, invalidation, optimistic update, rollback, stale-time, or cache policy changed. Existing read model data is passed through unchanged.
- Smells removed: four sidebar summary cards removed from `warranty-detail-view.tsx`; customer/product/serial route targets and serialized inventory browser search params now have focused coverage; test fixtures now align with `WarrantyOwnerAddress.street2` being optional instead of nullable; the page presenter is reduced to roughly 557 lines.
- Smells deferred: `warranty-detail-view.tsx` still owns header metrics, coverage timeline, certificate header-action wiring, extension dialog wiring, and activity/system-history tabs; browser QA remains deferred because this was behavior-preserving extraction.
- Verification: focused sidebar summary component tests passed; targeted eslint passed; warranty suite passed 20 files / 82 tests; `tsc --noEmit` passed; `git diff --check` passed.
- Gates skipped: browser QA skipped because this extraction preserved visible copy, route targets, search params, route behavior, server behavior, query/cache behavior, and mutation behavior.
- Goal adaptation: no standing goal text change. This continues the active maintainer goal by making warranty traceability context explicit and testable.
- Residual risk: warranty detail remains smaller but still owns header/coverage summary state, certificate action wiring, dialog wiring, and activity tabs. The next sprint should prioritize header/coverage extraction or activity tab ownership only if it protects a concrete operator workflow or planned behavior change.

## Sprint Closeout Audit

Completion audit:

- Objective: extract warranty sidebar traceability cards from the warranty detail presenter without changing route links or displayed context.
- Deliverables checked: sprint artifact, sidebar summary card module, warranty detail integration, focused component tests, targeted lint, warranty unit suite, typecheck, and diff whitespace gate.
- Evidence inspected: `src/components/domain/warranty/views/warranty-detail-view.tsx`, `src/components/domain/warranty/views/warranty-sidebar-summary-cards.tsx`, `tests/unit/warranty/warranty-sidebar-summary-cards.test.tsx`, and `docs/warranty/MAINTAINER-SPRINT-8.md`.

Touched domains: warranty detail presentation, warranty sidebar traceability presentation, warranty UI tests, and maintainer sprint documentation.

Workflow protected: warranty read model -> sidebar summary cards -> customer link, warranty number, owner snapshot, product link, serial inventory browser link, delivery entitlement context, and legacy/manual coverage context.

Business value protected: RENOZ operators can verify the warranty's customer, owner, battery asset, and coverage source before taking support, warranty, or entitlement actions.

Architecture standards checked:

- route/container boundary: no route, container, or tab behavior changed
- hook/server/schema/database boundary: no hooks, server functions, schemas, database reads, or side effects changed
- query/cache contract: no query keys, invalidation, mutation, optimistic update, or rollback behavior changed
- mutation behavior: no mutation behavior touched
- domain ownership: sidebar traceability rendering now has a focused warranty module
- serialized lineage continuity: the serial link continues to route to `/inventory/browser` with serialized search context

Smells removed:

- purchased-via, owner snapshot, product, and coverage-source cards embedded in `warranty-detail-view.tsx`
- customer/product/serial route targets lacked focused component coverage
- serialized inventory browser search params lacked focused coverage
- test fixture had nullable `street2` where the schema expects optional `street2`

Smells deferred:

- header metric and coverage timeline rendering still live in the page presenter
- certificate header-action wiring still lives in the page presenter
- extension dialog wiring still lives in the page presenter
- activity/system-history tab composition still lives in the page presenter
- browser QA remains deferred until a visual or workflow behavior pass

Verification:

- `./node_modules/.bin/vitest run tests/unit/warranty/warranty-sidebar-summary-cards.test.tsx` passed 1 file / 2 tests
- `./node_modules/.bin/eslint src/components/domain/warranty/views/warranty-detail-view.tsx src/components/domain/warranty/views/warranty-sidebar-summary-cards.tsx tests/unit/warranty/warranty-sidebar-summary-cards.test.tsx` passed
- `./node_modules/.bin/vitest run tests/unit/warranty` passed 20 files / 82 tests
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit` passed
- `git diff --check` passed

Gates skipped: browser QA skipped because this was a behavior-preserving extraction with focused unit coverage and no route, server, cache, mutation, or layout redesign.

Goal adaptations made or declined: declined goal changes. The standing product-owner goal remains correct; this sprint applies it to warranty traceability context and serialized asset navigation.

Residual risk: warranty detail is down to roughly 557 lines but still owns header/coverage state, certificate action wiring, dialog wiring, and activity tabs. Continue with slices that protect operator workflow clarity or prepare a concrete behavior change.
