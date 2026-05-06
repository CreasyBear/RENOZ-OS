# Financial Maintainer Sprint 9

## Slice

Order payment administration permission and tenant-write hardening.

## Why This Matters

After direct payment recording was hardened, the remaining order payment administration mutations still relied on session-only authentication. Updating, deleting, or refunding a payment changes cash ledger state and recalculates invoice/order paid state, so those operations need explicit finance permissions and tenant-scoped writes.

## Workflow Spine

`/orders/:id` and `/financial/invoices/:id`
-> order payment dialogs and payment controls
-> `useUpdateOrderPayment`, `useDeleteOrderPayment`, `useCreateRefundPayment`
-> `updateOrderPayment`, `deleteOrderPayment`, `createRefundPayment`
-> `orderPayments`
-> `recalculateOrderFinancialProjection`
-> order payment list/summary, order detail, invoice detail/list/summary invalidation
-> corrected paid/balance state after administration.

## Issue Raised

The server mutations for payment update, soft delete, and refund creation checked existing payment ownership, but they still used bare `withAuth()` and some writes only scoped by payment id after the pre-check.

## Implementation

- Required `PERMISSIONS.financial.update` for payment update.
- Required `PERMISSIONS.financial.delete` for payment soft delete.
- Required `PERMISSIONS.financial.update` for refund creation.
- Set `app.organization_id` inside update, delete, and refund transactions before ledger writes.
- Carried `orderPayments.organizationId` and `orderPayments.deletedAt is null` into update and delete write predicates.
- Added affected-row guards for update and delete write races.
- Extended `tests/unit/orders/order-payment-ledger-contract.test.ts` to pin the payment administration permission and tenant-write contract.

## Standards Checked

- Domain ownership: payment administration remains in the order payment ledger server module.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: unchanged from Sprint 8 and still pinned by the ledger contract test.
- Query/cache contract: unchanged; existing hooks still invalidate payment, order, and invoice cache surfaces after administration mutations.
- Tenant isolation: strengthened by tenant-scoped write predicates and transaction tenant context.
- Permission boundary: strengthened from session-only auth to explicit finance update/delete permissions.
- Transactional finance integrity: payment writes and projection recalculation still occur in one transaction per mutation.
- UI states: unchanged; this slice did not alter dialogs or feedback copy.
- Diff reviewability: one server module, one focused contract test extension, one closeout note.

## Smells Removed

- Session-only auth for payment update, soft delete, and refund mutations.
- Payment update/delete writes scoped only by id after ownership pre-check.
- Missing affected-row guards for update/delete write races.

## Smells Deferred

- Payment read functions still scope by payment organization without joining back to the owning order; a future read/reporting slice should decide whether order-spine proof is required for reads.
- Refund creation still performs original-payment and refund-total checks before opening the write transaction. A future concurrency slice can evaluate whether refund-total validation should move into the transaction with stronger locking.
- Browser QA was not run because this slice changed server authorization and write contracts, not UI behavior.

## Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/orders/order-payment-ledger-contract.test.ts` (6 tests).
- Passed: `./node_modules/.bin/vitest run tests/unit/orders` (48 files, 175 tests).
- Passed: `./node_modules/.bin/vitest run tests/unit/financial/finance-projection-trace.test.ts tests/unit/financial/order-amount-breakdown.test.ts` (2 files, 5 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.

## Goal Adaptation

Declined goal changes. The Sprint 8 adaptation still stands: serialized gates are closed work and only return when a future slice touches serialized lineage.

## Residual Risk

The order payment write boundary is now permissioned and tenant-scoped. The next finance-maintainer opportunity is either read-spine consistency for payment reads/reporting or transaction-strength validation for refund concurrency.
