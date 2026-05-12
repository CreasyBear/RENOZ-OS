# Inventory Maintainer Sprint 156: Transfer Product Gate Lock

## Status

Closed in commit-ready state.

## Issue 1: Transfer Serialization Gate Was Read Outside The Transaction

### Problem

`transferInventory` used `products.isSerialized` to choose between serialized and non-serialized transfer workflows, but it read that product row before starting the transfer transaction and did not lock it.

That product gate controls whether serial numbers are required, rejected, or used to drive serialized inventory movement. For battery OEM warehouse operations, the classification that chooses the transfer path must be stable before inventory rows, cost layers, movement evidence, and serialized lineage are written.

### Workflow Spine

Transfer request
-> same-location validation
-> serials normalized
-> transaction starts
-> organization context is set
-> product row is organization-scoped, active-row filtered, and locked
-> serialized/non-serialized transfer validation runs from the locked product gate
-> source inventory row is organization-scoped and locked
-> transfer quantity and cost-layer movement run
-> inventory movement evidence is written
-> serialized lineage is updated for serialized transfers
-> finance mutation contract returns affected inventory and layer identities.

### Touched Domains

- Inventory transfer server function.
- Transfer tenant-scope/contract tests.
- Inventory sprint evidence.

### Business Value Protected

Warehouse transfers move real lithium battery stock and preserve cost-layer value. The product serialization mode determines whether serial-level identity must move with that stock. Locking that gate prevents a transfer from using stale product classification while writing inventory, valuation, and serialized lineage records.

### Scope Constraints

- Do not redesign transfer status policy.
- Do not change whether quarantined or returned stock may be physically transferred.
- Do not change transfer cache invalidation or UI.
- Do not change cost-layer transfer logic.
- Do not broaden into transfer return-shape cleanup.

### Changes

- Removed the pre-transaction product lookup from `transferInventory`.
- Moved the product lookup inside the existing transaction.
- Added `for update` to lock the product row before serialized/non-serialized validation.
- Kept the same organization and soft-delete product predicates.
- Kept same-location validation outside the transaction because it does not depend on database state.
- Added focused contract coverage that fails if the product gate returns to `db.select`, loses transaction ownership, or drops the lock.

### Standards Checked

- Domain ownership: transfer server function owns warehouse-to-warehouse movement and now owns its product serialization gate inside the same transaction.
- Route -> container/page -> hook -> server function -> schema/database -> query/cache policy: no route/hook/cache changes; server function boundary tightened.
- Tenant isolation/data integrity: product lookup remains organization-scoped and now transaction-locked.
- Transactional inventory/finance integrity: product classification, inventory writes, movements, cost layers, and serialized lineage now share transaction state.
- Serialized lineage continuity: serialized transfer validation now depends on locked product classification before lineage writes.
- UI states/error handling: unchanged; existing transfer error formatting remains in place.
- Query/cache contract: unchanged.
- Reviewability: one moved lookup and one contract assertion.

### Smells Removed

- Transfer workflow chose serialized vs non-serialized behavior from an unlocked pre-transaction product read.
- Product gate hardening lagged behind the receiving and adjustment mutation patterns.

### Deferred

- Transfer status policy remains deferred. Some businesses intentionally move quarantined stock between warehouse locations, so changing that requires an explicit operator workflow decision.
- Serialized transfer return shape remains deferred; this sprint did not normalize the returned `sourceItem`/`destinationItem` payload.
- Browser smoke is not relevant to this server-only slice and was skipped.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/inventory/transfer-tenant-scope-contract.test.ts tests/unit/inventory/use-transfer-inventory.test.tsx`
- Passed: `./node_modules/.bin/eslint src/server/functions/inventory/transfers.ts tests/unit/inventory/transfer-tenant-scope-contract.test.ts`
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
- Passed: `git diff --check`

### Goal Adaptation

No adaptation needed. This follows the maintainer goal by tightening a domain transaction boundary before changing transfer behavior.

### Residual Risk

Low for this slice. The product gate is now transaction-bound and locked. Broader transfer semantics, especially whether non-available dispositions should be movable and how serialized transfer responses should be shaped for exact cache invalidation, remain separate product decisions.
