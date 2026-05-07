# Inventory Maintainer Sprint 113: Inventory Read Active Product Descriptors

## Status

Closed in commit-ready state.

## Issue 1: Inventory Reads Could Enrich Rows With Soft-Deleted Products

### Problem

`listInventory`, `quickSearchInventory`, and inventory item detail reads scoped product descriptors to the organization, but they did not require active product records. Product rows are soft-deleted, so archived product metadata could still appear in inventory list/search/detail surfaces.

### Workflow Spine

Inventory list/search/detail
-> inventory read hook/cache contract
-> `src/server/functions/inventory/reads.ts`
-> tenant-scoped `inventory`
-> active tenant-scoped `products`
-> tenant-scoped `warehouse_locations`
-> operator inventory rows.

### Touched Domains

- Inventory read server function.
- Inventory read-model tenant-scope contract tests.
- Inventory sprint evidence.

### Business Value Protected

Inventory screens are stock truth surfaces. Operators should not see archived product descriptors as if they are active sellable/supportable SKUs while receiving, searching, picking, supporting, or reconciling battery stock.

### Scope Constraints

- Do not change inventory list pagination, totals, filters, sorting, limits, response shape, hooks, query keys, or cache policy.
- Do not change inventory writes, movements, valuation, finance, or serialized lineage behavior.
- Keep existing left-join behavior for list/search descriptors to avoid a hidden count/totals behavior change in this sprint.

### Changes

- Added `inventoryProductJoinCondition` for active tenant-scoped product descriptor joins.
- Reused the helper for inventory list count/totals/item descriptor joins.
- Reused the helper for quick-search product descriptor joins.
- Added `isNull(products.deletedAt)` to inventory item detail product lookup.
- Updated the existing inventory read-model contract to guard active product descriptor semantics.

### Standards Checked

- Domain ownership: inventory read descriptor policy is local to the inventory read server function.
- Route -> container/page -> hook -> server -> schema/database -> query/cache policy: server descriptor scope hardened; hook/query-key/cache behavior unchanged.
- Tenant isolation/data integrity: inventory rows remain organization-scoped and product descriptors now require active same-tenant products.
- Query/cache contract: unchanged; no mutation or invalidation behavior changed.
- UI states/error handling: response shape is stable; archived product descriptors no longer enrich inventory rows.
- Reviewability: one helper, three descriptor read updates, one existing contract update, one closeout note.

### Smells Removed

- Repeated ad hoc product descriptor join logic in inventory reads.
- Soft-deleted products could enrich inventory list/search descriptors.
- Soft-deleted products could be returned as inventory item detail product metadata.

### Deferred

- Whether inventory rows linked to archived products should be hidden, flagged, or remediated is a separate product/data-policy sprint.
- Broader inventory read model decomposition remains separate.
- Browser QA was not selected because this is a server descriptor-scope hardening slice with no intended layout change.

### Gates

- Passed: `bunx vitest run tests/unit/inventory/read-model-tenant-scope-contract.test.ts`.
- Passed: focused ESLint on touched server function and test.
- Passed: `bun run typecheck`.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. Serialized gates remain retired and this sprint does not change serialized lineage behavior.

### Residual Risk

Moderate. Existing inventory rows linked to archived products can still appear because this sprint deliberately preserved left-join/count behavior. They will not receive archived product descriptors, but a future data-policy sprint should decide whether to hide, flag, or repair those rows.
