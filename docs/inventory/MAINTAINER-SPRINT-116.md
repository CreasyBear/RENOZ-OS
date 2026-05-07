# Inventory Maintainer Sprint 116: WMS Dashboard Active Product Descriptors

## Status

Closed in commit-ready state.

## Issue 1: WMS Dashboard Product Labels Could Include Soft-Deleted Products

### Problem

WMS dashboard stock-by-category and recent movement reads scoped product descriptor joins to the organization, but did not require active product records. This meant archived product metadata could still feed warehouse dashboard category labels and movement timeline labels.

### Workflow Spine

WMS dashboard
-> dashboard hook/cache contract
-> `getStockByCategory`, `getRecentMovementsTimeline`, `getWMSDashboard`
-> tenant-scoped `inventory` and `inventory_movements`
-> active tenant-scoped `products`
-> tenant-scoped categories/locations
-> warehouse dashboard aggregates and timelines.

### Touched Domains

- Inventory WMS dashboard server function.
- Inventory read-model tenant-scope contract tests.
- Inventory sprint evidence.

### Business Value Protected

The WMS dashboard steers warehouse attention across stock value, category mix, location mix, and movement activity. Archived products should not provide current labels for operational stock or movement summaries.

### Scope Constraints

- Do not change WMS dashboard totals, comparison semantics, category/location grouping shape, movement limits, ordering, response shape, hooks, query keys, or cache policy.
- Do not change inventory writes, movement creation, valuation, finance, or serialized lineage behavior.
- Preserve left-join behavior so inventory/movement rows remain visible even when an active product descriptor is unavailable.

### Changes

- Added `wmsInventoryProductJoinCondition` for active tenant-scoped inventory-to-product descriptor joins.
- Added `wmsMovementProductJoinCondition` for active tenant-scoped movement-to-product descriptor joins.
- Reused the inventory helper in standalone and combined stock-by-category queries.
- Reused the movement helper in standalone and combined recent movement queries.
- Updated the existing inventory read-model contract to guard active WMS dashboard product descriptor semantics.

### Standards Checked

- Domain ownership: WMS descriptor policy is local to the WMS dashboard server function.
- Route -> container/page -> hook -> server -> schema/database -> query/cache policy: server descriptor scope hardened; hook/query-key/cache behavior unchanged.
- Tenant isolation/data integrity: inventory and movement rows remain organization-scoped; product labels now require active same-tenant products.
- Query/cache contract: unchanged; no mutation or invalidation behavior changed.
- UI states/error handling: response shape is stable; archived product descriptors no longer enrich WMS dashboard rows.
- Reviewability: two helpers, four descriptor join replacements, one existing contract update, one closeout note.

### Smells Removed

- Repeated ad hoc product descriptor joins in WMS dashboard reads.
- Soft-deleted products could enrich WMS stock category aggregates.
- Soft-deleted products could enrich WMS recent movement timelines.

### Deferred

- Explicit archived-product UI state for inventory/movement rows remains a UX/data-policy slice.
- Category active/deleted-state policy remains separate; this sprint only scoped product descriptors.
- Browser QA was not selected because this is a server descriptor-scope slice with no intended layout change.

### Gates

- Passed: `bunx vitest run tests/unit/inventory/read-model-tenant-scope-contract.test.ts`.
- Passed: focused ESLint on touched server function and test.
- Passed: `bun run typecheck`.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. Serialized gates remain retired and this sprint does not change serialized lineage behavior.

### Residual Risk

Moderate. Inventory or movement rows tied to archived products remain visible and may group under uncategorized or unknown labels because this sprint preserves visibility and response shape. A later product/data-policy sprint should decide whether archived product activity gets explicit labeling or remediation.
