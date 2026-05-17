# Inventory Maintainer Sprint 214: Dashboard Refresh Boundary

Status: closed and commit-ready.

## Problem

`unified-inventory-dashboard.tsx` still owned dashboard refresh coordination inline.

The parent collected WMS, dashboard, movement, and alert refetch functions, then directly coordinated them with `Promise.all` and emitted the success toast. Refresh is a small workflow contract shared by the command bar and unavailable-state retry, so the sequencing and success condition should be directly tested instead of hidden inside the dashboard container.

## Workflow Spine Protected

```text
inventory dashboard route
  -> UnifiedInventoryDashboard
  -> useWMSDashboard / useInventoryDashboard / useMovementsDashboard / useTriggeredAlerts
  -> refreshInventoryDashboard
  -> InventoryDashboardCommandBar / InventoryDashboardUnavailableState retry
  -> operator-visible refreshed dashboard feedback
```

## Touched Domains

- Inventory dashboard refresh orchestration.
- Inventory dashboard presentation container.
- Inventory dashboard tests.
- Inventory sprint evidence.

## Business Value Protected

Operators use dashboard refresh to recover from stale inventory snapshots and cold-load failures. This slice keeps the refresh contract honest: all dashboard read sources are refetched, success feedback appears only after every source resolves, and failed refreshes do not show false success feedback.

## Changes

- Added `src/components/domain/inventory/inventory-dashboard-refresh.ts`.
- Moved dashboard refresh `Promise.all` coordination and success message selection out of `src/components/domain/inventory/unified-inventory-dashboard.tsx`.
- Kept hook ownership and callback wiring in the parent dashboard.
- Added `tests/unit/inventory/inventory-dashboard-refresh.test.ts`.
- Added source-boundary assertions that keep refresh coordination out of the unified dashboard parent.

## Standards Checked

- Domain ownership: refresh orchestration now lives in an inventory dashboard helper boundary.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: unchanged; the dashboard still calls the same hooks and refetch functions.
- Tenant isolation: unchanged; no server reads, tenant predicates, organization scope, auth context, or query inputs changed.
- Transactional integrity: unchanged; no inventory, receiving, movement, valuation, support, warranty, RMA, order, supplier, or finance writes changed.
- Serialized lineage: unchanged; no serial identity, movement history, warranty/RMA continuity, quantity, or cost-layer persistence changed.
- Query/cache contract: unchanged; no query keys, stale times, invalidation, or hook contracts changed.
- Operator-safe states: preserved dashboard refresh success feedback and avoided false success feedback on rejected refreshes.
- Reviewable diff: limited to refresh helper extraction, focused tests, dashboard callsite cleanup, and this closeout note.

## Smells Removed

- Removed `Promise.all` refresh coordination from the unified dashboard.
- Removed the literal dashboard refresh success copy from the unified dashboard.
- Added direct tests for successful and failed refresh behavior.
- Added source-boundary assertions so future edits do not move refresh coordination back into the parent.

## Smells Deferred

- `unified-inventory-dashboard.tsx` still owns high-level data fetching, tracked-products dialog state, acknowledge callback wiring, metrics derivation, and final dashboard composition.
- Likely future slices: extract tracked-products dialog handoff, alert acknowledge callback behavior, or metrics derivation.
- `src/server/functions/inventory/valuation.ts`, `src/server/functions/inventory/stock-counts.ts`, `src/server/functions/inventory/alerts.ts`, `src/server/functions/products/product-inventory.ts`, `src/server/functions/pipeline/pipeline.ts`, and `src/lib/query-keys.ts` remain larger architecture pressure points.
- Bundle splitting remains deferred after the production build warning about chunks larger than 500 kB.

## Verification

- `npm run test:vitest -- tests/unit/inventory/inventory-dashboard-refresh.test.ts tests/unit/inventory/inventory-dashboard-command-bar.test.tsx tests/unit/inventory/query-normalization-wave3-dashboard.test.tsx` passed, 3 files / 16 tests.
- `./node_modules/.bin/eslint src/components/domain/inventory/unified-inventory-dashboard.tsx src/components/domain/inventory/inventory-dashboard-refresh.ts tests/unit/inventory/inventory-dashboard-refresh.test.ts --report-unused-disable-directives` passed.
- `git diff --check` passed.
- `npm run lint:reliability` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run test:unit` passed, 764 files / 2533 tests.
- `npm run build` was not rerun for this sprint because the slice is a bounded refresh helper extraction with unchanged route loading, server functions, cache keys, and persistence behavior. The known large-chunk warning remains deferred.

## Goal Adaptation

No standing goal change. This sprint continues the product-owner goal by moving dashboard refresh workflow behavior into an owned, tested boundary.

## Residual Risk

Low risk for this slice because no server behavior, tenant scope, cache key, transaction logic, serialized lineage, or persistence model changed. Medium residual architecture risk remains in tracked-products dialog handoff, alert acknowledge behavior, metrics derivation, bundle size, and larger inventory/server-function surfaces.
