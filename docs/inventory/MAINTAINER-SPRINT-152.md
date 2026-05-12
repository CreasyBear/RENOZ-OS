# Inventory Maintainer Sprint 152: Deallocation Preserves Stock Status

## Status

Closed in commit-ready state.

## Issue 1: Deallocation Could Reclassify Non-Allocatable Stock

### Problem

`deallocateInventory` recomputed inventory status from allocation count alone:

`newAllocated > 0 ? "allocated" : "available"`

That made release behavior too blunt. A partially allocated `available` row could be flipped to `allocated` after a partial release, and a quarantined, returned, damaged, or sold row with allocated quantity could be restored to `available` when the allocation reached zero.

Sprint 151 made allocation require `available` rows. Deallocation also needs to preserve stock status truth instead of turning a reservation release into a quality/availability change.

### Workflow Spine

Deallocation request
-> transaction starts
-> organization context is set
-> inventory row is organization-scoped and locked
-> allocated quantity is validated
-> allocation quantity is released
-> inventory status is preserved unless resolving an `allocated` row
-> movement, activity, and serialized lineage release evidence is written.

### Touched Domains

- Inventory deallocation server function.
- Inventory serialized lineage release behavior.
- Inventory stock mutation contract tests.
- Inventory sprint evidence.

### Business Value Protected

Releasing a reservation should not make quarantined, damaged, returned, or sold batteries saleable. Operators need reservation state and stock disposition to remain separate so support recovery, fulfillment, and warehouse truth do not bleed into one another.

### Scope Constraints

- Do not change allocation schemas.
- Do not change allocation guard behavior from Sprint 151.
- Do not change query keys, cache invalidation, or UI.
- Do not redesign reservation planning.

### Changes

- Added `resolveDeallocatedInventoryStatus` so deallocation only derives status for rows currently marked `allocated`.
- Preserved current inventory status for rows already marked `available`, `damaged`, `returned`, `quarantined`, or `sold`.
- Added `resolveDeallocatedSerializedStatus` to avoid restoring quarantined/returned serialized lineage to available during release.
- Explicitly release serialized item allocation when the serialized item remains non-available after deallocation.
- Added contract coverage for inventory status preservation and serialized release behavior.

### Standards Checked

- Domain ownership: deallocation owns reservation release, not stock disposition changes.
- Route -> container/page -> hook -> server function -> schema/database -> query/cache policy: UI/hook/cache unchanged; server mutation semantics tightened.
- Tenant isolation/data integrity: inventory row remains organization-scoped and locked before release.
- Transactional inventory/finance integrity: no finance writes in this slice; movement/activity/serialized release remain transaction-bound.
- Serialized lineage continuity: serialized allocation release remains explicit even when final serialized status is quarantined, returned, or scrapped.
- UI states/error handling: existing validation behavior retained.
- Query/cache contract: unchanged.
- Reviewability: two local status helpers, one mutation update, one focused contract assertion.

### Smells Removed

- Reservation release overwrote stock disposition.
- Partial deallocation could make an available row look fully allocated.
- Serialized release behavior depended on the helper only releasing allocations when status became `available`.

### Deferred

- Whether `sold` rows should reject deallocation entirely remains deferred to a future order/fulfillment state-machine slice.
- Full serialized mapping for every exceptional inventory status remains deferred until inventory and serialized status enums are reconciled.
- Database-backed deallocation integration tests remain deferred.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/inventory/stock-mutation-tenant-scope-contract.test.ts`
- Passed: `./node_modules/.bin/eslint src/server/functions/inventory/allocations.ts tests/unit/inventory/stock-mutation-tenant-scope-contract.test.ts`
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
- Passed: `git diff --check`

### Goal Adaptation

No adaptation needed. This sprint follows the inventory/warehouse maintainer goal by keeping reservation release separate from stock disposition.

### Residual Risk

Low for this slice. Deallocation now preserves stock status, but sold-row deallocation policy still needs a broader fulfillment review.
