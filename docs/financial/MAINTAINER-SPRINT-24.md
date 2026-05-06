# Financial Maintainer Sprint 24

## Slice

Credit-note update lifecycle hardening.

## Why This Matters

Draft credit notes can still change amount, GST, reason, and internal notes before issue. Those edits must not validate draft state outside the write transaction and then mutate a credit note after another operator has issued, applied, voided, or deleted it.

## Business Value Protected

This protects correction workflows for battery orders. Operators can edit draft credit notes while they are still proposals, but issued or otherwise changed credits should not accept stale edits.

## Workflow Spine

`/financial/credit-notes`
-> update credit note mutation
-> `updateCreditNote`
-> `updateCreditNoteRecord`
-> tenant-scoped `creditNotes` row lock
-> draft-state validation
-> tenant-scoped `creditNotes` update
-> credit-note cache invalidation.

## Issue Raised

`updateCreditNoteRecord` read and validated draft state before issuing a separate update by id. The update did not include organization or non-deleted predicates and had no update-return guard.

## Implementation

- Kept deterministic update payload and GST recalculation before the transaction.
- Moved credit-note lookup, draft-state validation, and update into one transaction.
- Set tenant context before the locked read.
- Added a row lock on the tenant-scoped credit note.
- Scoped the update by credit note id, organization id, and non-deleted state.
- Added an explicit update-return guard.
- Kept activity logging outside the transaction while using the locked before-state and updated after-state returned from the transaction.
- Added source contract coverage for transaction -> tenant context -> lock -> draft validation -> update -> guard ordering.

## Standards Checked

- Domain ownership: credit-note update behavior remains in the financial domain.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: the protected workflow spine is documented above.
- Query/cache contract: unchanged; update is server-facing today and should be wired through the existing credit-note invalidation pattern when exposed.
- Tenant isolation: tenant context is set before the locked read, and read/update predicates include `organizationId`.
- Transactional finance integrity: update validation and write now share one transaction.
- UI states: unchanged; this slice protects existing server behavior from stale acceptance.
- Operator-safe errors: kept existing not-found and draft-only messages; added an explicit stale-update guard.
- Diff reviewability: one server mutation refactor, one focused source contract, one closeout note.

## Smells Removed

- Pre-write draft-state validation for credit-note edits.
- Credit-note update by id without organization/deleted predicates.
- Implicit update success assumption.

## Smells Deferred

- Credit-note void still has its own read-before-write pattern and should be the next lifecycle slice.
- Credit-note mutation invalidation remains duplicated in the hook layer and should be centralized after void is hardened.
- Browser QA was not run because this slice changed server transaction ordering and tests, not UI layout or interaction behavior.

## Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/financial/finance-projection-trace.test.ts tests/unit/financial/credit-note-feedback-contract.test.ts` (2 files, 15 tests).
- Passed: `./node_modules/.bin/vitest run tests/unit/financial` (17 files, 66 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.

## Goal Adaptation

Declined goal changes. This continues the credit-note lifecycle sequence after issue and application hardening.

## Residual Risk

Credit-note update, issue, and application are transaction-bound. Void remains the next lifecycle mutation to harden before centralizing credit-note cache invalidation.
