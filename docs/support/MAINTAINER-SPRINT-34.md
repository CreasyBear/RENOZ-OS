# Support Maintainer Sprint 34

## Slice

RMA credit remedy cache contract.

## Why This Matters

Processing an RMA with a credit remedy creates a financial credit note artifact and, when applied immediately, recalculates the source order balance. The support workflow was refreshing RMA and order detail state only, leaving credit-note, customer, invoice, and financial reporting views dependent on manual refresh or incidental cache expiry.

## Business Value Protected

This protects after-sales support and finance from stale credit-note visibility after battery returns. Operators should be able to process an RMA credit and immediately trust the financial credit-note list/detail views, customer context, source order context, invoice state, AR reporting, and reminder candidates. Applied credits remain adjustments, not cash revenue.

## Workflow Spine

`/support/rmas/$rmaId`
-> `useProcessRma`
-> `processRma`
-> `executeRmaRemedy`
-> credit branch writes `creditNotes` and optionally recalculates the order projection
-> `invalidateCreditNoteQueries`
-> credit-note list/detail, customer detail, order detail/list/infinite-list, and, for applied credits only, invoice and order-balance reporting surfaces.

## Issue Raised

Sprint 33 routed RMA refund remedies through the shared order payment ledger cache contract. RMA credit remedies still created financial credit note artifacts from the support domain without reusing the credit-note cache contract.

## Implementation

- Extracted `invalidateCreditNoteQueries` into `src/hooks/financial/_credit-note-cache.ts`.
- Kept direct credit-note hooks routed through the extracted financial helper.
- Expanded the shared credit-note helper to refresh order infinite lists and invoice caches when a credit is applied.
- Routed `useProcessRma` credit remedies through `invalidateCreditNoteQueries`.
- Preserved refund remedies on `invalidateOrderPaymentLedger` and non-financial remedies on source order detail invalidation.
- Added runtime coverage for issued and applied RMA credit remedy cache behavior.
- Updated the credit-note feedback source contract to pin the extracted helper.

## Standards Checked

- Domain ownership: support owns RMA remedy orchestration; financial owns credit-note cache freshness.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: the protected workflow spine is documented above.
- Query/cache contract: issued credits refresh credit-note/customer/order context; applied credits also refresh invoice and AR reporting context.
- Tenant isolation: unchanged; this slice does not alter server predicates.
- Transactional finance integrity: unchanged; this follows the existing transaction-hardened RMA credit creation path.
- UI states: unchanged; affected views refetch through existing query states.
- Operator-safe errors: unchanged; RMA and credit-note mutation feedback boundaries were not moved.
- Diff reviewability: one helper extraction, one support hook branch, two focused contract updates, one closeout note.

## Smells Removed

- RMA credit remedies duplicated the business effect of credit-note workflows without sharing the financial cache contract.
- Credit-note cache policy lived inside a hook file, making support-owned credit remedy workflows unable to reuse it cleanly.
- Applied credit notes refreshed balance reporting without explicitly refreshing invoice caches.
- Credit-note mutations refreshed finite order lists but missed infinite order lists.

## Smells Deferred

- RMA replacement remedies should be reviewed as a separate replacement-order cache contract slice.
- Xero payment reconciliation still has a separate cache contract because it owns Xero status surfaces as well as payment state.
- Browser QA was not run because this slice changes mutation cache policy and tests, not visible layout or interaction behavior.

## Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/support/use-rma-mutations.test.tsx tests/unit/financial/credit-note-feedback-contract.test.ts tests/unit/financial/query-key-contract.test.tsx tests/unit/financial/finance-projection-trace.test.ts` (4 files, 27 tests).
- Passed: `./node_modules/.bin/vitest run tests/unit/support tests/unit/financial` (84 files, 279 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.

## Goal Adaptation

Accepted the runtime process change: serialized gates are retired as routine sprint evidence. Serialized lineage continuity remains a domain invariant, but lineage-specific evidence is only required when the slice actually touches serialized inventory or lineage behavior. This slice does not.

## Residual Risk

RMA replacement remedies and Xero payment reconciliation remain the next cache-contract risks. Both should be handled as separate slices so support-created artifacts, finance-created artifacts, and imported accounting artifacts each have explicit freshness contracts.
