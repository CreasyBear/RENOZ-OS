# Inventory Maintainer Sprint 105: Product Stock Alert Cache Scope

## Status

Closed in commit-ready state.

## Issue 1: Stock Mutations Invalidated Low-Stock Alerts With Product IDs

### Problem

Product low-stock alerts are queried by alert scope (`all` or location), but stock-changing mutations invalidated `queryKeys.products.stockAlerts(productId)`. That key shape looked product-scoped even though the alert read path is scope-scoped, so manual receives, adjustments, product stock adjustments, and fulfillment stock mutations could leave the visible low-stock alert surface stale.

### Workflow Spine

Inventory receive/adjust, product stock adjust, or order fulfillment mutation
-> mutation hook cache helper
-> centralized `queryKeys.products`
-> low-stock alert query prefix
-> `useLowStockAlerts`
-> product/warehouse operator stock alert surface.

### Touched Domains

- Inventory stock mutation cache helper.
- Product inventory hook and product query keys.
- Orders fulfillment inventory cache helper.
- Inventory/product stock alert cache contract tests.
- Inventory sprint evidence.

### Business Value Protected

Operators rely on low-stock alerts to decide what to replenish or hold back. Battery stock changes should clear all low-stock alert scopes so the UI does not keep showing stale shortages after receiving, adjustment, picking, or shipping work.

### Scope Constraints

- Do not change server stock writes, authorization, transaction boundaries, inventory movement rows, valuation, or serialized lineage behavior.
- Do not change `useLowStockAlerts` response shape or thresholds.
- Keep product-specific inventory, stats, movement, and detail invalidations product-scoped.
- Only widen the low-stock alert invalidation to the correct alert-scope prefix.

### Changes

- Added `queryKeys.products.stockAlertsAll()` as the canonical low-stock alert prefix.
- Reframed `queryKeys.products.stockAlerts(scope)` around alert scope instead of product identity.
- Updated Inventory stock mutation invalidations to invalidate `stockAlertsAll()`.
- Updated Orders fulfillment stock side-effect invalidations to invalidate `stockAlertsAll()`.
- Updated Product stock adjustment invalidation to invalidate `stockAlertsAll()`.
- Updated existing receive/adjust inventory tests and added a source contract to prevent product-ID alert invalidation from returning.

### Standards Checked

- Domain ownership: product alert query keys now describe the actual alert read contract; Inventory and Orders invalidate through that shared contract.
- Route -> container/page -> hook -> server -> schema/database -> query/cache policy: mutation hooks now invalidate the same key family that `useLowStockAlerts` reads; server/schema/database behavior unchanged.
- Tenant isolation/data integrity: no auth, organization predicates, inventory writes, movement rows, or transactional finance behavior changed.
- Query/cache contract: low-stock alert invalidation is now prefix-based and scope-correct; product detail/inventory/stat/movement invalidations remain product-specific.
- UI states/error handling: alert surfaces should refetch instead of showing stale stock state after stock mutations.
- Reviewability: focused cache-key diff with no UI/server rewrite.

### Smells Removed

- Misleading `stockAlerts(productId)` invalidation for a scope-keyed alert query.
- Duplicate cache-contract drift across Inventory, Products, and Orders stock mutation helpers.
- Missing source contract for the low-stock alert query-key family.

### Deferred

- No browser QA selected because this is a cache-key contract fix with focused hook/source tests.
- Broader product inventory hook consolidation remains a separate architecture slice.

### Gates

- Passed: focused inventory stock alert cache contract and receive/adjust hook tests.
- Passed: focused ESLint on touched query key, hooks, helpers, and tests.
- Passed: `bun run typecheck`.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. Serialized gates remain retired and this sprint does not change serialized lineage behavior.

### Residual Risk

Low. The invalidation is intentionally broader for low-stock alerts, but limited to the product stock-alert prefix rather than all product caches.
