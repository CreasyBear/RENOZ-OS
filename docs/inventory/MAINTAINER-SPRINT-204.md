# Inventory Maintainer Sprint 204: Dashboard Alerts Boundary

Status: closed and commit-ready.

## Problem

`unified-inventory-dashboard.tsx` still carried the active alerts section inline with dashboard reads, stock-health metrics, breakdowns, tracked items, movements, top movers, empty states, and helper lists.

The active alerts strip is an operator triage surface. It shows low/out/expiry/slow-moving pressure, lets persisted alerts acknowledge through the existing mutation path, and lets fallback/read-only rows dismiss locally without writing. Keeping this behavior inside the unified dashboard made the presenter harder to reason about and made alert dismissal safety harder to test directly.

## Workflow Spine Protected

```text
inventory dashboard route
  -> UnifiedInventoryDashboard
  -> InventoryDashboardAlertsSection
  -> triggered alert view models from useTriggeredAlerts
  -> operator-visible alert labels/messages, read-only dismissal, acknowledge action, alerts-list handoff
```

## Touched Domains

- Inventory dashboard presentation.
- Inventory dashboard active-alert summary UI.
- Inventory alert acknowledge/dismiss interaction.
- Inventory WMS stock semantics source contract.
- Inventory dashboard tests.
- Inventory sprint evidence.

## Business Value Protected

Warehouse operators need the dashboard to surface stock pressure without turning fallback/read-only rows into accidental writes. This slice keeps active alerts visible and dismissible while preserving the distinction between local dismissal and persisted acknowledgement.

The WMS stock semantics contract was also realigned with the Sprint 203 metrics extraction so it continues to protect the alert-trend comparability rule at the module that now owns it.

## Changes

- Added `src/components/domain/inventory/inventory-dashboard-alerts-section.tsx`.
- Moved active alert severity styles, type labels, local dismissal state, read-only dismissal safety, persisted acknowledgement handoff, and the "view all alerts" link out of `src/components/domain/inventory/unified-inventory-dashboard.tsx`.
- Imported the focused alerts component and shared `DashboardAlert` type back into the unified dashboard.
- Added direct alerts-section coverage for persisted acknowledgement, fallback/read-only dismissal, visible alert limits, full-alerts link behavior, and source-boundary ownership.
- Updated the WMS stock semantics contract to assert that `UnifiedInventoryDashboard` passes stock semantics/comparison units into `InventoryDashboardMetrics`, while `InventoryDashboardMetrics` owns the alert-comparison guard.

## Standards Checked

- Domain ownership: the dashboard active-alert strip now has a focused inventory dashboard component.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: unchanged; this is a presenter extraction using existing dashboard read data and existing acknowledge mutation wiring.
- Tenant isolation: unchanged; no server reads, tenant predicates, or organization scoping changed.
- Transactional integrity: unchanged; no inventory, receiving, counting, movement, valuation, support, warranty, RMA, order, supplier, or finance writes changed.
- Serialized lineage: unchanged; no serial identity, movement history, warranty/RMA continuity, quantity, or cost-layer persistence changed.
- Query/cache contract: unchanged; no query keys, stale times, invalidation, refetch, or hook inputs changed.
- Mutation/cache contract: existing acknowledge mutation call remains the only persisted path; fallback/read-only rows still dismiss locally without invoking `onAcknowledge`.
- Operator-safe states: preserved visible active alerts, first-three summary limit, alert page handoff, read-only dismissal copy, and persisted acknowledgement copy.
- Reviewable diff: limited to component extraction, focused tests, source-contract realignment, dashboard import/callsite cleanup, and this closeout note.

## Smells Removed

- Removed active-alert rendering, local dismissed-alert state, severity style map, alert-type label map, dismiss button behavior, and alerts-list link from the unified dashboard.
- Reduced `unified-inventory-dashboard.tsx` from 1148 lines to 1066 lines.
- Added direct tests for active-alert display and dismissal behavior instead of relying on broad dashboard coverage.
- Removed a stale source-contract assumption that the WMS alert-comparison guard must live in the unified dashboard after the metrics extraction.

## Smells Deferred

- `unified-inventory-dashboard.tsx` still owns stock breakdown cards, tracked items, movement activity, top movers, empty state, and several helper/list components.
- Likely future slices: stock breakdown section, tracked items panel, recent movements activity, top movers panel, dashboard helper extraction.
- `src/server/functions/inventory/valuation.ts`, `src/server/functions/inventory/stock-counts.ts`, `src/server/functions/products/product-inventory.ts`, and `src/lib/query-keys.ts` remain larger architecture pressure points.
- Production build was not rerun for this sprint because full unit, typecheck, lint, reliability guards, focused inventory tests, and diff checks cover the bounded UI/source-contract extraction.

## Verification

- `git diff --check` passed.
- `./node_modules/.bin/eslint src/components/domain/inventory/unified-inventory-dashboard.tsx src/components/domain/inventory/inventory-dashboard-alerts-section.tsx tests/unit/inventory/inventory-dashboard-alerts-section.test.tsx tests/unit/inventory/wms-stock-semantics-contract.test.ts --report-unused-disable-directives` passed.
- `npm run test:vitest -- tests/unit/inventory/wms-stock-semantics-contract.test.ts tests/unit/inventory/inventory-dashboard-alerts-section.test.tsx tests/unit/inventory/query-normalization-wave3-dashboard.test.tsx` passed, 3 files / 16 tests.
- `npm run lint:reliability` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run test:unit` passed, 755 files / 2495 tests.

## Goal Adaptation

No standing goal change. This sprint continues the product-owner goal by shrinking the dashboard monolith, preserving operator-safe alert behavior, and keeping source contracts aligned with extracted domain ownership.

## Residual Risk

Low risk for this slice because no server behavior, tenant scope, cache key, transaction logic, serialized lineage, or persistence model changed. Medium residual architecture risk remains in the rest of the dashboard composition and in larger inventory valuation/query-key surfaces.
