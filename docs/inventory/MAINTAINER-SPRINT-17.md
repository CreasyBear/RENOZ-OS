# Inventory Maintainer Sprint 17

This sprint follows Sprint 16's smaller stock-mutation tenant-hardening. The target is stock-count lifecycle tenant-hardening: count setup, count item entry, completion reconciliation, variance reads, and cancellation.

Status: Closed after Issue 1.

## Business Value

Stock counts are a warehouse truth workflow for RENOZ Energy. Starting a count snapshots inventory, operators enter counted quantities, and completion can create real stock adjustments with valuation, cost-layer, and serialized-lineage consequences. Tenant scope must hold across the whole lifecycle, especially when counts are updated, reconciled, or used for variance analysis.

## Workflow Spine

inventory counts page/list
-> stock count hooks
-> `listStockCounts`, `getStockCount`, `updateStockCount`, `startStockCount`, `updateStockCountItem`, `bulkUpdateCountItems`, `completeStockCount`, `cancelStockCount`, `getCountVarianceAnalysis`
-> inventory read/count permissions
-> organization-scoped parent count
-> organization-bounded inventory/product/location joins
-> parent-anchored count item writes
-> organization-scoped reconciliation writes
-> movement, valuation/cost-layer, and serialized-lineage continuity
-> existing stock-count and inventory cache invalidation.

## Architecture Constraints

- Keep this sprint to stock-count lifecycle tenant scope and static contract coverage.
- Preserve stock-count quantity math, status transitions, variance calculations, movement payloads, cost-layer behavior, serialized lineage events, mutation response shape, query keys, cache invalidation, and UI.
- Do not broaden into count concurrency/locking redesign, schema migrations, optimistic cache updates, or browser UX polish.
- Treat `stockCountItems` as parent-scoped because the table has no `organizationId`; use the organization-scoped `stockCounts` parent as the tenant anchor.

## Issue Ledger

### 1. Stock Count Lifecycle Needed Stronger Tenant Boundaries

Problem:

- Parent count reads were organization-scoped, but several final `stock_counts` updates used only the count ID.
- Individual count item updates used only the item ID after a parent-count check.
- Completion reconciliation updated `inventory` and serialized item status rows by ID only.
- Stock-count relation reads joined inventory, products, and locations without organization predicates.
- Creating a stock count validated location ownership, but updating `locationId` did not.

Workflow protected:

stock count lifecycle -> organization-scoped parent count -> count item entry -> completion reconciliation -> inventory movement/finance/serialized lineage continuity.

Implemented slice:

- Added organization predicates to update, start, completion, and cancel final `stock_counts` writes.
- Anchored individual `stock_count_items` updates to both item ID and parent count ID.
- Added organization predicates to completion reconciliation inventory writes.
- Added organization predicates to completion serialized-item status writes.
- Added organization-bounded inventory/product/location joins for stock count detail, start-count enriched items, and variance analysis.
- Added organization-scoped validation for `locationId` changes in `updateStockCount`.
- Added a focused stock-count tenant-scope contract test covering parent writes, location validation, count-item writes, reconciliation writes, read joins, finance continuity, and serialized-lineage continuity references.

Out of scope:

- Changing stock count status rules, quantity reconciliation math, negative inventory policy, valuation/cost-layer behavior, movement metadata, query keys, cache invalidation, or UI.
- Adding live database integration tests for cross-tenant stock-count fixtures.
- Redesigning count completion locking and concurrent count-item entry.
- Adding `organizationId` to `stock_count_items`.

Closeout:

- Touched domains: inventory stock-count server functions, inventory stock-count tenant-scope tests, inventory sprint evidence.
- Workflow protected: stock count list/detail/update/start/count item entry/bulk entry/complete/cancel/variance -> tenant-scoped reads and writes -> reconciliation finance and serialized-lineage continuity.
- Business value protected: warehouse count workflows now keep tenant boundaries explicit while preserving inventory availability, valuation, and serialized lineage behavior.
- Architecture standards checked: route/page/hook/query-key/cache flow is unchanged; server functions keep explicit inventory permissions; parent count remains the ownership anchor for count items; final writes now carry tenant or parent scope.
- Tenant isolation and data integrity checked: parent count writes are organization-scoped; location update ownership is validated; read joins are organization-bounded; reconciliation inventory and serialized writes are organization-scoped.
- Query/cache contract checked: no query keys, stale times, invalidation, optimistic updates, or cache mutation helpers changed.
- Smells removed: ID-only parent count lifecycle writes; ID-only count item update; ID-only reconciliation inventory and serialized writes; unbounded relation joins; missing update-time location ownership validation.
- Smells deferred: live multi-tenant integration tests; count completion concurrency/locking redesign; possible future schema-level tenant column on `stock_count_items`.
- Gates run: focused stock-count tenant-scope contract test; focused stock-count/query tests; focused ESLint; full inventory suite; TypeScript; `git diff --check`.
- Gates skipped: browser QA, because this was a server tenant-scope hardening change with no UI or interaction change.
- Goal adaptations: declined. The standing maintainer goal already requires tenant isolation, transactional inventory/finance integrity, serialized lineage continuity, meaningful tests, reviewable domain slices, and closeout evidence.
- Residual risk: static contract coverage protects source patterns; runtime cross-tenant database fixtures and concurrency tests remain future hardening layers.
