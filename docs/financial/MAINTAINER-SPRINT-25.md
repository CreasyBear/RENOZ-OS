# Financial Maintainer Sprint 25

## Slice

Credit-note void lifecycle hardening.

## Why This Matters

Voiding a credit note closes out a credit adjustment that should no longer be used. That transition must not validate lifecycle state outside the write transaction and then void a credit note after another operator has applied, voided, or deleted it.

## Business Value Protected

This protects commercial correction workflows for battery orders. Operators can void unused credits, but applied credits remain protected from accidental removal and already-voided credits cannot be rewritten by stale actions.

## Workflow Spine

`/financial/credit-notes`
-> `useVoidCreditNote`
-> `voidCreditNote`
-> `voidCreditNoteRecord`
-> tenant-scoped `creditNotes` row lock
-> applied/voided-state validation
-> tenant-scoped `creditNotes` update
-> credit-note cache invalidation.

## Issue Raised

`voidCreditNoteRecord` read and validated lifecycle state before issuing a separate update by id. The update did not include organization or non-deleted predicates and had no update-return guard.

## Implementation

- Moved credit-note lookup, applied/voided-state validation, void note assembly, and update into one transaction.
- Set tenant context before the locked read.
- Added a row lock on the tenant-scoped credit note.
- Scoped the void update by credit note id, organization id, and non-deleted state.
- Added an explicit update-return guard.
- Kept activity logging outside the transaction while using the locked before-state and voided after-state returned from the transaction.
- Added source contract coverage for transaction -> tenant context -> lock -> lifecycle validation -> update -> guard ordering.

## Standards Checked

- Domain ownership: credit-note void behavior remains in the financial domain.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: the protected workflow spine is documented above.
- Query/cache contract: unchanged; void still invalidates credit-note list/detail queries.
- Tenant isolation: tenant context is set before the locked read, and read/update predicates include `organizationId`.
- Transactional finance integrity: void validation and write now share one transaction.
- UI states: unchanged; this slice protects existing void behavior from stale server acceptance.
- Operator-safe errors: kept existing not-found, applied-credit, and already-voided messages; added an explicit stale-update guard.
- Diff reviewability: one server mutation refactor, one focused source contract, one closeout note.

## Smells Removed

- Pre-write lifecycle validation for voiding credit notes.
- Credit-note void update by id without organization/deleted predicates.
- Implicit update success assumption.

## Smells Deferred

- Credit-note creation still has customer/order validation outside the retrying insert and should be reviewed as a separate creation/idempotency slice.
- Credit-note mutation invalidation remains duplicated in the hook layer and should be centralized after creation is reviewed.
- Browser QA was not run because this slice changed server transaction ordering and tests, not UI layout or interaction behavior.

## Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/financial/finance-projection-trace.test.ts tests/unit/financial/credit-note-feedback-contract.test.ts` (2 files, 16 tests).
- Passed: `./node_modules/.bin/vitest run tests/unit/financial` (17 files, 67 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.

## Goal Adaptation

Declined goal changes. This completes the credit-note update/issue/apply/void lifecycle hardening sequence.

## Residual Risk

Credit-note update, issue, apply, and void are transaction-bound. The remaining lifecycle risk is credit-note creation and numbering/idempotency, followed by credit-note cache invalidation centralization.
