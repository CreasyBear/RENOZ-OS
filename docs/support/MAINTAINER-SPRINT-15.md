# Support Maintainer Sprint 15

## Slice

RMA refund remedy ledger hardening.

## Why This Matters

RMA refund remedies create negative cash ledger rows that drive order and invoice paid state. They must follow the same financial integrity contract as direct refunds: require finance authority, lock the source payment before refund balance validation, confirm the refund insert returned a row, and only then recalculate projection.

## Workflow Spine

`/support/rmas/:id`
-> process RMA remedy
-> `processRma`
-> `executeRmaRemedy`
-> `createRefundArtifact`
-> locked source `orderPayments` row
-> refund total validation
-> refund `orderPayments` insert returning
-> insert-return guard
-> `updateOrderPaymentStatus`
-> RMA canonical artifact link and order/invoice paid-state projection.

## Issue Raised

RMA refund remedies were already inside the outer RMA process transaction and wrote audit attribution, but the helper did not require a finance permission, did not lock the source payment before computing remaining refundable balance, and did not guard refund insert returning before projection recalculation.

## Implementation

- Required `PERMISSIONS.financial.update` for RMA refund artifact creation.
- Locked the source payment row with `.for('update')` before refund-total validation.
- Added `Refund could not be recorded.` validation guard before projection recalculation.
- Extended `tests/unit/support/rma-remedy-execution-transaction.test.ts` to assert source-payment locking and no projection when insert returning is empty.
- Extended `tests/unit/support/rma-workflow-trace-contract.test.ts` to pin the RMA refund ledger safety contract.

## Standards Checked

- Domain ownership: RMA process remains support-owned; cash ledger creation remains explicit inside the order payment ledger path.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: route/process spine documented above; RMA response uses persisted artifact links.
- Query/cache contract: unchanged; this slice did not alter client cache behavior.
- Tenant isolation: preserved by the outer RMA transaction tenant context and tenant-scoped payment predicates.
- Transactional finance integrity: strengthened by lock-before-validation and insert-return-before-projection ordering.
- Permission boundary: strengthened from support update alone to support update plus finance update for refund cash movement.
- UI states: unchanged; remedy result surfaces the same canonical artifact structure.
- Diff reviewability: one shared RMA execution helper, two focused support tests, one closeout note.

## Smells Removed

- RMA refund cash movement without explicit finance permission.
- RMA refund remaining-balance validation without source-payment lock.
- RMA refund projection recalculation without a refund insert-return guard.

## Smells Deferred

- RMA credit-note and replacement-order paths were not broadened in this slice.
- Support-role UX for users who can process RMAs but lack finance update remains a product-policy follow-up.
- Browser QA was not run because this slice changed server permission/transaction contracts, not UI behavior.

## Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/support/rma-remedy-execution-transaction.test.ts tests/unit/support/rma-workflow-trace-contract.test.ts` (2 files, 9 tests).
- Passed: `./node_modules/.bin/vitest run tests/unit/support` (67 files, 207 tests).
- Passed: `./node_modules/.bin/vitest run tests/unit/orders` (48 files, 178 tests; rerun alone after unrelated concurrent-load timeouts).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.

## Goal Adaptation

Declined goal changes. Serialized gates remain retired for non-serialized slices; this RMA slice touched payment ledger integrity, not serialized inventory lineage.

## Residual Risk

RMA refund cash movement is now aligned with the hardened payment ledger contract. The remaining product question is how to present finance-permission blockers to support operators in the RMA remedy UI.
