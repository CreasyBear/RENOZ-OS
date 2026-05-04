# Inventory Maintainer Sprint 20

This sprint follows Sprint 19's serialized item lineage hardening. The target is inventory forecasting tenant/data-integrity hardening: manual forecast upserts, bulk forecast writes, and reorder recommendation read joins.

Status: Closed after Issue 1.

## Business Value

Forecasting and reorder recommendations help RENOZ Energy decide what battery stock to buy before operators hit fulfillment shortages. Forecast rows must only reference tenant-owned products, and reorder read models should not rely on implied product/inventory/location ownership.

## Workflow Spine

inventory forecasting/reorder views
-> forecasting hooks
-> `listForecasts`, `getProductForecast`, `upsertForecast`, `bulkUpdateForecasts`, `calculateSafetyStock`, `getReorderRecommendations`, `getForecastAccuracy`
-> inventory read/forecast permissions
-> organization-scoped product and forecast reads
-> organization-validated forecast product ownership
-> organization-scoped forecast writes
-> organization-bounded reorder inventory/location joins
-> existing forecasting query-key invalidation.

## Architecture Constraints

- Keep this sprint to forecasting tenant/data-integrity scope and static contract coverage.
- Preserve demand, safety stock, reorder point, urgency, allocatable stock, mutation response shape, query keys, cache invalidation, and UI.
- Do not broaden into forecasting algorithm redesign, purchase-order generation, browser UX polish, or live database fixtures.

## Issue Ledger

### 1. Forecast Writes and Reorder Joins Needed Stronger Tenant Boundaries

Problem:

- Manual forecast upsert selected existing rows by organization/product/date/period, but the final update used only the forecast ID.
- Bulk forecast upsert wrote tenant-scoped rows but did not first validate that every submitted product belonged to the tenant.
- Reorder recommendation inventory and location joins relied on implied ownership instead of explicit organization predicates.

Workflow protected:

forecast/reorder workflow -> organization-scoped products and forecasts -> tenant-validated bulk writes -> organization-bounded reorder read model -> existing forecasting cache contracts.

Implemented slice:

- Added organization predicate to manual `upsertForecast` update writes.
- Added bulk product ownership validation before `bulkUpdateForecasts` writes.
- Added organization predicate to reorder recommendation inventory joins.
- Added organization predicate to reorder location breakdown joins.
- Added a focused forecasting tenant-scope contract test covering upsert writes, bulk product validation, reorder joins, and allocatable-stock semantics.

Out of scope:

- Changing forecasting math, reorder thresholds, urgency sorting, historical demand SQL, mutation result payloads, query keys, cache invalidation, or UI.
- Adding live multi-tenant forecast fixtures.
- Adding purchase-order generation checks.

Closeout:

- Touched domains: inventory forecasting server functions, inventory forecasting tenant-scope tests, inventory sprint evidence.
- Workflow protected: forecast list/detail/upsert/bulk update/safety stock/reorder/accuracy -> tenant-scoped reads and writes -> existing forecasting cache contracts.
- Business value protected: forecast rows cannot be bulk-written for non-tenant products, and reorder recommendations now keep inventory/location joins tenant-bounded.
- Architecture standards checked: route/page/hook/query-key/cache flow is unchanged; server functions keep explicit inventory permissions; forecasting semantics and allocatable-stock contracts are unchanged.
- Tenant isolation and data integrity checked: manual update writes are organization-scoped; bulk writes validate product ownership; reorder inventory/location joins are organization-bounded.
- Query/cache contract checked: no query keys, stale times, invalidation, optimistic updates, or cache mutation helpers changed.
- Smells removed: ID-only forecast update write; missing bulk product ownership validation; unbounded reorder inventory/location joins.
- Smells deferred: live multi-tenant forecast integration fixtures; forecasting algorithm review; purchase-order generation hardening.
- Gates run: focused forecasting tenant-scope contract test; focused forecasting schema/allocatable/query tests; focused ESLint; full inventory suite; TypeScript; `git diff --check`.
- Gates skipped: browser QA, because this was a server tenant/data-integrity hardening change with no UI or interaction change.
- Goal adaptations: declined. The standing maintainer goal already requires tenant isolation, transactional inventory integrity, meaningful tests, reviewable domain slices, and closeout evidence.
- Residual risk: static contract coverage protects source patterns; live database fixtures remain a future hardening layer.
