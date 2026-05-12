# Inventory Maintainer Sprint 146: Atomic Stock Count Item Edits

## Status

Closed in commit-ready state.

## Issue 1: Count Item Edits Could Race Count Completion

### Problem

`updateStockCountItem` and `bulkUpdateCountItems` checked the parent stock-count status before writing count items. Completion and start now lock their parent workflow rows, but item edits could still race with completion or cancellation: an operator could validate an `in_progress` count and then write counted quantities after the count had already moved state.

### Workflow Spine

Count item edit request
-> transaction starts
-> organization context is set
-> parent stock count is organization-scoped and locked
-> `in_progress` status is validated
-> target item rows are updated
-> stock-count query cache invalidation remains hook-owned.

### Touched Domains

- Inventory stock-count item edit lifecycle.
- Inventory stock-count contract tests.
- Inventory sprint evidence.

### Business Value Protected

Counted quantities are evidence. They must not mutate after the count lifecycle has moved to completion or cancellation.

### Scope Constraints

- Do not change stock-count UI.
- Do not change count item schemas.
- Do not change query keys or hook invalidation.
- Do not redesign the full active-count editing state machine.

### Changes

- Wrapped single count-item updates in a transaction.
- Moved parent stock-count read/status validation inside that transaction.
- Locked the parent stock-count row before single item updates.
- Moved bulk parent stock-count read/status validation inside its existing transaction.
- Locked the parent stock-count row before bulk item updates.
- Added contract tests for parent locks before single and bulk item writes.

### Standards Checked

- Domain ownership: stock-count item write paths own their parent lifecycle precondition.
- Route -> container/page -> hook -> server function -> schema/database -> query/cache policy: UI/hook/cache unchanged; server mutation contract hardened.
- Tenant isolation/data integrity: parent count remains organization-scoped and locked before child item writes.
- Transactional inventory/finance integrity: no finance writes in this slice; completion still owns adjustment integrity.
- Serialized lineage continuity: unchanged.
- UI states/error handling: existing not-found and not-in-progress errors retained.
- Query/cache contract: unchanged.
- Reviewability: two mutation-path transaction changes and focused contract tests.

### Smells Removed

- Count item status validation happened outside the item write transaction.
- Bulk item write validation happened outside the bulk write transaction.
- Count item evidence could be written after lifecycle state changed.

### Deferred

- Item-level edit locks and optimistic edit conflict UI remain deferred.
- Broader count lifecycle state machine cleanup remains deferred.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/inventory/stock-count-tenant-scope-contract.test.ts`
- Passed: `./node_modules/.bin/eslint src/server/functions/inventory/stock-counts.ts tests/unit/inventory/stock-count-tenant-scope-contract.test.ts`
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
- Passed: `git diff --check`

### Goal Adaptation

No adaptation needed. This is a direct lifecycle integrity fix under the standing inventory/warehouse maintainer goal.

### Residual Risk

Low for this slice. Count item edits now share the parent lifecycle lock pattern used by start and completion. The broader active-count editing UX remains unchanged.
