# Inventory Maintainer Sprint 149: Transactional Manual Receive Product Gate

## Status

Closed in commit-ready state.

## Issue 1: Manual Receiving Could Use Stale Product Availability

### Problem

`receiveInventory` validated product existence and receive eligibility before opening its stock-in transaction. The transaction then created or updated inventory, inserted a movement, created cost layers, recomputed valuation, and updated serialized lineage from that earlier product decision.

If a product was deactivated, soft-deleted, or made non-inventory-tracked between preflight and stock-in writes, manual receiving could still create live warehouse evidence for a product that was no longer receivable.

### Workflow Spine

Manual receive request
-> transaction starts
-> organization context is set
-> product is organization-scoped, non-deleted, and locked
-> product receive eligibility is validated
-> serialization contract is validated against the locked product
-> location and inventory rows are read
-> inventory, movement, cost layer, valuation, activity, and serialized lineage writes occur.

### Touched Domains

- Inventory manual receiving server function.
- Inventory stock mutation contract tests.
- Inventory sprint evidence.

### Business Value Protected

Manual receiving creates stock, cost basis, movement history, and serialized battery lineage. It must not create warehouse or finance evidence for products that have just been removed from active inventory operations.

### Scope Constraints

- Do not change receiving UI.
- Do not change receiving input schemas.
- Do not change cost-layer math, serialized lineage behavior, query keys, or cache invalidation.
- Do not change supplier-backed PO receiving.

### Changes

- Moved manual receive product lookup into the receiving transaction.
- Locked the product row before receive eligibility and serialization validation.
- Kept product tenant and soft-delete bounds intact.
- Preserved existing validation messages and error codes.
- Added a contract test proving the product gate happens before inventory writes.

### Standards Checked

- Domain ownership: manual non-PO stock-in remains owned by `receiveInventory`.
- Route -> container/page -> hook -> server function -> schema/database -> query/cache policy: UI, hook, schema, and cache unchanged; server mutation boundary hardened.
- Tenant isolation/data integrity: product and inventory writes remain organization-scoped; product availability is now transaction-fresh.
- Transactional inventory/finance integrity: inventory, movement, cost layer, valuation, activity, and serialized lineage remain one transaction.
- Serialized lineage continuity: serialization validation now uses the locked product row before lineage writes.
- UI states/error handling: existing operator-safe validation copy retained.
- Query/cache contract: unchanged.
- Reviewability: one server function and one focused contract assertion.

### Smells Removed

- Product receive eligibility was decided outside the transaction that creates stock evidence.
- Serialization validation could be based on stale product serialization metadata.

### Deferred

- Applying the same product-lock pattern to stock adjustments remains deferred as a separate slice.
- Broader stock-in state machine extraction remains deferred.
- Database-backed race integration tests remain deferred.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/inventory/stock-mutation-tenant-scope-contract.test.ts tests/unit/inventory/manual-receive-serialization-contract.test.ts`
- Passed: `./node_modules/.bin/eslint src/server/functions/inventory/receiving.ts tests/unit/inventory/stock-mutation-tenant-scope-contract.test.ts tests/unit/inventory/manual-receive-serialization-contract.test.ts`
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
- Passed: `git diff --check`

### Goal Adaptation

No adaptation needed. This sprint follows the standing inventory/warehouse maintainer goal by making manual stock-in evidence harder to corrupt.

### Residual Risk

Low for this slice. Manual receiving now uses a fresh locked product gate, but stock adjustments still need the same review.
