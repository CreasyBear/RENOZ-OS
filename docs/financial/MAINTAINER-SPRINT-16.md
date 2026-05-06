# Financial Maintainer Sprint 16

## Slice

Order payment ledger cache contract extraction.

## Why This Matters

Every payment ledger mutation changes order paid state and invoice paid-state context. The hook layer repeated the same order/invoice invalidations across create, update, delete, and refund mutations, which made future payment-ledger changes easier to miss or drift.

## Workflow Spine

`/orders/:id` and `/financial/invoices/:id`
-> payment/refund dialogs
-> `useCreateOrderPayment`, `useUpdateOrderPayment`, `useDeleteOrderPayment`, `useCreateRefundPayment`
-> order payment server mutations
-> `orderPayments` and financial projection
-> `invalidateOrderPaymentLedger`
-> order payment list, payment summary, optional payment detail, order detail, invoice detail/list/summary.

## Issue Raised

The order payment hook duplicated the same cache invalidation contract four times and constructed the payment summary key inline with an array spread.

## Implementation

- Added `queryKeys.orders.paymentSummary(orderId)`.
- Switched `useOrderPaymentSummary` to the centralized summary key.
- Extracted `invalidateOrderPaymentLedger(queryClient, orderId, { paymentId? })`.
- Routed create, update, delete, and refund payment mutation success handlers through the shared helper.
- Extended `tests/unit/orders/order-payment-ledger-contract.test.ts` to pin the helper and summary key contract.
- Extended `tests/unit/orders/order-mutation-invalidation.test.tsx` with functional payment create/update invalidation coverage.

## Standards Checked

- Domain ownership: payment cache policy stays in the order payment hook.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: hook/cache segment extracted and documented above.
- Query/cache contract: strengthened by one summary key and one shared invalidation helper.
- Tenant isolation: unchanged; this slice did not alter server predicates.
- Transactional finance integrity: unchanged; this protects the UI cache reflection of projection changes.
- UI states: unchanged; successful payment mutations still refresh paid-state surfaces.
- Diff reviewability: one query-key addition, one hook extraction, two focused tests, one closeout note.

## Smells Removed

- Repeated payment-ledger invalidation blocks across four mutations.
- Inline payment summary query key construction.
- Payment update cache contract depending on copy-pasted payment detail invalidation.

## Smells Deferred

- Payment read permission policy remains deferred as a role-policy slice.
- Manual payment idempotency/duplicate-detection UX remains deferred as a product decision.
- Browser QA was not run because this slice changed hook cache policy and tests, not UI layout or interaction behavior.

## Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/orders/order-payment-ledger-contract.test.ts tests/unit/orders/order-mutation-invalidation.test.tsx` (2 files, 17 tests).
- Passed: `./node_modules/.bin/vitest run tests/unit/orders` (48 files, 180 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.

## Goal Adaptation

Declined goal changes. Serialized gates remain retired for non-serialized slices.

## Residual Risk

The payment mutation cache policy is now centralized. The next payment-ledger product slice should either decide read permissions or define duplicate-payment prevention behavior.
