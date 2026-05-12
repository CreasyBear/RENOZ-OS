# Inventory Maintainer Sprint 144: Atomic Stock Count Completion Snapshot

## Status

Closed in commit-ready state.

## Issue 1: Stock Count Completion Read Parent State Before Its Transaction

### Problem

`completeStockCount` checked the parent count status and loaded count items before opening the transaction that performs completion. Inventory rows were locked later, but the parent count and item snapshot were not read under the same transaction boundary. Concurrent completion, cancellation, or count-item edits could make completion operate on stale workflow state.

### Workflow Spine

Complete stock count request
-> transaction starts
-> organization context is set
-> parent stock count is organization-scoped and locked
-> status is validated
-> count items are read from the locked workflow snapshot
-> all-row inventory freshness guard
-> optional adjustment writes
-> parent count completion update.

### Touched Domains

- Inventory stock-count server completion.
- Inventory stock-count contract tests.
- Inventory sprint evidence.

### Business Value Protected

Stock-count completion is the moment warehouse evidence becomes operational truth. Parent workflow state, item entries, inventory quantity, finance effects, and serialized lineage must be reconciled from one transactionally coherent snapshot.

### Scope Constraints

- Do not change stock-count UI.
- Do not change count item editing semantics.
- Do not alter adjustment math or freshness policy from Sprints 141-143.
- Do not introduce broader stock-count lifecycle refactors.

### Changes

- Moved parent stock-count read, status validation, count-item read, and uncounted validation into the completion transaction.
- Locked the parent stock-count row with `FOR UPDATE` before reading completion items.
- Added contract coverage that parent lock happens before item reads and rejects regression to pre-transaction item reads.

### Standards Checked

- Domain ownership: stock-count completion now owns one transactionally coherent workflow snapshot.
- Route -> container/page -> hook -> server function -> schema/database -> query/cache policy: route and hook unchanged; server function boundary hardened.
- Tenant isolation/data integrity: parent count remains organization-scoped; child item read is anchored to the locked parent count ID.
- Transactional inventory/finance integrity: inventory row locks and finance/lineage side effects now run after parent workflow lock and item snapshot read.
- Serialized lineage continuity: unchanged, but lineage mutation now depends on a stronger parent workflow snapshot.
- UI states/error handling: existing not-found, validation, and conflict paths retained.
- Query/cache contract: unchanged.
- Reviewability: one local transaction-boundary refactor and one focused contract test.

### Smells Removed

- Completion status validation happened outside the completion transaction.
- Count items were loaded before the parent workflow row was locked.

### Deferred

- Item-level edit locking while a user is actively counting remains deferred.
- Broader stock-count lifecycle state machine cleanup is deferred.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/inventory/stock-count-tenant-scope-contract.test.ts`.
- Passed: focused ESLint on touched server function and contract test.
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. This is a direct transaction-boundary cleanup under the standing inventory/warehouse maintainer goal.

### Residual Risk

Moderate. The function is stricter about reading completion state under lock, but it does not redesign the broader stock-count lifecycle.
