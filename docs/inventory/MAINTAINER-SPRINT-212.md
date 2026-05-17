# Inventory Maintainer Sprint 212: Dashboard Unavailable State Boundary

Status: closed and commit-ready.

## Problem

`unified-inventory-dashboard.tsx` still owned the cold-load WMS failure panel after most dashboard sections had been extracted.

The parent decided when the WMS read was unavailable, then rendered alert icons, button primitives, retry copy, support guidance, and the operator-safe error message inline. That made the dashboard container keep presentation responsibility for a failure state that should be directly testable on its own.

## Workflow Spine Protected

```text
inventory dashboard route
  -> UnifiedInventoryDashboard
  -> useWMSDashboard
  -> getWmsDashboardReadErrorMessage
  -> InventoryDashboardUnavailableState
  -> retry via dashboard refresh orchestration
```

## Touched Domains

- Inventory dashboard presentation.
- Inventory dashboard cold-load read-state behavior.
- Inventory dashboard tests.
- Inventory sprint evidence.

## Business Value Protected

Operators need a failed inventory dashboard load to be explicit and recoverable without leaking raw database, tenant policy, or server details. This slice keeps the dashboard fail-closed when WMS data is missing, preserves retry, and makes the unavailable state a small tested boundary instead of inline dashboard markup.

## Changes

- Added `src/components/domain/inventory/inventory-dashboard-unavailable-state.tsx`.
- Moved the WMS cold-load failure panel, alert icon, retry button, and support guidance out of `src/components/domain/inventory/unified-inventory-dashboard.tsx`.
- Kept cold-load detection, sanitized message selection, and refresh orchestration in the parent dashboard.
- Added `tests/unit/inventory/inventory-dashboard-unavailable-state.test.tsx`.
- Kept the existing query-normalization dashboard test covering the integrated cold-load behavior.

## Standards Checked

- Domain ownership: cold-load dashboard presentation now lives in an inventory dashboard component boundary.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: unchanged; the dashboard still calls `useWMSDashboard` and uses the existing read-error normalizer.
- Tenant isolation: unchanged; no server reads, tenant predicates, organization scope, auth context, or query inputs changed.
- Transactional integrity: unchanged; no inventory, receiving, movement, valuation, support, warranty, RMA, order, supplier, or finance writes changed.
- Serialized lineage: unchanged; no serial identity, movement history, warranty/RMA continuity, quantity, or cost-layer persistence changed.
- Query/cache contract: unchanged; no query keys, stale times, invalidation, refetch mechanics, or hook contracts changed.
- Operator-safe states: preserved sanitized unavailable copy, retry affordance, and suppression of raw WMS read failures.
- Reviewable diff: limited to extracting the unavailable state component, focused tests, dashboard import/callsite cleanup, and this closeout note.

## Smells Removed

- Removed alert/error icons and button primitive imports from the unified dashboard.
- Removed cold-load failure copy and layout markup from the dashboard container.
- Reduced `unified-inventory-dashboard.tsx` from 281 lines to 266 lines.
- Added direct coverage for the unavailable-state component and source-boundary assertions.

## Smells Deferred

- `unified-inventory-dashboard.tsx` still owns high-level data fetching, refresh orchestration, derived read-state booleans, tracked-products dialog state, acknowledge callback wiring, and final dashboard composition.
- Likely future slices: extract dashboard read-state derivation, refresh orchestration, or tracked-products dialog handoff.
- `src/server/functions/inventory/valuation.ts`, `src/server/functions/inventory/stock-counts.ts`, `src/server/functions/inventory/alerts.ts`, `src/server/functions/products/product-inventory.ts`, `src/server/functions/pipeline/pipeline.ts`, and `src/lib/query-keys.ts` remain larger architecture pressure points.
- Bundle splitting remains deferred after the production build warning about chunks larger than 500 kB.

## Verification

- `npm run test:vitest -- tests/unit/inventory/inventory-dashboard-unavailable-state.test.tsx tests/unit/inventory/query-normalization-wave3-dashboard.test.tsx tests/unit/inventory/inventory-dashboard-empty-state.test.tsx` passed, 3 files / 13 tests.
- `./node_modules/.bin/eslint src/components/domain/inventory/unified-inventory-dashboard.tsx src/components/domain/inventory/inventory-dashboard-unavailable-state.tsx tests/unit/inventory/inventory-dashboard-unavailable-state.test.tsx --report-unused-disable-directives` passed.
- `git diff --check` passed.
- `npm run lint:reliability` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run test:unit` passed, 762 files / 2527 tests.
- `npm run build` was not rerun for this sprint because the slice is a bounded presentation extraction with unchanged route loading, server functions, cache contracts, and persistence behavior. Sprint 211's build gate passed immediately before this slice and the known large-chunk warning remains deferred.

## Goal Adaptation

No standing goal change. This sprint continues the product-owner goal by moving an operator-facing failure state into an owned boundary and making the dashboard container easier to reason about.

## Residual Risk

Low risk for this slice because no server behavior, tenant scope, cache key, transaction logic, serialized lineage, or persistence model changed. Medium residual architecture risk remains in the dashboard shell, refresh orchestration, bundle size, and larger inventory/server-function surfaces.
