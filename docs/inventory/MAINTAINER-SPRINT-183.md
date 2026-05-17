# Inventory Maintainer Sprint 183: Read-State Error Boundary Cleanup

## Status

Closed in commit-ready state.

## Issue 1: Inventory Read Presenters Still Accepted Raw Query Messages

### Problem

The inventory stock-count route, inventory detail quality tab, and unified inventory dashboard still passed query error messages directly into operator-visible read states. The hooks usually normalize read failures already, but the presentation boundary still trusted `error.message`, which made future regressions easy: a raw database, tenant-policy, or transport error could become visible copy if a caller supplied an unnormalized error.

### Workflow Spine

Stock counts:

route `/inventory/counts`
-> `StockCountsPage`
-> `useStockCounts`
-> `listStockCounts`
-> `queryKeys.inventory.stockCounts`
-> `StockCountList`.

Quality history:

route `/inventory/$itemId`
-> `InventoryDetailView`
-> `useQualityInspections`
-> `listQualityInspections`
-> `queryKeys.inventory.qualityInspections`
-> quality tab read state.

Warehouse dashboard:

route `/inventory`
-> `UnifiedInventoryDashboard`
-> `useWMSDashboard` / `useInventoryDashboard`
-> dashboard server reads
-> `queryKeys.inventory.wmsDashboard` / `queryKeys.inventory.dashboard`
-> dashboard unavailable/degraded panels.

### Touched Domains

- Inventory stock counts.
- Inventory item quality history.
- Inventory/WMS dashboard read states.
- Inventory read-state contract tests.

### Business Value Protected

Warehouse operators need to know whether stock counts, item quality history, and dashboard metrics are unavailable or stale without seeing database, tenant-policy, or transport internals. These surfaces support cycle counting, receiving confidence, stock visibility, and warehouse decision-making; error copy should guide recovery instead of exposing implementation detail.

### Scope Constraints

- Do not change server reads, query keys, cache invalidation, database predicates, stock-count lifecycle behavior, quality inspection writes, WMS aggregation, inventory quantities, cost layers, valuation, or serialized lineage.
- Keep this as a read-state presentation boundary cleanup.
- Preserve cold-load unavailable states and cached-data degraded states.

### Changes

- Added `stock-count-error-messages.ts` for route-local stock-count read copy.
- Added `quality-read-error-messages.ts` for item-detail quality history read copy.
- Added `dashboard-read-error-messages.ts` for WMS and inventory dashboard read copy.
- Replaced direct `countsError?.message`, `qualityError?.message`, and dashboard raw message extraction with the domain-local mappers.
- Extended stock-count, quality-history, and dashboard tests to prove raw query messages are suppressed while unavailable/degraded states remain visible.

### Standards Checked

- Domain ownership: read-state copy stays in inventory-owned route/component helpers.
- Route -> container/page -> hook -> server function -> schema/database -> query/cache policy: checked for all three read paths; only route/component presentation boundaries changed.
- Tenant isolation/data integrity: no tenant predicates, organization scope, inventory writes, movement rows, cost layers, valuation, finance, or serialized lineage behavior changed.
- Query/cache contract: no query key or invalidation behavior changed.
- Honest UI states: cold-load failures still render unavailable states; cached-data failures still render degraded stale-data warnings.
- Operator-safe error handling: arbitrary raw query messages are no longer passed into these inventory read presenters.
- Reviewability: small helper extraction with focused regression tests.

### Smells Removed

- Route/component dependence on raw `error.message` for stock-count list failures.
- Item detail quality tab dependence on raw `qualityError?.message`.
- Dashboard message extraction from arbitrary WMS/dashboard error objects.
- Dashboard top-movers fallback reading `dashboardError?.message` directly.

### Smells Deferred

- `LocationImportValidationError.message` remains intentionally allowed because it carries user-correctable CSV row validation guidance, not arbitrary query/server failure text.
- Broader non-inventory raw error-message cleanup remains a cross-domain reliability backlog item.
- Browser QA was not selected because this slice changes tested read-state copy contracts without layout or interaction changes.

### Gates

- Passed: `npm run test:vitest -- tests/unit/inventory/query-normalization-wave3-stock-counts.test.tsx tests/unit/inventory/query-normalization-wave3-quality.test.tsx tests/unit/inventory/query-normalization-wave3-dashboard.test.tsx`.
- Passed: targeted ESLint on touched inventory source and tests.
- Passed: `npm run lint`.
- Passed: `npm run typecheck`.
- Passed: `git diff --check`.
- Checked: `rg -n "\\w+Error\\?\\.message|error\\.message|as \\{ message" src/routes/_authenticated/inventory src/components/domain/inventory src/hooks/inventory -g '*.ts' -g '*.tsx'` now returns only the intentional `LocationImportValidationError.message` validation path.

### Goal Adaptation

No adaptation needed. This sprint directly follows the standing product-owner goal by improving Inventory/Warehouse operator-safe errors and keeping the route -> hook -> server -> query/cache read spines easier to reason about.

### Residual Risk

Low for the touched inventory surfaces. The remaining same-pattern inventory match is intentional validation copy for location CSV imports. Other domains still contain raw `error.message` usage and should be burned down through their own domain-sliced sprints.
