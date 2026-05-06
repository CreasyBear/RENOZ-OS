# Financial Maintainer Sprint 20

## Slice

Payment-plan creation race hardening.

## Why This Matters

Creating a payment plan establishes the installment structure that operators use to collect deposits and progress payments on high-value battery orders. Two concurrent creates must not both see an empty schedule and insert duplicate plan rows.

## Business Value Protected

This protects order payment terms from duplication and keeps finance operators from seeing competing installment schedules for the same order.

## Workflow Spine

`/financial/payment-plans`
-> create payment plan mutation
-> `createPaymentPlan`
-> `createPaymentPlanForOrder`
-> tenant-scoped `orders` row lock
-> existing `paymentSchedules` check
-> tenant-scoped `paymentSchedules` insert
-> payment schedule query invalidation.

## Issue Raised

`createPaymentPlanForOrder` read the order outside the transaction and then checked for an existing plan inside the transaction without locking a parent row. When no schedule rows existed yet, concurrent create requests could both pass the empty-plan check.

## Implementation

- Moved order lookup into the create transaction.
- Set tenant context before the order read.
- Added a tenant-scoped row lock on the parent order.
- Kept custom installment total validation after the locked order read.
- Kept the existing plan check inside the same transaction.
- Added a lock to the existing plan check when rows are present.
- Added an explicit installment insert-count guard.
- Returned order metadata from the transaction for activity logging without reopening the order read.
- Added source contract coverage for transaction -> tenant context -> order lock -> existing-plan check -> insert -> guard ordering.

## Standards Checked

- Domain ownership: payment plan creation remains in the financial domain.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: the protected workflow spine is documented above.
- Query/cache contract: unchanged; successful creation still flows through existing payment schedule invalidation.
- Tenant isolation: tenant context is set before locked reads, and order/schedule predicates include `organizationId`.
- Transactional finance integrity: create now serializes on the order row and checks/inserts in one transaction.
- UI states: unchanged; this slice prevents duplicate server acceptance behind the existing create UI.
- Operator-safe errors: kept the existing conflict copy and added an explicit insert failure message.
- Diff reviewability: one server creation refactor, one focused source contract, one closeout note.

## Smells Removed

- Pre-transaction order read in payment-plan creation.
- Empty-plan race when no schedule rows existed to lock.
- Implicit assumption that insert returned every generated installment.

## Smells Deferred

- Query invalidation still only refreshes the payment schedule list/detail from the hook and should be reviewed against order detail/invoice surfaces separately.
- Browser QA was not run because this slice changed server transaction ordering and tests, not UI layout or interaction behavior.

## Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/financial/finance-projection-trace.test.ts tests/unit/financial/payment-plan-feedback-contract.test.ts` (2 files, 12 tests).
- Passed: `./node_modules/.bin/vitest run tests/unit/financial` (17 files, 63 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.

## Goal Adaptation

Declined goal changes. This slice closes the payment-plan creation side of the mutation hardening sequence.

## Residual Risk

Payment-plan create, record, edit, and delete paths now use transaction-bound validation around their critical rows. The next payment-plan slice should be cache specificity or a product decision around explicit replacement flows.
