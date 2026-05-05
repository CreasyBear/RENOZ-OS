# Purchase Orders Maintainer Sprint 10

## Status

Closed in commit-ready state.

## Issue 1: Bulk Receiving No-Pending Honesty

### Problem

Bulk receiving counted purchase orders with no pending items as processed. That made a stale or already-received selection look like a successful receipt even though no receipt, inventory movement, or product cost update was created.

### Workflow Spine

Bulk receiving dialog
-> `useBulkReceiveGoods`
-> `bulkReceiveGoods` preparation loop
-> no-pending purchase-order skip accounting
-> received/skipped/failed batch result
-> dialog progress summary and operator toast.

### Touched Domains

- Supplier bulk receive server result accounting.
- Supplier bulk receive hook result/progress contract.
- Procurement bulk receiving processing summary.
- Bulk receive source/UI tests.

### Business Value Protected

Bulk receiving is a warehouse speed path. Operators need the system to distinguish real stock-in from stale rows that have nothing left to receive, otherwise the UI can imply inventory was updated when it was not.

### Scope Constraints

- Do not change `receiveGoods`, receipt creation, prepared receipt payloads, serial preflight, schemas, tenant predicates, quantity math, inventory writes, product cost updates, cache invalidation, failed-row retry flow, or no-pending skip behavior beyond honest accounting.
- Preserve `processed` as receipt-created count and `failed` as failed-row count.
- Preserve `invalid_serial_state` review behavior and `errorsById`.
- Do not run serialized gates for this result-accounting/UI summary slice.

### Changes

- Added `skipped` to the bulk receive server result.
- Changed no-pending purchase orders from `processed++` to `skipped++`.
- Added result message formatting for received/skipped/failed outcomes.
- Added `skipped` to the hook and dialog result contracts.
- Updated progress completion math and processing summary UI to show `Received`, `Skipped`, and `Failed`.
- Added coverage for skipped no-pending accounting, progress callback shape, and dialog skipped-state copy.

### Standards Checked

- Domain ownership: server owns batch result accounting; hook exposes the result contract; dialog presents the operator summary.
- Route -> container/page -> hook -> server flow: unchanged except the result shape now includes `skipped`.
- Query/cache policy: no query keys, invalidations, stale times, or cache contracts changed.
- Tenant isolation/data integrity: no auth boundary, organization predicate, server read/write query, transaction, inventory mutation, product cost update, or tenant assumption changed.
- Inventory/finance integrity: stock-in side effects remain untouched; skipped rows still create no receipt, no inventory movement, and no cost update.
- Serialized lineage: no serial validation, serial preflight, serialized mutation envelope, lineage write, or repair script changed. `invalid_serial_state` code continuity remains covered; serialized gates remain retired as routine evidence.
- UI states/error handling: bulk processing now distinguishes received, skipped, and failed rows instead of implying skipped rows were received.
- Reviewability: the diff is limited to result accounting/message formatting, hook/dialog type propagation, focused tests, and this closeout note.

### Smells Removed

- No-pending purchase orders counted as processed.
- Bulk receive success copy that could claim receipt creation when all selected rows were already complete.
- Processing summary with only total/processed/failed counts.
- Progress callback that could not represent skipped rows.

### Deferred

- Skipped rows are count-only, not listed by PO. A future workflow slice can add skipped row details if operators need to review which POs were already complete.
- Browser QA was not selected because this was result accounting and summary text with focused UI tests, not layout or route behavior.

### Gates

- Passed: focused skipped-accounting and receiving contracts, `./node_modules/.bin/vitest run tests/unit/suppliers/bulk-receive-goods-row-failure-contract.test.ts tests/unit/suppliers/bulk-receive-failure.test.ts tests/unit/suppliers/use-bulk-receive-goods.test.tsx tests/unit/procurement/bulk-receiving-dialog.test.tsx tests/unit/suppliers/receive-goods-serialization.test.ts tests/unit/purchase-orders/query-normalization-wave3d-consumers.test.tsx` - 6 files, 27 tests.
- Passed: broader purchase-order/procurement/receive suite, `./node_modules/.bin/vitest run tests/unit/purchase-orders tests/unit/procurement tests/unit/suppliers/bulk-receive-goods-row-failure-contract.test.ts tests/unit/suppliers/bulk-receive-failure.test.ts tests/unit/suppliers/use-bulk-receive-goods.test.tsx tests/unit/suppliers/receive-goods.test.ts tests/unit/suppliers/receive-goods-tenant-scope-contract.test.ts tests/unit/suppliers/receive-goods-serialization.test.ts` - 38 files, 115 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for `skipped`, `results.skipped++`, `formatBulkReceiveResultMessage`, progress callback shape, dialog skipped summary, preserved `errorsById`, and preserved `invalid_serial_state`.
- Passed: `git diff --check`.
- Note: the broader suite still emits the existing `--localstorage-file` jsdom warning; tests pass.
- Skipped: browser QA because this was result accounting and summary text with no route/layout change.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not deliberately change serialized lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or related repair scripts.

### Goal Adaptation

Declined. The standing maintainer goal already covers honest UI states, receiving/inventory integrity, safe mutation/cache contracts, meaningful tests, and risk-selected evidence.

### Residual Risk

Skipped rows are not itemized in the UI or result metadata. The result contract now distinguishes skipped count, but future operator feedback may justify adding skipped row details.
