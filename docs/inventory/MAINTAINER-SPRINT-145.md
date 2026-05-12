# Inventory Maintainer Sprint 145: Atomic Stock Count Start Snapshot

## Status

Closed in commit-ready state.

## Issue 1: Stock Count Start Checked Parent Status Before Its Transaction

### Problem

`startStockCount` read and validated the parent count status before opening the transaction that generates the count sheet. Two operators or devices could race the same draft count: both could observe `draft`, then enter separate transactions and generate duplicate count-sheet items or start from stale workflow state.

### Workflow Spine

Start stock count request
-> transaction starts
-> organization context is set
-> parent stock count is organization-scoped and locked
-> draft status is validated
-> inventory rows are selected for the count sheet
-> parent count moves to `in_progress`
-> count items are inserted and returned.

### Touched Domains

- Inventory stock-count server start lifecycle.
- Inventory stock-count contract tests.
- Inventory sprint evidence.

### Business Value Protected

Starting a cycle count creates the evidence baseline for warehouse truth. The baseline must come from a single locked workflow transition, not a race between competing starts.

### Scope Constraints

- Do not change count creation or count item schema.
- Do not change UI behavior.
- Do not lock inventory snapshot generation beyond the existing transaction; completion freshness guards still protect later movement.
- Do not broaden into a full stock-count state machine refactor.

### Changes

- Moved parent stock-count read and draft-status validation inside the start transaction.
- Locked the parent stock-count row with `FOR UPDATE` before selecting inventory rows for the count sheet.
- Added contract coverage that the start path locks the parent count before count-sheet generation and no longer reads the parent count via `db` outside the transaction.

### Standards Checked

- Domain ownership: stock-count start owns the count-sheet baseline transition.
- Route -> container/page -> hook -> server function -> schema/database -> query/cache policy: route and hook unchanged; server lifecycle boundary hardened.
- Tenant isolation/data integrity: parent count remains organization-scoped and locked before item generation.
- Transactional inventory/finance integrity: no finance writes in this slice; completion freshness guards remain responsible for later adjustment integrity.
- Serialized lineage continuity: unchanged.
- UI states/error handling: existing not-found and non-draft validation paths retained.
- Query/cache contract: unchanged.
- Reviewability: local transaction-boundary refactor, focused contract test, closeout note.

### Smells Removed

- Start status validation happened outside the count-sheet generation transaction.
- Count-sheet generation could race from stale parent workflow state.

### Deferred

- Inventory row locking during count-sheet generation remains deferred; completion freshness guards reject movement drift before completion.
- Broader stock-count state machine cleanup remains deferred.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/inventory/stock-count-tenant-scope-contract.test.ts`.
- Passed: focused ESLint on touched server function and contract test.
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. This is a direct lifecycle atomicity fix under the standing inventory/warehouse maintainer goal.

### Residual Risk

Moderate. The start transition is now locked, but the broader active-count editing lifecycle still has deferred concurrency questions.
