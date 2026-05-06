# Financial Maintainer Sprint 11

## Slice

Order payment refund concurrency hardening.

## Why This Matters

Refunds are negative cash movement against a prior payment. The remaining refundable balance must be calculated at the same transactional boundary that writes the refund, otherwise simultaneous refund attempts can both pass validation against stale totals.

## Workflow Spine

`/orders/:id` and `/financial/invoices/:id`
-> refund payment dialog
-> `useCreateRefundPayment`
-> `createRefundPayment`
-> locked original `orderPayments` row
-> refund total validation
-> refund ledger insert
-> `recalculateOrderFinancialProjection`
-> order payment list/summary and invoice/order paid-state invalidation.

## Issue Raised

`createRefundPayment` proved the original payment and calculated existing refunds before opening the transaction that inserted the new refund. The checks were tenant-scoped, but they were not protected against concurrent refund attempts for the same original payment.

## Implementation

- Moved original-payment lookup into the refund write transaction.
- Locked the original payment row with `SELECT FOR UPDATE` via Drizzle `.for("update")`.
- Moved existing-refund total calculation and remaining-balance validation into the same transaction after the lock.
- Kept transaction tenant context before all refund reads/writes.
- Updated `tests/unit/orders/order-payment-ledger-contract.test.ts` to pin the transaction/lock/validation/write ordering.
- Updated `tests/unit/orders/order-payments-refund.test.ts` so its transaction mock executes the callback and exercises transactional validation.

## Standards Checked

- Domain ownership: refund behavior remains in the order payment ledger server module.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: unchanged hook/cache spine, strengthened server mutation contract.
- Query/cache contract: unchanged; refund hook still invalidates payment, order, and invoice cache surfaces.
- Tenant isolation: preserved with transaction tenant context and tenant-scoped original/refund predicates.
- Transactional finance integrity: strengthened by serializing refunds on the original payment row before balance validation and insert.
- UI states: unchanged; existing refund dialog feedback remains the operator-facing boundary.
- Diff reviewability: one server mutation, one contract test extension, one focused test mock update, one closeout note.

## Smells Removed

- Refund remaining-balance validation outside the write transaction.
- Concurrent refund attempts validating against stale refund totals.
- Focused refund unit test transaction mock that did not execute the server transaction body.

## Smells Deferred

- Refund insert does not currently add an explicit affected-row guard because insert returning already drives the returned object; broader payment-ledger insert failure semantics can be reviewed with create-payment failure handling.
- Payment read permission policy remains deferred as a role-policy slice.
- Browser QA was not run because this slice changed server transaction behavior and tests, not UI interaction or layout behavior.

## Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/orders/order-payment-ledger-contract.test.ts tests/unit/orders/order-payments-refund.test.ts` (2 files, 8 tests).
- Passed: `./node_modules/.bin/vitest run tests/unit/orders` (48 files, 176 tests).
- Passed: `./node_modules/.bin/vitest run tests/unit/financial/finance-projection-trace.test.ts tests/unit/financial/order-amount-breakdown.test.ts` (2 files, 5 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.

## Goal Adaptation

Declined goal changes. Serialized gates remain retired for non-serialized slices.

## Residual Risk

Refunds now validate at the write boundary. The next finance-maintainer slice should either clarify payment read permissions or tighten failure handling for payment/refund insert returning behavior.
