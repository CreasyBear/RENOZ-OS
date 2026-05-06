# Financial Maintainer Sprint 22

## Slice

Credit-note application transaction hardening.

## Why This Matters

Applying a credit note changes the credit-note lifecycle and the target order financial projection. That operation must not validate against stale credit-note or order state, then apply the adjustment after another operator has changed the same record.

## Business Value Protected

This protects order balance accuracy for battery orders where credits are used to resolve overbilling, customer concessions, warranty adjustments, or commercial corrections. A credit note should only become an applied adjustment once its eligibility and target order are locked and verified.

## Workflow Spine

`/financial/credit-notes`
-> `useApplyCreditNote`
-> `applyCreditNoteToInvoice`
-> `applyCreditNoteRecordToInvoice`
-> tenant-scoped `creditNotes` row lock
-> tenant-scoped `orders` row lock
-> credit/customer validation
-> tenant-scoped `creditNotes` update
-> `recalculateOrderFinancialProjection`
-> credit-note/order cache invalidation.

## Issue Raised

`applyCreditNoteRecordToInvoice` read and validated the credit note and order before opening the transaction. The transaction then updated the credit note and recalculated the order projection without tenant context, row locks, a tenant-scoped update predicate, or an update-return guard.

## Implementation

- Moved credit-note lookup, order lookup, status validation, customer validation, apply update, and projection recalculation into one transaction.
- Set tenant context before locked reads.
- Added row locks on the credit note and target order.
- Scoped the apply update by credit note id, organization id, and non-deleted state.
- Added an explicit update-return guard.
- Removed the post-transaction unscoped credit-note reload.
- Kept activity logging outside the transaction while using the locked before-state and updated after-state returned from the transaction.
- Added source contract coverage for transaction -> tenant context -> locks -> validations -> update -> projection ordering.

## Standards Checked

- Domain ownership: credit-note application remains in the financial domain.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: the protected workflow spine is documented above.
- Query/cache contract: unchanged; apply still invalidates credit notes, credit note detail, order detail, and order lists.
- Tenant isolation: tenant context is set before locked reads, and read/update predicates include `organizationId`.
- Transactional finance integrity: credit-note state change and order financial projection now share one transaction.
- UI states: unchanged; this slice protects existing apply behavior from stale server acceptance.
- Operator-safe errors: kept existing not-found, wrong-status, and customer-mismatch messages; added an explicit stale-update guard.
- Diff reviewability: one server mutation refactor, one focused source contract, one closeout note.

## Smells Removed

- Pre-transaction credit-note status validation.
- Pre-transaction target order validation.
- Credit-note apply update by id without organization/deleted predicates.
- Post-transaction credit-note reload by id without tenant predicate.
- Projection recalculation without transaction-local tenant context.

## Smells Deferred

- Credit-note create, update, issue, and void still have their own read-before-write patterns and should be handled as separate lifecycle slices.
- Credit-note mutation invalidation is still duplicated in the hook layer and should be centralized after server lifecycle boundaries are hardened.
- Browser QA was not run because this slice changed server transaction ordering and tests, not UI layout or interaction behavior.

## Gates

- Passed after tightening a brittle source-string assertion: `./node_modules/.bin/vitest run tests/unit/financial/finance-projection-trace.test.ts tests/unit/financial/credit-note-feedback-contract.test.ts` (2 files, 13 tests).
- Passed: `./node_modules/.bin/vitest run tests/unit/financial` (17 files, 64 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.

## Goal Adaptation

Declined goal changes. The sprint process remains domain-sliced: transaction integrity comes before cache cleanup when the same workflow exposes both risks.

## Residual Risk

Credit-note application is now transaction-bound. The next credit-note sprint should choose between lifecycle mutation hardening for issue/void/update or centralizing credit-note cache invalidation after those server contracts are stable.
