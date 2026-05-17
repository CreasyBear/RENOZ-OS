# Inventory Maintainer Sprint 205: Dashboard Movements Timeline Boundary

Status: closed and commit-ready.

## Problem

`unified-inventory-dashboard.tsx` still owned the recent movements timeline implementation after the metrics, command bar, header, activity tab, costing, meta panel, and active-alert extractions.

That timeline was not just markup. It grouped movement rows into operator-readable activities, selected movement icons, decided inbound/outbound quantity signs, formatted human-readable descriptions, grouped activity by display date, and rendered the WMS loading skeleton. Keeping that logic in the unified dashboard made the parent responsible for movement semantics and created a redundant group-then-flatten path before rendering recent activity.

## Workflow Spine Protected

```text
inventory dashboard route
  -> UnifiedInventoryDashboard
  -> InventoryDashboardMovementsTimeline
  -> WMS recentMovements read model
  -> operator-readable movement activity, quantity direction, SKU summary, loading/empty state
```

## Touched Domains

- Inventory dashboard presentation.
- Inventory WMS recent movement summary UI.
- Inventory movement activity aggregation and display copy.
- Inventory dashboard tests.
- Inventory sprint evidence.

## Business Value Protected

Warehouse operators use recent movements to understand what just happened across receiving, allocation, transfer, picking, shipping, adjustment, and return flows. This slice keeps those events readable as activity, not as noisy row-level movement fragments, while making the movement summary easier to test and evolve independently from dashboard data orchestration.

## Changes

- Added `src/components/domain/inventory/inventory-dashboard-movements-timeline.tsx`.
- Moved movement icon policy, movement aggregation, movement activity wording, date grouping, inbound/outbound quantity badge behavior, empty state, and movement skeleton rendering out of `src/components/domain/inventory/unified-inventory-dashboard.tsx`.
- Changed the unified dashboard to pass raw `wmsData?.recentMovements ?? []` directly into the movements timeline instead of pre-grouping by date and then flattening inside the old inline timeline.
- Added direct tests for receipt aggregation, outbound allocation quantity signing, empty state, skeleton shape, and source-boundary ownership.

## Standards Checked

- Domain ownership: recent movement presentation and movement-summary semantics now live in a focused inventory dashboard component.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: unchanged; this is a presenter extraction using the existing WMS dashboard read model.
- Tenant isolation: unchanged; no server reads, tenant predicates, or organization scoping changed.
- Transactional integrity: unchanged; no inventory, receiving, counting, movement, valuation, support, warranty, RMA, order, supplier, or finance writes changed.
- Serialized lineage: unchanged; no serial identity, movement history, warranty/RMA continuity, quantity, or cost-layer persistence changed.
- Query/cache contract: unchanged; no query keys, stale times, invalidation, refetch, or hook inputs changed.
- Operator-safe states: preserved WMS loading skeleton, unavailable/degraded warning composition in the parent card, no-recent-activity empty state, movement grouping, SKU summary, date grouping, and inbound/outbound quantity direction.
- Reviewable diff: limited to component extraction, focused tests, dashboard import/callsite cleanup, and this closeout note.

## Smells Removed

- Removed movement icon mapping, aggregation, activity formatting, date grouping, movement timeline rendering, movement skeleton rendering, and redundant pre-grouping from the unified dashboard.
- Reduced `unified-inventory-dashboard.tsx` from 1066 lines to 799 lines.
- Added direct tests for recent movement activity behavior instead of relying only on broad dashboard rendering.
- Removed movement-specific `date-fns`, `Fragment`, and movement icon imports from the dashboard presenter.

## Smells Deferred

- `unified-inventory-dashboard.tsx` still owns stock breakdown cards, tracked items, top movers, empty state, and several helper/list components.
- Likely future slices: stock breakdown section, tracked items panel, top movers panel, dashboard empty-state extraction, and dashboard read-warning extraction.
- `src/server/functions/inventory/valuation.ts`, `src/server/functions/inventory/stock-counts.ts`, `src/server/functions/products/product-inventory.ts`, and `src/lib/query-keys.ts` remain larger architecture pressure points.
- Production build was not rerun for this sprint because full unit, typecheck, lint, reliability guards, focused inventory tests, and diff checks cover the bounded UI extraction.

## Verification

- `git diff --check` passed.
- `./node_modules/.bin/eslint src/components/domain/inventory/unified-inventory-dashboard.tsx src/components/domain/inventory/inventory-dashboard-movements-timeline.tsx tests/unit/inventory/inventory-dashboard-movements-timeline.test.tsx --report-unused-disable-directives` passed.
- `npm run test:vitest -- tests/unit/inventory/inventory-dashboard-movements-timeline.test.tsx tests/unit/inventory/query-normalization-wave3-dashboard.test.tsx` passed, 2 files / 14 tests.
- `npm run lint:reliability` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run test:unit` passed, 756 files / 2500 tests.

## Goal Adaptation

No standing goal change. This sprint continues the product-owner goal by shrinking the dashboard monolith, removing mixed movement presentation semantics from the parent, and making movement activity behavior directly testable.

## Residual Risk

Low risk for this slice because no server behavior, tenant scope, cache key, transaction logic, serialized lineage, or persistence model changed. Medium residual architecture risk remains in the rest of the dashboard composition and in larger inventory valuation/query-key surfaces.
