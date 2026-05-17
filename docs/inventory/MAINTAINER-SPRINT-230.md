# Inventory Maintainer Sprint 230: Stock Count Completion Boundary

Status: closed and commit-ready.

## Problem

After Sprint 229, `stock-counts.ts` still owned the full stock count completion and reconciliation transaction inline. That left the public server-function facade responsible for tenant RLS context, count locking, counted item completeness validation, stale inventory snapshot checks, inventory row locking, variance adjustment writes, FIFO layer consumption, positive adjustment layer creation, inventory value recompute, serialized cost integrity, movement creation, serialized lineage updates, variance review marks, completion status, and finance mutation envelope construction.

Stock counts are high-consequence for RENOZ Energy because counted warehouse stock becomes the correction point for physical battery inventory, serialized item state, valuation, and downstream fulfillment confidence. Completion should sit behind a named reconciliation helper while the public server function stays focused on auth, schema, and delegation.

## Workflow Spine Protected

Stock count completion
-> `useCompleteStockCount`
-> `completeStockCount` server function
-> inventory count permission
-> completion input schema
-> `completeStockCountReconciliation` helper
-> tenant RLS context set in transaction
-> in-progress stock count lock
-> counted item completeness guard
-> tenant-scoped inventory row locks
-> stale snapshot guard
-> optional variance adjustments
-> tenant inventory update
-> FIFO consume or stock count adjustment layer create
-> value recompute
-> serialized cost integrity checks
-> movement creation
-> serialized lineage update/event when applicable
-> variance review marks
-> completed count update
-> unchanged inventory finance mutation success envelope
-> unchanged stock-count/cache invalidation contract.

## Touched Domains

- Inventory stock-count completion server function.
- Inventory stock-count reconciliation transaction helper.
- Inventory stock-count tenant-scope and source contracts.
- Inventory stock-count hook/cache/query normalization coverage.
- Sprint evidence.

## Business Value Protected

RENOZ Energy depends on trustworthy cycle counts and warehouse reconciliation to keep battery stock, serialized item status, dispatch readiness, service stock, RMA decisions, valuation, and finance reporting aligned with the physical warehouse. This slice keeps stock-count completion tenant-scoped, cost-layer-aware, serialized-lineage-aware, and easier to audit before any behavior changes are attempted.

## Changes

- Added `src/server/functions/inventory/complete-stock-count-reconciliation.ts`.
- Moved the stock count completion transaction out of `stock-counts.ts`.
- Kept `completeStockCount` as the public server function, permission boundary, input schema boundary, and response boundary.
- Kept the hook, route, query keys, cache invalidation, and caller contract unchanged.
- Moved the stale inventory snapshot guard into the helper that owns reconciliation.
- Updated source contracts so tenant scoping, count delegation, item locks, stale snapshot checks, inventory writes, serialized writes, finance metadata, affected cost layer ids, and affected product ids are asserted against the helper that now owns them.

## Standards Checked

- Domain ownership: stock count completion now has a named reconciliation helper.
- Route -> container/page -> hook -> server -> schema/database -> query/cache policy: unchanged. The route and hook still call the same public server function and cache behavior is unchanged.
- Tenant isolation: preserved tenant RLS context, stock count ownership predicate, inventory ownership predicate, inventory update ownership predicate, serialized item ownership predicate, and completed-count ownership predicate.
- Transactional inventory and finance integrity: preserved one transaction around count lock, item validation, inventory locks, stale snapshot checks, inventory writes, cost-layer writes, value recompute, movement writes, serialized lineage writes, count completion, and finance envelope construction.
- Serialized lineage continuity: preserved serial normalization, serialized unit guard, serialized cost integrity checks, serialized item upsert, scrap status mapping, and serialized event creation.
- Honest UI states and operator-safe errors: preserved not-found, invalid status, uncounted item, stale snapshot, negative quantity, serialized unit violation, insufficient layer quantity, and serialized infrastructure fallback behavior.
- Mutation/cache contracts: unchanged. Stock count completion still flows through the existing stock-count mutation and cache invalidation policy.
- Tests: source contracts now guard the extracted helper boundary and existing stock-count/query/workflow tests still pass.

## Smells Removed

- `stock-counts.ts` no longer mixes completion facade concerns with the full reconciliation transaction.
- Reduced `stock-counts.ts` from more than 1,300 lines to 921 lines.
- Made the stock-count completion write policy inspectable in one helper.
- Kept stock-count cache invalidation and UI behavior untouched while isolating the transaction body.

## Smells Deferred

- `complete-stock-count-reconciliation.ts` is intentionally still a broad transaction helper at 400 lines. It is clearer than the previous facade, but future sprints can split inventory adjustment, cost-layer reconciliation, movement creation, and serialized lineage handling into smaller helpers.
- `stock-counts.ts` still owns planning, start, item update, bulk item update, cancel, variance analysis, and read-model behavior.
- Live database fixtures for stock-count completion remain deferred; this sprint preserves source behavior and contracts but does not execute real count rows.
- `src/lib/query-keys.ts` remains a large shared architecture pressure point outside this sprint.

## Verification

- `npm run test:vitest -- tests/unit/inventory/stock-count-tenant-scope-contract.test.ts tests/unit/inventory/query-normalization-wave3-stock-counts.test.tsx tests/unit/inventory/stock-count-schema-ownership.test.ts tests/unit/inventory/stock-action-error-messages.test.ts tests/unit/inventory/query-normalization-wave3-movements.test.tsx tests/unit/inventory/stock-in-workflow-trace.test.ts` passed: 6 files, 43 tests.
- `./node_modules/.bin/eslint src/server/functions/inventory/stock-counts.ts src/server/functions/inventory/complete-stock-count-reconciliation.ts tests/unit/inventory/stock-count-tenant-scope-contract.test.ts --report-unused-disable-directives` passed.
- `git diff --check` passed.
- `npm run lint:reliability` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run test:unit` passed: 765 files, 2,536 tests.

## Skipped

- Production build was skipped because this was a server-only transaction extraction covered by focused contracts, focused lint, typecheck, full lint, reliability lint, and the full unit suite.
- Browser QA was skipped because no UI rendering or interaction changed.
- Live database stock-count checks were skipped because no SQL semantics or write policy changed beyond extraction.

## Goal Adaptation

None. This follows the active goal's domain-sliced cleanup model and keeps architecture cleanliness as the dominant lens.

## Residual Risk

Low for behavior because the public server function, permission, schema, hook contract, cache contract, response envelope, tenant predicates, transaction shape, finance metadata, movement records, and serialized lineage references are preserved. Medium architecture risk remains because the extracted reconciliation helper is still broad, and stock-count lifecycle operations still have transaction boundaries that can be tightened in later sprints.
