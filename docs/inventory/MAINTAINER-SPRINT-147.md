# Inventory Maintainer Sprint 147: Draft-Only Stock Count Planning Edits

## Status

Closed in commit-ready state.

## Issue 1: Generic Stock Count Updates Could Bypass Lifecycle Truth

### Problem

`updateStockCountSchema` was derived from the create schema, so edit payloads could inherit create-time defaults such as `countType: "cycle"`, `varianceThreshold: 5`, and empty metadata. The same generic edit path also accepted `status`, allowing lifecycle state to be changed outside the dedicated start, complete, and cancel functions.

That made the stock-count contract harder to trust: a planning edit could accidentally rewrite count metadata, and status could be represented without the evidence that the lifecycle functions create.

### Workflow Spine

Draft stock count planning edit
-> update payload validation
-> transaction starts
-> organization context is set
-> parent stock count is organization-scoped and locked
-> draft status is validated
-> planning fields update
-> lifecycle status remains owned by start, complete, and cancel.

### Touched Domains

- Inventory stock-count planning edit lifecycle.
- Inventory stock-count schemas.
- Inventory stock-count contract tests.
- Inventory sprint evidence.

### Business Value Protected

Stock counts are warehouse evidence. A count sheet should not be retargeted, default-mutated, or status-changed after the operator starts counting. Completed and cancelled states must only come from lifecycle paths that preserve inventory, finance, and review evidence.

### Scope Constraints

- Do not change stock-count UI.
- Do not change query keys or cache invalidation.
- Do not redesign count creation or completion.
- Do not add a new lifecycle state machine.

### Changes

- Replaced `updateStockCountSchema = createStockCountSchema.partial().extend(...)` with an explicit edit schema that has no create defaults.
- Made `status` invalid in generic stock-count update payloads.
- Moved generic stock-count update validation and write into a transaction.
- Locked the parent stock-count row before validating draft status.
- Restricted generic planning edits to draft counts.
- Removed generic status writes from `updateStockCount`.
- Added schema and server-function contract coverage.

### Standards Checked

- Domain ownership: stock-count lifecycle state is owned by lifecycle functions, not generic planning edits.
- Route -> container/page -> hook -> server function -> schema/database -> query/cache policy: UI/hook/cache unchanged; schema and server mutation boundary tightened.
- Tenant isolation/data integrity: parent count remains organization-scoped and locked before planning writes.
- Transactional inventory/finance integrity: no inventory or finance writes in this slice; completion remains the only adjustment path.
- Serialized lineage continuity: unchanged.
- UI states/error handling: existing mutation error handling remains hook-owned; server returns validation errors for non-draft edits.
- Query/cache contract: unchanged.
- Reviewability: one schema boundary, one server mutation, two focused contract tests.

### Smells Removed

- Update schema inherited create-time defaults.
- Generic stock-count update accepted lifecycle status.
- Generic stock-count planning edits validated parent state outside the write transaction.
- Started count sheets could be mutated through the planning edit path.

### Deferred

- Draft edit UI polish remains deferred.
- More granular post-start note-only edits remain deferred until there is a concrete operator workflow.
- Broader stock-count state-machine extraction remains deferred.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/inventory/stock-count-schema-ownership.test.ts tests/unit/inventory/stock-count-tenant-scope-contract.test.ts`
- Passed: `./node_modules/.bin/eslint src/lib/schemas/inventory/stock-counts.ts src/server/functions/inventory/stock-counts.ts tests/unit/inventory/stock-count-schema-ownership.test.ts tests/unit/inventory/stock-count-tenant-scope-contract.test.ts`
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
- Passed: `git diff --check`

### Goal Adaptation

No adaptation needed. This sprint follows the standing inventory/warehouse maintainer goal by reducing a lifecycle bypass and making the repo easier to reason about.

### Residual Risk

Low for this slice. The planning edit contract is stricter, but no UI has been changed to expose draft edit affordances.
