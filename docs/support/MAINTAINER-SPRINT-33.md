# Support Maintainer Sprint 33

## Slice

RMA refund remedy cache contract.

## Why This Matters

Processing an RMA with a refund remedy creates a real refund ledger row and recalculates the source order financial projection. That support-owned workflow changes order balance and cash reporting just like a direct refund, but the support hook only refreshed RMA and order detail state.

## Business Value Protected

This protects after-sales support and finance from stale order balances after a battery return refund. Operators should be able to complete an RMA refund and trust order payment history, invoice state, AR reporting, reminder candidates, and cash revenue reporting without a manual refresh.

## Workflow Spine

`/support/rmas/$rmaId`
-> `useProcessRma`
-> `processRma`
-> `executeRmaRemedy`
-> refund branch writes `orderPayments` and recalculates order projection
-> `invalidateOrderPaymentLedger`
-> order payment list/summary, order detail/list, invoice detail/list/summary, order-balance reporting, and cash revenue reporting.

## Issue Raised

Sprint 30 aligned direct order payment and refund mutations with the shared financial reporting helper. RMA refund remedies still created refund ledger artifacts through the support workflow without reusing that cache contract.

## Implementation

- Extracted `invalidateOrderPaymentLedger` into `src/hooks/orders/_order-payment-cache.ts`.
- Kept direct order payment hooks routed through the extracted helper.
- Routed `useProcessRma` refund remedies through `invalidateOrderPaymentLedger`.
- Preserved non-refund RMA remedy behavior as RMA list/detail plus source order detail refresh.
- Added runtime coverage for refund remedy cache invalidation and a non-refund guard.
- Updated the order payment ledger source contract to pin the extracted helper.

## Standards Checked

- Domain ownership: order payment cache policy is owned by an order hook helper; support reuses it only when it creates a refund payment artifact.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: the protected workflow spine is documented above.
- Query/cache contract: RMA refunds now refresh payment ledger, order, invoice, financial reporting, and cash revenue surfaces.
- Tenant isolation: unchanged; this slice does not alter server predicates.
- Transactional finance integrity: unchanged; this follows the existing transaction-hardened RMA refund ledger path.
- UI states: unchanged; affected surfaces refetch through existing query states.
- Operator-safe errors: unchanged; RMA remedy feedback boundaries were not moved.
- Diff reviewability: one helper extraction, one support hook branch, two focused tests, one closeout note.

## Smells Removed

- RMA refund remedies duplicated the business effect of direct refunds without sharing the direct refund cache contract.
- Order payment cache policy lived inside a hook file, making it harder for support-owned refund workflows to reuse.

## Smells Deferred

- RMA credit remedies create credit note artifacts and should be reviewed as a separate credit-note cache contract slice.
- Xero payment reconciliation still has a separate cache contract because it owns Xero status surfaces as well as payment state.
- Browser QA was not run because this slice changes mutation cache policy and tests, not visible layout or interaction behavior.

## Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/support/use-rma-mutations.test.tsx tests/unit/orders/order-mutation-invalidation.test.tsx tests/unit/orders/order-payment-ledger-contract.test.ts tests/unit/financial/payment-plan-feedback-contract.test.ts tests/unit/financial/credit-note-feedback-contract.test.ts tests/unit/financial/query-key-contract.test.tsx` (6 files, 33 tests).
- Passed: `./node_modules/.bin/vitest run tests/unit/support tests/unit/orders tests/unit/financial` (132 files, 459 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Passed: `git diff --cached --check`.

## Goal Adaptation

Declined further goal changes. Serialized gates remain retired as routine evidence; this slice does not touch serialized lineage continuity.

## Residual Risk

RMA credit remedies and Xero payment reconciliation should be checked next so refund, credit, and imported payment artifacts all have explicit cache freshness contracts.
