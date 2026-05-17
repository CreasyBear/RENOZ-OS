# Inventory Maintainer Sprint 221: Inventory Cost Layer Read Boundary

Status: closed and commit-ready.

## Problem

After Sprint 220, `valuation.ts` still owned the generic cost-layer read pair for `listCostLayers` and `getInventoryCostLayers`, plus the capitalization attachment and inventory-row summary shaping behind those reads. That kept inventory-item valuation evidence in the same module as valuation reports, COGS preview, reconciliation, manual cost-layer writes, product cost-layer reads, and weighted-average writes.

Inventory-item cost layers are finance-sensitive stock evidence. They show FIFO layer quantity, remaining value, references, expiry, and landed cost components. The read model should be local to that evidence surface while the server functions preserve auth and public compatibility.

## Workflow Spine Protected

```text
inventory cost-layer hooks/query keys
  -> listCostLayers / getInventoryCostLayers server functions
  -> listInventoryCostLayers / readInventoryCostLayers helpers
  -> inventory_cost_layers / inventory_cost_layer_capitalizations / inventory SQL
  -> inventory-item FIFO cost-layer rows and summary
```

## Touched Domains

- Inventory valuation server functions.
- Inventory cost-layer read model.
- Inventory tenant-scope contract tests.
- Inventory cost-layer tab and query-normalization regression coverage.
- Maintainer sprint evidence.

## Business Value Protected

Inventory-item FIFO cost layers are the operator-visible valuation trail for warehouse stock. Keeping this read model focused helps RENOZ Energy review stock value, landed-cost components, remaining quantity, and expiry/reference evidence without coupling that view to COGS preview, reconciliation, or manual write behavior.

## Changes

- Added `src/server/functions/inventory/inventory-cost-layers-read.ts`.
- Moved cost-layer row shaping, landed-cost capitalization attachment, paged list reads, inventory-item reads, and inventory-item summaries out of `valuation.ts`.
- Kept `listCostLayers` and `getInventoryCostLayers` as authenticated server-function boundaries.
- Updated the valuation tenant-scope contract test to inspect the moved read helper for organization-scoped cost layers, capitalization rows, and inventory ownership checks.
- Reduced `valuation.ts` from 850 lines to 715 lines.

## Standards Checked

- Domain ownership: inventory-item cost-layer evidence now has a named read module with local row and summary shaping.
- Route/page/hook/cache flow: unchanged; hook imports, server-function exports, query keys, and cache contracts remain stable.
- Query/cache contract: unchanged public server functions and response shapes.
- Tenant isolation: preserved organization scope on cost layers, cost-layer capitalization rows, and inventory existence checks.
- Transactional inventory/finance integrity: no writes touched; manual cost-layer writes, COGS preview, reconciliation, and weighted-average writes remain unchanged.
- Serialized lineage continuity: no serial, movement, RMA, warranty, or stock mutation behavior touched.
- Honest UI states: unchanged; existing query-normalization and cost-layer tab coverage still protect shaped read behavior.
- Operator-safe errors: preserved `Inventory item not found` behavior behind the inventory-item read.
- Reviewable diff: one read helper extraction plus one source-boundary test update.

## Smells Removed

- Removed cost-layer capitalization attachment and cost-layer row conversion from `valuation.ts`.
- Removed generic cost-layer list and inventory-item read SQL from the mixed valuation module.
- Kept manual cost-layer writes separate from read-only cost-layer evidence.
- Made tenant-scope tests follow the helper that now owns cost-layer read predicates.

## Smells Deferred

- `valuation.ts` still owns valuation headline reads, finance reconciliation, COGS preview, manual cost-layer writes, and weighted-average writes.
- `calculateCOGS` still carries FIFO preview logic inline and should be split only with COGS-specific tests because it contains business policy around simulate-only behavior and insufficient-layer feedback.
- `reconcileInventoryFinanceIntegrity` remains write-heavy and should be handled as a separate finance/inventory integrity slice.
- `src/lib/query-keys.ts` remains large; domain-segmented query key ownership remains a separate architecture slice.
- Production bundle-size warnings remain a frontend/performance slice.

## Verification

- `git diff --check`
- `npm run test:vitest -- tests/unit/inventory/valuation-tenant-scope-contract.test.ts tests/unit/inventory/query-normalization-wave3-analytics.test.tsx tests/unit/inventory/query-normalization-wave7b.test.tsx tests/unit/inventory/inventory-cost-layers-tab-content.test.tsx`
- `./node_modules/.bin/eslint src/server/functions/inventory/valuation.ts src/server/functions/inventory/inventory-cost-layers-read.ts tests/unit/inventory/valuation-tenant-scope-contract.test.ts --report-unused-disable-directives`
- `npm run lint:reliability`
- `npm run typecheck`
- `npm run lint`

## Skipped

- Full unit suite: skipped because focused cost-layer, query-normalization, tenant-scope, typecheck, full lint, and reliability gates cover this read-only extraction. The changed public server functions remain stable delegates.
- Production build: skipped because exports, routes, hooks, cache contracts, and schemas are unchanged, and the broader type/lint gates passed.
- Manual browser QA: skipped because no UI, route, hook, or cache behavior changed.
- Finance integrity database gate: skipped because no writes, migrations, finance postings, or SQL invariant scripts changed.

## Goal Adaptation

No goal adaptation made. This sprint continues the inventory/warehouse architecture-cleanliness track by extracting another finance-sensitive read model from a mixed server module.

## Residual Risk

Behavioral risk is low because the public server-function interfaces are unchanged and focused regression coverage passed. Structural risk remains medium in `valuation.ts` until valuation headline reads, COGS preview, finance reconciliation, manual cost-layer writes, and weighted-average writes are split into clearer modules.
