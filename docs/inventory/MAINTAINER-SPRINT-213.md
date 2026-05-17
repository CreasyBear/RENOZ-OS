# Inventory Maintainer Sprint 213: Dashboard Read-State Boundary

Status: closed and commit-ready.

## Problem

`unified-inventory-dashboard.tsx` still derived WMS and dashboard read-state policy inline.

The parent decided whether each read was loading, unavailable, or degraded, then selected sanitized WMS/dashboard error messages directly. That policy feeds multiple child panels and protects operators from raw database or tenant-policy failures, so it deserves a small pure boundary with direct tests instead of living as loose booleans in the dashboard container.

## Workflow Spine Protected

```text
inventory dashboard route
  -> UnifiedInventoryDashboard
  -> useWMSDashboard / useInventoryDashboard
  -> buildInventoryDashboardReadState
  -> InventoryDashboardUnavailableState / InventoryDashboardReadWarning / dashboard panels
  -> operator-safe unavailable and degraded dashboard states
```

## Touched Domains

- Inventory dashboard read-state policy.
- Inventory dashboard presentation orchestration.
- Inventory dashboard tests.
- Inventory sprint evidence.

## Business Value Protected

Operators need the inventory dashboard to be honest when stock data is missing or stale. This slice keeps cold-load failures blocked, stale snapshots visible with warnings, and raw read failures hidden behind operator-safe copy while moving the read-state policy into a directly tested helper.

## Changes

- Added `src/components/domain/inventory/inventory-dashboard-read-state.ts`.
- Moved WMS/dashboard loading, unavailable, degraded, and sanitized-message derivation out of `src/components/domain/inventory/unified-inventory-dashboard.tsx`.
- Kept hook ownership, refresh orchestration, and panel composition in the parent dashboard.
- Added `tests/unit/inventory/inventory-dashboard-read-state.test.ts`.
- Updated the existing dashboard query-normalization test to assert the new read-state boundary.

## Standards Checked

- Domain ownership: dashboard read-state policy now lives in an inventory dashboard helper boundary.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: unchanged; the dashboard still calls the same hooks and passes the same child-panel props.
- Tenant isolation: unchanged; no server reads, tenant predicates, organization scope, auth context, or query inputs changed.
- Transactional integrity: unchanged; no inventory, receiving, movement, valuation, support, warranty, RMA, order, supplier, or finance writes changed.
- Serialized lineage: unchanged; no serial identity, movement history, warranty/RMA continuity, quantity, or cost-layer persistence changed.
- Query/cache contract: unchanged; no query keys, stale times, invalidation, refetch mechanics, or hook contracts changed.
- Operator-safe states: preserved sanitized cold-load unavailable copy, degraded snapshot warnings, and suppression of raw WMS/dashboard read failures.
- Reviewable diff: limited to read-state helper extraction, focused tests, dashboard callsite cleanup, and this closeout note.

## Smells Removed

- Removed inline `hasUsableWmsData` and `hasUsableDashboardData` derivation from the unified dashboard.
- Removed direct read-error normalizer imports from the unified dashboard.
- Centralized WMS/dashboard unavailable and degraded booleans in a tested pure helper.
- Added source-boundary assertions so future edits do not move raw read-error handling back into the dashboard parent.

## Smells Deferred

- `unified-inventory-dashboard.tsx` still owns high-level data fetching, refresh orchestration, tracked-products dialog state, acknowledge callback wiring, metrics derivation, and final dashboard composition.
- Likely future slices: extract refresh orchestration, tracked-products dialog handoff, or dashboard metrics/read-model derivation.
- `src/server/functions/inventory/valuation.ts`, `src/server/functions/inventory/stock-counts.ts`, `src/server/functions/inventory/alerts.ts`, `src/server/functions/products/product-inventory.ts`, `src/server/functions/pipeline/pipeline.ts`, and `src/lib/query-keys.ts` remain larger architecture pressure points.
- Bundle splitting remains deferred after the production build warning about chunks larger than 500 kB.

## Verification

- `npm run test:vitest -- tests/unit/inventory/inventory-dashboard-read-state.test.ts tests/unit/inventory/query-normalization-wave3-dashboard.test.tsx tests/unit/inventory/inventory-dashboard-unavailable-state.test.tsx` passed, 3 files / 14 tests.
- `./node_modules/.bin/eslint src/components/domain/inventory/unified-inventory-dashboard.tsx src/components/domain/inventory/inventory-dashboard-read-state.ts tests/unit/inventory/inventory-dashboard-read-state.test.ts tests/unit/inventory/query-normalization-wave3-dashboard.test.tsx --report-unused-disable-directives` passed.
- `git diff --check` passed.
- `npm run lint:reliability` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run test:unit` passed, 763 files / 2530 tests.
- `npm run build` was not rerun for this sprint because the slice is a bounded pure-helper extraction with unchanged route loading, server functions, cache contracts, and persistence behavior. The known large-chunk warning remains deferred.

## Goal Adaptation

No standing goal change. This sprint continues the product-owner goal by moving dashboard read-state policy into an owned boundary and making the dashboard container easier to reason about.

## Residual Risk

Low risk for this slice because no server behavior, tenant scope, cache key, transaction logic, serialized lineage, or persistence model changed. Medium residual architecture risk remains in dashboard refresh orchestration, tracked-products dialog handoff, metrics derivation, bundle size, and larger inventory/server-function surfaces.
