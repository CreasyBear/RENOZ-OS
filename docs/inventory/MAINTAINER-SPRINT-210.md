# Inventory Maintainer Sprint 210: Dashboard Empty State Boundary

Status: closed and commit-ready.

## Problem

`unified-inventory-dashboard.tsx` still owned the new-user inventory empty state after the major dashboard panel extractions.

That empty state mixed first-run warehouse guidance, inventory receiving CTA copy, location setup CTA copy, and shared `DataTableEmpty` composition into the parent dashboard. The parent should decide when there are zero on-hand units, but it should not own the empty-state presentation.

## Workflow Spine Protected

```text
inventory dashboard route
  -> UnifiedInventoryDashboard
  -> InventoryDashboardEmptyState
  -> zero-unit WMS totals state
  -> operator-visible first-run receiving/location setup guidance
```

## Touched Domains

- Inventory dashboard presentation.
- Inventory first-run empty-state UI.
- Inventory receiving/location setup navigation actions.
- Inventory dashboard tests.
- Inventory sprint evidence.

## Business Value Protected

New operators need a clear first action when the warehouse has no inventory on hand: receive stock or set up warehouse locations. This slice keeps those first-run actions intact while removing another presentation concern from the dashboard container.

## Changes

- Added `src/components/domain/inventory/inventory-dashboard-empty-state.tsx`.
- Moved first-run empty-state copy, icon, action labels, and shared empty-state composition out of `src/components/domain/inventory/unified-inventory-dashboard.tsx`.
- Kept the zero-unit visibility condition and route navigation callbacks in the parent dashboard.
- Replaced the inline `DataTableEmpty` block with `InventoryDashboardEmptyState`.
- Removed `DataTableEmpty` and `Package` imports from the unified dashboard.
- Added direct tests for rendered first-run guidance, action callbacks, and source-boundary ownership.

## Standards Checked

- Domain ownership: first-run inventory dashboard presentation now lives in a focused inventory dashboard component.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: unchanged; this is a presenter extraction using existing WMS totals state.
- Tenant isolation: unchanged; no server reads, tenant predicates, organization scope, or auth context changed.
- Transactional integrity: unchanged; no inventory, receiving, counting, movement, valuation, support, warranty, RMA, order, supplier, or finance writes changed.
- Serialized lineage: unchanged; no serial identity, movement history, warranty/RMA continuity, quantity, or cost-layer persistence changed.
- Query/cache contract: unchanged; no query keys, stale times, invalidation, refetch, or hook inputs changed.
- Operator-safe states: preserved first-run empty copy, receive-inventory action, and set-up-locations action.
- Reviewable diff: limited to component extraction, focused tests, dashboard import/callsite cleanup, and this closeout note.

## Smells Removed

- Removed first-run empty-state `DataTableEmpty` composition from the unified dashboard.
- Reduced `unified-inventory-dashboard.tsx` from 317 lines to 306 lines.
- Added direct tests for empty-state behavior instead of relying only on broad dashboard rendering.
- Removed empty-state-specific icon/shared empty-state imports from the dashboard presenter.

## Smells Deferred

- `unified-inventory-dashboard.tsx` still owns high-level read-state shell, alert mapping, refresh orchestration, and tracked-products dialog state.
- Likely future slices: final dashboard container cleanup or moving to larger server-function architecture pressure.
- `src/server/functions/inventory/valuation.ts`, `src/server/functions/inventory/stock-counts.ts`, `src/server/functions/products/product-inventory.ts`, `src/server/functions/pipeline/pipeline.ts`, and `src/lib/query-keys.ts` remain larger architecture pressure points.
- Bundle splitting remains deferred after the earlier production build warning about chunks larger than 500 kB.

## Verification

- `git diff --check` passed.
- `./node_modules/.bin/eslint src/components/domain/inventory/unified-inventory-dashboard.tsx src/components/domain/inventory/inventory-dashboard-empty-state.tsx tests/unit/inventory/inventory-dashboard-empty-state.test.tsx --report-unused-disable-directives` passed.
- `npm run test:vitest -- tests/unit/inventory/inventory-dashboard-empty-state.test.tsx tests/unit/inventory/query-normalization-wave3-dashboard.test.tsx` passed, 2 files / 11 tests.
- `npm run lint:reliability` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run test:unit` passed, 761 files / 2524 tests.
- `npm run build` was not rerun for this sprint because the slice is a bounded UI extraction with full typecheck, lint, reliability, focused, and unit coverage. The existing large-chunk build warning remains deferred.

## Goal Adaptation

No standing goal change. This sprint continues the product-owner goal by shrinking the dashboard monolith, moving first-run inventory guidance into an owned component, and keeping the operator onboarding path directly testable.

## Residual Risk

Low risk for this slice because no server behavior, tenant scope, cache key, transaction logic, serialized lineage, or persistence model changed. Medium residual architecture risk remains in the dashboard shell, bundle size, and larger inventory/server-function surfaces.
