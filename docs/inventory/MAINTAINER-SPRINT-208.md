# Inventory Maintainer Sprint 208: Dashboard Tracked Items Boundary

Status: closed and commit-ready.

## Problem

`unified-inventory-dashboard.tsx` still owned the tracked-items panel after the stock breakdown, top movers, movement timeline, alerts, metrics, command bar, and header extractions.

That panel mixed tracked-product display policy, quantity-to-status mapping, product-link rendering, empty-state recovery, loading skeletons, stale-count warning placement, unavailable-count handling, and edit-button composition into the parent dashboard. The parent should own tracked-product selection and dialog state, but it should not own the row rendering and display semantics for the tracked-items card.

## Workflow Spine Protected

```text
inventory dashboard route
  -> UnifiedInventoryDashboard
  -> useTrackedProducts
  -> InventoryDashboardTrackedItemsPanel
  -> tracked product inventory read model
  -> operator-visible tracked SKU/name/quantity/status, edit recovery, loading/degraded/unavailable/empty states
```

## Touched Domains

- Inventory dashboard presentation.
- Dashboard tracked-products inventory summary UI.
- Tracked-product stale/unavailable read-state display.
- Tracked-product quantity-to-stock-status display policy.
- Inventory dashboard tests.
- Inventory sprint evidence.

## Business Value Protected

Operations users can pin important battery SKUs and see their current stock posture without leaving the dashboard. This slice keeps that watchlist visible and honest when inventory counts are stale or temporarily unavailable, while making the presentation independently testable from dashboard orchestration.

## Changes

- Added `src/components/domain/inventory/inventory-dashboard-tracked-items-panel.tsx`.
- Moved tracked-items card markup, edit button, list rendering, product links, empty state, skeletons, stale/unavailable warnings, and quantity-to-status mapping out of `src/components/domain/inventory/unified-inventory-dashboard.tsx`.
- Kept tracked-product selection, local storage hook state, dialog state, and `TrackedProductsDialog` ownership in the parent dashboard.
- Replaced the inline tracked-items card with `InventoryDashboardTrackedItemsPanel`.
- Removed tracked-item helper types, `getStockStatus`, `TrackedItemsList`, `TrackedItemsSkeleton`, `STOCK_STATUS_CONFIG`, `StatusCell`, `Edit2`, and `Skeleton` from the unified dashboard.
- Added direct tests for status mapping, product-link routing, unavailable gating, empty-state recovery, stale warning display, skeleton shape, and source-boundary ownership.

## Standards Checked

- Domain ownership: tracked-items presentation and display policy now live in a focused inventory dashboard component.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: unchanged; the parent still calls `useTrackedProducts`, which owns the query key and server read.
- Tenant isolation: unchanged; no server reads, tenant predicates, organization scope, or auth context changed.
- Transactional integrity: unchanged; no inventory, receiving, counting, movement, valuation, support, warranty, RMA, order, supplier, or finance writes changed.
- Serialized lineage: unchanged; no serial identity, movement history, warranty/RMA continuity, quantity, or cost-layer persistence changed.
- Query/cache contract: unchanged; no query keys, stale times, invalidation, refetch, or hook inputs changed.
- Operator-safe states: preserved edit action, add-items recovery, product link to inventory tab, stale warning, unavailable warning only when products are selected, loading skeletons, and stock status labels.
- Reviewable diff: limited to component extraction, focused tests, dashboard import/callsite cleanup, and this closeout note.

## Smells Removed

- Removed tracked-item row rendering, status mapping, skeleton rendering, empty state, and warning composition from the unified dashboard.
- Reduced `unified-inventory-dashboard.tsx` from 511 lines to 356 lines.
- Added direct tests for tracked-items behavior instead of relying only on broad dashboard rendering.
- Removed tracked-item-specific display imports from the dashboard presenter.

## Smells Deferred

- `unified-inventory-dashboard.tsx` still owns the new-user empty state and recent-movements card frame around the extracted movements timeline.
- Likely future slices: dashboard empty-state extraction, recent-movements card shell extraction, and final dashboard container cleanup.
- `src/server/functions/inventory/valuation.ts`, `src/server/functions/inventory/stock-counts.ts`, `src/server/functions/products/product-inventory.ts`, `src/server/functions/pipeline/pipeline.ts`, and `src/lib/query-keys.ts` remain larger architecture pressure points.
- Bundle splitting remains deferred after the earlier production build warning about chunks larger than 500 kB.

## Verification

- `git diff --check` passed.
- `./node_modules/.bin/eslint src/components/domain/inventory/unified-inventory-dashboard.tsx src/components/domain/inventory/inventory-dashboard-tracked-items-panel.tsx tests/unit/inventory/inventory-dashboard-tracked-items-panel.test.tsx --report-unused-disable-directives` passed.
- `npm run test:vitest -- tests/unit/inventory/inventory-dashboard-tracked-items-panel.test.tsx tests/unit/inventory/query-normalization-wave3-dashboard.test.tsx` passed, 2 files / 15 tests.
- `npm run lint:reliability` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run test:unit` passed, 759 files / 2517 tests.
- `npm run build` was not rerun for this sprint. It passed earlier in the same audit session before this UI extraction, with the existing large-chunk warning still deferred.

## Goal Adaptation

No standing goal change. This sprint continues the product-owner goal by shrinking the dashboard monolith, moving tracked SKU watchlist presentation into an owned component, preserving honest read states, and making the operator watchlist directly testable.

## Residual Risk

Low risk for this slice because no server behavior, tenant scope, cache key, transaction logic, serialized lineage, or persistence model changed. Medium residual architecture risk remains in the dashboard shell, bundle size, and larger inventory/server-function surfaces.
