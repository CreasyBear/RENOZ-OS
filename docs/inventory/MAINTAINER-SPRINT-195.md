# Inventory Maintainer Sprint 195: Movements Tab Boundary

Status: closed and commit-ready.

## Problem

`inventory-detail-view.tsx` still carried the full movements tab inline with header, overview, cost layers, quality, activity, sidebar, and meta-panel logic.

The movements tab is the operator's full trace for "what happened to this battery item?" It shows movement type, references, operator, timestamp, reason, signed quantity, and before/after quantity. Keeping that trace surface inside the broader presenter made the movement evidence workflow harder to test directly and kept the detail view too monolithic.

## Workflow Spine Protected

```text
inventory detail route
  -> InventoryDetailContainer
  -> InventoryDetailView movements tab
  -> MovementsTabContent
  -> movement records from inventory detail read model
  -> operator-visible movement history with references, quantities, reasons, and before/after counts
```

## Touched Domains

- Inventory detail presentation.
- Inventory movement history tab UI.
- Inventory detail/view tests.
- Inventory sprint evidence.

## Business Value Protected

The movement history tab supports warehouse and support operators reconstructing the lifecycle of a serialized battery item across receiving, allocation, shipping, returns, transfers, and adjustments. This is the proof surface for inventory traceability, escalation handling, RMA investigation, and stock correction review.

## Changes

- Added `src/components/domain/inventory/views/inventory-movements-tab-content.tsx`.
- Removed the inline `MovementsTabContent` implementation from `src/components/domain/inventory/views/inventory-detail-view.tsx`.
- Imported the focused movements tab component back into the inventory detail presenter without changing props or behavior.
- Added component coverage for empty state, loading skeletons, movement metadata, reference fallback, signed quantities, before/after counts, and source-boundary ownership.

## Standards Checked

- Domain ownership: the full movement trace tab now has a focused inventory detail component.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: unchanged; this is a presenter extraction using the existing inventory detail read model.
- Tenant isolation: unchanged; no server reads or tenant predicates changed.
- Transactional integrity: unchanged; no movement, inventory, cost, valuation, or finance writes changed.
- Serialized lineage: display-only slice; no serial identity, movement persistence, RMA continuity, warranty continuity, or receipt lineage logic changed.
- Query/cache contract: unchanged.
- Operator-safe states: preserved loading skeletons, honest empty state, movement reference fallback, signed quantities, and before/after quantity display.
- Reviewable diff: limited to component extraction, focused tests, and this closeout note.

## Smells Removed

- Removed a workflow-specific movement history tab from the inventory detail presenter.
- Reduced `inventory-detail-view.tsx` from 1,155 lines to 1,031 lines.
- Added direct tests for the full movement tab behavior instead of relying only on broad detail-view rendering.
- Added a source-boundary test so the full movement tab does not silently drift back into the presenter.

## Smells Deferred

- `inventory-detail-view.tsx` still owns header, costing breakdown, cost layers tab, quality tab, activity tab, right meta panel, and sidebar composition.
- Cost layers and quality tab content remain inline and are likely future extraction candidates.
- `src/components/domain/inventory/unified-inventory-dashboard.tsx`, `src/server/functions/inventory/valuation.ts`, and `src/lib/query-keys.ts` remain larger architecture pressure points.
- Production build was not rerun for this sprint because this was a presenter extraction covered by typecheck, lint, reliability guards, focused tests, and the full unit suite.

## Verification

- `git diff --check` passed.
- `./node_modules/.bin/eslint src/components/domain/inventory/views/inventory-detail-view.tsx src/components/domain/inventory/views/inventory-movements-tab-content.tsx tests/unit/inventory/inventory-movements-tab-content.test.tsx --report-unused-disable-directives` passed.
- `npm run test:vitest -- tests/unit/inventory/inventory-movements-tab-content.test.tsx tests/unit/inventory/inventory-movement-history-preview.test.tsx tests/unit/inventory/query-normalization-wave3-quality.test.tsx` passed, 3 files / 14 tests.
- `npm run lint:reliability` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run test:unit` passed, 746 files / 2459 tests.

## Goal Adaptation

No standing goal change. This sprint continues the product-owner goal by making the operator-facing inventory movement evidence surface explicit, testable, and easier to reason about.

## Residual Risk

Low risk for this slice because no data fetching, server behavior, mutation behavior, tenant scope, cache policy, or transaction logic changed. Medium residual architecture risk remains in the broader inventory detail presenter and in larger inventory/dashboard/query-key surfaces.
