# Inventory Maintainer Sprint 220: Product Cost Layer Read Boundary

Status: closed and commit-ready.

## Problem

After Sprint 219, `valuation.ts` still owned the product detail FIFO cost-layer read for `getProductCostLayers`. That mixed a product inventory evidence surface with valuation reports, COGS preview, finance reconciliation, manual cost-layer writes, and weighted-average cost writes.

The product cost-layer read is important evidence for operators reviewing a battery SKU's stock value: active layers, consumed layers, remaining quantity, weighted average cost, and last purchase cost. It should have a small server-function interface and a focused read-model implementation.

## Workflow Spine Protected

```text
product inventory tab
  -> useProductCostLayers
  -> getProductCostLayers server function
  -> readProductCostLayers helper
  -> inventory_cost_layers / inventory SQL
  -> product-level FIFO cost-layer summary
```

## Touched Domains

- Inventory valuation server functions.
- Product inventory cost-layer read model.
- Inventory tenant-scope contract tests.
- Product inventory tab regression coverage.
- Maintainer sprint evidence.

## Business Value Protected

Product-level FIFO cost layers let RENOZ Energy inspect SKU valuation, slow stock, purchase cost history, and remaining cost basis before procurement, sales, support, warranty, or finance decisions. Moving the read model behind a named helper makes this evidence surface easier to maintain without touching cost writes or reconciliation.

## Changes

- Added `readProductCostLayers` in `src/server/functions/inventory/product-cost-layers-read.ts`.
- Moved product cost-layer SQL, unit-cost conversion, active-layer summary, weighted average cost, and last purchase cost shaping out of `valuation.ts`.
- Kept `getProductCostLayers` as the authenticated server-function boundary and delegated to the helper.
- Updated the valuation tenant-scope contract test to inspect the product cost-layer read helper directly.
- Reduced `valuation.ts` from 899 lines to 850 lines.

## Standards Checked

- Domain ownership: product FIFO cost-layer evidence now has a named inventory read boundary.
- Route/page/hook/cache flow: unchanged; product tab hook, query key, and server-function export remain stable.
- Query/cache contract: unchanged public server function and unchanged product cost-layer cache consumer.
- Tenant isolation: preserved organization scope on cost layers and inventory joins.
- Transactional inventory/finance integrity: no writes touched; weighted-average cost write remains in `valuation.ts` and still checks active tenant-owned products before update.
- Serialized lineage continuity: no serial, movement, RMA, warranty, or stock mutation behavior touched.
- Honest UI states: unchanged; product inventory tab and query-normalization tests still protect shaped read behavior.
- Operator-safe errors: unchanged; no new operator-facing error text introduced.
- Reviewable diff: one read helper extraction plus one source-boundary test update.

## Smells Removed

- Removed product-level FIFO cost-layer SQL and summary shaping from the mixed valuation module.
- Made the product cost-layer tenant-scope test follow the helper that now owns the read.
- Kept product cost-layer read behavior separate from weighted-average product cost writes.

## Smells Deferred

- `valuation.ts` still owns generic cost-layer reads, valuation headline reads, finance reconciliation, COGS preview, manual cost-layer writes, and weighted-average writes.
- `updateProductWeightedAverageCost` duplicates active product cost-layer aggregation logic and should be considered with a write-safe finance/cache slice, not folded into this read-only extraction.
- `src/lib/query-keys.ts` remains large; domain-segmented query key ownership is still a separate architecture slice.
- Production bundle-size warnings remain a frontend/performance slice.

## Verification

- `git diff --check`
- `npm run test:vitest -- tests/unit/inventory/valuation-tenant-scope-contract.test.ts tests/unit/products/product-inventory-tab-container.test.tsx tests/unit/inventory/query-normalization-wave3-analytics.test.tsx tests/unit/inventory/query-normalization-wave7b.test.tsx`
- `./node_modules/.bin/eslint src/server/functions/inventory/valuation.ts src/server/functions/inventory/product-cost-layers-read.ts tests/unit/inventory/valuation-tenant-scope-contract.test.ts --report-unused-disable-directives`
- `npm run lint:reliability`
- `npm run typecheck`
- `npm run lint`

## Skipped

- Full unit suite: skipped for this slice because focused inventory/product read coverage, typecheck, full lint, and reliability guards covered the changed behavior. The full unit suite passed immediately before Sprint 219 closeout and this slice does not alter public route, hook, cache, schema, or mutation contracts.
- Production build: skipped because this is a server read-model extraction with unchanged exports and a clean typecheck/full lint pass. The build passed immediately before this sprint with existing large-chunk and native `bcrypt` warnings.
- Manual browser QA: skipped because no UI, route, hook, or cache behavior changed.
- Finance integrity database gate: skipped because no writes, finance posting, migrations, or SQL invariant scripts changed.

## Goal Adaptation

No goal adaptation made. This sprint continues the inventory/warehouse architecture-cleanliness track by extracting another business-relevant read model from a mixed module.

## Residual Risk

Behavioral risk is low because the public server function and product inventory tab contract are unchanged, and focused product/inventory tests passed. Structural risk remains medium in `valuation.ts` until valuation headline reads, cost-layer reads, reconciliation, COGS preview, and weighted-average writes are split into clearer modules.
