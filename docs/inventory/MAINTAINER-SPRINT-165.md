# Inventory Maintainer Sprint 165: Stock Count Layer Evidence

## Status

Closed in commit-ready state.

## Issue 1: Stock Count Reconciliation Omitted Affected Layer IDs

### Problem

`completeStockCount` reconciles quantity variances through FIFO layer consumption or adjustment layer creation, and it already returns `layerDeltas` inside the finance metadata. It did not return `affectedLayerIds`, even though the inventory finance mutation contract names those IDs as part of the standardized mutation envelope.

That made the stock count response weaker than adjustments, receiving, and transfers: a caller could see layer deltas, but not the canonical affected layer ID list expected by the finance contract.

### Workflow Spine

Stock count completion
-> `completeStockCount`
-> locked count
-> locked counted inventory rows
-> snapshot freshness check
-> variance reconciliation
-> FIFO layer consumption or adjustment layer creation
-> valuation recompute
-> finance mutation envelope.

### Touched Domains

- Inventory stock count server function.
- Inventory stock count contract tests.
- Inventory sprint evidence.

### Business Value Protected

Cycle count closeout now returns the same layer evidence shape as other inventory-finance mutations. That makes warehouse reconciliation easier to audit and keeps future cache, reporting, or finance consumers from needing stock-count-specific exceptions.

### Scope Constraints

- Do not change count planning, count item editing, or completion status behavior.
- Do not change FIFO consumption or positive variance cost policy.
- Do not change serialized lineage behavior.
- Do not add new UI behavior in this slice.

### Changes

- Added `affectedLayerIds` tracking to `completeStockCount`.
- Recorded consumed FIFO layer IDs for negative count variances.
- Recorded created adjustment layer IDs for positive count variances.
- Returned `affectedLayerIds` in the stock count finance mutation envelope.
- Added a contract test that protects the layer ID evidence shape.

### Standards Checked

- Domain ownership: stock count remains owner of cycle count reconciliation.
- Route -> container/page -> hook -> server function -> schema/database -> query/cache policy: server response envelope now matches the shared finance contract more closely.
- Tenant isolation/data integrity: unchanged; reconciliation still locks tenant-scoped inventory rows.
- Transactional inventory/finance integrity: layer ID evidence is captured inside the same transaction as quantity, layer, movement, and valuation writes.
- Serialized lineage continuity: unchanged.
- Honest UI/error handling: unchanged.
- Query/cache contract: improved response evidence for future targeted cache/report consumers.
- Reviewability: no behavior change beyond response evidence; focused test added.

### Smells Removed

- Stock count finance envelope returned layer deltas without the standardized `affectedLayerIds` list.
- Negative and positive variance branches did not share a canonical layer ID collection point.

### Deferred

- No browser smoke; this is a server response-envelope slice with source-level contract coverage.
- No broader stock count UX work; operator count states were not touched.
- Positive variance valuation policy remains unchanged.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/inventory/stock-count-tenant-scope-contract.test.ts tests/unit/inventory/stock-mutation-tenant-scope-contract.test.ts tests/unit/inventory/valuation-tenant-scope-contract.test.ts tests/unit/inventory/inventory-finance-helper-tenant-scope-contract.test.ts`
- Passed: `./node_modules/.bin/eslint src/server/functions/inventory/stock-counts.ts tests/unit/inventory/stock-count-tenant-scope-contract.test.ts --report-unused-disable-directives`
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
- Passed: `git diff --check`

### Goal Adaptation

No adaptation needed. This sprint follows the maintainer goal by tightening a small inventory/finance contract without widening the domain scope.

### Residual Risk

Low. This improves mutation evidence only; it does not change stock count reconciliation behavior or valuation policy.
