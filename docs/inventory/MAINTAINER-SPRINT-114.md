# Inventory Maintainer Sprint 114: Movement Read Active Product Descriptors

## Status

Closed in commit-ready state.

## Issue 1: Movement History Could Enrich Rows With Soft-Deleted Products

### Problem

`listMovements` scoped movement rows and product joins to the organization, but product descriptor enrichment did not require active product records. Movement history is an audit-style operator surface, so archived products should not be reintroduced as active-looking descriptors.

### Workflow Spine

Inventory movement history
-> movement read hook/cache contract
-> `listMovements`
-> tenant-scoped `inventory_movements`
-> active tenant-scoped `products`
-> tenant-scoped `warehouse_locations`
-> tenant-scoped reference documents
-> movement timeline rows.

### Touched Domains

- Inventory movement server function.
- Inventory read-model tenant-scope contract tests.
- Inventory sprint evidence.

### Business Value Protected

Movement history supports warehouse reconciliation, order support, purchase receiving review, and inventory audit work. Product descriptors should reflect active same-tenant records and not resurrect archived SKU metadata in operator timelines.

### Scope Constraints

- Do not change movement filters, pagination, totals, summary aggregates, ordering, response shape, hooks, query keys, or cache policy.
- Do not change inventory writes, movement creation, valuation, finance, or serialized lineage behavior.
- Preserve existing left-join behavior so historical rows without active product metadata still remain visible.

### Changes

- Added `movementProductJoinCondition` for active tenant-scoped product descriptor joins.
- Reused the helper in `listMovements`.
- Updated the existing inventory read-model contract to guard active movement product descriptor semantics.

### Standards Checked

- Domain ownership: movement descriptor policy is local to the movement read server function.
- Route -> container/page -> hook -> server -> schema/database -> query/cache policy: server descriptor scope hardened; hook/query-key/cache behavior unchanged.
- Tenant isolation/data integrity: movement rows remain organization-scoped and product descriptors now require active same-tenant products.
- Query/cache contract: unchanged; no mutation or invalidation behavior changed.
- UI states/error handling: response shape is stable; archived product descriptors no longer enrich movement rows.
- Reviewability: one helper, one descriptor join update, one existing contract update, one closeout note.

### Smells Removed

- Ad hoc product descriptor join in `listMovements`.
- Soft-deleted products could enrich inventory movement history rows.

### Deferred

- Whether historical movement rows for archived products should show explicit archived labels is a separate UX/data-policy sprint.
- Dashboard movement product descriptors remain a separate read-surface hardening slice.
- Browser QA was not selected because this is a server descriptor-scope slice with no intended layout change.

### Gates

- Passed: `bunx vitest run tests/unit/inventory/read-model-tenant-scope-contract.test.ts`.
- Passed: focused ESLint on touched server function and test.
- Passed: `bun run typecheck`.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. Serialized gates remain retired and this sprint does not change serialized lineage behavior.

### Residual Risk

Low to moderate. Historical movements tied to archived products still appear, but product descriptor fields will be null unless an active same-tenant product exists. A future UX slice should decide whether to display an explicit archived-product state.
