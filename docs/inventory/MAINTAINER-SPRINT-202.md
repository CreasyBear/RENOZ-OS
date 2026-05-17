# Inventory Maintainer Sprint 202: Dashboard Command Bar Boundary

Status: closed and commit-ready.

## Problem

`unified-inventory-dashboard.tsx` still carried the dashboard command/search bar inline with dashboard reads, metrics, alerts, stock breakdowns, tracked items, recent movements, top movers, and empty-state composition.

The command bar is a high-frequency operator workflow surface. It owns quick inventory search, item navigation, product-inventory handoff, refresh, and the primary warehouse action links for receiving, counting, locations, and alert settings. Keeping that workflow inside the broader dashboard made search/navigation behavior harder to test directly and kept the dashboard monolith responsible for too many unrelated contracts.

## Workflow Spine Protected

```text
inventory dashboard route
  -> UnifiedInventoryDashboard
  -> InventoryDashboardCommandBar
  -> useInventorySearch / debounced query / router navigate
  -> item detail, product inventory tab, receiving, stock count, locations, alert settings
```

## Touched Domains

- Inventory dashboard presentation.
- Inventory command/search workflow UI.
- Inventory item and product inventory navigation handoff.
- Inventory dashboard tests.
- Inventory sprint evidence.

## Business Value Protected

Warehouse operators need fast lookup and action entry points to receive stock, run counts, manage locations, investigate alerts, and jump from a matched stock item to the exact item or product inventory context. Making the command bar explicit keeps that workflow easier to verify before deeper dashboard or inventory read-model changes.

## Changes

- Added `src/components/domain/inventory/inventory-dashboard-command-bar.tsx`.
- Moved inventory search state, debounced search, outside-click dismissal, slash keyboard shortcut, item navigation, product inventory navigation, refresh button, and quick action links out of `src/components/domain/inventory/unified-inventory-dashboard.tsx`.
- Imported the focused command bar back into the unified dashboard with `onRefresh={handleRefresh}`.
- Updated the dashboard source comment so search-result ownership points to the command bar boundary.
- Added component coverage for search empty state, inventory search hook arguments, item navigation, product-inventory navigation, refresh, warehouse action links, and source-boundary ownership.

## Standards Checked

- Domain ownership: the dashboard command/search workflow now has a focused inventory component.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: the search hook now lives in the command bar boundary; the hook, server function, query key, cache policy, and route targets are unchanged.
- Tenant isolation: unchanged; no server reads, tenant predicates, or organization scoping changed.
- Transactional integrity: unchanged; no inventory, receiving, counting, movement, valuation, support, warranty, RMA, or finance writes changed.
- Serialized lineage: unchanged; no serial identity, movement history, warranty/RMA continuity, quantity, or cost-layer persistence changed.
- Query/cache contract: preserved `useInventorySearch(debouncedSearch, { limit: 8 }, debouncedSearch.length >= 2)` and existing dashboard refresh via hook refetch functions.
- Operator-safe states: preserved loading copy, empty search copy, escape/blur dismissal, item result metadata, product inventory handoff, refresh action, and warehouse quick action links.
- Reviewable diff: limited to component extraction, focused tests, dashboard import/callsite cleanup, and this closeout note.

## Smells Removed

- Removed search state, refs, effects, keyboard shortcut wiring, search dropdown markup, and quick action menu markup from the unified dashboard.
- Reduced `unified-inventory-dashboard.tsx` from 1385 lines to 1199 lines.
- Added direct tests for the command/search workflow instead of relying only on broad dashboard rendering.
- Added a source-boundary test so the search hook and `inventory-search` input stay out of the unified dashboard presenter.

## Smells Deferred

- `unified-inventory-dashboard.tsx` still owns metrics, alert section, stock breakdown cards, tracked items, movement activity, top movers, empty state, and several helper/list components.
- Likely future slices: metrics strip, stock breakdown section, tracked items panel, recent movements activity, and top movers panel.
- `src/server/functions/inventory/valuation.ts` and `src/lib/query-keys.ts` remain larger architecture pressure points.
- Production build and full unit suite were not rerun for this sprint because this was a bounded UI extraction covered by typecheck, lint, reliability guards, focused dashboard tests, and diff checks.

## Verification

- `git diff --check` passed.
- `./node_modules/.bin/eslint src/components/domain/inventory/unified-inventory-dashboard.tsx src/components/domain/inventory/inventory-dashboard-command-bar.tsx tests/unit/inventory/inventory-dashboard-command-bar.test.tsx --report-unused-disable-directives` passed.
- `npm run test:vitest -- tests/unit/inventory/inventory-dashboard-command-bar.test.tsx tests/unit/inventory/query-normalization-wave3-dashboard.test.tsx` passed, 2 files / 13 tests.
- `npm run lint:reliability` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.

## Goal Adaptation

No standing goal change. This sprint continues the product-owner goal by making a core warehouse operator command surface explicit, testable, and easier to reason about.

## Residual Risk

Low risk for this slice because no server behavior, mutation behavior, tenant scope, cache key, transaction logic, serialized lineage, or persistence changed. Medium residual architecture risk remains in the rest of the dashboard composition and in larger inventory valuation/query-key surfaces.
