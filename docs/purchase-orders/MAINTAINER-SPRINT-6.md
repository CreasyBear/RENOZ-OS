# Purchase Orders Maintainer Sprint 6

## Status

Closed in commit-ready state.

## Issue 1: Bulk Receiving Root Failure Feedback Ownership

### Problem

Bulk receiving still had a raw mutation failure path. The `useBulkReceiveGoods` hook surfaced `error.message` directly, and `BulkReceivingDialog` also toasted caught `onConfirm` rejections. When a root bulk receive mutation failed, operators could see unsafe infrastructure text and potentially duplicate failure toasts.

### Workflow Spine

Receiving dashboard selected purchase orders
-> bulk receiving dialog selection/serial review
-> `useBulkReceiveGoods`
-> `bulkReceiveGoods` server function
-> purchase-order receiving, receipt, inventory, and product cache invalidation
-> single operator-safe root failure toast from the mutation owner.

### Touched Domains

- Procurement bulk receiving dialog feedback ownership.
- Supplier bulk receive mutation hook feedback.
- Purchase-order mutation error formatting.
- Bulk receive mutation/cache contract tests.

### Business Value Protected

Bulk receiving is an operator speed path for supplier intake. When the batch fails before per-row results are available, the operator needs safe, workflow-specific guidance without seeing database internals or duplicate toasts while warehouse stock-in remains unchanged.

### Scope Constraints

- Do not change `bulkReceiveGoods`, `receiveGoods`, schemas, tenant predicates, serial validation, receipt payload mapping, quantity math, inventory writes, product cost updates, or serialized mutation envelopes.
- Do not change success or partial-failure result toasts.
- Do not change bulk receive cache invalidation policy.
- Do not run serialized gates for this feedback ownership slice.

### Changes

- Added `formatPurchaseOrderBulkReceiveMutationError` for bulk receive root failures.
- Routed `useBulkReceiveGoods` root `onError` through the formatter.
- Kept the bulk receiving dialog responsible for returning to review state after rejection, but removed its raw duplicate toast.
- Exported the new formatter from the purchase-order hooks barrel.
- Added tests for workflow-specific bulk receive code messages, unsafe server message suppression, and presenter no-toast ownership.

### Standards Checked

- Domain ownership: purchase-order mutation formatting owns purchase-order receiving failure copy; the mutation hook owns server failure feedback.
- Route -> container/page -> hook -> server flow: receiving dashboard and dialog still call the bulk receive hook through `onConfirm`; server functions are unchanged.
- Query/cache policy: bulk receive still invalidates purchase-order list/status/receiving summary/pending approvals, affected purchase-order detail/items/receipts, inventory all, and products all.
- Tenant isolation/data integrity: no server function, auth boundary, database predicate, quantity update, inventory mutation, product cost update, or transaction changed.
- Inventory/finance integrity: stock-in side effects remain owned by existing receive server functions; this slice only changes feedback handling for root mutation failures.
- Serialized lineage: no serialized validation, serial preflight, serialized mutation envelope, or repair script changed. Focused receive serialization tests were rerun; serialized gates remain retired as routine evidence.
- UI states/error handling: root bulk receive failures now produce one safe hook-owned toast, and the dialog returns to review without leaking raw exception copy.
- Reviewability: the diff is limited to formatter/helper export, one hook error branch, one dialog catch branch, tests, and this closeout note.

### Smells Removed

- Raw `error.message` bulk receive mutation toast.
- Duplicate presenter and hook ownership of root bulk receive failure toasts.
- Missing workflow-specific formatting for `invalid_serial_state` and `transition_blocked` root bulk receive errors.

### Deferred

- Per-row bulk receive failure copy still uses server-returned row error strings because those are part of the batch result contract; a separate slice can normalize row-level copy if operators report noisy row messages.
- Product serialization read error helper still has a generic `error.message` extractor; it remains a separate read-state slice.
- Browser QA was not selected because this was source-covered mutation feedback ownership with no layout or interaction behavior change beyond avoiding an extra toast.

### Gates

- Passed: focused bulk receiving feedback and receive contracts, `./node_modules/.bin/vitest run tests/unit/suppliers/use-bulk-receive-goods.test.tsx tests/unit/procurement/bulk-receiving-dialog.test.tsx tests/unit/purchase-orders/purchase-order-mutation-errors.test.ts tests/unit/purchase-orders/goods-receipt-mutation-feedback-contract.test.ts tests/unit/purchase-orders/query-normalization-wave3d-consumers.test.tsx tests/unit/purchase-orders/query-normalization-wave3d.test.tsx tests/unit/suppliers/receive-goods-serialization.test.ts` - 7 files, 30 tests.
- Passed: broader purchase-order/procurement/receive suite, `./node_modules/.bin/vitest run tests/unit/purchase-orders tests/unit/procurement tests/unit/suppliers/use-bulk-receive-goods.test.tsx tests/unit/suppliers/receive-goods.test.ts tests/unit/suppliers/receive-goods-tenant-scope-contract.test.ts tests/unit/suppliers/receive-goods-serialization.test.ts` - 35 files, 103 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for bulk receive formatter usage, removal of raw bulk receive root toast, preserved invalidations, and presenter no-toast ownership coverage.
- Passed: `git diff --check`.
- Note: the broader suite still emits the existing `--localstorage-file` jsdom warning; tests pass.
- Skipped: browser QA because this was feedback ownership wiring with no visual layout change.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not deliberately change serialized lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or related repair scripts.

### Goal Adaptation

Declined. The standing maintainer goal and sprint process already cover safe mutation contracts, operator-safe errors, receiving/inventory awareness, risk-selected evidence, and retired routine serialized gates.

### Residual Risk

The root failure path is unit/source-covered rather than exercised against a live server rejection. Row-level failure messages remain server-result copy and should be reviewed separately if they prove noisy in real bulk receiving operations.
