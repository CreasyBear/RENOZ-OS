# Inventory Maintainer Sprint 197: Quality Tab Boundary

Status: closed and commit-ready.

## Problem

`inventory-detail-view.tsx` still carried the quality tab inline with header, overview, movement history, cost layers, activity, sidebar, and meta-panel logic.

The quality tab is the operator-visible inspection evidence surface for a serialized battery item. It handles loading, true empty state, hard unavailable state, stale-data degraded warning, retry action, inspection metadata, result badges, notes, and defect tags. Keeping that state machine inside the broader presenter made honest quality-history behavior harder to test directly and kept the presenter too monolithic.

## Workflow Spine Protected

```text
inventory detail route
  -> InventoryDetailContainer
  -> InventoryDetailView quality tab
  -> QualityTabContent
  -> quality inspection records from inventory detail read model
  -> operator-visible inspection history with honest unavailable/degraded states
```

## Touched Domains

- Inventory detail presentation.
- Inventory quality inspection display UI.
- Inventory detail/view tests.
- Inventory sprint evidence.

## Business Value Protected

Quality history helps warehouse, support, and warranty operators understand whether a battery item passed inspection, failed, or was accepted conditionally. The degraded and unavailable states prevent false confidence when inspection history cannot be refreshed, which protects support decisions, RMA investigation, warranty review, and stock release decisions.

## Changes

- Added `src/components/domain/inventory/views/inventory-quality-tab-content.tsx`.
- Removed the inline `QualityTabContent` implementation from `src/components/domain/inventory/views/inventory-detail-view.tsx`.
- Imported the focused quality tab component back into the inventory detail presenter without changing props or behavior.
- Added component coverage for empty state, loading skeletons, cold-load unavailable copy, retry action, stale-data degraded warning, inspection metadata, notes, defects, result badge copy, and source-boundary ownership.

## Standards Checked

- Domain ownership: the quality inspection tab now has a focused inventory detail component.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: unchanged; this is a presenter extraction using the existing inventory detail read model.
- Tenant isolation: unchanged; no server reads or tenant predicates changed.
- Transactional integrity: unchanged; no inventory, quality, RMA, warranty, receiving, or finance writes changed.
- Serialized lineage: display-only slice; no serial identity, quality persistence, RMA continuity, warranty continuity, or receipt lineage logic changed.
- Query/cache contract: unchanged.
- Operator-safe states: preserved loading skeletons, honest empty state, hard unavailable state, stale-data degraded warning, retry action, inspection metadata, result badge, notes, and defect tags.
- Reviewable diff: limited to component extraction, focused tests, and this closeout note.

## Smells Removed

- Removed the quality inspection state machine from the inventory detail presenter.
- Reduced `inventory-detail-view.tsx` from 901 lines to 755 lines.
- Added direct tests for quality history display and unavailable/degraded behavior instead of relying only on broad detail-view rendering.
- Added a source-boundary test so the quality tab does not silently drift back into the presenter.

## Smells Deferred

- `inventory-detail-view.tsx` still owns header, costing breakdown, activity tab, right meta panel, and sidebar composition.
- The activity tab and costing breakdown remain likely future extraction candidates.
- `src/components/domain/inventory/unified-inventory-dashboard.tsx`, `src/server/functions/inventory/valuation.ts`, and `src/lib/query-keys.ts` remain larger architecture pressure points.
- Production build was not rerun for this sprint because this was a presenter extraction covered by typecheck, lint, reliability guards, focused tests, and the full unit suite.

## Verification

- `git diff --check` passed.
- `./node_modules/.bin/eslint src/components/domain/inventory/views/inventory-detail-view.tsx src/components/domain/inventory/views/inventory-quality-tab-content.tsx tests/unit/inventory/inventory-quality-tab-content.test.tsx --report-unused-disable-directives` passed.
- `npm run test:vitest -- tests/unit/inventory/inventory-quality-tab-content.test.tsx tests/unit/inventory/query-normalization-wave3-quality.test.tsx tests/unit/inventory/quality-schema-ownership.test.ts` passed, 3 files / 14 tests.
- `npm run lint:reliability` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run test:unit` passed, 748 files / 2468 tests.

## Goal Adaptation

No standing goal change. This sprint continues the product-owner goal by making an operator-safety quality inspection evidence surface explicit, testable, and easier to reason about.

## Residual Risk

Low risk for this slice because no data fetching, server behavior, mutation behavior, tenant scope, cache policy, transaction logic, or quality persistence changed. Medium residual architecture risk remains in the broader inventory detail presenter and in larger inventory/dashboard/query-key surfaces.
