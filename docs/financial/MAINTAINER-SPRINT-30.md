# Financial Maintainer Sprint 30

## Slice

Direct order payment reporting freshness contract.

## Why This Matters

Manual order payments, payment edits, payment deletes, and refunds all write or alter `orderPayments` and recalculate order financial projection. Those changes affect order paid-state columns, invoice state, AR aging, outstanding invoices, top-customer outstanding amounts, reminder candidates, dashboard metrics, and cash revenue reporting.

## Business Value Protected

This protects finance operators from stale balances after recording or correcting cash movement. RENOZ should not show a paid or refunded battery order as still collectible in order lists, invoice lists, AR reports, or reminder queues.

## Workflow Spine

Order detail / invoice detail
-> record payment, update payment, delete payment, or refund dialog
-> `useCreateOrderPayment`, `useUpdateOrderPayment`, `useDeleteOrderPayment`, `useCreateRefundPayment`
-> order payment server functions
-> `orderPayments` and order financial projection
-> `orders.paid_amount`, `orders.balance_due`, `orders.payment_status`
-> `invalidateOrderPaymentLedger`
-> order payment list/summary/detail, order detail/list, invoice detail/list/summary, order-balance reporting, and cash revenue reporting.

## Issue Raised

Sprint 29 added a shared financial reporting helper for order-balance-changing payment-plan cash collection. The direct order payment helper still refreshed ledger, order detail, and invoice surfaces only. It also omitted order list and infinite-list caches even though those surfaces display paid-state and balance columns.

## Implementation

- Imported `invalidateOrderBalanceReportingQueries` into the order payment hook.
- Extended `invalidateOrderPaymentLedger` to invalidate finite and infinite order lists.
- Routed all direct ledger mutations through the shared order-balance reporting helper with `includeCashRevenue: true`.
- Preserved existing payment list, payment summary, optional payment detail, order detail, invoice detail, invoice lists, and invoice summary invalidation.
- Extended source and runtime cache contracts for direct payment, payment update, payment delete, and refund flows.

## Standards Checked

- Domain ownership: order payment ledger cache policy remains centralized in `use-order-payments`; financial reporting roots remain owned by the financial helper.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: the protected workflow spine is documented above.
- Query/cache contract: all direct order payment ledger mutations now refresh order, invoice, financial reporting, and cash revenue surfaces.
- Tenant isolation: unchanged; this slice does not alter server predicates.
- Transactional finance integrity: unchanged; this follows the existing transaction-hardened order payment ledger paths.
- UI states: unchanged; affected surfaces refetch through existing query states.
- Operator-safe errors: unchanged; payment/refund dialog error-copy boundaries were not moved.
- Diff reviewability: one hook helper extension, two focused contract tests, one closeout note.

## Smells Removed

- Direct order payment/refund cache policy drifted from the payment-plan cash collection reporting contract.
- Order list and infinite-order list paid-state surfaces were not invalidated after direct ledger mutations.
- Cash-revenue reporting was not refreshed after editing, deleting, or refunding direct order payments.

## Smells Deferred

- RMA refund remedies create refund ledger rows inside the support workflow and should be reviewed against the same reporting helper as a support-owned slice.
- Xero payment reconciliation has its own hook/cache contract and should be evaluated separately because it also owns Xero status caches.
- Browser QA was not run because this slice changes mutation cache policy and tests, not visible layout or interaction behavior.

## Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/orders/order-mutation-invalidation.test.tsx tests/unit/orders/order-payment-ledger-contract.test.ts tests/unit/financial/payment-plan-feedback-contract.test.ts tests/unit/financial/credit-note-feedback-contract.test.ts tests/unit/financial/query-key-contract.test.tsx` (5 files, 29 tests).
- Passed: `./node_modules/.bin/vitest run tests/unit/orders tests/unit/financial` (65 files, 251 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Passed: `git diff --cached --check`.

## Goal Adaptation

Declined further goal changes. Serialized gates remain retired as routine evidence; this slice does not touch serialized lineage continuity.

## Residual Risk

RMA refund remedies and Xero payment reconciliation should be checked next so every local or imported cash movement has an explicit reporting freshness contract.
