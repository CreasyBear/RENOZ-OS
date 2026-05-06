# Financial Maintainer Sprint 13

## Slice

Order payment ledger audit attribution consistency.

## Why This Matters

Payment ledger rows are business records. Operators need to know who recorded the payment event, and maintainers need consistent audit metadata across all payment writers. Scheduled installment payments, Xero payment imports, and RMA refunds already set `createdBy` and `updatedBy`; direct payment and refund recording should follow the same contract.

## Workflow Spine

`/orders/:id` and `/financial/invoices/:id`
-> record payment / refund dialogs
-> `useCreateOrderPayment` / `useCreateRefundPayment`
-> `createOrderPayment` / `createRefundPayment`
-> `orderPayments.recordedBy`, `orderPayments.createdBy`, `orderPayments.updatedBy`
-> `recalculateOrderFinancialProjection`
-> order/invoice cache invalidation and paid-state refresh.

## Issue Raised

Direct order payment and refund inserts set `recordedBy` but left the shared audit columns unset. Other order payment writers already populated `createdBy` and `updatedBy`, so the direct manual path was inconsistent.

## Implementation

- Added `createdBy: ctx.user.id` and `updatedBy: ctx.user.id` to direct payment inserts.
- Added `createdBy: ctx.user.id` and `updatedBy: ctx.user.id` to direct refund inserts.
- Extended `tests/unit/orders/order-payment-ledger-contract.test.ts` to pin direct payment/refund audit attribution.

## Standards Checked

- Domain ownership: audit attribution remains at the order payment ledger server boundary.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: unchanged, with more complete ledger row metadata.
- Query/cache contract: unchanged.
- Tenant isolation: unchanged from the hardened payment spine.
- Transactional finance integrity: unchanged; attribution is written with the same ledger row that drives projection.
- UI states: unchanged; no interaction or layout changes.
- Diff reviewability: one server module, one focused contract test extension, one closeout note.

## Smells Removed

- Manual payment/refund ledger rows missing `createdBy` and `updatedBy`.
- Inconsistent attribution between direct payment recording, scheduled installment payments, Xero imports, and RMA refunds.

## Smells Deferred

- Historic payment rows with missing audit columns are not backfilled. A future data hygiene slice can decide whether to backfill from `recordedBy`.
- Payment read permission policy remains deferred as a role-policy slice.
- Browser QA was not run because this slice changed server row metadata and source contracts, not UI behavior.

## Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/orders/order-payment-ledger-contract.test.ts` (9 tests).
- Passed: `./node_modules/.bin/vitest run tests/unit/orders` (48 files, 178 tests).
- Passed: `./node_modules/.bin/vitest run tests/unit/financial/finance-projection-trace.test.ts tests/unit/financial/order-amount-breakdown.test.ts` (2 files, 5 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.

## Goal Adaptation

Declined goal changes. Serialized gates remain retired for non-serialized slices.

## Residual Risk

New direct ledger rows are now audit-attributed consistently. Historic rows may still have missing `createdBy`/`updatedBy` values until a deliberate backfill is planned.
