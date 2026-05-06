# Financial Maintainer Sprint 18

## Slice

Installment edit concurrency hardening.

## Why This Matters

Payment-plan edits change due dates, promised amounts, GST, descriptions, and operator notes for commercial battery orders. Those edits must not race with payment recording and mutate an installment after it has become paid.

## Business Value Protected

This protects finance and operations from changing the terms of an installment after cash has already been collected against it. Operators can trust that paid installments are closed accounting facts, not editable promises.

## Workflow Spine

`/financial/payment-plans`
-> `useUpdateInstallment`
-> `updateInstallment`
-> `updatePaymentScheduleInstallment`
-> tenant-scoped `paymentSchedules` row lock
-> paid-state validation
-> tenant-scoped `paymentSchedules` update
-> payment schedule query invalidation.

## Issue Raised

`updatePaymentScheduleInstallment` read and validated the installment before issuing a separate update by id. A concurrent payment could mark the installment paid between validation and write.

## Implementation

- Kept deterministic update payload assembly outside the transaction.
- Moved installment lookup, paid-state validation, and update into one transaction.
- Set tenant context before the locked read.
- Added a row lock on the tenant-scoped installment read.
- Scoped the installment update by both installment id and organization id.
- Added an explicit update-return guard.
- Kept activity logging outside the transaction while using the locked before-state and updated after-state returned from the transaction.
- Added source contract coverage for transaction -> tenant context -> lock -> paid-state validation -> update -> guard ordering.

## Standards Checked

- Domain ownership: payment schedule edit behavior remains in the financial domain.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: the protected workflow spine is documented above.
- Query/cache contract: unchanged; successful installment edits still invalidate payment schedule queries.
- Tenant isolation: tenant context is set before the locked read, and the schedule read/update predicates include `organizationId`.
- Transactional finance integrity: edit validation and write now share one transaction, preventing paid-state races.
- UI states: unchanged; this slice protects existing edit behavior from stale server acceptance.
- Operator-safe errors: kept existing not-found and paid-installment conflict messages; added an explicit stale-write guard.
- Diff reviewability: one server mutation refactor, one focused source contract, one closeout note.

## Smells Removed

- Pre-write paid-state validation for installment edits.
- Installment edit update by id without an organization predicate.
- Implicit update success assumption.

## Smells Deferred

- `deletePaymentPlanForOrder` still has separate pre-delete checks and should be handled as a separate plan-removal slice.
- Browser QA was not run because this slice changed server transaction ordering and tests, not UI layout or interaction behavior.

## Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/financial/finance-projection-trace.test.ts tests/unit/financial/payment-plan-feedback-contract.test.ts` (2 files, 10 tests).
- Passed: `./node_modules/.bin/vitest run tests/unit/financial` (17 files, 61 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.

## Goal Adaptation

Declined goal changes. The sprint process correction from sprint 17 stands: retired serialized closeout work is not a routine gate unless the slice touches serialized inventory or warranty lineage.

## Residual Risk

Installment payment recording and installment edits now serialize around the installment row. Payment-plan deletion remains the remaining mutation with meaningful concurrency debt.
