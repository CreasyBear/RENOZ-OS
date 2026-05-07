# Inventory Maintainer Sprint 123: Location Contents Active Product Labels

## Status

Closed in commit-ready state.

## Issue 1: Location Contents Could Use Soft-Deleted Product Labels

### Problem

`getLocation` returns inventory contents for a warehouse location with product descriptors, but the inventory-to-product join only checked organization scope. Archived product metadata could still label inventory rows in a location detail view.

### Workflow Spine

Warehouse location detail
-> location hook/cache contract
-> `getLocation`
-> tenant-scoped warehouse location
-> tenant-scoped inventory rows
-> active tenant-scoped product descriptors
-> location contents and utilization metrics.

### Touched Domains

- Inventory location server function.
- Inventory location permission/scope contract tests.
- Inventory sprint evidence.

### Business Value Protected

Warehouse location detail is a bin truth surface. Operators should be able to inspect what sits in a location without archived SKU metadata being presented as current product context.

### Scope Constraints

- Do not change location list/filtering, location CRUD, utilization metrics, response shape, hooks, query keys, or cache policy.
- Do not change inventory writes, movement writes, valuation, finance, alerts, forecasts, or serialized lineage behavior.
- Preserve left-join visibility so inventory rows remain visible when an active product descriptor is unavailable.

### Changes

- Added `locationInventoryProductJoinCondition` for active tenant-scoped location contents product descriptors.
- Reused the helper in `getLocation` inventory contents.
- Updated the existing location permission/scope contract to guard active product descriptor semantics.

### Standards Checked

- Domain ownership: location contents descriptor policy is local to the location server function.
- Route -> container/page -> hook -> server -> schema/database -> query/cache policy: server read descriptor scope hardened; hook/query-key/cache behavior unchanged.
- Tenant isolation/data integrity: location and inventory rows remain organization-scoped; product labels now require active same-tenant products.
- Query/cache contract: unchanged; no mutation or invalidation behavior changed.
- UI states/error handling: response shape is stable; archived product descriptors become null while contents remain visible.
- Reviewability: one helper, one join replacement, one existing contract update, one closeout note.

### Smells Removed

- Ad hoc product descriptor join in location contents.
- Soft-deleted products could enrich warehouse location inventory rows.

### Deferred

- Explicit archived-product location contents UI state remains a UX/data-policy slice.
- Broader location server decomposition remains separate.
- Browser QA was not selected because this is a server descriptor-scope slice with no intended layout change.

### Gates

- Passed: `bunx vitest run tests/unit/inventory/location-permission-contract.test.ts`.
- Passed: focused ESLint on touched server function and test.
- Passed: `bun run typecheck`.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. Serialized gates remain retired and this sprint does not change serialized lineage behavior.

### Residual Risk

Low to moderate. Inventory rows tied to archived products still appear with null product descriptors. A later UX/data-policy slice should decide whether to label those rows explicitly as archived-product stock.
