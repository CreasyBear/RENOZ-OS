# Inventory Maintainer Sprint 219: Aging Read Boundary

Status: closed and commit-ready.

## Problem

After the finance integrity and turnover extractions, `valuation.ts` still owned the inventory aging SQL read, bucket aggregation, product/location grouping, and recommendation text. That kept unrelated valuation responsibilities in one file and made aging stock health harder to review independently.

## Workflow Spine Protected

```text
inventory aging hook/query key
  -> getInventoryAging server function
  -> readInventoryAging helper
  -> inventory_cost_layers / inventory / products / warehouse_locations SQL
  -> aging report shaped states
```

## Touched Domains

- Inventory valuation server functions.
- Inventory aging read model.
- Inventory tenant-scope contract tests.
- Inventory query-normalization and WMS stock semantics regression coverage.
- Maintainer sprint evidence.

## Business Value Protected

The aging report supports slow-moving battery stock review, working-capital visibility, warehouse health, and purchasing discipline. Keeping the read boundary isolated makes future aging, valuation, and stock-health changes easier to reason about without risking COGS, reconciliation, or cost-layer behavior.

## Changes

- Added `readInventoryAging` in `src/server/functions/inventory/inventory-aging-read.ts`.
- Moved aging SQL, bucket shaping, product/location aggregation, summary shaping, and recommendation generation out of `valuation.ts`.
- Kept `getInventoryAging` as the authenticated server-function boundary and delegated the read model to the helper.
- Updated the valuation tenant-scope contract test so it follows the moved tenant-bounded joins.
- Reduced `valuation.ts` to 899 lines.

## Standards Checked

- Domain ownership: aging stock health now has a named inventory read boundary instead of living inline in the valuation module.
- Route/page/hook/cache flow: unchanged; this sprint only moved server read-model internals.
- Query/cache contract: unchanged exports and query semantics.
- Tenant isolation: preserved organization scope on cost layers, inventory joins, product joins, and warehouse location joins.
- Transactional inventory/finance integrity: no writes touched.
- Serialized lineage continuity: no serialized identity, movement, or stock mutation behavior touched.
- Honest UI states: unchanged; existing query-normalization coverage still protects shaped failures and stale/degraded states.
- Operator-safe errors: unchanged; no new raw operator-facing errors introduced.
- Reviewable diff: one helper extraction plus one source-boundary test update.

## Smells Removed

- Removed aging SQL and aggregation from the mixed-responsibility valuation server function.
- Removed aging recommendation formatting from `valuation.ts`.
- Stopped mutating the input `ageBuckets` array by sorting a copy inside the read helper.
- Made aging tenant-scope checks inspect the aging read helper directly.

## Smells Deferred

- `valuation.ts` still owns cost layer reads, valuation headline reads, reconciliation, COGS preview, product cost layers, and weighted-average writes. Next useful slices are product cost-layer read extraction or valuation headline read extraction.
- `src/lib/query-keys.ts` remains large and should eventually be segmented by domain-owned key factories while preserving centralized public contracts.
- Production build still warns about large chunks; code-splitting is a separate frontend/performance slice.

## Verification

- `git diff --check`
- `npm run test:vitest -- tests/unit/inventory/valuation-tenant-scope-contract.test.ts tests/unit/inventory/query-normalization-wave3-analytics.test.tsx tests/unit/inventory/query-normalization-wave7b.test.tsx tests/unit/inventory/wms-stock-semantics-contract.test.ts`
- `./node_modules/.bin/eslint src/server/functions/inventory/valuation.ts src/server/functions/inventory/inventory-aging-read.ts tests/unit/inventory/valuation-tenant-scope-contract.test.ts --report-unused-disable-directives`
- `npm run lint:reliability`
- `npm run typecheck`
- `npm run lint`
- `npm run test:unit`
- `npm run build`

Build passed with the existing large-chunk warning and native `bcrypt` OS/architecture deployment note.

## Skipped

- Manual browser QA: skipped because this was a server read-model extraction with unchanged route, hook, UI, and cache surfaces.
- Finance integrity database gate: skipped because no inventory writes, finance writes, migrations, or SQL invariant scripts changed.
- Document/release gates: skipped because no document generation or release packaging behavior changed.

## Goal Adaptation

No goal adaptation made. This sprint follows the existing product-owner goal by reducing inventory monolith pressure through a bounded, business-relevant read boundary.

## Residual Risk

Behavioral risk is low because the server function remains the same public boundary and focused/full gates passed. Structural risk remains medium in inventory valuation because several valuation and finance responsibilities still live together in `valuation.ts`.
