# Financial Maintainer Sprint 19

## Slice

Payment-plan deletion integrity hardening.

## Why This Matters

Deleting a payment plan removes the operator-facing installment structure for an order. That action must not race with payment recording, and it must not delete a plan once any cash has been recorded against an installment.

## Business Value Protected

This protects commercial battery order finance from losing installment context after deposits or partial payments have been collected. A payment plan can still be removed while it is only a promise, but not after it has become part of the cash trail.

## Workflow Spine

`/financial/payment-plans`
-> delete payment plan mutation
-> `deletePaymentPlan`
-> `deletePaymentPlanForOrder`
-> tenant-scoped `paymentSchedules` row locks for the order
-> recorded-payment validation
-> tenant-scoped `paymentSchedules` delete
-> payment schedule query invalidation.

## Issue Raised

`deletePaymentPlanForOrder` checked only for `status === 'paid'` inside the transaction and read plan type outside the transaction. A partially paid installment can remain `due`, which meant deletion could remove installment structure after cash had already been linked.

## Implementation

- Removed the pre-transaction plan-type read.
- Locked all tenant-scoped installments for the order before deciding whether deletion is allowed.
- Blocked deletion when any locked installment is `paid` or has `paidAmount > 0`.
- Used the locked row set as the delete count and plan-type logging source.
- Kept the delete scoped by order id and organization id.
- Returned the public mutation shape unchanged as `{ deleted }`.
- Added source contract coverage for transaction -> tenant context -> lock -> recorded-payment validation -> delete ordering.

## Standards Checked

- Domain ownership: payment plan removal remains in the financial domain.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: the protected workflow spine is documented above.
- Query/cache contract: unchanged; successful deletion still flows through existing payment schedule invalidation.
- Tenant isolation: tenant context is set before the locked read, and read/delete predicates include `organizationId`.
- Transactional finance integrity: deletion now serializes against payment recording and blocks any recorded installment cash, including partial payments.
- UI states: unchanged; this slice protects existing deletion behavior from accepting stale or financially unsafe state.
- Operator-safe errors: deletion now says recorded installment payments, not only paid installments.
- Diff reviewability: one server mutation refactor, one focused source contract, one closeout note.

## Smells Removed

- Pre-transaction plan-type read for deletion logging.
- Paid-status-only deletion guard that missed partial payments.
- Separate count query after the decision point.

## Smells Deferred

- Payment-plan creation still has broader plan replacement behavior that should be reviewed separately before adding richer payment-plan lifecycle controls.
- Browser QA was not run because this slice changed server transaction ordering and tests, not UI layout or interaction behavior.

## Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/financial/finance-projection-trace.test.ts tests/unit/financial/payment-plan-feedback-contract.test.ts` (2 files, 11 tests).
- Passed: `./node_modules/.bin/vitest run tests/unit/financial` (17 files, 62 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.

## Goal Adaptation

Declined goal changes. This completes the payment-plan mutation hardening sequence started in sprints 17 and 18.

## Residual Risk

The record, edit, and delete payment-plan mutation paths now serialize around installment rows. The next financial/product slice should review payment-plan creation/replacement semantics and query invalidation specificity.
