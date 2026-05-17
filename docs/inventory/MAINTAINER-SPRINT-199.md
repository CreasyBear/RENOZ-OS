# Inventory Maintainer Sprint 199: Right Meta Panel Boundary

Status: closed and commit-ready.

## Problem

`inventory-detail-view.tsx` still carried the right-side item details panel inline with header, tabs, lifecycle, costing, movement preview, activity, and sidebar composition.

The right meta panel is the operator-visible reference surface for product context, inventory identity, warehouse location, lifecycle dates, and audit dates. It appears in both the desktop side panel and the mobile item details sheet. Keeping that metadata surface inside the broader presenter made item-reference behavior harder to test directly and kept the presenter responsible for too many unrelated display contracts.

## Workflow Spine Protected

```text
inventory detail route
  -> InventoryDetailContainer
  -> InventoryDetailView desktop side panel / mobile details sheet
  -> RightMetaPanel
  -> item product, identity, location, date, and audit fields from inventory detail read model
  -> operator-visible item reference details and product inventory handoff
```

## Touched Domains

- Inventory detail presentation.
- Inventory item identity and location metadata display UI.
- Inventory detail/view tests.
- Inventory sprint evidence.

## Business Value Protected

Warehouse, support, warranty, and finance-adjacent operators use the side panel to confirm they are acting on the correct battery item before reviewing movements, cost layers, quality records, or activity. The product inventory handoff also lets an operator move from an item-specific view back to product-level stock context without losing the inventory frame.

## Changes

- Added `src/components/domain/inventory/views/inventory-right-meta-panel.tsx`.
- Removed the inline `RightMetaPanel` implementation from `src/components/domain/inventory/views/inventory-detail-view.tsx`.
- Imported the focused right meta panel component back into both the desktop side panel and mobile details sheet without changing props or behavior.
- Added component coverage for product context, product inventory link params/search, identification metadata, location metadata, lifecycle dates, audit dates, optional metadata omissions, fallback description copy, and source-boundary ownership.

## Standards Checked

- Domain ownership: the item details side panel now has a focused inventory detail component.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: unchanged; this is a presenter extraction using the existing inventory detail read model.
- Tenant isolation: unchanged; no server reads or tenant predicates changed.
- Transactional integrity: unchanged; no inventory, receiving, purchasing, valuation, support, warranty, RMA, or finance writes changed.
- Serialized lineage: display-only slice; no serial identity, movement history, warranty/RMA continuity, quantity, or cost-layer persistence changed.
- Query/cache contract: unchanged.
- Operator-safe states: preserved optional field omission, fallback product description, location display, date display, audit display, and product inventory handoff.
- Reviewable diff: limited to component extraction, focused tests, and this closeout note.

## Smells Removed

- Removed the item metadata side panel from the inventory detail presenter.
- Reduced `inventory-detail-view.tsx` from 676 lines to 531 lines.
- Added direct tests for item-reference metadata instead of relying only on broad detail-view rendering.
- Added a source-boundary test so the right meta panel does not silently drift back into the presenter.

## Smells Deferred

- `inventory-detail-view.tsx` still owns the header, tab shell, activity tab, desktop panel animation, and mobile sheet composition.
- The activity tab remains a likely future extraction candidate.
- `src/components/domain/inventory/unified-inventory-dashboard.tsx`, `src/server/functions/inventory/valuation.ts`, and `src/lib/query-keys.ts` remain larger architecture pressure points.
- Production build and full unit suite were not rerun for this sprint because this was a presentational extraction covered by typecheck, lint, reliability guards, focused tests, and diff checks.

## Verification

- `git diff --check` passed.
- `./node_modules/.bin/eslint src/components/domain/inventory/views/inventory-detail-view.tsx src/components/domain/inventory/views/inventory-right-meta-panel.tsx tests/unit/inventory/inventory-right-meta-panel.test.tsx --report-unused-disable-directives` passed.
- `npm run test:vitest -- tests/unit/inventory/inventory-right-meta-panel.test.tsx` passed, 1 file / 4 tests.
- `npm run lint:reliability` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.

## Goal Adaptation

No standing goal change. This sprint continues the product-owner goal by making an inventory item reference surface explicit, testable, and easier to reason about.

## Residual Risk

Low risk for this slice because no data fetching, server behavior, mutation behavior, tenant scope, cache policy, transaction logic, or item metadata persistence changed. Medium residual architecture risk remains in the broader inventory detail presenter and in larger inventory/dashboard/query-key surfaces.
