# Inventory Maintainer Sprint 148: Atomic Stock Count Cancellation

## Status

Closed in commit-ready state.

## Issue 1: Cancellation Could Race Completion

### Problem

`cancelStockCount` read the parent stock count, validated that it was not completed, and then wrote `cancelled` outside a transaction. Start, completion, planning edits, and item edits now lock their parent workflow row, but cancellation could still race with completion and overwrite lifecycle truth after completion had begun.

### Workflow Spine

Cancel count request
-> transaction starts
-> organization context is set
-> parent stock count is organization-scoped and locked
-> completed status is rejected
-> cancellation status write occurs
-> stock-count query cache invalidation remains hook-owned.

### Touched Domains

- Inventory stock-count cancellation lifecycle.
- Inventory stock-count contract tests.
- Inventory sprint evidence.

### Business Value Protected

Cancellation is an operator decision about whether a count remains evidence. It must not be able to overwrite a completion path that may already be reconciling warehouse stock, cost layers, movements, and serialized lineage.

### Scope Constraints

- Do not change stock-count UI.
- Do not change query keys or cache invalidation.
- Do not change completion, start, or item edit behavior.
- Do not redesign cancelled-count idempotency.

### Changes

- Wrapped `cancelStockCount` in a transaction.
- Set organization context inside the cancellation transaction.
- Locked the parent stock-count row before validation.
- Moved the cancellation status write to the transaction handle.
- Added a contract test that cancellation locks before writing status.

### Standards Checked

- Domain ownership: cancellation owns only cancellation; completion remains the inventory/finance reconciliation owner.
- Route -> container/page -> hook -> server function -> schema/database -> query/cache policy: UI/hook/cache unchanged; server mutation contract hardened.
- Tenant isolation/data integrity: parent count remains organization-scoped and locked before status write.
- Transactional inventory/finance integrity: no inventory or finance writes in this slice; the fix prevents cancellation from racing completion.
- Serialized lineage continuity: unchanged; completion remains the serialized lineage write path.
- UI states/error handling: existing completed-count validation message retained.
- Query/cache contract: unchanged.
- Reviewability: one lifecycle mutation and one focused contract assertion.

### Smells Removed

- Cancellation validation happened outside the cancellation write transaction.
- Cancellation was the remaining stock-count lifecycle parent-write path without a parent row lock.

### Deferred

- Explicit rejection for already-cancelled counts remains deferred to avoid changing idempotency semantics in this slice.
- Cancellation reason capture remains deferred until there is a concrete operator workflow.
- Broader lifecycle state-machine extraction remains deferred.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/inventory/stock-count-tenant-scope-contract.test.ts`
- Passed: `./node_modules/.bin/eslint src/server/functions/inventory/stock-counts.ts tests/unit/inventory/stock-count-tenant-scope-contract.test.ts`
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
- Passed: `git diff --check`

### Goal Adaptation

No adaptation needed. This continues the inventory/warehouse maintainer goal by closing a lifecycle race in a narrow domain slice.

### Residual Risk

Low for this slice. The cancellation path is stricter around lifecycle races, but cancelled-count idempotency and reason capture remain unchanged.
