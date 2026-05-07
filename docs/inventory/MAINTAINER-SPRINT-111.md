# Inventory Maintainer Sprint 111: Product Inventory Location Labels

## Status

Closed in commit-ready state.

## Issue 1: Product Inventory Summary Returned Placeholder Locations

### Problem

`getProductInventory` grouped stock by `inventory.locationId`, but returned `locationCode: ''` and `locationName: 'Location'` for every row. Operators reviewing product stock across warehouse locations could see quantities without truthful warehouse/bin labels.

### Workflow Spine

Product inventory summary
-> product inventory hook/cache contract
-> `getProductInventory`
-> tenant-scoped `products`
-> tenant-scoped `inventory`
-> tenant-scoped `warehouse_locations`
-> product inventory location rows.

### Touched Domains

- Product inventory server function.
- Product inventory summary location contract tests.
- Inventory sprint evidence.

### Business Value Protected

Warehouse and support operators need to know where sellable, allocated, and on-hand product quantities actually sit. Placeholder labels turn a stock truth surface into a reconciliation task and increase picking, support, RMA, and purchase-planning friction.

### Scope Constraints

- Do not change product inventory hooks, query keys, invalidation, cache lifetime, UI layout, or response shape.
- Do not change inventory writes, movement creation, valuation, finance, or serialized lineage behavior.
- Keep inactive/deactivated location handling unchanged; this sprint only requires tenant-scoped location metadata for existing inventory rows.

### Changes

- Added `inventoryLocationJoinCondition` for tenant-scoped inventory-to-location joins.
- Joined `warehouse_locations` inside `getProductInventory`.
- Selected `locationCode` and `locationName` from the joined tenant-scoped location row.
- Grouped inventory aggregates by location metadata.
- Replaced placeholder response labels with real location values.
- Added a focused source contract guarding the tenant-scoped join and preventing placeholder labels from returning.

### Standards Checked

- Domain ownership: product inventory summary enrichment stays inside the product inventory server function.
- Route -> container/page -> hook -> server -> schema/database -> query/cache policy: server read result improved; hook/query-key/cache behavior unchanged.
- Tenant isolation/data integrity: product, inventory, and location metadata are scoped to the authenticated organization.
- Query/cache contract: unchanged; no mutation or invalidation behavior changed.
- UI states/error handling: response shape is stable, but the UI now receives honest location labels.
- Reviewability: one helper, one join/select/grouping update, one focused contract, one closeout note.

### Smells Removed

- Placeholder `locationCode` values in product inventory summary rows.
- Placeholder `locationName` values in product inventory summary rows.
- ID-only implicit location enrichment opportunity in the product inventory summary read.

### Deferred

- Broader product inventory server decomposition remains a separate architecture slice.
- Product inventory row sorting remains unchanged to avoid an incidental behavior change.
- Browser QA was not selected because this is a server response data-quality slice with no intended layout change.

### Gates

- Passed: `bunx vitest run tests/unit/products/product-inventory-summary-location-contract.test.ts`.
- Passed: focused ESLint on touched server function and test.
- Passed: `bun run typecheck`.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. Serialized gates remain retired and this sprint does not change serialized lineage behavior.

### Residual Risk

Low. Inventory rows with invalid cross-tenant or missing location references will no longer appear in this enriched summary because the location join now requires a tenant-scoped warehouse location. That is consistent with the product inventory summary being an operator-facing stock truth surface.
