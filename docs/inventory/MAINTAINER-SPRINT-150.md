# Inventory Maintainer Sprint 150: Transactional Adjustment Product Gate

## Status

Closed in commit-ready state.

## Issue 1: Stock Adjustments Could Use Stale Product Availability

### Problem

`adjustInventory` loaded product identity, inventory-tracking state, and serialization policy before opening the adjustment transaction. The transaction then locked and mutated inventory, consumed or created cost layers, recomputed valuation, wrote movement history, and updated serialized lineage from that earlier product decision.

If a product changed between preflight and adjustment writes, a stock increase could create live inventory from stale eligibility, and serialized adjustment rules could be evaluated against stale product serialization metadata.

### Workflow Spine

Adjustment request
-> transaction starts
-> organization context is set
-> product is organization-scoped, non-deleted, and locked
-> inventory row is locked
-> stock-in eligibility and serialized rules are validated from locked rows
-> inventory, movement, cost layer, valuation, activity, and serialized lineage writes occur.

### Touched Domains

- Inventory adjustment server function.
- Inventory stock mutation contract tests.
- Inventory sprint evidence.

### Business Value Protected

Manual stock corrections affect warehouse truth, valuation, movement history, and serialized battery lineage. Operators should not be able to increase stock or apply serialized correction rules from product metadata that changed mid-request.

### Scope Constraints

- Do not change adjustment UI.
- Do not change adjustment input schemas.
- Do not change positive/negative adjustment policy.
- Do not change cost-layer math, serialized lineage behavior, query keys, or cache invalidation.

### Changes

- Moved adjustment product lookup into the adjustment transaction.
- Locked the product row before inventory row lookup and mutation.
- Kept product tenant and soft-delete bounds intact.
- Preserved existing validation messages and error codes.
- Added a contract test proving the product gate happens before inventory writes.

### Standards Checked

- Domain ownership: stock corrections remain owned by `adjustInventory`.
- Route -> container/page -> hook -> server function -> schema/database -> query/cache policy: UI, hook, schema, and cache unchanged; server mutation boundary hardened.
- Tenant isolation/data integrity: product and inventory writes remain organization-scoped; product availability is now transaction-fresh.
- Transactional inventory/finance integrity: inventory, movement, cost layer, valuation, activity, and serialized lineage remain one transaction.
- Serialized lineage continuity: serialized adjustment rules now use the locked product row before lineage writes.
- UI states/error handling: existing operator-safe validation copy retained.
- Query/cache contract: unchanged.
- Reviewability: one server function and one focused contract assertion.

### Smells Removed

- Product adjustment eligibility was decided outside the transaction that mutates stock evidence.
- Serialized adjustment rules could be based on stale product serialization metadata.

### Deferred

- Allocation/deallocation product metadata freshness remains deferred until a dedicated allocation slice.
- Broader stock mutation state-machine extraction remains deferred.
- Database-backed race integration tests remain deferred.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/inventory/stock-mutation-tenant-scope-contract.test.ts`
- Passed: `./node_modules/.bin/eslint src/server/functions/inventory/adjustments.ts tests/unit/inventory/stock-mutation-tenant-scope-contract.test.ts`
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
- Passed: `git diff --check`

### Goal Adaptation

No adaptation needed. This sprint follows the standing inventory/warehouse maintainer goal by hardening stock correction evidence with a narrow transaction-boundary fix.

### Residual Risk

Low for this slice. Adjustment product metadata is now transaction-fresh, but allocation/deallocation deserves the same freshness review.
