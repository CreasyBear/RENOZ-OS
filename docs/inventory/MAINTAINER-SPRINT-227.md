# Inventory Maintainer Sprint 227: Manual Receive Transaction Boundary

Status: closed and commit-ready.

## Problem

After Sprint 226, `receiving.ts` still owned the full manual stock-in transaction inline. That made the public server-function facade responsible for product availability checks, serialization validation, tenant RLS context, location validation, inventory row locking, movement creation, cost-layer creation, value recompute, serialized lineage events, activity logging, and finance mutation envelope construction.

Manual receiving is one of the highest-consequence warehouse workflows in RENOZ-V3. It creates stock, cost layers, inventory value, movement audit trail, and serialized lineage. The write policy should be isolated behind a named helper while the route-facing server function stays focused on auth, schema, and delegation.

## Workflow Spine Protected

Manual stock receive
-> `useReceiveInventory`
-> `receiveInventory` server function
-> inventory receive permission
-> `receiveInventorySchema`
-> `receiveManualInventory` helper
-> tenant RLS context set in transaction
-> active inventory-tracked product lock
-> shared manual serialization guard
-> tenant location validation
-> tenant inventory row lock or insert
-> movement creation
-> `manual_receive` cost layer creation
-> inventory value recompute
-> serialized lineage event when applicable
-> activity logging
-> unchanged inventory finance mutation success envelope.

## Touched Domains

- Inventory manual receiving server function.
- Manual receive transaction helper.
- Inventory activity logging helper type.
- Inventory stock mutation, serialization, and cost-layer source contracts.
- Sprint evidence.

## Business Value Protected

RENOZ Energy depends on manual stock-in for non-PO warehouse intake, ad hoc found stock, samples, promos, and exception receipts. This slice keeps those receives tenant-scoped, finance-aware, and serialized-lineage-aware while making the transaction easier to audit before future receiving and adjustment work.

## Changes

- Added `src/server/functions/inventory/manual-receive-inventory.ts`.
- Moved the manual receive transaction out of `receiving.ts`.
- Kept `receiveInventory` as the public server function, permission boundary, schema boundary, and response boundary.
- Kept the hook, route, query keys, cache invalidation, and caller contract unchanged.
- Narrowed `logActivityInTransaction` to accept a minimal inventory activity context instead of requiring the full auth context.
- Updated source contracts so tenant scoping, product lock, serialization guard, cost-layer readback, finance recompute, and lineage references are asserted against the helper that now owns them.

## Standards Checked

- Domain ownership: manual receiving now has a named transaction helper.
- Route -> container/page -> hook -> server -> schema/database -> query/cache policy: unchanged. The route and hook still call the same public server function and cache behavior is unchanged.
- Tenant isolation: preserved tenant RLS context, active product ownership predicate, location ownership predicate, inventory row ownership predicate, cost-layer ownership predicate, and activity organization context.
- Transactional inventory and finance integrity: preserved one transaction around product lock, inventory write, movement write, cost-layer creation, value recompute, serialized lineage, activity logging, and finance envelope construction.
- Serialized lineage continuity: preserved serialized item upsert and `received` event creation for serialized manual receives.
- Honest UI states and operator-safe errors: preserved product-not-found, unavailable-product, serialization, location-not-found, and serialized-unit validation behavior.
- Mutation/cache contracts: unchanged.
- Tests: source contracts now guard the extracted helper boundary and existing hook/query tests still pass.

## Smells Removed

- `receiving.ts` no longer mixes auth/schema facade concerns with the full warehouse stock-in transaction.
- Reduced `receiving.ts` from 317 lines to 28 lines.
- Made the manual receive write policy inspectable in one helper.
- Reduced activity logging coupling by allowing inventory activity writes to pass the minimal context required.

## Smells Deferred

- `manual-receive-inventory.ts` is intentionally still a large transaction helper at 292 lines. It is clearer than the previous facade, but future sprints can split product/location preflight, inventory row upsert, receipt layer construction, and serialized lineage into smaller helpers.
- Adjustment, transfer, and stock-count write modules still need the same boundary review.
- Live database fixtures for manual receive remain deferred; this sprint preserves source behavior and contracts but does not execute real receive rows.
- `src/lib/query-keys.ts` remains a large shared architecture pressure point outside this sprint.

## Verification

- `npm run test:vitest -- tests/unit/inventory/stock-mutation-tenant-scope-contract.test.ts tests/unit/inventory/manual-receive-serialization-contract.test.ts tests/unit/inventory/cost-layer-reference-contract.test.ts tests/unit/inventory/receive-inventory-schema-ownership.test.ts tests/unit/inventory/stock-in-workflow-trace.test.ts tests/unit/inventory/use-receive-inventory.test.tsx tests/unit/inventory/query-normalization-wave3-movements.test.tsx` passed: 7 files, 42 tests.
- `./node_modules/.bin/eslint src/server/functions/inventory/receiving.ts src/server/functions/inventory/manual-receive-inventory.ts src/server/functions/inventory/_activity.ts tests/unit/inventory/stock-mutation-tenant-scope-contract.test.ts tests/unit/inventory/manual-receive-serialization-contract.test.ts tests/unit/inventory/cost-layer-reference-contract.test.ts --report-unused-disable-directives` passed.
- `npm run typecheck` passed.
- `git diff --check` passed.
- `npm run lint:reliability` passed.
- `npm run lint` passed.
- `npm run test:unit` passed: 765 files, 2,536 tests.

## Skipped

- Production build was skipped because this was a server-side extraction covered by focused tests, typecheck, full lint, reliability gates, and full unit tests.
- Browser QA was skipped because no UI rendering or interaction changed.
- Live database manual receive checks were skipped because no SQL semantics or write policy changed.

## Goal Adaptation

None. This follows the active goal's domain-sliced cleanup model and keeps architecture cleanliness as the dominant lens.

## Residual Risk

Low for behavior because the public server function, permission, schema, hook contract, cache contract, response envelope, tenant predicates, transaction shape, finance metadata, and serialized lineage references are preserved. Medium architecture risk remains because the extracted manual receive helper is still broad, and adjustment, transfer, and stock-count write paths still need the same audit and extraction discipline.
