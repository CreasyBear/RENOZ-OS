# Inventory Maintainer Sprint 207: Dashboard Stock Breakdown Boundary

Status: closed and commit-ready.

## Problem

`unified-inventory-dashboard.tsx` still owned the category and location stock breakdown cards after the recent movement timeline and top movers extractions.

Those cards mixed WMS read-state composition, category value display, location occupancy display, empty-state copy, add-location navigation, loading skeletons, and stale-warning placement into the parent dashboard. That kept physical stock-distribution semantics coupled to dashboard orchestration and tracked-item presentation.

## Workflow Spine Protected

```text
inventory dashboard route
  -> UnifiedInventoryDashboard
  -> InventoryDashboardStockBreakdownCards
  -> WMS stockByCategory / stockByLocation read models
  -> operator-visible category value/unit summaries, location occupancy, loading/degraded/empty states
```

## Touched Domains

- Inventory dashboard presentation.
- Inventory WMS category stock summary UI.
- Inventory WMS location stock summary UI.
- Organization-aware amount display for category value rows.
- Inventory dashboard tests.
- Inventory sprint evidence.

## Business Value Protected

Warehouse and operations users use the dashboard to see where physical stock and value sit by category and by location. This slice keeps that scan path visible, keeps stale WMS data explicit, and keeps missing category/location setup honest rather than letting the parent dashboard hide those operational states inside a large mixed presenter.

## Changes

- Added `src/components/domain/inventory/inventory-dashboard-stock-breakdown-cards.tsx`.
- Moved category and location stock cards, list rendering, empty states, loading skeletons, stale-warning composition, and add-location link markup out of `src/components/domain/inventory/unified-inventory-dashboard.tsx`.
- Replaced parent-owned `useOrgFormat` currency formatting with `FormatAmount` inside the stock breakdown component.
- Replaced the inline category/location card markup in the unified dashboard with `InventoryDashboardStockBreakdownCards`.
- Removed category/location imports and helper functions from the unified dashboard.
- Added direct tests for rendered category values, location occupancy progress, stale warnings, empty states, loading skeleton shape, and source-boundary ownership.

## Standards Checked

- Domain ownership: category/location stock breakdown presentation now lives in a focused inventory dashboard component.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: unchanged; this is a presenter extraction using existing WMS dashboard read models.
- Tenant isolation: unchanged; no server reads, tenant predicates, organization scope, or auth context changed.
- Transactional integrity: unchanged; no inventory, receiving, counting, movement, valuation, support, warranty, RMA, order, supplier, or finance writes changed.
- Serialized lineage: unchanged; no serial identity, movement history, warranty/RMA continuity, quantity, or cost-layer persistence changed.
- Query/cache contract: unchanged; no query keys, stale times, invalidation, refetch, or hook inputs changed.
- Operator-safe states: preserved loading skeletons, stale WMS warnings, empty category state, empty location state, add-location recovery link, category unit count, category value, and location occupancy percentage.
- Reviewable diff: limited to component extraction, focused tests, dashboard import/callsite cleanup, and this closeout note.

## Smells Removed

- Removed category/location card markup, list helpers, skeletons, empty states, stale warning placement, and category amount formatting from the unified dashboard.
- Reduced `unified-inventory-dashboard.tsx` from 679 lines to 511 lines.
- Added direct tests for stock breakdown behavior instead of relying only on broad dashboard rendering.
- Removed category/location-specific icon, badge, progress, type, and formatting imports from the dashboard presenter.

## Smells Deferred

- `unified-inventory-dashboard.tsx` still owns tracked items, the new-user empty state, tracked-item helper mapping, and tracked-item skeleton rendering.
- Likely future slices: tracked items panel, dashboard empty-state extraction, and final dashboard shell cleanup.
- `src/server/functions/inventory/valuation.ts`, `src/server/functions/inventory/stock-counts.ts`, `src/server/functions/products/product-inventory.ts`, `src/server/functions/pipeline/pipeline.ts`, and `src/lib/query-keys.ts` remain larger architecture pressure points.
- Bundle splitting remains deferred after the production build warning about chunks larger than 500 kB.

## Verification

- `git diff --check` passed.
- `./node_modules/.bin/eslint src/components/domain/inventory/unified-inventory-dashboard.tsx src/components/domain/inventory/inventory-dashboard-stock-breakdown-cards.tsx tests/unit/inventory/inventory-dashboard-stock-breakdown-cards.test.tsx --report-unused-disable-directives` passed.
- `npm run test:vitest -- tests/unit/inventory/inventory-dashboard-stock-breakdown-cards.test.tsx tests/unit/inventory/query-normalization-wave3-dashboard.test.tsx` passed, 2 files / 14 tests.
- `npm run lint:reliability` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run test:unit` passed, 758 files / 2511 tests.
- `npm run build` passed. It still reports the existing large-chunk warning.

## Goal Adaptation

No standing goal change. This sprint continues the product-owner goal by shrinking the dashboard monolith, moving physical stock-distribution presentation into an owned component, preserving honest WMS read states, and making the operator-visible stock breakdown directly testable.

## Residual Risk

Low risk for this slice because no server behavior, tenant scope, cache key, transaction logic, serialized lineage, or persistence model changed. Medium residual architecture risk remains in tracked-item dashboard composition, dashboard empty-state ownership, bundle size, and larger inventory/server-function surfaces.
