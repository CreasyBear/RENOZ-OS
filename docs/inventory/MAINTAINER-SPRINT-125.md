# Inventory Maintainer Sprint 125: PO Receive Active Product Failure Contract

## Status

Closed in commit-ready state.

## Issue 1: PO Receiving Misclassified Archived Product Blocks As Serial Errors

### Problem

Single and bulk purchase-order receiving already require active, tenant-scoped product rows before stock-in. However, the shared product serialization helper reported missing or archived linked products as an `invalid_serial_state` with serialization-specific copy.

That failed closed, but it sent operators toward serial-number review when the real issue was that the purchase-order line referenced a product that was unavailable or archived.

### Workflow Spine

Purchase-order receiving
-> goods receipt dialog / bulk receiving dialog
-> supplier receiving hooks
-> `receiveGoods` / `bulkReceiveGoods`
-> active tenant-scoped product read
-> shared product receive requirement map
-> transactional inventory movement, cost layers, product cost update, and optional serialized lineage.

### Touched Domains

- Supplier purchase-order receiving server helper.
- Supplier receiving serialization contract tests.
- Inventory stock-in sprint evidence.

### Business Value Protected

PO receiving is a high-value stock-in workflow. Operators need a clear block when a line points at an archived or otherwise unavailable SKU, because receiving that order affects stock truth, valuation, cost layers, and serial lineage.

### Scope Constraints

- Do not rewrite `receiveGoods` or `bulkReceiveGoods` transaction flow.
- Do not change serial-number validation behavior for actual serialized products.
- Do not change hooks, query keys, cache invalidation, movement creation, cost-layer creation, product cost recomputation, or receipt persistence.
- Keep active-product failure closed before stock-in.

### Changes

- Changed unavailable linked products from `invalid_serial_state` to `transition_blocked`.
- Replaced serialization-specific copy with product-availability copy for archived or unavailable PO-line products.
- Extended the focused contract test to assert both single and bulk PO receiving read active tenant-scoped product rows before stock-in.

### Standards Checked

- Domain ownership: supplier receiving product receive requirements stay in the shared supplier helper.
- Route -> container/page -> hook -> server -> schema/database -> query/cache policy: server failure contract hardened; UI and cache contracts unchanged.
- Tenant isolation/data integrity: single and bulk receiving still require tenant-scoped active product rows.
- Transactional inventory/finance integrity: transaction body, movements, cost layers, product cost updates, and receipt writes unchanged.
- Serialized lineage continuity: actual serialized-product validation and lineage writes remain unchanged.
- UI states/error handling: archived/unavailable product failures now return workflow-blocking copy instead of serial-review copy.
- Reviewability: one helper contract update, one focused test update, one closeout note.

### Smells Removed

- Archived or unavailable products in PO lines were classified as serial-state failures.
- Bulk receiving could send operators back to serial review for a product availability block.

### Deferred

- Existing purchase orders that reference archived products may need a dedicated repair or re-link workflow.
- Purchase-order detail UI could show archived product status directly on affected lines; that is a UX/data presentation slice.
- Browser QA was not selected because this is a server failure-contract slice with no intended layout change.

### Gates

- Passed: `bunx vitest run tests/unit/suppliers/receive-goods-serialization.test.ts`.
- Passed: focused ESLint on touched helper and test.
- Passed: `bun run typecheck`.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. Serialized gates remain retired; this sprint preserves serialized lineage continuity and narrows a misleading supplier receiving failure mode.

### Residual Risk

Low. The receive paths already failed closed for inactive products. This sprint changes the classification and regression coverage so future maintainers do not reintroduce a serial-state fallback for product availability blocks.
