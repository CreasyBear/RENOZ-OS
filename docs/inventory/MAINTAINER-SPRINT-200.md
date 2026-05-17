# Inventory Maintainer Sprint 200: Activity Tab Boundary

Status: closed and commit-ready.

## Problem

`inventory-detail-view.tsx` still carried the activity tab inline with header, lifecycle, alerts, overview, movement, cost layer, quality, desktop side panel, and mobile sheet composition.

The activity tab is the operator-visible event history surface for inventory changes, stock movements, and system events. It also owns the optional activity logging action and the inventory-filtered handoff into the shared activity feed. Keeping that workflow inside the broader presenter made activity read-state wiring harder to test directly and kept the presenter responsible for too many unrelated display contracts.

## Workflow Spine Protected

```text
inventory detail route
  -> InventoryDetailContainer
  -> InventoryDetailView activity tab
  -> ActivityTabContent
  -> inventory activity records from the inventory detail container
  -> shared activity timeline with inventory feed handoff and optional log action
```

## Touched Domains

- Inventory detail presentation.
- Inventory activity history display UI.
- Activity timeline handoff from inventory detail.
- Inventory detail/view tests.
- Inventory sprint evidence.

## Business Value Protected

Inventory activity history helps operators reconstruct what happened to a battery item before acting on stock, support, warranty, RMA, or finance-adjacent decisions. Keeping the inventory-filtered feed handoff and optional log action explicit makes the activity trail easier to verify and safer to evolve without disturbing valuation, movement, quality, or metadata display.

## Changes

- Added `src/components/domain/inventory/views/inventory-activity-tab-content.tsx`.
- Removed the inline activity-tab implementation from `src/components/domain/inventory/views/inventory-detail-view.tsx`.
- Imported the focused activity tab component back into the inventory detail presenter without changing props or behavior.
- Added component coverage for the optional log action, read-only mode, loading/error/activity state handoff to `UnifiedActivityTimeline`, inventory feed search params, activity copy, and source-boundary ownership.

## Standards Checked

- Domain ownership: the inventory activity tab now has a focused inventory detail component.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: unchanged; this is a presenter extraction using existing activity records from the inventory detail container.
- Tenant isolation: unchanged; no server reads or tenant predicates changed.
- Transactional integrity: unchanged; no inventory, receiving, purchasing, valuation, support, warranty, RMA, activity-write, or finance writes changed.
- Serialized lineage: display-only slice; no serial identity, movement history, warranty/RMA continuity, quantity, or activity persistence changed.
- Query/cache contract: unchanged.
- Operator-safe states: preserved optional log action, read-only mode, loading state, error state, activity count handoff, timeline title/description, empty state copy, and inventory-filtered activity feed handoff.
- Reviewable diff: limited to component extraction, focused tests, and this closeout note.

## Smells Removed

- Removed activity timeline wiring and activity logging CTA markup from the inventory detail presenter.
- Reduced `inventory-detail-view.tsx` from 531 lines to 513 lines.
- Added direct tests for the activity tab handoff instead of relying only on broad detail-view rendering.
- Added a source-boundary test so the activity tab does not silently drift back into the presenter.

## Smells Deferred

- `inventory-detail-view.tsx` still owns the header, tab shell, lifecycle derivation, order association derivation, desktop panel animation, and mobile sheet composition.
- Header and tab-shell extraction remain possible future slices, but the remaining presenter is now much closer to a composition surface.
- `src/components/domain/inventory/unified-inventory-dashboard.tsx`, `src/server/functions/inventory/valuation.ts`, and `src/lib/query-keys.ts` remain larger architecture pressure points.
- Production build and full unit suite were not rerun for this sprint because this was a narrow presentational extraction covered by typecheck, lint, reliability guards, focused tests, and diff checks.

## Verification

- `git diff --check` passed.
- `./node_modules/.bin/eslint src/components/domain/inventory/views/inventory-detail-view.tsx src/components/domain/inventory/views/inventory-activity-tab-content.tsx tests/unit/inventory/inventory-activity-tab-content.test.tsx --report-unused-disable-directives` passed.
- `npm run test:vitest -- tests/unit/inventory/inventory-activity-tab-content.test.tsx` passed, 1 file / 4 tests.
- `npm run lint:reliability` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.

## Goal Adaptation

No standing goal change. This sprint continues the product-owner goal by making an inventory activity history surface explicit, testable, and easier to reason about.

## Residual Risk

Low risk for this slice because no data fetching, server behavior, mutation behavior, tenant scope, cache policy, transaction logic, or activity persistence changed. Medium residual architecture risk remains in the inventory dashboard, inventory valuation server function, and query-key surface.
