# Inventory Maintainer Sprint 198: Costing Breakdown Boundary

Status: closed and commit-ready.

## Problem

`inventory-detail-view.tsx` still carried the overview costing breakdown inline with header, movement history, cost layers, quality, activity, sidebar, and meta-panel logic.

The costing breakdown is the operator-visible valuation summary for an inventory item. It shows unit cost, weighted average cost, total value, FIFO method, cost-layer count, and oldest layer date. Keeping that finance-sensitive proof surface inside the broader presenter made the valuation display harder to test directly and kept the presenter too monolithic for future inventory work.

## Workflow Spine Protected

```text
inventory detail route
  -> InventoryDetailContainer
  -> InventoryDetailView overview tab
  -> CostingBreakdown
  -> item valuation fields and cost layer records from inventory detail read model
  -> operator-visible unit cost, weighted average, total value, FIFO method, oldest layer
```

## Touched Domains

- Inventory detail presentation.
- Inventory valuation and costing display UI.
- Inventory detail/view tests.
- Inventory sprint evidence.

## Business Value Protected

The costing summary helps operators and finance-adjacent users understand stock value, FIFO layer history, weighted cost, landed-cost review, purchase/receiving impact, and correction review without hunting through raw movement records. Making the display boundary explicit keeps this valuation proof easier to inspect before deeper inventory, receiving, procurement, or finance behavior changes.

## Changes

- Added `src/components/domain/inventory/views/inventory-costing-breakdown.tsx`.
- Removed the inline `CostingBreakdown` implementation from `src/components/domain/inventory/views/inventory-detail-view.tsx`.
- Imported the focused costing component back into the inventory detail presenter without changing props or behavior.
- Added component coverage for no-layer valuation, layered weighted-average valuation, FIFO/oldest-layer copy, and source-boundary ownership.

## Standards Checked

- Domain ownership: the overview costing summary now has a focused inventory detail component.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: unchanged; this is a presenter extraction using the existing inventory detail read model.
- Tenant isolation: unchanged; no server reads or tenant predicates changed.
- Transactional integrity: unchanged; no inventory, receiving, purchasing, valuation, or finance writes changed.
- Serialized lineage: display-only slice; no serial identity, movement history, warranty/RMA continuity, quantity, or cost-layer persistence changed.
- Query/cache contract: unchanged.
- Operator-safe states: preserved the no-layer path, weighted-average display only when layers exist, total value display, FIFO method copy, cost-layer count, and oldest-layer display.
- Reviewable diff: limited to component extraction, focused tests, and this closeout note.

## Smells Removed

- Removed the finance-sensitive costing summary from the inventory detail presenter.
- Reduced `inventory-detail-view.tsx` from 755 lines to 676 lines.
- Added direct tests for valuation display behavior instead of relying only on broad detail-view rendering.
- Added a source-boundary test so the costing breakdown does not silently drift back into the presenter.

## Smells Deferred

- `inventory-detail-view.tsx` still owns header, activity tab, right meta panel, and sidebar composition.
- The activity tab and right meta panel remain likely future extraction candidates.
- `src/components/domain/inventory/unified-inventory-dashboard.tsx`, `src/server/functions/inventory/valuation.ts`, and `src/lib/query-keys.ts` remain larger architecture pressure points.
- Production build was not rerun for this sprint because this was a presenter extraction covered by typecheck, lint, reliability guards, focused tests, and the full unit suite.

## Verification

- `git diff --check` passed.
- `./node_modules/.bin/eslint src/components/domain/inventory/views/inventory-detail-view.tsx src/components/domain/inventory/views/inventory-costing-breakdown.tsx tests/unit/inventory/inventory-costing-breakdown.test.tsx --report-unused-disable-directives` passed.
- `npm run test:vitest -- tests/unit/inventory/inventory-costing-breakdown.test.tsx tests/unit/inventory/inventory-cost-layers-tab-content.test.tsx tests/unit/inventory/valuation-schema-ownership.test.ts` passed, 3 files / 10 tests.
- `npm run lint:reliability` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run test:unit` passed, 749 files / 2471 tests.

## Goal Adaptation

No standing goal change. This sprint continues the product-owner goal by making an inventory valuation proof surface explicit, testable, and easier to reason about.

## Residual Risk

Low risk for this slice because no data fetching, server behavior, mutation behavior, tenant scope, cache policy, transaction logic, or valuation persistence changed. Medium residual architecture risk remains in the broader inventory detail presenter and in larger inventory/dashboard/query-key surfaces.
