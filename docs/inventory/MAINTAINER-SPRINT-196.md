# Inventory Maintainer Sprint 196: Cost Layers Tab Boundary

Status: closed and commit-ready.

## Problem

`inventory-detail-view.tsx` still carried the cost layers tab inline with header, overview, movement history, quality, activity, sidebar, and meta-panel logic.

The cost layers tab is the operator-visible valuation trace for a serialized battery item. It shows layer sequence, received dates, expiry, remaining quantity, unit cost, total cost, landed cost components, and aggregate remaining value. Keeping that valuation evidence surface inside the broader presenter made the finance-sensitive inventory detail workflow harder to test directly and kept the presenter too monolithic.

## Workflow Spine Protected

```text
inventory detail route
  -> InventoryDetailContainer
  -> InventoryDetailView cost-layers tab
  -> CostLayersTabContent
  -> cost layer records from inventory detail read model
  -> operator-visible valuation trace with FIFO layer sequence, landed cost components, quantities, and totals
```

## Touched Domains

- Inventory detail presentation.
- Inventory cost layer and valuation display UI.
- Inventory detail/view tests.
- Inventory sprint evidence.

## Business Value Protected

Cost layers help RENOZ operators understand stock value, landed cost allocation, expiry exposure, and remaining value for battery inventory. This supports inventory valuation, stock correction review, purchase/receiving analysis, and finance-facing audit conversations without changing the write path.

## Changes

- Added `src/components/domain/inventory/views/inventory-cost-layers-tab-content.tsx`.
- Removed the inline `CostLayersTabContent` implementation from `src/components/domain/inventory/views/inventory-detail-view.tsx`.
- Imported the focused cost layers tab component back into the inventory detail presenter without changing props or behavior.
- Added component coverage for empty state, loading skeletons, layer sequence, received/expiry dates, quantities, mocked currency values, landed cost components, aggregate totals, and source-boundary ownership.

## Standards Checked

- Domain ownership: the cost layer valuation tab now has a focused inventory detail component.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: unchanged; this is a presenter extraction using the existing inventory detail read model.
- Tenant isolation: unchanged; no server reads or tenant predicates changed.
- Transactional integrity: unchanged; no inventory, valuation, landed cost, purchase order, receiving, or finance writes changed.
- Serialized lineage: display-only slice; no serial identity, movement persistence, RMA continuity, warranty continuity, or receipt lineage logic changed.
- Query/cache contract: unchanged.
- Operator-safe states: preserved loading skeletons, honest empty state, layer sequencing, landed cost component rows, expiry visibility, and aggregate total display.
- Reviewable diff: limited to component extraction, focused tests, and this closeout note.

## Smells Removed

- Removed a finance-sensitive cost layer tab from the inventory detail presenter.
- Reduced `inventory-detail-view.tsx` from 1,031 lines to 901 lines.
- Added direct tests for the valuation display behavior instead of relying only on broad detail-view rendering.
- Added a source-boundary test so the cost layers tab does not silently drift back into the presenter.

## Smells Deferred

- `inventory-detail-view.tsx` still owns header, costing breakdown, quality tab, activity tab, right meta panel, and sidebar composition.
- Quality tab content remains inline and is the next obvious inventory detail extraction candidate.
- `src/components/domain/inventory/unified-inventory-dashboard.tsx`, `src/server/functions/inventory/valuation.ts`, and `src/lib/query-keys.ts` remain larger architecture pressure points.
- Production build was not rerun for this sprint because this was a presenter extraction covered by typecheck, lint, reliability guards, focused tests, and the full unit suite.

## Verification

- `git diff --check` passed.
- `./node_modules/.bin/eslint src/components/domain/inventory/views/inventory-detail-view.tsx src/components/domain/inventory/views/inventory-cost-layers-tab-content.tsx tests/unit/inventory/inventory-cost-layers-tab-content.test.tsx --report-unused-disable-directives` passed.
- `npm run test:vitest -- tests/unit/inventory/inventory-cost-layers-tab-content.test.tsx tests/unit/inventory/inventory-movements-tab-content.test.tsx tests/unit/inventory/valuation-schema-ownership.test.ts` passed, 3 files / 11 tests.
- `npm run lint:reliability` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run test:unit` passed, 747 files / 2463 tests.

## Goal Adaptation

No standing goal change. This sprint continues the product-owner goal by making a finance-sensitive inventory valuation evidence surface explicit, testable, and easier to reason about.

## Residual Risk

Low risk for this slice because no data fetching, server behavior, mutation behavior, tenant scope, cache policy, transaction logic, or valuation calculation changed. Medium residual architecture risk remains in the broader inventory detail presenter and in larger inventory/dashboard/query-key surfaces.
