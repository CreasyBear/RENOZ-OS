# Financial Maintainer Sprint 8

## Slice

Invoice payment recording ledger boundary hardening.

## Why This Matters

Recording an invoice payment creates the real cash ledger row that drives order and invoice paid state. A payment write must prove the target order belongs to the operator's organization before inserting the ledger row and recalculating the finance projection.

## Workflow Spine

`/financial/invoices/:id`
-> `InvoiceDetailContainer`
-> `RecordPaymentDialog`
-> `useCreateOrderPayment(invoiceId)`
-> `createOrderPayment`
-> `orders`, `orderPayments`
-> `recalculateOrderFinancialProjection`
-> `queryKeys.orders.payments(orderId)`, payment summary, order detail, invoice detail, invoice lists, invoice summary
-> honest paid/balance state after mutation.

## Issue Raised

`createOrderPayment` used session-only auth and inserted an `orderPayments` row for the submitted `orderId` before explicitly proving that the order was non-deleted and owned by the authenticated organization.

The projection recalculation was already organization-scoped and would reject a missing order, but the mutation boundary should not rely on a later projection step to enforce the ledger target.

## Implementation

- Required `PERMISSIONS.financial.update` for direct payment recording.
- Set `app.organization_id` inside the transaction before the ledger write.
- Added an organization-scoped, non-deleted order existence guard inside the transaction before inserting into `orderPayments`.
- Added `tests/unit/orders/order-payment-ledger-contract.test.ts` to pin the permission, tenant guard, pre-insert ordering, and invoice/order payment cache spine.

## Standards Checked

- Domain ownership: invoice UI still records payments through the order payment ledger, where the cash record belongs.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: mapped and pinned in the source contract test.
- Query/cache contract: unchanged; create payment still invalidates order payment list/summary, order detail, invoice detail, invoice lists, and invoice summary.
- Tenant isolation: strengthened at the mutation boundary with an explicit `orders.organizationId` and `orders.deletedAt` guard before insert.
- Permission boundary: strengthened from authenticated session to `financial.update` for real payment recording.
- Transactional finance integrity: tenant context, order guard, ledger insert, and projection recalculation now run in the same transaction.
- UI states: unchanged; existing dialog feedback formatter remains the operator-facing error boundary.
- Diff reviewability: one server boundary edit, one focused contract test, one closeout note.

## Smells Removed

- Session-only auth for real payment recording.
- Ledger insert attempted before an explicit tenant-owned order guard.
- Payment creation transaction missing local tenant context setup.

## Smells Deferred

- `updateOrderPayment`, `deleteOrderPayment`, and `createRefundPayment` still use session-only auth. They already prove existing payment ownership, but their permission boundary should be reviewed in a separate order-payment administration slice.
- `getOrderPayments` and `getOrderPaymentSummary` scope by payment organization, not by joining the owning order. That may be acceptable for ledger reads, but a future reporting slice should decide whether reads should also prove the order tenant spine.
- Browser QA was not run because this slice changed server authorization/tenant integrity and source contracts, not layout or interaction behavior.

## Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/orders/order-payment-ledger-contract.test.ts` (3 tests).
- Passed: `./node_modules/.bin/vitest run tests/unit/orders` (48 files, 172 tests).
- Passed: `./node_modules/.bin/vitest run tests/unit/financial/finance-projection-trace.test.ts tests/unit/financial/order-amount-breakdown.test.ts` (2 files, 5 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.

## Goal Adaptation

Accepted the goal adaptation that serialized gates are closed work, not a recurring closeout category. Lineage continuity remains a product standard when serialized inventory or warranty lineage is touched; this payment slice did not touch that domain.

## Residual Risk

The direct payment path now protects the create boundary. Existing payment edit/delete/refund permissions should be handled next as a separate, reviewable slice rather than mixed into this payment-recording change.
