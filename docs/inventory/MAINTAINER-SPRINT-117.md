# Inventory Maintainer Sprint 117: Stock Count Active Product Descriptors

## Status

Closed in commit-ready state.

## Issue 1: Stock Count Reads Could Enrich Rows With Soft-Deleted Products

### Problem

Stock count item reads, started count-sheet reads, and variance analysis joined product descriptors by product ID and organization only. Physical count workflows should not show archived product metadata as current SKU truth while operators reconcile warehouse stock.

### Workflow Spine

Stock count planning/execution/variance
-> stock count hooks/cache contract
-> `getStockCount`, `startStockCount`, `getCountVarianceAnalysis`
-> tenant-scoped `stock_counts` and `stock_count_items`
-> tenant-scoped `inventory`
-> active tenant-scoped `products`
-> tenant-scoped warehouse locations
-> count sheet and variance rows.

### Touched Domains

- Inventory stock count server function.
- Inventory stock count tenant-scope contract tests.
- Inventory sprint evidence.

### Business Value Protected

Stock counts are warehouse reconciliation controls. Operators need count sheets and variance reports that avoid resurrecting archived SKU descriptors while counting, investigating variances, and closing adjustments.

### Scope Constraints

- Do not change stock count lifecycle status rules, count generation, variance calculations, response shape, hooks, query keys, or cache policy.
- Do not change inventory adjustment writes, finance layer updates, serialized lineage updates, or movement creation.
- Preserve left-join visibility for count-sheet reads where the existing response allows missing descriptors.

### Changes

- Added `stockCountProductJoinCondition` for active tenant-scoped inventory-to-product descriptor joins.
- Reused the helper in `getStockCount`.
- Reused the helper in the `startStockCount` enriched count-sheet response.
- Reused the helper in `getCountVarianceAnalysis`.
- Updated the existing stock-count tenant-scope contract to guard active product descriptor semantics.

### Standards Checked

- Domain ownership: stock count descriptor policy is local to the stock count server function.
- Route -> container/page -> hook -> server -> schema/database -> query/cache policy: server descriptor scope hardened; hook/query-key/cache behavior unchanged.
- Tenant isolation/data integrity: stock count rows and inventory rows remain organization-scoped; product descriptors now require active same-tenant products.
- Query/cache contract: unchanged; no mutation or invalidation behavior changed.
- Finance/serialized lineage: write paths and continuity references are unchanged.
- UI states/error handling: response shape is stable; archived product descriptors no longer enrich stock count rows.
- Reviewability: one helper, three descriptor join replacements, one existing contract update, one closeout note.

### Smells Removed

- Repeated ad hoc product descriptor joins in stock count reads.
- Soft-deleted products could enrich count-sheet rows.
- Soft-deleted products could enrich variance-analysis rows.

### Deferred

- Explicit archived-product count-sheet UI state remains a UX/data-policy slice.
- Broader stock count server decomposition remains separate.
- Browser QA was not selected because this is a server descriptor-scope slice with no intended layout change.

### Gates

- Passed: `bunx vitest run tests/unit/inventory/stock-count-tenant-scope-contract.test.ts`.
- Passed: focused ESLint on touched server function and test.
- Passed: `bun run typecheck`.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. Serialized gates remain retired; this sprint checks serialized lineage continuity references but does not change lineage behavior.

### Residual Risk

Low to moderate. Existing stock count rows tied to archived products can still appear with null product descriptors where the response shape permits it. A later UX/data-policy sprint should decide whether count sheets should show an explicit archived-product state.
