# Purchase Orders Maintainer Sprint 5

## Status

Closed in commit-ready state.

## Issue 1: Goods Receipt Mutation Feedback Safety

### Problem

`GoodsReceiptDialog` surfaced raw receive-goods mutation errors in the operator-facing toast. Receiving is where purchase orders become warehouse stock, product cost context, and serialized inventory evidence; failure copy should be safe and actionable without leaking internal exception text.

### Workflow Spine

Purchase-order detail receive dialog
-> selected receipt rows and serial inputs
-> `useReceiveGoods`
-> supplier receive-goods server function
-> purchase-order detail/list/receipts, inventory, and product cache invalidation
-> operator-safe receive failure toast.

### Touched Domains

- Purchase-order goods receipt mutation feedback.
- Supplier receive-goods hook invalidation evidence.
- Receive-goods tenant/serialization contract evidence.

### Business Value Protected

Goods receipt is the handoff from supplier ordering into warehouse truth. Operators need safe receive failure copy when quantity, serial, tenant, permission, or validation rules block stock-in, while the underlying inventory and serialized server contracts remain authoritative.

### Scope Constraints

- Do not change receive-goods server functions, schemas, tenant predicates, serialized validation, quantity math, inventory writes, product cost updates, or receipt payload mapping.
- Do not change success toasts, serial navigation, dialog close behavior, pending guards, validation steps, or dirty-state prompts.
- Do not change receive mutation invalidation policy.
- Do not reopen serialized gates as routine evidence for this UI feedback slice.

### Changes

- Imported `formatPurchaseOrderMutationError` into `GoodsReceiptDialog`.
- Routed receive-goods failure toasts through the purchase-order formatter.
- Added a source contract that pins safe formatter usage and the existing receive-goods cache invalidation spine.

### Standards Checked

- Domain ownership: receive failure copy reuses the purchase-order formatter introduced in Sprint 1.
- Route -> container/page -> hook -> server flow: the receive dialog still maps UI rows to `useReceiveGoods`; the hook still owns mutation/cache behavior; server functions are unchanged.
- Query/cache policy: receive still invalidates purchase-order detail, purchase-order list, purchase-order receipts, inventory all, and products all.
- Tenant isolation/data integrity: receive-goods tenant-scope contracts were rerun; no server function, schema, tenant predicate, quantity update, inventory mutation, product cost update, or transaction changed.
- Inventory/finance integrity: receiving stock-in side effects are untouched; the slice only changes failure feedback.
- Serialized lineage: serialized receive contracts were rerun; no serialized validation, serial payload mapping, or serialized mutation contract changed. Serialized gates remain retired as routine evidence.
- UI states/error handling: safe validation/not-found/permission/serialized validation copy can now reach receiving operators; unsafe infrastructure messages fall back to purchase-order-owned copy.
- Reviewability: the diff is limited to one receive-dialog import/catch branch, one source contract, and this closeout note.

### Smells Removed

- Raw `error.message` receive-goods failure toast.
- Receive-dialog feedback drift from purchase-order list/detail/create/cost mutation feedback.
- Unpinned receive-dialog invalidation expectations in the feedback path.

### Deferred

- Bulk receiving feedback remains owned by the bulk receiving/procurement flow and was not changed here.
- Product serialization error-state copy has a separate helper and was not changed here.
- Browser QA was not selected because this was source-covered toast/error wiring with no layout or interaction behavior change.

### Gates

- Passed: focused receive feedback and receive server contracts, `./node_modules/.bin/vitest run tests/unit/purchase-orders/goods-receipt-mutation-feedback-contract.test.ts tests/unit/purchase-orders/purchase-order-mutation-errors.test.ts tests/unit/purchase-orders/query-normalization-wave3d-consumers.test.tsx tests/unit/purchase-orders/query-normalization-wave3d.test.tsx tests/unit/suppliers/receive-goods-tenant-scope-contract.test.ts tests/unit/suppliers/receive-goods-serialization.test.ts tests/unit/suppliers/receive-goods.test.ts` - 7 files, 33 tests.
- Passed: `./node_modules/.bin/vitest run tests/unit/purchase-orders tests/unit/suppliers/receive-goods.test.ts tests/unit/suppliers/receive-goods-tenant-scope-contract.test.ts tests/unit/suppliers/receive-goods-serialization.test.ts` - 31 files, 89 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for receive formatter usage, removed raw receive `error.message` toast, preserved receive invalidations, and retained receive-goods tenant/serialization contract coverage.
- Passed: `git diff --check`.
- Note: the purchase-order consumer suite still emits the existing `--localstorage-file` jsdom warning; tests pass.
- Skipped: browser QA because this was source-covered mutation feedback wiring with no layout change.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not deliberately change serialized lineage, inventory identity, serialized movement, or related repair scripts. Focused receive serialization contracts were the relevant evidence.

### Goal Adaptation

Accepted in execution, with no new goal text required. The standing sprint process already treats serialized gates as risk-selected evidence, not routine closeout work. This sprint follows that policy: serialized lineage remains an invariant, but the serialized gate pack stays closed unless a slice deliberately changes serialized lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or related repair scripts.

### Residual Risk

The receive dialog is source-contracted rather than exercised through a live receipt submission or API rejection payload. Backend error shapes outside the formatter extraction paths intentionally fall back to purchase-order-owned copy.
