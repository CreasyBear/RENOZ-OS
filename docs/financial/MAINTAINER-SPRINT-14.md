# Financial Maintainer Sprint 14

## Slice

Xero payment reconciliation ledger boundary hardening.

## Why This Matters

Xero payment webhooks create real payment ledger rows that drive invoice and order paid state. That external integration path should follow the same ledger contract as direct payment recording: set tenant context inside the transaction, prove the insert returned a row, and only then recalculate financial projection.

## Workflow Spine

Xero payment webhook
-> `applyXeroPaymentWebhookEvent`
-> `applyXeroPaymentUpdate`
-> `xeroPaymentEvents` dedupe record
-> `orderPayments` insert returning
-> insert-return guard
-> `updateOrderPaymentStatus`
-> `orders` paid/balance projection
-> `xeroPaymentEvents.resultState`.

## Issue Raised

`applyXeroPaymentUpdate` already deduped Xero payment events and attributed payment rows, but the transaction did not set local tenant context and did not guard the order payment insert result before recalculating the financial projection.

## Implementation

- Set `app.organization_id` inside the Xero payment apply transaction.
- Changed the Xero `orderPayments` insert to return the inserted ledger id.
- Added `Xero payment could not be recorded` validation guard before projection recalculation.
- Updated `tests/unit/financial/xero-payment-reconciliation-behavior.test.ts` to execute transaction inserts through `.returning`, assert attribution/tenant execution, and reject empty insert-return results.
- Extended `tests/unit/financial/finance-projection-trace.test.ts` to pin Xero ledger insert -> guard -> projection ordering.

## Standards Checked

- Domain ownership: Xero reconciliation remains in the financial integration shared module.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: webhook path is not route-driven; server function -> ledger -> projection -> event result state is now documented and pinned.
- Query/cache contract: no TanStack cache surface is involved in webhook processing; invoice/order reads pick up projection state.
- Tenant isolation: strengthened by setting transaction tenant context before Xero ledger reads/writes.
- Transactional finance integrity: strengthened by requiring a concrete ledger insert before projection recalculation.
- UI states: unchanged; webhook result state remains `applied`, `rejected`, `duplicate`, or `unknown_invoice`.
- Diff reviewability: one server module, two focused tests, one closeout note.

## Smells Removed

- Xero payment apply transaction missing local tenant context.
- Projection recalculation after Xero payment insert without an explicit insert-return guard.
- Test double for Xero reconciliation inserts that did not exercise `.returning`.

## Smells Deferred

- Xero event dedupe insertion and result-state updates occur outside the payment apply transaction by design; a future integration reliability slice can evaluate stuck `processing` event recovery.
- Historic Xero payment rows with incomplete metadata are not backfilled.
- Browser QA was not run because this slice changed webhook server behavior and tests, not UI behavior.

## Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/financial/xero-payment-reconciliation-behavior.test.ts tests/unit/financial/finance-projection-trace.test.ts` (2 files, 10 tests).
- Passed: `./node_modules/.bin/vitest run tests/unit/financial` (17 files, 59 tests).
- Passed: `./node_modules/.bin/vitest run tests/unit/orders` (48 files, 178 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.

## Goal Adaptation

Declined goal changes. Serialized gates remain retired for non-serialized slices.

## Residual Risk

Xero payment application now follows the payment ledger projection contract. The remaining integration risk is operational recovery for events left in `processing` if a non-validation error interrupts payment application.
