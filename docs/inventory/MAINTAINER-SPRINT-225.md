# Inventory Maintainer Sprint 225: Product Weighted Cost Boundary

Status: closed and commit-ready.

## Problem

After Sprint 224, `valuation.ts` still owned the weighted-average product cost update inline with valuation reads, cost-layer endpoints, COGS preview, finance reconciliation, aging, turnover, and manual cost-layer creation.

That update is a finance-sensitive product signal: it validates an active tenant-owned product, aggregates active tenant-owned cost layers, and writes `products.cost_price`. It should be small enough to review independently from valuation report orchestration.

## Workflow Spine Protected

Product weighted cost refresh
-> `updateProductWeightedAverageCost` server function
-> `updateWeightedAverageProductCost` helper
-> active tenant-owned product preflight
-> tenant-owned active cost-layer aggregation
-> tenant-owned product `costPrice` write
-> unchanged response shape for callers.

## Touched Domains

- Inventory valuation server functions.
- Product weighted-average cost update helper.
- Inventory valuation tenant-scope/source contract tests.
- Product inventory tab and inventory valuation regression coverage.
- Sprint evidence.

## Business Value Protected

RENOZ Energy depends on SKU cost price as a finance and purchasing signal. This slice keeps product cost refreshes tied to active tenant-owned inventory cost layers and tenant-owned products while making the write policy easier to audit before future receiving or finance work.

## Changes

- Added `src/server/functions/inventory/product-weighted-average-cost.ts`.
- Moved active-product validation, active cost-layer aggregation, weighted-average calculation, and product `costPrice` update out of `valuation.ts`.
- Kept `updateProductWeightedAverageCost` as the public server function, permission boundary, and input schema boundary.
- Updated source contracts to prove the valuation server function delegates and the helper owns the tenant predicates, active-product guard, no-layer response, and update response.

## Standards Checked

- Domain ownership: weighted product cost refresh now has a named inventory/product-cost helper.
- Route -> container/page -> hook -> server -> schema/database -> query/cache policy: unchanged. No route, hook, query key, or cache invalidation behavior changed.
- Tenant isolation: preserved active product preflight with `products.organizationId = organizationId`, active product constraint, cost-layer organization predicate, inventory organization predicate, and product update organization predicate.
- Transactional inventory and finance integrity: unchanged. This existing helper is not transaction-wrapped here; it still reads active cost layers then updates the product cost signal exactly as before.
- Serialized lineage continuity: unchanged. No serialized item, shipment, RMA, or lineage behavior changed.
- Honest UI states and operator-safe errors: preserved `Product not found` failure behavior and existing hook/UI contracts.
- Mutation/cache contracts: unchanged.
- Tests: source contracts now guard the extracted helper boundary and existing focused product/inventory tests still pass.

## Smells Removed

- `valuation.ts` no longer owns weighted-average product cost recalculation inline.
- Removed 71 lines of product cost write detail from the broad valuation server-function module.
- Made the product cost write policy inspectable as one helper instead of mixed into valuation orchestration.

## Smells Deferred

- `valuation.ts` still owns manual cost-layer creation and value recomputation.
- `src/lib/query-keys.ts` remains a large shared architecture pressure point.
- Database-backed product cost refresh fixtures remain deferred; this sprint preserves source behavior and contracts but does not execute real cost-layer rows.

## Verification

- `npm run test:vitest -- tests/unit/inventory/valuation-tenant-scope-contract.test.ts tests/unit/inventory/valuation-permission-contract.test.ts tests/unit/inventory/query-normalization-wave3-analytics.test.tsx tests/unit/inventory/query-normalization-wave7b.test.tsx tests/unit/products/product-inventory-tab-container.test.tsx` passed: 5 files, 30 tests.
- `./node_modules/.bin/eslint src/server/functions/inventory/valuation.ts src/server/functions/inventory/product-weighted-average-cost.ts tests/unit/inventory/valuation-tenant-scope-contract.test.ts --report-unused-disable-directives` passed.
- `git diff --check` passed.
- `npm run lint:reliability` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run test:unit` passed: 765 files, 2,536 tests.

## Skipped

- Production build was skipped because this was a server-side extraction covered by focused tests, typecheck, full lint, reliability gates, and full unit tests.
- Browser QA was skipped because no UI rendering or interaction changed.
- Live database product-cost checks were skipped because no SQL semantics or write policy changed.

## Goal Adaptation

None. This follows the active goal's domain-sliced cleanup model and keeps architecture cleanliness as the dominant lens.

## Residual Risk

Low for behavior because the public server function, permission, schema, response shape, tenant predicates, and test suite are preserved. Medium residual architecture risk remains in `valuation.ts` until manual cost-layer creation is split into its own transactional boundary.
