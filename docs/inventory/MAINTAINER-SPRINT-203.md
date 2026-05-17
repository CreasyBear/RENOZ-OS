# Inventory Maintainer Sprint 203: Dashboard Metrics Boundary

Status: closed and commit-ready.

## Problem

`unified-inventory-dashboard.tsx` still carried the key metrics strip inline with dashboard reads, alerts, stock breakdowns, tracked items, recent movements, top movers, and empty-state composition.

The metrics strip is the dashboard's first stock-health summary. It presents total value, physical on-hand units, allocatable alerts, and active locations. It also owns a subtle but important display contract: alert count changes should only render as trend deltas when alert comparison units and semantics are actually comparable. Keeping that logic inside the broader dashboard made stock-summary behavior harder to test directly and kept the dashboard monolith responsible for too many unrelated display contracts.

## Workflow Spine Protected

```text
inventory dashboard route
  -> UnifiedInventoryDashboard
  -> InventoryDashboardMetrics
  -> WMS totals + dashboard metrics + comparison semantics
  -> operator-visible total value, physical stock, allocatable alerts, locations
```

## Touched Domains

- Inventory dashboard presentation.
- Inventory dashboard stock-health metrics UI.
- Inventory dashboard comparison semantics.
- Inventory dashboard tests.
- Inventory sprint evidence.

## Business Value Protected

Warehouse and finance-adjacent operators need the dashboard summary to distinguish physical stock, stock value, allocatable alert pressure, and location coverage. Preserving the alert-trend guard prevents count-based alert changes from being displayed like percentage trends, which avoids false confidence in the dashboard summary.

## Changes

- Added `src/components/domain/inventory/inventory-dashboard-metrics.tsx`.
- Moved total value, on-hand units, allocatable alerts, location count, loading state, dashboard-unavailable copy, metric deltas, and alert-comparison guard logic out of `src/components/domain/inventory/unified-inventory-dashboard.tsx`.
- Imported the focused metrics component back into the unified dashboard with existing WMS totals, dashboard metrics, comparison, stock semantics, comparison units, and loading/unavailable state.
- Added component coverage for value/unit/location display, unavailable alert copy, alert state, percentage trend rendering, non-comparable count-delta suppression, and source-boundary ownership.

## Standards Checked

- Domain ownership: the stock-health metrics strip now has a focused inventory dashboard component.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: unchanged; this is a presenter extraction using existing dashboard read data.
- Tenant isolation: unchanged; no server reads, tenant predicates, or organization scoping changed.
- Transactional integrity: unchanged; no inventory, receiving, counting, movement, valuation, support, warranty, RMA, or finance writes changed.
- Serialized lineage: unchanged; no serial identity, movement history, warranty/RMA continuity, quantity, or cost-layer persistence changed.
- Query/cache contract: unchanged; no query keys, stale times, invalidation, refetch, or hook inputs changed.
- Operator-safe states: preserved loading state, dashboard-unavailable alert copy, stock value display, physical stock display, allocatable alert display, active location count, and comparable alert-trend guard.
- Reviewable diff: limited to component extraction, focused tests, dashboard import/callsite cleanup, and this closeout note.

## Smells Removed

- Removed metric-card rendering and alert-comparison display logic from the unified dashboard.
- Reduced `unified-inventory-dashboard.tsx` from 1199 lines to 1148 lines.
- Added direct tests for stock-health metrics instead of relying only on broad dashboard rendering.
- Added a source-boundary test so `MetricCard` and alert-trend guard logic do not silently drift back into the unified dashboard presenter.

## Smells Deferred

- `unified-inventory-dashboard.tsx` still owns alert section, stock breakdown cards, tracked items, movement activity, top movers, empty state, and several helper/list components.
- Likely future slices: active alerts section, stock breakdown section, tracked items panel, recent movements activity, and top movers panel.
- `src/server/functions/inventory/valuation.ts` and `src/lib/query-keys.ts` remain larger architecture pressure points.
- Production build and full unit suite were not rerun for this sprint because this was a bounded UI extraction covered by typecheck, lint, reliability guards, focused dashboard tests, and diff checks.

## Verification

- `git diff --check` passed.
- `./node_modules/.bin/eslint src/components/domain/inventory/unified-inventory-dashboard.tsx src/components/domain/inventory/inventory-dashboard-metrics.tsx tests/unit/inventory/inventory-dashboard-metrics.test.tsx --report-unused-disable-directives` passed.
- `npm run test:vitest -- tests/unit/inventory/inventory-dashboard-metrics.test.tsx tests/unit/inventory/query-normalization-wave3-dashboard.test.tsx` passed, 2 files / 13 tests.
- `npm run lint:reliability` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.

## Goal Adaptation

No standing goal change. This sprint continues the product-owner goal by making a stock-health dashboard summary explicit, testable, and easier to reason about.

## Residual Risk

Low risk for this slice because no server behavior, mutation behavior, tenant scope, cache key, transaction logic, serialized lineage, or persistence changed. Medium residual architecture risk remains in the rest of the dashboard composition and in larger inventory valuation/query-key surfaces.
