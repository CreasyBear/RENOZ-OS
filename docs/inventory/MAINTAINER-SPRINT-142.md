# Inventory Maintainer Sprint 142: Full Count Sheet Freshness Guard

## Status

Closed in commit-ready state.

## Issue 1: Stale No-Variance Count Rows Could Still Complete

### Problem

Sprint 141 rejected stale inventory snapshots for rows that needed variance adjustments. Rows with no variance were still outside that guard. A count could therefore complete as clean even if inventory moved after the count sheet was generated, so the completion evidence could imply that a stale count sheet was trustworthy.

### Workflow Spine

Stock count start
-> expected quantity snapshot for every count item
-> counted quantity entry
-> complete stock count with adjustments enabled
-> lock every counted inventory row
-> reject stale or missing snapshot rows
-> only then apply variance adjustments and finance/serialized side effects.

### Touched Domains

- Inventory stock-count server completion.
- Inventory stock-count contract tests.
- Inventory sprint evidence.

### Business Value Protected

Cycle-count completion should be reliable warehouse evidence. Clean rows matter as much as adjusted rows because operators use a completed count to trust what was physically verified.

### Scope Constraints

- Do not change stock-count UI or count entry.
- Do not auto-complete, rebase, or merge stale count sheets.
- Do not change adjustment, cost-layer, valuation, or serialized lineage behavior once all rows are fresh.
- Do not broaden outside stock-count completion.

### Changes

- Stock-count completion now locks inventory rows for every counted item, not only variance rows.
- Completion rejects missing inventory rows as stale count-sheet evidence.
- Snapshot freshness now runs for all count items before any variance adjustment writes.
- Updated the stock-count contract test to protect the all-row lock, all-row snapshot guard, and regression away from variance-only row selection.

### Standards Checked

- Domain ownership: stock-count completion owns count-sheet freshness before reconciliation.
- Route -> container/page -> hook -> server function -> schema/database -> query/cache policy: route and hooks unchanged; server completion invariant tightened.
- Tenant isolation/data integrity: all locked inventory rows remain scoped by organization.
- Transactional inventory/finance integrity: no quantity, cost-layer, valuation, or movement write can run from a stale count sheet.
- Serialized lineage continuity: stale serialized rows are rejected before lineage mutation.
- UI states/error handling: existing mutation error path receives a conflict for stale evidence.
- Query/cache contract: unchanged.
- Reviewability: one server selection/guard refinement, one focused contract test update, one closeout note.

### Smells Removed

- Snapshot freshness only protected variance rows.
- Count completion could mark stale no-variance rows as trustworthy.
- Missing inventory rows in a count sheet could be skipped rather than treated as stale evidence.

### Deferred

- Stale-count recovery UX remains deferred.
- Policy for preserving historical count evidence after legitimate post-count movement remains deferred; the current operator-safe contract is to refresh and recount before applying completion.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/inventory/stock-count-tenant-scope-contract.test.ts`.
- Passed: focused ESLint on touched server function and contract test.
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. This is a direct follow-through on stock-count integrity under the standing inventory/warehouse maintainer goal.

### Residual Risk

Moderate. The stricter completion guard may expose stale count workflows that previously appeared clean.
