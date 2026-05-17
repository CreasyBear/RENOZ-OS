# Inventory Maintainer Sprint 229: Transfer Transaction Boundary

Status: closed and commit-ready.

## Problem

After Sprint 228, `transfers.ts` still owned the full warehouse-to-warehouse stock movement transaction inline. That left the public server-function facade responsible for same-location validation, serial normalization, tenant RLS context, product serialization checks, source row locking, serialized source validation, source and destination inventory writes, cost-layer movement, value recompute, serialized lineage updates, movement creation, activity logging, and finance mutation envelope construction.

Transfers are high-consequence for RENOZ Energy because they move real battery stock between warehouse locations while preserving cost-layer value and serialized identity. The write policy should sit behind a named helper while the public server function stays focused on auth, schema, and delegation.

## Workflow Spine Protected

Inventory transfer
-> `useTransferInventory`
-> `transferInventory` server function
-> inventory transfer permission
-> `stockTransferSchema`
-> `transferInventoryQuantity` helper
-> same-location guard
-> tenant RLS context set in transaction
-> tenant product lock and serialization gate
-> source inventory row lock
-> row-scoped non-serialized source guard
-> serialized source row locks and serial availability guards
-> source inventory decrement
-> destination inventory lock or create
-> cost layers moved source to destination
-> source and destination value recompute
-> serialized cost integrity checks when applicable
-> movement creation
-> serialized lineage update/event when applicable
-> activity logging for non-serialized transfer movement
-> unchanged inventory finance mutation success envelope
-> unchanged cache invalidation through `invalidateInventoryStockMutationQueries`.

## Touched Domains

- Inventory transfer server function.
- Inventory transfer transaction helper.
- Inventory transfer tenant-scope and lineage source contracts.
- Inventory transfer hook/cache regression coverage.
- Inventory movement query normalization coverage.
- Sprint evidence.

## Business Value Protected

RENOZ Energy depends on reliable location transfers for dispatch staging, quarantine, returns, damaged stock, service stock, and warehouse organization. This slice keeps transfer behavior tenant-scoped, cost-layer-aware, serialized-lineage-aware, and easier to audit before the larger stock-count module is tackled.

## Changes

- Added `src/server/functions/inventory/transfer-inventory-quantity.ts`.
- Moved the transfer transaction out of `transfers.ts`.
- Kept `transferInventory` as the public server function, permission boundary, schema boundary, and response boundary.
- Kept the hook, route, query keys, cache invalidation, and caller contract unchanged.
- Updated source contracts so tenant scoping, product lock, row-scope guard, transfer disposition mapping, finance references, lineage references, and movement reason handling are asserted against the helper that now owns them.

## Standards Checked

- Domain ownership: inventory transfer now has a named transaction helper.
- Route -> container/page -> hook -> server -> schema/database -> query/cache policy: unchanged. The route and hook still call the same public server function and cache behavior is unchanged.
- Tenant isolation: preserved tenant RLS context, product ownership predicate, source inventory ownership predicate, serialized source row ownership predicate, destination inventory ownership predicate, and activity organization context.
- Transactional inventory and finance integrity: preserved one transaction around product lock, inventory writes, cost-layer moves, value recompute, serialized integrity checks, movement writes, lineage writes, activity logging, and finance envelope construction.
- Serialized lineage continuity: preserved serial normalization, source serial availability guard, destination unit guard, destination status mapping, canonical serial upsert, status event creation, and serialized cost integrity checks.
- Honest UI states and operator-safe errors: preserved same-location, product-not-found, serialized serial-count, non-serialized source row, source-not-found, serial missing, serial unavailable, destination unit violation, insufficient quantity, and layer mismatch behavior.
- Mutation/cache contracts: unchanged. Transfers still use refetch-first row/serial-scoped cache behavior and centralized query keys.
- Tests: source contracts now guard the extracted helper boundary and existing hook/query/workflow tests still pass.

## Smells Removed

- `transfers.ts` no longer mixes auth/schema facade concerns with the full warehouse transfer transaction.
- Reduced `transfers.ts` from 622 lines to a 28-line facade.
- Made the transfer write policy inspectable in one helper.
- Kept transfer cache invalidation and UI behavior untouched while isolating the transaction body.

## Smells Deferred

- `transfer-inventory-quantity.ts` is intentionally still a broad transaction helper at 596 lines. It is clearer than the previous facade, but future sprints can split serialized transfer handling, non-serialized transfer handling, layer delta recording, movement creation, lineage updates, and activity logging into smaller helpers.
- `stock-counts.ts` remains the largest inventory write module and still needs boundary review.
- Live database fixtures for transfers remain deferred; this sprint preserves source behavior and contracts but does not execute real transfer rows.
- `src/lib/query-keys.ts` remains a large shared architecture pressure point outside this sprint.

## Verification

- `npm run test:vitest -- tests/unit/inventory/transfer-tenant-scope-contract.test.ts tests/unit/inventory/use-transfer-inventory.test.tsx tests/unit/inventory/stock-transfer-reason-contract.test.ts tests/unit/inventory/stock-mutation-cache-contract.test.ts tests/unit/inventory/query-normalization-wave3-movements.test.tsx tests/unit/inventory/stock-in-workflow-trace.test.ts` passed: 6 files, 30 tests.
- `./node_modules/.bin/eslint src/server/functions/inventory/transfers.ts src/server/functions/inventory/transfer-inventory-quantity.ts tests/unit/inventory/transfer-tenant-scope-contract.test.ts --report-unused-disable-directives` passed.
- `git diff --check` passed.
- `npm run lint:reliability` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run test:unit` passed: 765 files, 2,536 tests.

## Skipped

- Production build was skipped because this was a server-only transaction extraction covered by focused contracts, focused lint, typecheck, full lint, reliability lint, and the full unit suite.
- Browser QA was skipped because no UI rendering or interaction changed.
- Live database transfer checks were skipped because no SQL semantics or write policy changed beyond extraction.

## Goal Adaptation

None. This follows the active goal's domain-sliced cleanup model and keeps architecture cleanliness as the dominant lens.

## Residual Risk

Low for behavior because the public server function, permission, schema, hook contract, cache contract, response envelope, tenant predicates, transaction shape, finance metadata, movement records, and serialized lineage references are preserved. Medium architecture risk remains because the extracted transfer helper is still broad, and stock-count write paths now carry the largest remaining inventory transaction-boundary debt.
