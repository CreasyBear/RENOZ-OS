# Inventory Maintainer Sprint 119: Weighted Average Cost Active Product Write

## Status

Closed in commit-ready state.

## Issue 1: Weighted Average Cost Update Could Mutate Soft-Deleted Products

### Problem

`updateProductWeightedAverageCost` verified product tenant ownership before recalculating `costPrice`, but it did not require the product to be active. A soft-deleted product could still be accepted and mutated if its ID was submitted.

### Workflow Spine

Weighted average product cost refresh
-> inventory valuation server mutation
-> active tenant-scoped product preflight
-> tenant-scoped inventory cost layers
-> active tenant-scoped product cost update.

### Touched Domains

- Inventory valuation server function.
- Inventory valuation tenant-scope contract tests.
- Inventory sprint evidence.

### Business Value Protected

Weighted-average cost feeds purchasing, receiving, valuation, and margin decisions. Archived products should not receive current cost recalculations, because that makes historical or deleted SKU records look operationally live.

### Scope Constraints

- Do not change cost layer selection, weighted-average math, returned payload shape, hooks, query keys, or cache policy.
- Do not change valuation reads, finance integrity reads, reconciliation writes, inventory writes, movement writes, or serialized lineage behavior.
- Keep the existing `NotFoundError` behavior for inaccessible products, now including soft-deleted products.

### Changes

- Added `isNull(products.deletedAt)` to the product preflight lookup.
- Added `isNull(products.deletedAt)` to the `costPrice` update predicate.
- Updated the existing valuation tenant-scope contract to guard active-product write semantics.

### Standards Checked

- Domain ownership: weighted-average product-cost mutation remains inside the valuation server function.
- Route -> container/page -> hook -> server -> schema/database -> query/cache policy: mutation predicate hardened; hook/query-key/cache behavior unchanged.
- Tenant isolation/data integrity: product read and write predicates require same tenant and active product state.
- Finance integrity: cost-layer math and finance reconciliation behavior unchanged.
- Query/cache contract: unchanged; no invalidation behavior changed.
- UI states/error handling: inaccessible or archived products continue to surface as product not found.
- Reviewability: two predicate updates, one existing contract update, one closeout note.

### Smells Removed

- Soft-deleted products could pass weighted-average cost preflight.
- Soft-deleted products could be updated by weighted-average cost refresh.

### Deferred

- Broader valuation mutation transactionality and cache invalidation review remains a separate sprint.
- Explicit archived-product UX/data policy remains separate.
- Browser QA was not selected because this is a server mutation predicate slice with no intended layout change.

### Gates

- Passed: `bunx vitest run tests/unit/inventory/valuation-tenant-scope-contract.test.ts`.
- Passed: focused ESLint on touched server function and test.
- Passed: `bun run typecheck`.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. Serialized gates remain retired and this sprint does not change serialized lineage behavior.

### Residual Risk

Low. The mutation now rejects archived products through the same not-found path used for missing or cross-tenant products. Cost-layer reads for historical archived-product inventory remain intentionally visible through separate read policies.
