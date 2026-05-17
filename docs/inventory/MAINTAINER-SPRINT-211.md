# Inventory Maintainer Sprint 211: Dashboard Alert Mapping Boundary

Status: closed and commit-ready.

## Problem

`unified-inventory-dashboard.tsx` still owned active-alert read-model mapping after the alert display section had already been extracted.

The parent converted `TriggeredAlert` data into dashboard alert view models: generated fallback IDs, translated severities, selected product/location display names, copied threshold values, converted trigger timestamps, and preserved fallback read-only state. That is display-model translation for the alert panel, not dashboard orchestration.

## Workflow Spine Protected

```text
inventory dashboard route
  -> UnifiedInventoryDashboard
  -> useTriggeredAlerts
  -> buildDashboardAlerts
  -> InventoryDashboardAlertsSection
  -> operator-visible active alert summary and safe acknowledge/dismiss behavior
```

## Touched Domains

- Inventory dashboard presentation.
- Inventory active-alert view-model mapping.
- Inventory alert fallback/read-only display behavior.
- Inventory dashboard tests.
- Inventory sprint evidence.

## Business Value Protected

Operators need the inventory dashboard to surface active stock risks without implying that read-only fallback alerts were persisted or acknowledged. This slice keeps alert severity, threshold, product/location context, and fallback behavior intact while moving the mapping into the alert boundary where it can be directly tested.

## Changes

- Added `src/components/domain/inventory/inventory-dashboard-alert-mappers.ts`.
- Moved triggered-alert to dashboard-alert mapping out of `src/components/domain/inventory/unified-inventory-dashboard.tsx`.
- Kept alert fetching and acknowledge mutation orchestration in the parent dashboard.
- Updated `InventoryDashboardAlertsSection` tests to cover mapping from triggered alert read models into dashboard alert view models.
- Kept React fast-refresh constraints clean by placing the mapper in a non-component module instead of exporting a helper from the alert component file.

## Standards Checked

- Domain ownership: alert view-model translation now lives with the inventory dashboard alert boundary.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: unchanged; the parent still calls `useTriggeredAlerts` and `useAcknowledgeAlert`.
- Tenant isolation: unchanged; no server reads, tenant predicates, organization scope, or auth context changed.
- Transactional integrity: unchanged; no inventory, receiving, counting, movement, valuation, support, warranty, RMA, order, supplier, or finance writes changed.
- Serialized lineage: unchanged; no serial identity, movement history, warranty/RMA continuity, quantity, or cost-layer persistence changed.
- Query/cache contract: unchanged; no query keys, stale times, invalidation, refetch, or hook inputs changed.
- Operator-safe states: preserved fallback alert dismissal without persisted acknowledgement, persisted alert acknowledgement, severity display, alert count limiting, and alert-list drill-in.
- Reviewable diff: limited to mapper extraction, focused tests, dashboard import/callsite cleanup, and this closeout note.

## Smells Removed

- Removed severity mapping, triggered-alert field selection, timestamp conversion, and fallback flag mapping from the unified dashboard.
- Reduced `unified-inventory-dashboard.tsx` from 306 lines to 281 lines.
- Added direct tests for alert view-model mapping instead of relying only on broad dashboard rendering.
- Kept the alert component file component-only for fast refresh.

## Smells Deferred

- `unified-inventory-dashboard.tsx` still owns high-level read-state shell, refresh orchestration, acknowledge callback wiring, tracked-products dialog state, and final dashboard layout composition.
- Likely future slices: WMS unavailable/degraded shell extraction or move to larger server-function architecture pressure.
- `src/server/functions/inventory/valuation.ts`, `src/server/functions/inventory/stock-counts.ts`, `src/server/functions/products/product-inventory.ts`, `src/server/functions/pipeline/pipeline.ts`, and `src/lib/query-keys.ts` remain larger architecture pressure points.
- Bundle splitting remains deferred after the earlier production build warning about chunks larger than 500 kB.

## Verification

- `git diff --check` passed.
- `./node_modules/.bin/eslint src/components/domain/inventory/unified-inventory-dashboard.tsx src/components/domain/inventory/inventory-dashboard-alerts-section.tsx src/components/domain/inventory/inventory-dashboard-alert-mappers.ts tests/unit/inventory/inventory-dashboard-alerts-section.test.tsx --report-unused-disable-directives` passed.
- `npm run test:vitest -- tests/unit/inventory/inventory-dashboard-alerts-section.test.tsx tests/unit/inventory/query-normalization-wave3-dashboard.test.tsx tests/unit/inventory/query-normalization-wave3-alerts.test.tsx` passed, 3 files / 25 tests.
- `npm run lint:reliability` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run test:unit` passed, 761 files / 2525 tests.
- `npm run build` passed, with the known large chunk warning and Nitro native dependency note for `bcrypt`.

## Goal Adaptation

No standing goal change. This sprint continues the product-owner goal by moving alert display-model mapping into an owned boundary and keeping fallback alert behavior directly testable.

## Residual Risk

Low risk for this slice because no server behavior, tenant scope, cache key, transaction logic, serialized lineage, or persistence model changed. Medium residual architecture risk remains in the dashboard shell, bundle size, and larger inventory/server-function surfaces.
