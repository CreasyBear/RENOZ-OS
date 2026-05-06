# Financial Maintainer Sprint 29

## Slice

Installment payment reporting freshness contract.

## Why This Matters

Recording an installment payment creates a real `orderPayments` ledger row and recalculates the order financial projection. That changes cash revenue, order balance, AR aging, outstanding invoices, top-customer outstanding amounts, and payment reminder candidate eligibility. Operators should not need a hard refresh after collecting cash against a payment plan.

## Business Value Protected

This protects cash collection accuracy for high-value battery orders and prevents finance operators from reading stale AR, stale payment-plan progress, or stale reminder candidates immediately after recording a customer payment.

## Workflow Spine

`/financial/payment-plans`
-> `useRecordInstallmentPayment`
-> `recordInstallmentPayment`
-> `paymentSchedules`, `orderPayments`, and order financial projection
-> `orders.paid_amount`, `orders.balance_due`, `orders.payment_status`
-> `invalidatePaymentScheduleQueries(..., { refreshReporting: true })`
-> payment schedule list/detail, order detail/list, AR aging, dashboard metrics, outstanding invoices, top customers, reminder candidates, and cash revenue reporting.

## Issue Raised

Sprint 21 centralized payment schedule list/detail invalidation, but recording cash still did not refresh order or reporting surfaces. Sprint 28 added the reporting roots for credit-note application, leaving an obvious duplicated invariant unless payment schedules used the same reporting cache policy.

## Implementation

- Added `src/hooks/financial/_reporting-cache.ts`.
- Moved order-balance reporting invalidation into `invalidateOrderBalanceReportingQueries`.
- Preserved credit-note reporting refresh through the shared helper.
- Added optional cash-revenue invalidation for workflows that write `orderPayments`.
- Extended payment schedule invalidation with `refreshReporting`.
- After recording an installment payment, invalidated order detail/list plus order-balance reporting and cash revenue report families.
- Left create and installment edit mutations on the payment schedule cache path only.
- Extended credit-note and payment-plan source contracts to pin the shared reporting cache boundary.

## Standards Checked

- Domain ownership: financial reporting cache policy is centralized in a financial hook helper.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: the protected workflow spine is documented above.
- Query/cache contract: cash collection now refreshes payment schedule, order, AR, dashboard, outstanding, top-customer, reminder, and revenue report caches.
- Tenant isolation: unchanged; this slice does not alter server predicates.
- Transactional finance integrity: unchanged; this follows the transaction-hardened installment payment path.
- UI states: unchanged; affected surfaces refetch through existing query states.
- Operator-safe errors: unchanged; no error formatter or copy boundary moved.
- Diff reviewability: one shared helper, two hook call sites, two focused source contracts, one closeout note.

## Smells Removed

- Order-balance reporting invalidation lived inline in the credit-note hook instead of a shared financial cache primitive.
- Installment payment recording refreshed payment-plan state but not order or reporting state.
- Cash-revenue reporting had no mutation-side refresh after recording a real order payment.

## Smells Deferred

- Payment-plan create and installment edit do not refresh reporting because they do not write cash payments or recalculate order balances.
- Xero sync status was not invalidated; recording a manual installment payment does not itself run the Xero sync workflow.
- Statement generation remains an explicit history artifact and is not treated as a live reporting cache here.
- Browser QA was not run because this slice changes hook cache policy and tests, not visible layout or interaction behavior.

## Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/financial/payment-plan-feedback-contract.test.ts tests/unit/financial/credit-note-feedback-contract.test.ts tests/unit/financial/query-key-contract.test.tsx tests/unit/financial/finance-projection-trace.test.ts` (4 files, 24 tests).
- Passed: `./node_modules/.bin/vitest run tests/unit/financial` (17 files, 69 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Passed: `git diff --cached --check`.

## Goal Adaptation

Declined further goal changes. The retired serialized-gate adaptation remains in force; this slice does not touch serialized lineage continuity.

## Residual Risk

Other order-balance-changing workflows should be checked against `invalidateOrderBalanceReportingQueries` as they are touched, especially standalone cash payment or refund paths outside payment plans.
