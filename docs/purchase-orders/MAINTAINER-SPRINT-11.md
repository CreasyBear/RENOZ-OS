# Purchase Orders Maintainer Sprint 11

## Status

Closed in commit-ready state.

## Issue 1: Bulk Receiving Skipped Row Detail

### Problem

Sprint 10 made bulk receiving honest at the aggregate level by separating received, skipped, and failed counts. The remaining workflow smell was that skipped rows were count-only. If an operator selected several purchase orders and some were already complete, the dialog could say rows were skipped without showing which purchase orders were stale.

### Workflow Spine

Bulk receiving dialog
-> `useBulkReceiveGoods`
-> `bulkReceiveGoods` preparation loop
-> no-pending purchase-order skip detail
-> received/skipped/failed batch result
-> dialog processing summary with itemized skipped rows.

### Touched Domains

- Supplier bulk receive server result contract.
- Supplier bulk receive hook result contract.
- Procurement bulk receiving processing summary.
- Bulk receive source/UI tests.

### Business Value Protected

Bulk receiving is a warehouse speed path. Operators need row-level evidence for rows that did not create receipts so they can trust that stock-in, inventory movement, product cost, and receipt history were not silently changed for already-complete purchase orders.

### Scope Constraints

- Do not change receipt creation, quantity math, serial preflight, tenant predicates, inventory writes, finance/product cost updates, query invalidation, retry-failed behavior, or failed-row error normalization.
- Preserve `processed` as receipt-created count, `skipped` as no-pending count, and `failed` as failed-row count.
- Keep skipped rows informational only; retry remains owned by failed rows.
- Do not run serialized gates for this row-detail/UI summary slice.

### Changes

- Added `skippedDetails` to the bulk receive server result payload.
- Populated `skippedDetails` when a selected purchase order has no pending items to receive.
- Propagated `skippedDetails` through `useBulkReceiveGoods` and the bulk receiving dialog/container contract.
- Added a `Skipped Purchase Orders` processing section that maps skipped row IDs back to operator-visible PO numbers.
- Updated focused tests for the skipped detail contract and visible skipped row summary.

### Standards Checked

- Domain ownership: server owns row result semantics; hook owns mutation/cache side effects; dialog owns operator presentation.
- Route -> container/page -> hook -> server flow: preserved, with only the result payload widened.
- Query/cache policy: no query keys, invalidations, stale times, optimistic updates, or cache ownership changed.
- Tenant isolation/data integrity: server auth and organization predicates are unchanged; skipped rows still create no receipt, inventory movement, or product cost update.
- Inventory/finance integrity: no stock, serialized inventory, receipt, or cost write path changed.
- Serialized lineage: no serial validation, duplicate preflight, serialized mutation code, lineage write, warranty/RMA continuity, or repair script changed.
- UI states/error handling: the completion state now explains both how many rows skipped and which rows skipped.
- Reviewability: the diff is limited to result payload detail, dialog rendering, tests, and this closeout note.

### Smells Removed

- Count-only skipped result that forced operators to infer which purchase orders were already complete.
- Sprint 10 residual risk around missing skipped-row detail.
- Result contract that could represent failed row details but not skipped row details.

### Deferred

- Skipped reasons are currently a single no-pending reason. If future skipped states are introduced, the detail contract can carry additional reason strings without changing the dialog shape.
- Browser QA was not selected because this is source-covered dialog summary rendering with no route, layout, or interaction redesign.

### Gates

- Passed: focused skipped-detail and receiving contracts, `./node_modules/.bin/vitest run tests/unit/suppliers/bulk-receive-goods-row-failure-contract.test.ts tests/unit/suppliers/use-bulk-receive-goods.test.tsx tests/unit/procurement/bulk-receiving-dialog.test.tsx` - 3 files, 10 tests.
- Passed: broader purchase-order/procurement/receive suite, `./node_modules/.bin/vitest run tests/unit/purchase-orders tests/unit/procurement tests/unit/suppliers/bulk-receive-goods-row-failure-contract.test.ts tests/unit/suppliers/use-bulk-receive-goods.test.tsx tests/unit/suppliers/bulk-receive-failure.test.ts tests/unit/suppliers/receive-goods.test.ts tests/unit/suppliers/receive-goods-tenant-scope-contract.test.ts` - 37 files, 111 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for `skippedDetails`, `BulkReceiveSkippedDetail`, `Skipped Purchase Orders`, `No pending items to receive`, preserved `results.skipped++`, completion math, `errorsById`, and `invalid_serial_state`.
- Note: the broader suite still emits the existing `--localstorage-file` jsdom warning; tests pass.
- Skipped: browser QA because this was source-covered dialog summary rendering with no route/layout change.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not deliberately change serialized lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or repair scripts.

### Goal Adaptation

Accepted one operating-policy refinement from the maintainer thread: serialized gates are no longer routine closeout evidence. They should run only for deliberate serialized lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or repair-script changes.

### Residual Risk

Low. The skipped-detail contract currently has one reason class because no-pending is the only skipped state in this workflow. If future skip states are added, they should be added as explicit reason strings and covered by the same server-to-dialog contract.
