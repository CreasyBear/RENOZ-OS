# Inventory Maintainer Sprint 153: Bulk Status Respects Allocations

## Status

Closed in commit-ready state.

## Issue 1: Bulk Status Updates Could Bypass Reservation Release

### Problem

`bulkUpdateStatus` directly changed inventory row status by ID. It did not first lock the target rows or check whether any row had live allocated quantity.

After Sprint 151 and Sprint 152, allocation and deallocation now protect row-level allocatable truth. The bulk status path still allowed an operator action to change allocated stock to `available`, `damaged`, `returned`, `quarantined`, or `sold` without first releasing the reservation. That mixes reservation state with stock disposition and can make committed stock disappear from the allocation workflow.

### Workflow Spine

Bulk status request
-> transaction starts
-> organization context is set
-> target inventory rows are organization-scoped and locked
-> live allocated quantity is checked
-> non-allocation status changes are blocked until reservations are released
-> status update, movement audit rows, and activity logs are written.

### Touched Domains

- Inventory bulk status update server function.
- Inventory stock mutation contract tests.
- Inventory sprint evidence.

### Business Value Protected

Bulk status changes are operator tools for stock disposition. They must not silently override active fulfillment commitments. Allocated batteries should be released through the reservation workflow before they are quarantined, damaged, returned, sold, or made available again.

### Scope Constraints

- Do not change bulk status schemas.
- Do not change allocation/deallocation behavior from Sprints 151 and 152.
- Do not change query keys, cache invalidation, or UI.
- Do not map every inventory status to serialized lineage in this slice.

### Changes

- Locked target inventory rows before bulk status writes.
- Blocked non-`allocated` status changes when any target row has allocated quantity.
- Preserved existing partial-found behavior by updating only found, locked target IDs.
- Added a contract test for the allocation guard and locked target-row flow.

### Standards Checked

- Domain ownership: bulk status updates own disposition changes, not reservation release.
- Route -> container/page -> hook -> server function -> schema/database -> query/cache policy: UI/hook/cache unchanged; server mutation policy tightened.
- Tenant isolation/data integrity: target rows are organization-scoped and locked before status writes.
- Transactional inventory/finance integrity: no finance writes in this slice; movement/activity audit remains transaction-bound.
- Serialized lineage continuity: unchanged; broad serialized status mapping remains deferred.
- UI states/error handling: server returns a structured validation error for allocated rows.
- Query/cache contract: unchanged.
- Reviewability: one preflight lock/guard and one focused contract assertion.

### Smells Removed

- Bulk status updates could change disposition for rows with live allocated quantity.
- Bulk status writes used request IDs directly after the preflight was added, instead of the locked target ID set.

### Deferred

- Serialized lineage mapping for bulk status changes remains deferred as a separate slice.
- Whether setting status to `allocated` manually should require positive allocated quantity remains deferred.
- UI affordances for showing which allocated rows blocked the action remain deferred.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/inventory/stock-mutation-tenant-scope-contract.test.ts`
- Passed: `./node_modules/.bin/eslint src/server/functions/inventory/status-updates.ts tests/unit/inventory/stock-mutation-tenant-scope-contract.test.ts`
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
- Passed: `git diff --check`

### Goal Adaptation

No adaptation needed. This sprint follows the inventory/warehouse maintainer goal by protecting reservation state at another stock mutation boundary.

### Residual Risk

Low for this slice. Bulk status updates now respect active allocations, but serialized status mapping still needs a dedicated review.
