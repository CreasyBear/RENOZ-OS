# Financial Maintainer Sprint 21

## Slice

Payment schedule mutation cache contract extraction.

## Why This Matters

Payment-plan operators work from the order-specific schedule detail surface. Creating, editing, or recording against a plan must refresh both the broad payment schedule workbench and the specific order schedule cache.

## Business Value Protected

This protects operators from stale installment promises after they create a plan, edit terms, or record a payment. Finance screens should reflect the latest payment schedule state without relying on manual refresh.

## Workflow Spine

`/financial/payment-plans`
-> `useCreatePaymentPlan`, `useUpdateInstallment`, `useRecordInstallmentPayment`
-> payment schedule server functions
-> `paymentSchedules`
-> `invalidatePaymentScheduleQueries`
-> payment schedule list/workbench and order-specific schedule detail cache.

## Issue Raised

`useCreatePaymentPlan` invalidated both list and detail queries, while `useUpdateInstallment` and `useRecordInstallmentPayment` invalidated only the broad schedule list. The server already returns `orderId` for edit and record mutations, so the hook had enough context to refresh the detail cache.

## Implementation

- Added `invalidatePaymentScheduleQueries(queryClient, orderId?)`.
- Routed create, update, and record payment mutations through the shared helper.
- Used `variables.orderId` for create.
- Used `result.orderId` for update and record payment.
- Extended the payment-plan hook/source contract to pin the shared helper and detail invalidation behavior.

## Standards Checked

- Domain ownership: payment schedule cache policy stays in the financial hook.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: the protected workflow spine is documented above.
- Query/cache contract: list and detail invalidation now share one helper.
- Tenant isolation: unchanged; this slice did not alter server predicates.
- Transactional finance integrity: unchanged; this protects UI reflection of the transaction-hardened server paths.
- UI states: unchanged; this reduces stale detail state after successful mutations.
- Operator-safe errors: unchanged; existing mutation error formatter remains the boundary.
- Diff reviewability: one hook extraction, one focused source contract, one closeout note.

## Smells Removed

- Divergent invalidation behavior between create and update/record mutations.
- Repeated list invalidation blocks in payment schedule mutations.
- Detail cache staying stale even though mutation results had `orderId`.

## Smells Deferred

- There is still no exported delete payment plan hook in `use-payment-schedules`; adding one should wait until a UI flow actually needs deletion.
- Browser QA was not run because this slice changed hook cache policy and tests, not UI layout or interaction behavior.

## Gates

- Passed after correcting an obsolete inline-key assertion: `./node_modules/.bin/vitest run tests/unit/financial/payment-plan-feedback-contract.test.ts tests/unit/financial/finance-projection-trace.test.ts` (2 files, 12 tests).
- Passed: `./node_modules/.bin/vitest run tests/unit/financial` (17 files, 63 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.

## Goal Adaptation

Declined goal changes. This slice completes the payment-plan mutation hardening follow-through by aligning the hook cache contract with the server transaction work.

## Residual Risk

Create, update, record, and delete server mutations are hardened, and create/update/record hook invalidation is centralized. Delete remains server-only until the product exposes a deletion workflow.
