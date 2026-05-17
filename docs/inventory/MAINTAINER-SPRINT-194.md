# Inventory Maintainer Sprint 194: Movement History Preview Boundary

Status: closed and commit-ready.

## Problem

`inventory-detail-view.tsx` still carried the overview tab's recent movement preview inline with header, meta panel, tab content, quality state, cost layers, activity, and sidebar logic.

Recent movements are not decorative detail; they are the operator's quick trace of how a battery item moved through receiving, allocation, shipping, returns, adjustments, and transfers. Keeping that trace preview inside the broader presenter made the detail view harder to reason about and harder to test directly.

## Workflow Spine Protected

```text
inventory detail route
  -> InventoryDetailContainer
  -> InventoryDetailView overview tab
  -> MovementHistoryPreview
  -> movement records from inventory detail read model
  -> operator-visible recent movement trace
```

## Touched Domains

- Inventory detail presentation.
- Inventory movement trace preview UI.
- Inventory detail/view tests.
- Inventory sprint evidence.

## Business Value Protected

Movement traceability helps operators answer "what happened to this battery item?" without opening the full movement tab. The preview keeps recent receiving, allocation, shipping, return, transfer, and adjustment signals visible in the overview while making that UI independently testable.

## Changes

- Added `src/components/domain/inventory/views/inventory-movement-history-preview.tsx`.
- Removed the inline `MovementHistoryPreview` implementation from `src/components/domain/inventory/views/inventory-detail-view.tsx`.
- Imported the focused preview component back into the inventory detail presenter without changing props or behavior.
- Added component coverage for movement count, five-row preview limit, signed quantities, overflow copy, empty rendering, and source-boundary ownership.

## Standards Checked

- Domain ownership: recent movement preview now has a focused inventory detail component.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: unchanged; this is a presenter extraction using the existing inventory detail read model.
- Tenant isolation: unchanged; no server reads or tenant predicates changed.
- Transactional integrity: unchanged; no movement, inventory, cost, or valuation writes changed.
- Serialized lineage: display-only slice; no serial identity, movement persistence, or RMA/warranty continuity logic changed.
- Query/cache contract: unchanged.
- Operator-safe states: preserved loading skeleton, no-empty placeholder behavior, five movement limit, signed quantities, and overflow copy.
- Reviewable diff: limited to component extraction, focused tests, and this closeout note.

## Smells Removed

- Removed a workflow-specific movement preview from the 1,252-line inventory detail presenter.
- Reduced `inventory-detail-view.tsx` to 1,155 lines.
- Added direct tests for the movement preview behavior instead of relying only on broad detail-view rendering.
- Added a source-boundary test so the preview does not silently drift back into the presenter.

## Smells Deferred

- `inventory-detail-view.tsx` still owns header, costing breakdown, movements tab, cost layers tab, quality tab, activity tab, right meta panel, and sidebar composition.
- `MovementsTabContent` still lives inline and is a likely future extraction if movement traceability needs deeper UI work.
- `src/components/domain/inventory/unified-inventory-dashboard.tsx`, `src/server/functions/inventory/valuation.ts`, and `src/lib/query-keys.ts` remain larger architecture pressure points.
- Production build was not rerun because this was a presenter extraction covered by typecheck, lint, reliability guards, focused tests, and the full unit suite.

## Verification

- `git diff --check` passed.
- `npm run test:vitest -- tests/unit/inventory/inventory-movement-history-preview.test.tsx tests/unit/inventory/query-normalization-wave3-quality.test.tsx` passed, 2 files / 10 tests.
- `./node_modules/.bin/eslint src/components/domain/inventory/views/inventory-detail-view.tsx src/components/domain/inventory/views/inventory-movement-history-preview.tsx tests/unit/inventory/inventory-movement-history-preview.test.tsx --report-unused-disable-directives` passed.
- `npm run lint:reliability` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run test:unit` passed, 745 files / 2455 tests.

## Goal Adaptation

No standing goal change. This sprint continues the product-owner goal by making an operator-facing movement trace surface explicit, testable, and easier to reason about.

## Residual Risk

Low risk for this slice because no data fetching, server behavior, mutation behavior, tenant scope, cache policy, or transaction logic changed. Medium residual architecture risk remains in the broader inventory detail presenter and inventory dashboard surfaces.
