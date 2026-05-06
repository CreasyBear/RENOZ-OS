# Financial Maintainer Sprint 2

## Slice

Payment plan mutation feedback hardening.

## Why This Matters

Payment plans are collection promises attached to real order balances. Recording an installment payment creates ledger state, updates the schedule, and recalculates the order financial projection. Operators need clear recovery guidance when those actions fail, without exposing database constraints, stack-shaped client errors, or provider internals.

## Workflow Spine

`/financial/payment-plans`
-> `PaymentPlansPage`
-> `PaymentPlansList`
-> `usePaymentSchedule` / `useCreatePaymentPlan` / `useRecordInstallmentPayment` / `useOverdueInstallments`
-> `src/server/functions/financial/payment-schedules.ts`
-> `_shared/payment-plan-generation`, `_shared/payment-schedule-mutations`, `_shared/payment-schedule-read`
-> `orders`, `paymentSchedules`, `orderPayments`, `paymentSchedulePayments`
-> `queryKeys.financial.paymentSchedules*`
-> operator-safe success/error toasts.

## Issue Raised

The payment plans route surfaced raw mutation errors for:

- creating a payment plan
- recording an installment payment

Those actions belong to cash collection and order finance integrity. Raw thrown messages can leak implementation detail and make a failed payment action feel less trustworthy.

## Implementation

- Extended `src/hooks/financial/_mutation-errors.ts` with `formatPaymentPlanMutationError`.
- Exported the payment-plan formatter from `src/hooks/financial`.
- Replaced raw route mutation toasts with finance-owned formatter calls.
- Added `tests/unit/financial/payment-plan-feedback-contract.test.ts` to cover unsafe internals, safe workflow guidance, and route/hook/server wiring.

## Standards Checked

- Domain ownership: finance owns payment-plan action copy through `src/hooks/financial/_mutation-errors.ts`.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved and documented above.
- Query/cache contract: unchanged; create invalidates the payment schedule family and order detail schedule key; record-payment invalidates the payment schedule family.
- Tenant isolation: unchanged; server functions still use authenticated financial permissions and organization-scoped schedule/order predicates.
- Transactional finance integrity: unchanged; installment payment recording still creates the order payment, links it to the schedule, updates the installment, and recalculates the order financial projection inside one transaction.
- UI states: mutation failures now separate safe operator guidance from unsafe implementation detail.
- Diff reviewability: one finance formatter extension, one route import/call-site change, one focused test, one closeout doc.

## Smells Removed

- Raw `error.message || ...` mutation toasts in payment-plan create and record-payment actions.
- Repeated payment-plan fallback copy embedded directly in the route container.

## Smells Deferred

- Payment plan read error copy still displays `error.message` from the presenter. The hook currently normalizes read failures, but read-state presentation deserves its own finance read-state pass.
- Credit-note creation under `/financial/credit-notes` still has raw create feedback and should be handled as a separate credit-note create slice.
- Broader financial dashboard/read-state messages still expose raw read errors in places and should be triaged separately from mutation feedback.

## Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/financial/payment-plan-feedback-contract.test.ts` (3 tests).
- Passed: `./node_modules/.bin/vitest run tests/unit/financial` (17 files, 57 tests; existing localstorage-file warning emitted by the test environment).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.

## Goal Adaptation

Declined goal changes. This sprint applies the standing maintainer posture with focused finance-domain evidence.

## Residual Risk

The shared mutation feedback primitive now supports credit-note and payment-plan wrappers. Before migrating other domains, add more direct utility coverage or move existing domain formatter tests onto the shared contract deliberately.
