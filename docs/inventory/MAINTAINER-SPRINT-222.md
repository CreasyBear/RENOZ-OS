# Inventory Maintainer Sprint 222: Valuation Read Boundary

Status: closed and commit-ready.

## Problem

After Sprint 221, `valuation.ts` still owned the headline inventory valuation report: total value, total units, category breakdowns, warehouse-location breakdowns, product breakdowns, cost-layer counts, and finance-integrity summary attachment. That read model was still mixed with cost-layer writes, COGS preview, finance reconciliation, aging, turnover, and product cost updates.

The valuation report is a finance and warehouse visibility surface. It should be local enough to review its stock semantics and tenant predicates without scanning unrelated write paths.

## Workflow Spine Protected

```text
inventory valuation hook/query key
  -> getInventoryValuation server function
  -> readInventoryValuation helper
  -> inventory / products / categories / warehouse_locations / inventory_cost_layers SQL
  -> physical on-hand valuation report with finance integrity summary
```

## Touched Domains

- Inventory valuation server functions.
- Inventory valuation read model.
- Inventory tenant-scope and WMS stock-semantics contract tests.
- Inventory query-normalization regression coverage.
- Maintainer sprint evidence.

## Business Value Protected

The valuation report lets RENOZ Energy see physical on-hand stock value by category, warehouse location, and product. It supports purchasing, warehouse control, sales decisions, stock-health review, and finance closeout. Extracting the read model makes those semantics easier to protect without touching inventory writes or finance repair behavior.

## Changes

- Added `src/server/functions/inventory/inventory-valuation-read.ts`.
- Moved valuation totals, category breakdowns, location breakdowns, product breakdowns, active cost-layer counting, descriptor joins, and finance-integrity summary attachment out of `valuation.ts`.
- Kept `getInventoryValuation` as the authenticated server-function boundary and delegated to the helper.
- Updated the valuation tenant-scope contract test so product/category/location tenant predicates are checked in the moved helper.
- Updated the WMS stock semantics contract so valuation physical-on-hand assertions follow the moved helper.
- Reduced `valuation.ts` from 715 lines to 545 lines.

## Standards Checked

- Domain ownership: headline valuation reporting now has a named read module with local SQL and response shaping.
- Route/page/hook/cache flow: unchanged; public server-function export, query key, hook, and UI surfaces remain stable.
- Query/cache contract: unchanged public response shape and cache policy.
- Tenant isolation: preserved organization scope on inventory rows, product descriptors, category joins, warehouse locations, and cost-layer counts.
- Transactional inventory/finance integrity: no writes touched; finance-integrity summary remains included in the valuation response.
- Serialized lineage continuity: no serial, movement, RMA, warranty, order, or stock mutation behavior touched.
- Honest UI states: unchanged; query-normalization coverage still protects shaped inventory read behavior.
- Operator-safe errors: unchanged; no new operator-facing error path introduced.
- Reviewable diff: one read helper extraction plus source-boundary test updates.

## Smells Removed

- Removed headline valuation SQL and response shaping from the mixed valuation server module.
- Removed valuation descriptor join helper from `valuation.ts`.
- Kept physical-on-hand valuation semantics explicitly tested after the read moved.
- Made the tenant-scope test follow the module that now owns valuation report SQL.

## Smells Deferred

- `valuation.ts` still owns manual cost-layer writes, finance reconciliation, COGS preview, and weighted-average product cost writes.
- `calculateCOGS` still carries simulate-only FIFO preview policy inline and should be split with COGS-specific contract coverage.
- `reconcileInventoryFinanceIntegrity` remains write-heavy and should be handled as a separate finance/inventory integrity slice.
- `updateProductWeightedAverageCost` duplicates active product cost-layer aggregation and needs a write-safe product-cost policy slice.
- `src/lib/query-keys.ts` remains large; domain-segmented query key ownership remains a separate architecture slice.
- Production bundle-size warnings remain a frontend/performance slice.

## Verification

- `git diff --check`
- `npm run test:vitest -- tests/unit/inventory/valuation-tenant-scope-contract.test.ts tests/unit/inventory/wms-stock-semantics-contract.test.ts tests/unit/inventory/query-normalization-wave3-analytics.test.tsx tests/unit/inventory/query-normalization-wave7b.test.tsx`
- `./node_modules/.bin/eslint src/server/functions/inventory/valuation.ts src/server/functions/inventory/inventory-valuation-read.ts tests/unit/inventory/valuation-tenant-scope-contract.test.ts tests/unit/inventory/wms-stock-semantics-contract.test.ts --report-unused-disable-directives`
- `npm run lint:reliability`
- `npm run typecheck`
- `npm run lint`
- `npm run test:unit` (765 files, 2535 tests)

## Skipped

- Production build: skipped because this is a server read-model extraction with unchanged route, hook, cache, schema, and public server-function contracts. Typecheck, full lint, reliability guards, focused tests, and the full unit suite passed.
- Manual browser QA: skipped because no UI, route, hook, or cache behavior changed.
- Finance integrity database gate: skipped because no writes, migrations, finance postings, or SQL invariant scripts changed.

## Goal Adaptation

No goal adaptation made. This sprint continues the inventory/warehouse architecture-cleanliness track by extracting the physical-on-hand valuation read model from a mixed server module.

## Residual Risk

Behavioral risk is low because the public server-function interface is unchanged and focused plus full unit regression coverage passed. Structural risk remains medium in `valuation.ts` until COGS preview, finance reconciliation, manual cost-layer writes, and weighted-average product cost writes are split into clearer modules.
