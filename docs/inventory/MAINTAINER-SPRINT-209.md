# Inventory Maintainer Sprint 209: Dashboard Recent Movements Panel Boundary

Status: closed and commit-ready.

## Problem

`unified-inventory-dashboard.tsx` still owned the recent-movements card shell after the movement timeline extraction.

The timeline already owned movement aggregation and formatting, but the parent still owned the card title, activity-period subtitle, analytics link, loading skeleton routing, unavailable warning, degraded warning, and timeline placement. That kept WMS recent-movement presentation concerns in the dashboard container and left the activity section less consistent with the extracted top movers, tracked items, and stock breakdown panels.

## Workflow Spine Protected

```text
inventory dashboard route
  -> UnifiedInventoryDashboard
  -> InventoryDashboardRecentMovementsPanel
  -> InventoryDashboardMovementsTimeline
  -> WMS recentMovements read model
  -> operator-visible recent movement activity, analytics drill-in, loading/degraded/unavailable/empty states
```

## Touched Domains

- Inventory dashboard presentation.
- Inventory WMS recent movement card UI.
- Inventory recent movement read-state display.
- Inventory movement timeline boundary tests.
- Inventory sprint evidence.

## Business Value Protected

Warehouse operators use recent movements to understand what just happened across receiving, allocation, transfer, picking, shipping, adjustment, and return flows. This slice keeps the activity card, analytics drill-in, stale data warning, and unavailable state intact while making the card frame independently testable from dashboard orchestration.

## Changes

- Added `src/components/domain/inventory/inventory-dashboard-recent-movements-panel.tsx`.
- Moved recent-movements card title, subtitle, analytics link, loading skeleton routing, unavailable warning, degraded warning, and timeline placement out of `src/components/domain/inventory/unified-inventory-dashboard.tsx`.
- Replaced the inline recent-movements card with `InventoryDashboardRecentMovementsPanel`.
- Kept movement fetching/refetch orchestration in the parent dashboard.
- Updated the existing movements timeline boundary test to reflect the new dashboard -> recent panel -> timeline ownership path.
- Added direct tests for card framing, analytics link, unavailable state, degraded state, loading skeletons, and source-boundary ownership.

## Standards Checked

- Domain ownership: recent-movements card composition now lives in a focused inventory dashboard panel; movement aggregation remains owned by `InventoryDashboardMovementsTimeline`.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: unchanged; this is a presenter extraction using existing WMS dashboard read data.
- Tenant isolation: unchanged; no server reads, tenant predicates, organization scope, or auth context changed.
- Transactional integrity: unchanged; no inventory, receiving, counting, movement, valuation, support, warranty, RMA, order, supplier, or finance writes changed.
- Serialized lineage: unchanged; no serial identity, movement history, warranty/RMA continuity, quantity, or cost-layer persistence changed.
- Query/cache contract: unchanged; no query keys, stale times, invalidation, refetch, or hook inputs changed.
- Operator-safe states: preserved recent activity title, last-24-hours context, analytics drill-in, loading skeletons, cold unavailable warning, stale warning, and timeline empty state.
- Reviewable diff: limited to component extraction, focused tests, existing boundary-test update, dashboard import/callsite cleanup, and this closeout note.

## Smells Removed

- Removed recent-movements card markup, analytics link composition, loading/unavailable/degraded branching, and warning placement from the unified dashboard.
- Reduced `unified-inventory-dashboard.tsx` from 356 lines to 317 lines.
- Added direct tests for recent movement panel behavior instead of relying only on broad dashboard rendering.
- Removed recent-movement-specific card, icon, link, button variant, and utility imports from the dashboard presenter.

## Smells Deferred

- `unified-inventory-dashboard.tsx` still owns the new-user empty state and high-level read-state shell.
- Likely future slices: dashboard empty-state extraction and final dashboard container cleanup before moving to larger server-function architecture pressure.
- `src/server/functions/inventory/valuation.ts`, `src/server/functions/inventory/stock-counts.ts`, `src/server/functions/products/product-inventory.ts`, `src/server/functions/pipeline/pipeline.ts`, and `src/lib/query-keys.ts` remain larger architecture pressure points.
- Bundle splitting remains deferred after the earlier production build warning about chunks larger than 500 kB.

## Verification

- `git diff --check` passed.
- `./node_modules/.bin/eslint src/components/domain/inventory/unified-inventory-dashboard.tsx src/components/domain/inventory/inventory-dashboard-recent-movements-panel.tsx tests/unit/inventory/inventory-dashboard-recent-movements-panel.test.tsx tests/unit/inventory/inventory-dashboard-movements-timeline.test.tsx --report-unused-disable-directives` passed.
- `npm run test:vitest -- tests/unit/inventory/inventory-dashboard-recent-movements-panel.test.tsx tests/unit/inventory/inventory-dashboard-movements-timeline.test.tsx tests/unit/inventory/query-normalization-wave3-dashboard.test.tsx` passed, 3 files / 19 tests.
- `npm run lint:reliability` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run test:unit` passed, 760 files / 2522 tests.
- `npm run build` was not rerun for this sprint because the slice is a bounded UI extraction with full typecheck, lint, reliability, focused, and unit coverage. The existing large-chunk build warning remains deferred.

## Goal Adaptation

No standing goal change. This sprint continues the product-owner goal by shrinking the dashboard monolith, moving recent activity card composition into an owned panel, preserving honest WMS read states, and making the operator activity card directly testable.

## Residual Risk

Low risk for this slice because no server behavior, tenant scope, cache key, transaction logic, serialized lineage, or persistence model changed. Medium residual architecture risk remains in the dashboard shell, bundle size, and larger inventory/server-function surfaces.
