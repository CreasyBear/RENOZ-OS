# Inventory Maintainer Sprint 115: Dashboard Movement Active Product Descriptors

## Status

Closed in commit-ready state.

## Issue 1: Dashboard Top-Moving Products Could Use Soft-Deleted Product Labels

### Problem

The standard inventory dashboard's `topMoving` query grouped recent movement activity by product and enriched rows with product name/SKU, but the product join only checked organization scope. Soft-deleted products could still provide active-looking labels in a current dashboard summary.

### Workflow Spine

Inventory dashboard
-> dashboard hook/cache contract
-> `getInventoryDashboard`
-> tenant-scoped `inventory_movements`
-> active tenant-scoped `products`
-> top-moving product summary.

### Touched Domains

- Inventory dashboard server function.
- Inventory read-model tenant-scope contract tests.
- Inventory sprint evidence.

### Business Value Protected

The dashboard is an operator steering surface. Top-moving product labels should point to active same-tenant SKUs so warehouse, ordering, and support work does not prioritize archived product metadata as current operational truth.

### Scope Constraints

- Do not change dashboard metrics, recent movements, top-moving aggregation window, ordering, limits, response shape, hooks, query keys, or cache policy.
- Do not change movement writes, inventory valuation, finance, or serialized lineage behavior.
- Preserve left-join behavior so historical movement activity can remain visible without active product descriptors.

### Changes

- Added `dashboardMovementProductJoinCondition` for active tenant-scoped product descriptor joins.
- Reused the helper in the standard dashboard `topMoving` query.
- Updated the existing inventory read-model contract to guard active dashboard movement descriptor semantics.

### Standards Checked

- Domain ownership: dashboard descriptor policy is local to the dashboard server function.
- Route -> container/page -> hook -> server -> schema/database -> query/cache policy: server descriptor scope hardened; hook/query-key/cache behavior unchanged.
- Tenant isolation/data integrity: top-moving rows remain movement-scoped to the authenticated organization and product labels now require active same-tenant products.
- Query/cache contract: unchanged; no mutation or invalidation behavior changed.
- UI states/error handling: response shape is stable; archived product descriptors no longer enrich dashboard top-moving rows.
- Reviewability: one helper, one descriptor join update, one existing contract update, one closeout note.

### Smells Removed

- Ad hoc product descriptor join in the standard dashboard top-moving query.
- Soft-deleted products could enrich dashboard movement summaries.

### Deferred

- WMS dashboard product descriptor hardening remains a separate read-surface slice.
- Explicit archived-product dashboard state remains a UX/data-policy decision.
- Browser QA was not selected because this is a server descriptor-scope slice with no intended layout change.

### Gates

- Passed: `bunx vitest run tests/unit/inventory/read-model-tenant-scope-contract.test.ts`.
- Passed: focused ESLint on touched server function and test.
- Passed: `bun run typecheck`.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. Serialized gates remain retired and this sprint does not change serialized lineage behavior.

### Residual Risk

Low to moderate. Top-moving rows tied to archived products can still appear with null product labels because this sprint preserves movement-history visibility. A future UI/data-policy slice should decide whether to label those as archived product activity.
