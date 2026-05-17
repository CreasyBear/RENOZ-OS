# Inventory Maintainer Sprint 226: Manual Cost Layer Create Boundary

Status: closed and commit-ready.

## Problem

After Sprint 225, `valuation.ts` still owned manual cost-layer creation inline. That kept a transactional inventory finance write path mixed into the valuation facade alongside read endpoints, COGS preview delegation, weighted product cost refresh, finance integrity reads, and reconciliation wiring.

Manual cost-layer creation is small but consequence-bearing: it validates tenant-owned inventory, locks the row, inserts a tenant-owned cost layer, recomputes inventory value, and returns the existing `{ layer }` response. It deserves a named boundary that can be reviewed independently from valuation endpoint wiring.

## Workflow Spine Protected

Manual cost layer creation
-> `createCostLayer` server function
-> `createManualInventoryCostLayer` helper
-> inventory manage permission
-> validated cost-layer input
-> tenant RLS context set in transaction
-> tenant-owned inventory row lock
-> tenant-owned cost-layer insert
-> inventory value recompute
-> unchanged `{ layer }` response shape.

## Touched Domains

- Inventory valuation server-function facade.
- Manual inventory cost-layer write helper.
- Inventory valuation tenant-scope/source contract tests.
- Inventory valuation/query normalization regression coverage.
- Sprint evidence.

## Business Value Protected

RENOZ Energy relies on inventory value and cost layers for purchasing, warehouse, finance, and support decisions. This slice keeps manual cost adjustments tenant-scoped and value-cache coherent while making the write policy easier to inspect before deeper receiving, stock-count, or finance work.

## Changes

- Added `src/server/functions/inventory/inventory-cost-layer-create.ts`.
- Moved manual cost-layer transaction, RLS organization context, inventory row lock, NotFound behavior, cost-layer insert, and inventory value recompute out of `valuation.ts`.
- Kept `createCostLayer` as the public server function, permission boundary, schema boundary, and response boundary.
- Updated source contracts to prove the valuation facade delegates and the helper owns tenant scoping, transaction use, inventory row lock, and value recompute.

## Standards Checked

- Domain ownership: manual inventory cost-layer creation now has a named helper.
- Route -> container/page -> hook -> server -> schema/database -> query/cache policy: unchanged. No route, hook, query key, or cache invalidation behavior changed.
- Tenant isolation: preserved `set_config('app.organization_id', organizationId, false)`, tenant-owned inventory lookup, tenant-owned cost-layer insert, and tenant-aware inventory value recompute.
- Transactional inventory and finance integrity: preserved one transaction around row lock, insert, and value recompute.
- Serialized lineage continuity: unchanged. No serialized item, shipment, RMA, or lineage behavior changed.
- Honest UI states and operator-safe errors: preserved existing NotFound behavior and mutation fallback contracts.
- Mutation/cache contracts: unchanged.
- Tests: source contracts now guard the extracted create boundary and existing inventory valuation/query tests still pass.

## Smells Removed

- `valuation.ts` no longer owns manual cost-layer creation internals.
- Removed another transaction/write concern from the broad valuation server-function module.
- Reduced `valuation.ts` to 219 lines and made it read as a facade over named inventory helpers.

## Smells Deferred

- Other inventory finance write paths remain in their current modules, including receiving, adjustments, transfers, and stock counts.
- Database-backed manual cost-layer creation fixtures remain deferred; this sprint preserves source behavior and contracts but does not execute real cost-layer rows.
- `src/lib/query-keys.ts` remains a large shared architecture pressure point outside this sprint.

## Verification

- `npm run test:vitest -- tests/unit/inventory/valuation-tenant-scope-contract.test.ts tests/unit/inventory/valuation-permission-contract.test.ts tests/unit/inventory/query-normalization-wave3-analytics.test.tsx tests/unit/inventory/inventory-finance-helper-tenant-scope-contract.test.ts` passed: 4 files, 21 tests.
- `./node_modules/.bin/eslint src/server/functions/inventory/valuation.ts src/server/functions/inventory/inventory-cost-layer-create.ts tests/unit/inventory/valuation-tenant-scope-contract.test.ts --report-unused-disable-directives` passed.
- `npm run typecheck` passed.
- `git diff --check` passed.
- `npm run lint:reliability` passed.
- `npm run lint` passed.
- `npm run test:unit` passed: 765 files, 2,536 tests.

## Skipped

- Production build was skipped because this was a server-side extraction covered by focused tests, typecheck, full lint, reliability gates, and full unit tests.
- Browser QA was skipped because no UI rendering or interaction changed.
- Live database manual cost-layer checks were skipped because no SQL semantics or write policy changed.

## Goal Adaptation

None. This follows the active goal's domain-sliced cleanup model and keeps architecture cleanliness as the dominant lens.

## Residual Risk

Low for behavior because the public server function, permission, schema, response shape, tenant predicates, transaction, row lock, and test suite are preserved. Medium architecture risk remains across the broader inventory write surface until receiving, adjustments, transfers, and stock-count write helpers are audited with the same boundary discipline.
