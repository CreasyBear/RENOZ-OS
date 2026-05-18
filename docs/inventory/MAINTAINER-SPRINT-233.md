# Inventory Maintainer Sprint 233: Stock Count Read Boundary

Status: closed and commit-ready.

## Problem

`src/server/functions/inventory/stock-counts.ts` remained the largest inventory server function module at 921 lines. It mixed read-only stock-count surfaces with planning, lifecycle, count-item mutation, cancellation, and reconciliation delegation.

Stock counting is an inventory-control workflow. Mutations need strict transaction and tenant-scope scrutiny, while list/detail/history/variance reads need query-shape and operator-state scrutiny. Keeping both in one file made future warehouse count changes harder to review and increased the chance that read-only cleanup would touch mutation code.

## Workflow Spine Protected

```text
stock count route / count sheet UI
  -> use-stock-counts hooks
  -> public stock-count server module
  -> stock-count read module for list/detail/history/variance
  -> stock-count lifecycle module for planning/count-item mutations
  -> stock count tables, inventory rows, product descriptors, warehouse locations
```

## Touched Domains

- Inventory stock-count server functions.
- Inventory stock-count read and tenant-scope source contracts.
- Inventory sprint evidence.

## Business Value Protected

Warehouse operators need stock counts to be dependable because count sheets can create inventory adjustments, valuation changes, and serialized lineage updates at reconciliation. Separating read analytics from mutation orchestration makes the count workflow easier to inspect without weakening the transaction-sensitive path.

## Changes

- Added `src/server/functions/inventory/stock-counts-read.ts` for `listStockCounts`, `getStockCount`, `getCountVarianceAnalysis`, and `getCountHistory`.
- Added `src/server/functions/inventory/stock-counts-shared.ts` for the active, tenant-bounded stock-count product join condition used by reads and count-sheet generation.
- Kept `src/server/functions/inventory/stock-counts.ts` as the stable public import surface for existing hooks while narrowing it to planning, lifecycle, count-item mutation, completion delegation, and cancellation.
- Updated stock-count tenant-scope source contracts to check the new read boundary, shared join helper, and preserved public re-export.

## Standards Checked

- Domain ownership: stock-count reads now live in a focused inventory read module; lifecycle mutations remain in the lifecycle module.
- Route -> container/page -> hook -> server function -> schema/database -> query/cache policy: unchanged. Hooks still import from `@/server/functions/inventory/stock-counts`; query keys and cache invalidation are unchanged.
- Tenant isolation: preserved organization predicates for count reads, item joins, product descriptors, warehouse location joins, and mutation locks.
- Transactional inventory and finance integrity: unchanged. Reconciliation still delegates to `completeStockCountReconciliation`; no inventory, cost-layer, valuation, or serialized lineage writes changed.
- Serialized lineage continuity: unchanged; completion helper and serialized/cost-layer source contracts remain intact.
- Query/cache contract: unchanged; stock-count hooks and query normalization tests still exercise the same public server function imports.
- Operator-safe states: unchanged; no UI state or error normalization behavior changed.

## Smells Removed

- Reduced `src/server/functions/inventory/stock-counts.ts` from 921 lines to 569 lines.
- Removed read-only list/detail/history/variance handlers from the stock-count mutation module.
- Removed local duplicate ownership of the stock-count product descriptor join from the mutation module.
- Added a source contract preventing read handlers from drifting back into `stock-counts.ts`.

## Smells Deferred

- `stock-counts.ts` still contains multiple mutation responsibilities: create/update planning, start, item updates, bulk item updates, completion delegation, and cancellation. Future slices could split planning mutations from count execution mutations.
- `stock-counts-read.ts` is 369 lines and may deserve further splitting if variance/history analytics start changing independently from list/detail reads.
- Other inventory server modules remain large: forecasting, serialized items, and locations are still near 900 lines.

## Verification

- `npx eslint src/server/functions/inventory/stock-counts.ts src/server/functions/inventory/stock-counts-read.ts src/server/functions/inventory/stock-counts-shared.ts tests/unit/inventory/stock-count-tenant-scope-contract.test.ts --report-unused-disable-directives` passed.
- `npm run test -- tests/unit/inventory/stock-count-tenant-scope-contract.test.ts tests/unit/inventory/query-normalization-wave3-stock-counts.test.tsx tests/unit/inventory/stock-count-schema-ownership.test.ts` passed: 3 files, 27 tests.
- `git diff --check` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.

## Skipped

- Browser QA was skipped because no rendered UI behavior changed.
- Full `npm run test:unit` was skipped because the changed behavior surface is import/source-boundary preserving and covered by focused stock-count hook/source/schema tests plus full lint/typecheck.

## Goal Adaptation

No standing goal change. This sprint continues the Inventory/Warehouse architecture cleanup by reducing a server monolith along a workflow boundary while preserving public imports and mutation semantics.

## Residual Risk

Low behavior risk because public imports, schemas, query keys, cache invalidation, tenant predicates, reconciliation, and mutation code paths are unchanged. Medium architecture risk remains in stock-count mutation concentration and the other large inventory server modules.
