# Financial Maintainer Sprint 23

## Slice

Credit-note issue lifecycle hardening.

## Why This Matters

Issuing a credit note turns a draft adjustment into a usable financial instrument. That transition must not validate draft state outside the write transaction and then issue a credit note after another operator has changed or deleted it.

## Business Value Protected

This protects commercial correction workflows for battery orders. Operators can trust that only current draft credit notes become issued credits that can later be applied to order balances.

## Workflow Spine

`/financial/credit-notes`
-> `useIssueCreditNote`
-> `issueCreditNote`
-> `issueCreditNoteRecord`
-> tenant-scoped `creditNotes` row lock
-> draft-state validation
-> tenant-scoped `creditNotes` update
-> credit-note cache invalidation.

## Issue Raised

`issueCreditNoteRecord` read and validated the credit note before issuing a separate update by id. The update did not include the organization or non-deleted predicates and had no return guard.

## Implementation

- Moved issue lookup, draft-state validation, and issued-state update into one transaction.
- Set tenant context before the locked read.
- Added a row lock on the tenant-scoped credit note.
- Scoped the issue update by credit note id, organization id, and non-deleted state.
- Added an explicit update-return guard.
- Kept activity logging outside the transaction while using the locked before-state and issued after-state returned from the transaction.
- Added source contract coverage for transaction -> tenant context -> lock -> draft validation -> update -> guard ordering.

## Standards Checked

- Domain ownership: credit-note issue behavior remains in the financial domain.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: the protected workflow spine is documented above.
- Query/cache contract: unchanged; issue still invalidates credit-note list/detail queries.
- Tenant isolation: tenant context is set before the locked read, and read/update predicates include `organizationId`.
- Transactional finance integrity: issue validation and write now share one transaction.
- UI states: unchanged; this slice protects existing issue behavior from stale server acceptance.
- Operator-safe errors: kept existing not-found and draft-only messages; added an explicit stale-update guard.
- Diff reviewability: one server mutation refactor, one focused source contract, one closeout note.

## Smells Removed

- Pre-write draft-state validation for issuing credit notes.
- Issue update by id without organization/deleted predicates.
- Implicit update success assumption.

## Smells Deferred

- Credit-note update and void still have their own read-before-write patterns and should be handled as separate lifecycle slices.
- Credit-note mutation invalidation is still duplicated in the hook layer and should be centralized after server lifecycle boundaries are hardened.
- Browser QA was not run because this slice changed server transaction ordering and tests, not UI layout or interaction behavior.

## Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/financial/finance-projection-trace.test.ts tests/unit/financial/credit-note-feedback-contract.test.ts` (2 files, 14 tests).
- Passed: `./node_modules/.bin/vitest run tests/unit/financial` (17 files, 65 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.

## Goal Adaptation

Declined goal changes. This continues the credit-note lifecycle sequence after sprint 22 hardened application.

## Residual Risk

Credit-note issue and application are transaction-bound. Update and void remain the next lifecycle mutations to harden before centralizing credit-note cache invalidation.
