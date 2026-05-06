# Financial Maintainer Sprint 10

## Slice

Order payment read-spine tenant hardening.

## Why This Matters

Payment reads feed order payment tables, refund dialogs, summaries, and invoice paid-state context. After hardening payment writes, the read side should also prove that visible payments belong to an active tenant-owned order, not only to a payment row carrying the current organization id.

## Workflow Spine

`/orders/:id` and `/financial/invoices/:id`
-> payment list/detail/summary hooks
-> `getOrderPayments`, `getOrderPayment`, `getOrderPaymentSummary`
-> `orderPayments` joined to `orders`
-> order payment list, payment detail, and payment summary query keys
-> operator sees only active payments for active tenant-owned orders.

## Issue Raised

Payment list and summary reads scoped by `orderPayments.organizationId`, but they did not prove the submitted `orderId` still belonged to a non-deleted order in the same tenant. Single-payment reads also did not filter soft-deleted payment rows.

## Implementation

- Joined `orderPayments` back to `orders` in payment list, detail, and summary reads.
- Required the joined order to match `ctx.organizationId` and `orders.deletedAt is null`.
- Added `orderPayments.deletedAt is null` to the single-payment detail read.
- Extended `tests/unit/orders/order-payment-ledger-contract.test.ts` to pin the active tenant-owned order read spine.

## Standards Checked

- Domain ownership: payment reads remain in the order payment server module.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: unchanged hook and cache surfaces, strengthened server read contract.
- Query/cache contract: unchanged; read keys still use order payment list/detail/summary keys.
- Tenant isolation: strengthened by proving both payment organization and owning order organization.
- Data integrity: read side now matches the active-order assumptions enforced by the write side.
- Permission boundary: unchanged for reads; this slice deliberately avoided changing who can view payment reads until the broader order-vs-finance read policy is reviewed.
- UI states: unchanged; operators should see the same shape, with soft-deleted/orphaned rows excluded.
- Diff reviewability: one server module, one focused contract test extension, one closeout note.

## Smells Removed

- Payment reads that did not prove the owning order was active and tenant-owned.
- Single-payment detail reads returning soft-deleted payment rows.

## Smells Deferred

- Financial read permissions remain policy debt. Some order operators may need payment context without full finance permissions, so this should be reviewed as a product-role slice rather than changed opportunistically.
- Historic orphaned payment rows, if any exist from old write behavior, are now hidden by reads but not remediated. A future data hygiene task can detect and repair or archive them.
- Browser QA was not run because this slice changed server read predicates and source contracts, not layout or interaction behavior.

## Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/orders/order-payment-ledger-contract.test.ts` (7 tests).
- Passed: `./node_modules/.bin/vitest run tests/unit/orders` (48 files, 176 tests).
- Passed: `./node_modules/.bin/vitest run tests/unit/financial/finance-projection-trace.test.ts tests/unit/financial/order-amount-breakdown.test.ts` (2 files, 5 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.

## Goal Adaptation

Declined goal changes. Serialized gates remain retired for non-serialized slices.

## Residual Risk

The order payment read/write spine is now more consistent. The remaining finance-maintainer debt is role-policy clarity for payment reads and refund concurrency validation under simultaneous refund attempts.
