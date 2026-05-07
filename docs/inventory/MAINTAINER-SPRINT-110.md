# Inventory Maintainer Sprint 110: Location Inventory Product Scope

## Status

Closed in commit-ready state.

## Issue 1: Location Inventory Product Joins Were ID-Only

### Problem

`getLocationInventory` scoped inventory rows to the active organization and location, but both list and count queries joined product metadata by product ID only. The read path also uses product SKU/name for search, so product relation scope belongs in the query itself rather than relying on implicit relational hygiene.

### Workflow Spine

Location inventory surface
-> `getLocationInventory`
-> `inventory`
-> active tenant-scoped `products`
-> search/filter/pagination
-> location inventory rows.

### Touched Domains

- Product inventory server function.
- Product location inventory tenant-scope contract tests.
- Inventory sprint evidence.

### Business Value Protected

Warehouse operators reviewing a location need product labels and search results that belong to the current workspace. Location inventory is a stock truth surface; it should not enrich active inventory rows with another tenant's product metadata or soft-deleted products.

### Scope Constraints

- Do not change location inventory filters, search behavior, pagination, sort order, response shape, hooks, query keys, cache invalidation, or UI.
- Do not change inventory writes, movement creation, valuation, finance, or serialized lineage behavior.
- Keep this as a server read-scope hardening slice for location inventory product joins.

### Changes

- Added `inventoryProductJoinCondition` for active tenant-scoped product metadata.
- Reused the helper in the `getLocationInventory` list query.
- Reused the helper in the `getLocationInventory` count query.
- Added a focused source contract guarding location inventory product joins and search continuity.

### Standards Checked

- Domain ownership: product metadata joins now use a local product-inventory server helper.
- Route -> container/page -> hook -> server -> schema/database -> query/cache policy: server read boundary hardened; hook/query-key/cache behavior unchanged.
- Tenant isolation/data integrity: inventory rows and joined product metadata remain under the authenticated organization; soft-deleted products are excluded.
- Query/cache contract: unchanged; this sprint does not alter query keys or invalidations.
- UI states/error handling: location inventory rows continue to return the same shape, with inaccessible/deleted product rows excluded by the read query.
- Reviewability: one server helper, two join replacements, one focused contract, one closeout note.

### Smells Removed

- ID-only product join in `getLocationInventory` list query.
- ID-only product join in `getLocationInventory` count query.
- Soft-deleted products could still participate in location inventory search/enrichment.

### Deferred

- Product inventory summary still returns placeholder location names; replacing those with tenant-scoped warehouse metadata is a separate UX/data-quality sprint.
- Broader product inventory server decomposition remains a separate architecture slice.
- Browser QA was not selected because this is a server read-scope hardening slice with no intended layout change.

### Gates

- Passed: focused product location inventory tenant-scope contract.
- Passed: focused ESLint on touched server function and test.
- Passed: `bun run typecheck`.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. Serialized gates remain retired and this sprint does not change serialized lineage behavior.

### Residual Risk

Low for location inventory relation scope. Existing inventory rows linked to soft-deleted products may no longer appear in this enriched location read; that aligns the UI with active product metadata semantics.
