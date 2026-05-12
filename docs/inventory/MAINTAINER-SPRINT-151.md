# Inventory Maintainer Sprint 151: Allocation Requires Allocatable Rows

## Status

Closed in commit-ready state.

## Issue 1: Allocation Checked Quantity but Not Inventory Status

### Problem

RENOZ-V3 already treats allocatable stock as inventory rows with `status === "available"` and positive available quantity. Alerting, forecasting, reorder, availability hooks, and dashboard contracts use that rule so quarantined or damaged stock does not look saleable.

`allocateInventory` locked the inventory row and checked `quantityAvailable`, but it did not reject non-available row statuses before writing allocation state, movement history, activity, and serialized lineage. A quarantined or damaged row with stale positive availability could still be allocated.

### Workflow Spine

Allocation request
-> transaction starts with retry wrapper
-> organization context is set
-> inventory row is organization-scoped and locked
-> row status must be `available`
-> available quantity is checked
-> allocation quantity, movement, activity, and serialized lineage writes occur.

### Touched Domains

- Inventory allocation server function.
- Inventory stock mutation contract tests.
- Inventory sprint evidence.

### Business Value Protected

Allocation is a promise that stock can satisfy demand. Damaged, quarantined, returned, or otherwise non-available batteries must not be promised to orders or fulfillment workflows just because a quantity field is positive.

### Scope Constraints

- Do not change allocation schemas.
- Do not change deallocation semantics in this slice.
- Do not change query keys, cache invalidation, or UI.
- Do not redesign reservation planning.

### Changes

- Added an allocation status guard after the locked inventory row read.
- Rejected allocation unless the row status is `available`.
- Added a domain error code for non-allocatable inventory.
- Added a contract test proving status is checked before quantity allocation.

### Standards Checked

- Domain ownership: allocation owns the final row-level promise boundary.
- Route -> container/page -> hook -> server function -> schema/database -> query/cache policy: UI/hook/cache unchanged; server mutation policy tightened.
- Tenant isolation/data integrity: inventory row remains organization-scoped and locked.
- Transactional inventory/finance integrity: no finance writes in this slice; movement/activity/serialized allocation remain transaction-bound.
- Serialized lineage continuity: serialized allocation still happens only after row eligibility and quantity checks.
- UI states/error handling: server now returns a structured validation error for non-allocatable rows.
- Query/cache contract: unchanged.
- Reviewability: one guard and one focused contract assertion.

### Smells Removed

- Allocation write path used quantity availability without enforcing the established allocatable status invariant.

### Deferred

- Deallocation status-preservation semantics remain deferred to avoid widening this slice.
- Reservation planner and order fulfillment allocation paths remain deferred unless fresh evidence shows bypasses.
- Database-backed allocation race tests remain deferred.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/inventory/stock-mutation-tenant-scope-contract.test.ts`
- Passed: `./node_modules/.bin/eslint src/server/functions/inventory/allocations.ts tests/unit/inventory/stock-mutation-tenant-scope-contract.test.ts`
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
- Passed: `git diff --check`

### Goal Adaptation

No adaptation needed. This sprint follows the inventory/warehouse maintainer goal by enforcing existing allocatable-stock semantics at the write boundary.

### Residual Risk

Low for this slice. Allocation now rejects non-available rows, while deallocation status semantics remain a separate review target.
