# Financial Maintainer Sprint 12

## Slice

Order payment ledger insert-return guard hardening.

## Why This Matters

Payment and refund creation drive invoice/order paid-state projection. Projection recalculation should only run after the ledger insert returns a concrete row, making the cash movement contract explicit instead of relying on the database to always throw before returning an empty result.

## Workflow Spine

`/orders/:id` and `/financial/invoices/:id`
-> record payment / refund dialogs
-> `useCreateOrderPayment` / `useCreateRefundPayment`
-> `createOrderPayment` / `createRefundPayment`
-> `orderPayments` insert returning
-> projection guard
-> `recalculateOrderFinancialProjection`
-> order/invoice cache invalidation and paid-state refresh.

## Issue Raised

`createOrderPayment` and `createRefundPayment` inserted a ledger row and immediately recalculated the financial projection without explicitly guarding the insert-return result. Insert failures normally throw, but the server contract was not explicit about refusing projection without a ledger row.

## Implementation

- Added `Payment could not be recorded` validation guard after payment insert returning.
- Added `Refund could not be recorded` validation guard after refund insert returning.
- Extended `tests/unit/orders/order-payment-ledger-contract.test.ts` to pin that projection recalculation occurs after the insert-return guards.

## Standards Checked

- Domain ownership: payment creation/refund creation remain in the order payment ledger server module.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: unchanged hook/cache path, clearer server mutation contract.
- Query/cache contract: unchanged; successful mutations still trigger existing hook invalidations.
- Tenant isolation: unchanged from Sprints 8-11.
- Transactional finance integrity: strengthened by making projection dependent on a confirmed ledger row.
- UI states: unchanged; validation errors remain operator-safe and generic.
- Diff reviewability: one server module, one focused contract test extension, one closeout note.

## Smells Removed

- Projection recalculation assuming payment/refund insert returning was always populated.
- Missing explicit failure copy for create/refund insert-return anomalies.

## Smells Deferred

- Payment read permission policy remains deferred as a role-policy slice.
- This does not introduce database-level idempotency for manual payment recording; duplicate payment prevention is a separate product decision.
- Browser QA was not run because this slice changed server failure guards and source contracts, not UI behavior.

## Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/orders/order-payment-ledger-contract.test.ts` (8 tests).
- Passed: `./node_modules/.bin/vitest run tests/unit/orders` (48 files, 177 tests).
- Passed: `./node_modules/.bin/vitest run tests/unit/financial/finance-projection-trace.test.ts tests/unit/financial/order-amount-breakdown.test.ts` (2 files, 5 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.

## Goal Adaptation

Declined goal changes. Serialized gates remain retired for non-serialized slices.

## Residual Risk

The payment ledger creation path now has explicit projection guards. The larger remaining finance-product question is whether manual payment recording needs idempotency or duplicate-detection UX.
