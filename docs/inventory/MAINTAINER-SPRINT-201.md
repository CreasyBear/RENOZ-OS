# Inventory Maintainer Sprint 201: Header Boundary

Status: closed and commit-ready.

## Problem

`inventory-detail-view.tsx` still carried the item header inline with lifecycle, alerts, tab shell, overview, activity, desktop side panel, and mobile sheet composition.

The header is the first operator-visible proof that the user is looking at the correct battery item. It combines product name, inventory status, quality status, serial number, SKU, location, lot, and expiry warnings. Keeping that identity and safety surface inside the broader presenter made header behavior harder to test directly and kept the presenter responsible for too many unrelated display contracts.

## Workflow Spine Protected

```text
inventory detail route
  -> InventoryDetailContainer
  -> InventoryDetailView header zone
  -> InventoryHeader
  -> item identity, status, quality, location, lot, and expiry fields from inventory detail read model
  -> operator-visible item identity confirmation and expiry warning
```

## Touched Domains

- Inventory detail presentation.
- Inventory item identity and expiry-warning display UI.
- Inventory detail/view tests.
- Inventory sprint evidence.

## Business Value Protected

Warehouse, support, warranty, and finance-adjacent operators need to confirm the correct product, serial, SKU, location, lot, and quality state before acting on movements, cost layers, quality history, support/RMA, warranty, or stock decisions. Making the header explicit keeps the first item-confirmation surface easier to test and safer to evolve.

## Changes

- Added `src/components/domain/inventory/views/inventory-header.tsx`.
- Removed inline `InventoryHeader`, `MetaChipsRow`, and expiry-status helper logic from `src/components/domain/inventory/views/inventory-detail-view.tsx`.
- Imported the focused header component back into the inventory detail presenter without changing props or behavior.
- Added component coverage for product identity, status display, quality badge display, serial/SKU/location/lot chips, expiring warning, expired warning, optional metadata omission, and source-boundary ownership.

## Standards Checked

- Domain ownership: the inventory item header now has a focused inventory detail component.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: unchanged; this is a presenter extraction using the existing inventory detail read model.
- Tenant isolation: unchanged; no server reads or tenant predicates changed.
- Transactional integrity: unchanged; no inventory, receiving, purchasing, valuation, support, warranty, RMA, activity-write, or finance writes changed.
- Serialized lineage: display-only slice; no serial identity persistence, movement history, warranty/RMA continuity, quantity, or cost-layer persistence changed.
- Query/cache contract: unchanged.
- Operator-safe states: preserved status display, quality badge suppression for good state, optional serial/lot omission, SKU/location chips, expiring warning, and expired warning.
- Reviewable diff: limited to component extraction, focused tests, and this closeout note.

## Smells Removed

- Removed product identity, status/quality badge, meta-chip, and expiry-warning logic from the inventory detail presenter.
- Reduced `inventory-detail-view.tsx` from 513 lines to 360 lines.
- Added direct tests for header identity and expiry behavior instead of relying only on broad detail-view rendering.
- Added a source-boundary test so the header and meta-chip helper do not silently drift back into the presenter.

## Smells Deferred

- `inventory-detail-view.tsx` still owns tab counts, lifecycle derivation, order association derivation, copy-link/details-panel actions, desktop panel animation, and mobile sheet composition.
- The remaining detail presenter is now largely a composition shell, but extracting the tab shell or lifecycle derivation may still be useful if behavior work touches those paths.
- `src/components/domain/inventory/unified-inventory-dashboard.tsx`, `src/server/functions/inventory/valuation.ts`, and `src/lib/query-keys.ts` remain larger architecture pressure points.
- Production build and full unit suite were not rerun for this sprint because this was a narrow presentational extraction covered by typecheck, lint, reliability guards, focused tests, and diff checks.

## Verification

- `git diff --check` passed.
- `./node_modules/.bin/eslint src/components/domain/inventory/views/inventory-detail-view.tsx src/components/domain/inventory/views/inventory-header.tsx tests/unit/inventory/inventory-header.test.tsx --report-unused-disable-directives` passed.
- `npm run test:vitest -- tests/unit/inventory/inventory-header.test.tsx` passed, 1 file / 4 tests.
- `npm run lint:reliability` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.

## Goal Adaptation

No standing goal change. This sprint continues the product-owner goal by making the inventory item identity surface explicit, testable, and easier to reason about.

## Residual Risk

Low risk for this slice because no data fetching, server behavior, mutation behavior, tenant scope, cache policy, transaction logic, or item persistence changed. Medium residual architecture risk remains in the inventory dashboard, inventory valuation server function, and query-key surface.
