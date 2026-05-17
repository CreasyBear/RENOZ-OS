# Inventory Maintainer Sprint 228: Adjustment Transaction Boundary

Status: closed and commit-ready.

## Problem

After Sprint 227, `adjustments.ts` still owned the full operator stock-correction transaction inline. That left the public server-function facade responsible for tenant RLS context, product availability checks, row locking, serialized adjustment guards, negative-stock policy, FIFO layer consumption, adjustment layer creation, value recompute, serialized lineage updates, movement creation, activity logging, and finance mutation envelope construction.

Inventory adjustments are high-consequence because they correct warehouse truth directly. A bad adjustment can distort on-hand stock, inventory valuation, cost layers, serialized item state, and operator audit history. The write policy should sit behind a named helper while the public server function stays focused on auth, schema, and delegation.

## Workflow Spine Protected

Inventory quantity adjustment
-> `useAdjustInventory`
-> `adjustInventory` server function
-> inventory adjust permission
-> `stockAdjustmentSchema`
-> `adjustInventoryQuantity` helper
-> tenant RLS context set in transaction
-> active tenant product lock
-> target inventory row lock
-> ambiguous product/location adjustment guard
-> existing inventory row guard
-> serialized adjustment guards
-> negative-stock location policy
-> tenant inventory update
-> FIFO consume or adjustment layer create
-> inventory value recompute
-> serialized cost integrity check
-> movement creation
-> serialized lineage update/event when applicable
-> activity logging
-> unchanged inventory finance mutation success envelope.

## Touched Domains

- Inventory adjustment server function.
- Inventory adjustment transaction helper.
- Inventory stock mutation source contracts.
- Inventory movement, hook, and workflow regression coverage.
- Sprint evidence.

## Business Value Protected

RENOZ Energy depends on stock corrections when warehouse operators reconcile damaged units, found stock, cycle count deltas, serial mistakes, and receiving exceptions. This slice keeps those corrections tenant-scoped, finance-aware, serialized-lineage-aware, and easier to audit before future transfer and stock-count cleanup.

## Changes

- Added `src/server/functions/inventory/adjust-inventory-quantity.ts`.
- Moved the adjustment transaction out of `adjustments.ts`.
- Kept `adjustInventory` as the public server function, permission boundary, schema boundary, and response boundary.
- Kept the hook, route, query keys, cache invalidation, and caller contract unchanged.
- Updated source contracts so tenant scoping, product lock, ambiguous row guard, existing row guard, inventory write scope, serialized write scope, finance references, and lineage references are asserted against the helper that now owns them.

## Standards Checked

- Domain ownership: inventory adjustment now has a named transaction helper.
- Route -> container/page -> hook -> server -> schema/database -> query/cache policy: unchanged. The route and hook still call the same public server function and cache behavior is unchanged.
- Tenant isolation: preserved tenant RLS context, product ownership predicate, location ownership predicate, inventory row ownership predicate, serialized item ownership predicate, and activity organization context.
- Transactional inventory and finance integrity: preserved one transaction around product lock, inventory write, FIFO layer consume or adjustment layer creation, value recompute, serialized integrity check, movement write, lineage write, activity logging, and finance envelope construction.
- Serialized lineage continuity: preserved serialized unit bounds, canonical serial normalization, upsert-on-positive adjustment, scrap-on-zero adjustment, and serialized item event creation.
- Honest UI states and operator-safe errors: preserved product-not-found, ambiguous adjustment source, adjustment requires existing inventory, unavailable product, serialized quantity, negative inventory, and insufficient cost-layer behavior.
- Mutation/cache contracts: unchanged.
- Tests: source contracts now guard the extracted helper boundary and existing hook/query/workflow tests still pass.

## Smells Removed

- `adjustments.ts` no longer mixes auth/schema facade concerns with the full stock-correction transaction.
- Reduced `adjustments.ts` from 390+ lines of mixed facade and transaction logic to a 28-line facade.
- Made the adjustment write policy inspectable in one helper.
- Kept the same finance mutation envelope while separating the public server function from the transaction body.

## Smells Deferred

- `adjust-inventory-quantity.ts` is intentionally still a broad transaction helper at 379 lines. It is clearer than the previous facade, but future sprints can split product/inventory preflight, serialized adjustment policy, layer mutation, movement construction, lineage updates, and activity logging into smaller helpers.
- Transfer and stock-count write modules still need the same boundary review.
- Live database fixtures for adjustments remain deferred; this sprint preserves source behavior and contracts but does not execute real adjustment rows.
- `src/lib/query-keys.ts` remains a large shared architecture pressure point outside this sprint.
- Production build still emits a large chunk warning, so bundle/code-splitting work remains outside this inventory transaction slice.

## Verification

- `npm run test:vitest -- tests/unit/inventory/stock-mutation-tenant-scope-contract.test.ts tests/unit/inventory/use-adjust-inventory.test.tsx tests/unit/inventory/query-normalization-wave3-movements.test.tsx tests/unit/inventory/stock-in-workflow-trace.test.ts tests/unit/inventory/stock-action-error-messages.test.ts tests/unit/inventory/movement-schema-ownership.test.ts` passed: 6 files, 38 tests.
- `./node_modules/.bin/eslint src/server/functions/inventory/adjustments.ts src/server/functions/inventory/adjust-inventory-quantity.ts tests/unit/inventory/stock-mutation-tenant-scope-contract.test.ts --report-unused-disable-directives` passed.
- `npm run typecheck` passed.
- `git diff --check` passed.
- `npm run lint:reliability` passed.
- `npm run lint` passed.
- `npm run test:unit` passed: 765 files, 2,536 tests.
- `npm run build` passed.

## Skipped

- Browser QA was skipped because no UI rendering or interaction changed.
- Live database adjustment checks were skipped because no SQL semantics or write policy changed beyond extraction.

## Goal Adaptation

None. This follows the active goal's domain-sliced cleanup model and keeps architecture cleanliness as the dominant lens.

## Residual Risk

Low for behavior because the public server function, permission, schema, hook contract, cache contract, response envelope, tenant predicates, transaction shape, finance metadata, and serialized lineage references are preserved. Medium architecture risk remains because the extracted adjustment helper is still broad, and transfer plus stock-count write paths still need the same audit and extraction discipline.
