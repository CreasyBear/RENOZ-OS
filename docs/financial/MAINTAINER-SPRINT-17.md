# Financial Maintainer Sprint 17

## Slice

Installment payment ledger concurrency hardening.

## Why This Matters

Payment plans are promises against real order cash. Recording an installment payment must not let two operators validate against the same stale installment balance and then both write ledger rows. The payment schedule, order payment ledger, link table, and order financial projection need to move as one transaction.

## Business Value Protected

This protects cash collection accuracy for high-value battery orders, keeps operator payment-plan work trustworthy, and prevents finance dashboards from reporting paid progress that was created from stale installment state.

## Workflow Spine

`/financial/payment-plans`
-> `useRecordInstallmentPayment`
-> `recordInstallmentPayment`
-> `recordPaymentScheduleInstallmentPayment`
-> tenant-scoped `paymentSchedules` row lock
-> `orderPayments`
-> `paymentSchedulePayments`
-> `recalculateOrderFinancialProjection`
-> payment schedule query invalidation.

## Issue Raised

`recordPaymentScheduleInstallmentPayment` read the installment, checked paid state, and calculated remaining due before opening the transaction. Under concurrent submission, both requests could pass validation before either updated the schedule.

## Implementation

- Moved installment lookup, paid-state validation, remaining-due validation, payment reference calculation, ledger insert, link insert, schedule update, and projection recalculation into one transaction.
- Set tenant context before the locked read.
- Added a row lock on the tenant-scoped installment read.
- Kept the real payment ledger insert before the installment state update.
- Added an explicit guard for the `paymentSchedulePayments` link insert.
- Scoped the installment update by both installment id and organization id.
- Kept activity logging outside the transaction while using the locked before-state and updated after-state returned from the transaction.
- Added source contract coverage for lock -> validate -> ledger insert -> link insert -> schedule update -> projection ordering.

## Standards Checked

- Domain ownership: payment schedule mutation remains in the financial domain while writing to the order payment ledger as the canonical cash record.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: the protected workflow spine is documented above.
- Query/cache contract: unchanged; successful payment recording still invalidates payment schedule queries.
- Tenant isolation: tenant context is set before the locked read, and the schedule read/update predicates include `organizationId`.
- Transactional finance integrity: installment validation, ledger write, link write, schedule update, and financial projection now share one transaction.
- UI states: unchanged; this slice protects the data behind existing states.
- Operator-safe errors: kept existing not-found, already-paid, overpayment, and ledger failure messages; added an explicit link-write failure message.
- Diff reviewability: one server mutation refactor, one focused source contract, one closeout note.

## Smells Removed

- Pre-transaction installment paid-state validation.
- Pre-transaction remaining-due validation.
- Installment update by id without an organization predicate.
- Implicit link-table insert success assumption.

## Smells Deferred

- `updatePaymentScheduleInstallment` still performs its own read-before-write pattern and should be handled as a separate payment-plan edit slice.
- `deletePaymentPlanForOrder` still has separate pre-delete checks and should be handled as a separate plan-removal slice.
- Browser QA was not run because this slice changed server transaction ordering and tests, not UI layout or interaction behavior.

## Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/financial/finance-projection-trace.test.ts tests/unit/financial/payment-plan-feedback-contract.test.ts` (2 files, 9 tests).
- Passed: `./node_modules/.bin/vitest run tests/unit/financial` (17 files, 60 tests).
- Passed: `./node_modules/.bin/vitest run tests/unit/orders` (48 files, 180 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.

## Goal Adaptation

Accepted process correction: retired serialized closeout work should not appear as a routine sprint gate. Lineage evidence belongs only in slices that touch serialized inventory or warranty lineage.

## Residual Risk

The installment payment writer now serializes balance validation and ledger recording. The remaining payment-plan mutation debt is in installment edits and plan deletion, not payment recording.
