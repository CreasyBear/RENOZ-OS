# Inventory Maintainer Sprint 106: Product Movement Cache Filters

## Status

Closed in commit-ready state.

## Issue 1: Product Movement Reads Sent `locationId` Without Keying It

### Problem

`useProductMovements` accepted a `locationId` and sent it to `getProductMovements`, but the query key only included movement type, limit, and page. Switching between warehouse locations for the same product could reuse a movement-history cache created for a different location. Product stock adjustment also invalidated movement reads through an empty filter object instead of the existing product movement prefixes.

### Workflow Spine

Product inventory tab or movement history surface
-> `useProductMovements`
-> `queryKeys.products.movements`
-> `getProductMovements`
-> product inventory movement rows
-> product stock adjustment invalidation.

### Touched Domains

- Product inventory hook.
- Product query-key movement contract tests.
- Inventory sprint evidence.

### Business Value Protected

Warehouse operators reviewing battery movement history need location-specific history to be honest. A movement list for one bin or warehouse should not silently reuse the cached history for another location.

### Scope Constraints

- Do not change server movement reads, movement filters, authorization, or database predicates.
- Do not change UI layout or movement response shape.
- Keep product detail, inventory, stats, stock-alert, and movement invalidations targeted to product stock surfaces.
- Do not change Inventory-domain stock mutation helpers already using product movement prefixes.

### Changes

- Added a `movementFilters` object in `useProductMovements` that includes `movementType`, `locationId`, `limit`, and `page`.
- Reused `movementFilters` for both the query key and server payload.
- Updated product stock adjustment invalidation to use `queryKeys.products.movementsForProduct(productId)`.
- Updated aggregated movement invalidation to use `queryKeys.products.movementsAggregatedForProduct(productId)`.
- Added a focused product movement cache contract test.

### Standards Checked

- Domain ownership: product movement cache keys now reflect the product movement read contract.
- Route -> container/page -> hook -> server -> schema/database -> query/cache policy: hook key and server payload are aligned; server/schema/database behavior unchanged.
- Tenant isolation/data integrity: no auth, organization predicate, movement write, inventory transaction, valuation, or serialized lineage behavior changed.
- Query/cache contract: location-filtered movement reads now get distinct keys; product stock adjustment invalidates all product movement pages through prefix helpers.
- UI states/error handling: movement surfaces should refetch by actual filter instead of showing stale location history.
- Reviewability: one hook change, one focused contract, one closeout note.

### Smells Removed

- Query key omitted `locationId` while the server payload used it.
- Product stock adjustment used empty-filter movement invalidation instead of explicit movement prefixes.

### Deferred

- No browser QA selected because this is a hook/query-key contract fix with no intended layout change.
- Broader product inventory hook decomposition remains a separate architecture slice.

### Gates

- Passed: focused product movement cache contract.
- Passed: focused ESLint on touched hook and test.
- Passed: `bun run typecheck`.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. Serialized gates remain retired and this sprint does not change serialized lineage behavior.

### Residual Risk

Low. Existing cached entries with the old key shape will age out naturally; this change corrects future reads and mutation invalidation behavior.
