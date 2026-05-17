# Inventory Maintainer Sprint 206: Dashboard Top Movers Boundary

Status: closed and commit-ready.

## Problem

`unified-inventory-dashboard.tsx` still owned the top movers panel after the recent movement timeline extraction.

That panel mixed dashboard read-state composition, top-moving product normalization, movement-volume scaling, trend icon policy, loading skeletons, empty state, and warning markup into the parent dashboard. It also left a subtle display edge case: when top mover rows existed but all movement quantities were zero, progress values could calculate as `NaN`.

## Workflow Spine Protected

```text
inventory dashboard route
  -> UnifiedInventoryDashboard
  -> InventoryDashboardTopMoversPanel
  -> dashboardData.topMoving read model
  -> operator-visible top moving products, movement volume, trend direction, loading/unavailable/degraded states
```

## Touched Domains

- Inventory dashboard presentation.
- Inventory dashboard top-moving products summary UI.
- Inventory dashboard read-warning presentation.
- Inventory dashboard tests.
- Inventory sprint evidence.

## Business Value Protected

Warehouse and operations users use top movers to spot products with high movement volume and potential stocking pressure. This slice keeps that signal visible while making the panel independent from dashboard orchestration and preventing zero-volume mover rows from producing invalid progress output.

## Changes

- Added `src/components/domain/inventory/inventory-dashboard-top-movers-panel.tsx`.
- Added `src/components/domain/inventory/inventory-dashboard-read-warning.tsx`.
- Moved top-moving product normalization, card composition, loading skeleton, unavailable/degraded warning handling, empty state, progress scaling, and trend icon display out of `src/components/domain/inventory/unified-inventory-dashboard.tsx`.
- Replaced the inline top movers card with `InventoryDashboardTopMoversPanel`.
- Replaced the inline `DashboardReadWarning` helper with `InventoryDashboardReadWarning` for the remaining dashboard warnings.
- Clamped zero-quantity top mover progress to `0` instead of allowing `NaN`.
- Added direct tests for normalized rows, unavailable copy, zero-quantity progress, empty state, skeleton shape, and source-boundary ownership.

## Standards Checked

- Domain ownership: top movers presentation and read-warning markup now live in focused inventory dashboard components.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: unchanged; this is a presenter extraction using the existing dashboard read model.
- Tenant isolation: unchanged; no server reads, tenant predicates, or organization scoping changed.
- Transactional integrity: unchanged; no inventory, receiving, counting, movement, valuation, support, warranty, RMA, order, supplier, or finance writes changed.
- Serialized lineage: unchanged; no serial identity, movement history, warranty/RMA continuity, quantity, or cost-layer persistence changed.
- Query/cache contract: unchanged; no query keys, stale times, invalidation, refetch, or hook inputs changed.
- Operator-safe states: preserved loading skeleton, unavailable warning, degraded warning, empty state, top mover product/SKU/quantity display, and trend icon display.
- Reviewable diff: limited to component extraction, focused tests, dashboard import/callsite cleanup, and this closeout note.

## Smells Removed

- Removed top mover normalization, trend icon policy, card markup, skeleton rendering, empty state, and progress scaling from the unified dashboard.
- Removed the inline dashboard read-warning helper from the unified dashboard.
- Reduced `unified-inventory-dashboard.tsx` from 799 lines to 679 lines.
- Added direct tests for top movers behavior instead of relying on broad dashboard rendering.
- Removed top-mover-specific icon and schema imports from the dashboard presenter.

## Smells Deferred

- `unified-inventory-dashboard.tsx` still owns stock breakdown cards, tracked items, empty state, and several helper/list components.
- Likely future slices: stock breakdown section, tracked items panel, dashboard empty-state extraction, and dashboard read-state shell cleanup.
- `src/server/functions/inventory/valuation.ts`, `src/server/functions/inventory/stock-counts.ts`, `src/server/functions/products/product-inventory.ts`, and `src/lib/query-keys.ts` remain larger architecture pressure points.
- Production build was not rerun for this sprint because full unit, typecheck, lint, reliability guards, focused inventory tests, and diff checks cover the bounded UI extraction.

## Verification

- `git diff --check` passed.
- `./node_modules/.bin/eslint src/components/domain/inventory/unified-inventory-dashboard.tsx src/components/domain/inventory/inventory-dashboard-top-movers-panel.tsx src/components/domain/inventory/inventory-dashboard-read-warning.tsx tests/unit/inventory/inventory-dashboard-top-movers-panel.test.tsx --report-unused-disable-directives` passed.
- `npm run test:vitest -- tests/unit/inventory/inventory-dashboard-top-movers-panel.test.tsx tests/unit/inventory/query-normalization-wave3-dashboard.test.tsx` passed, 2 files / 15 tests.
- `npm run lint:reliability` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run test:unit` passed, 757 files / 2506 tests.

## Goal Adaptation

No standing goal change. This sprint continues the product-owner goal by shrinking the dashboard monolith, tightening top-mover display ownership, and making a small operator-facing edge case directly tested.

## Residual Risk

Low risk for this slice because no server behavior, tenant scope, cache key, transaction logic, serialized lineage, or persistence model changed. Medium residual architecture risk remains in the stock breakdown/tracked-items dashboard composition and larger inventory valuation/query-key surfaces.
