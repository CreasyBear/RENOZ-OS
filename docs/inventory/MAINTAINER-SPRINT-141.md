# Inventory Maintainer Sprint 141: Stock Count Snapshot Drift Guard

## Status

Closed in commit-ready state.

## Issue 1: Stock Count Completion Applied Variance Against Live Quantity Without Drift Detection

### Problem

Stock-count completion used the original count-sheet `expectedQuantity` to calculate variance, then applied that variance to the inventory row's live `quantityOnHand`. If inventory moved between count-sheet generation and completion, the completion path could double-apply operational movement and corrupt stock, valuation, cost layers, finance metadata, and serialized lineage state.

### Workflow Spine

Desktop stock count start
-> count-sheet expected quantity snapshot
-> counted quantity entry
-> complete stock count
-> locked inventory row
-> snapshot freshness guard
-> adjustment movement, cost-layer mutation, valuation recompute, serialized lineage update.

### Touched Domains

- Inventory stock-count server completion.
- Inventory stock-count contract tests.
- Inventory sprint evidence.

### Business Value Protected

Cycle counts are supposed to restore warehouse truth. Completion must not silently apply stale count-sheet variance after other warehouse movement has changed the row.

### Scope Constraints

- Do not change the stock-count UI.
- Do not change count-sheet generation or counted quantity entry.
- Do not auto-rebase stale count sheets.
- Do not alter cost-layer or serialized-lineage mutation behavior when the snapshot is fresh.

### Changes

- Added a named stock-count snapshot freshness guard.
- Locked reconciliation inventory rows with `FOR UPDATE` before applying stock-count adjustments.
- Rejected completion with a conflict when live on-hand quantity no longer matches the count-sheet expected quantity.
- Added a contract test that protects row locking, drift rejection, and guard ordering before quantity mutation.

### Standards Checked

- Domain ownership: stock-count completion owns count reconciliation; lower-level inventory finance helpers remain unchanged.
- Route -> container/page -> hook -> server function -> schema/database -> query/cache policy: existing desktop route and hook path unchanged; server completion contract hardened before database writes.
- Tenant isolation/data integrity: inventory rows remain organization-scoped and are now locked before reconciliation.
- Transactional inventory/finance integrity: stale count sheets cannot mutate quantity, cost layers, valuation, movement history, or finance metadata.
- Serialized lineage continuity: stale snapshots are rejected before serialized status/lineage mutation.
- UI states/error handling: existing mutation error formatter receives a conflict instead of a silent bad adjustment.
- Query/cache contract: unchanged.
- Reviewability: one server invariant, one focused contract test, one closeout note.

### Smells Removed

- Count completion trusted stale expected quantities without checking the live row.
- Reconciliation inventory reads were not row-locked before downstream mutation.

### Deferred

- A richer stale-count UI that offers refresh/recount recovery is deferred to a UX slice.
- Auto-rebasing counts after interim movement is intentionally deferred; it needs product policy, not just code.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/inventory/stock-count-tenant-scope-contract.test.ts`.
- Passed: focused ESLint on touched server function and contract test.
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. This sprint directly protects transactional inventory and finance integrity under the standing inventory/warehouse maintainer goal.

### Residual Risk

Moderate. The behavior changes completion from permissive to conflict-on-drift, which is the safer operator contract but may expose stale count workflows that previously completed silently.
