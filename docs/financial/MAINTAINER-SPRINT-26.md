# Financial Maintainer Sprint 26

## Slice

Credit-note creation transaction hardening.

## Why This Matters

Creating a credit note starts the correction lifecycle. Customer/order validation, credit-note number generation, and the insert need to agree on the same tenant-scoped state instead of validating relationships before a separate write.

## Business Value Protected

This protects commercial corrections for battery orders from stale customer/order relationships and makes credit-note creation easier to reason about when operators create credits concurrently.

## Workflow Spine

`/financial/credit-notes`
-> `useCreateCreditNote`
-> `createCreditNote`
-> `createCreditNoteRecord`
-> tenant-scoped `customers` row lock
-> optional tenant-scoped `orders` row lock
-> transaction-local credit-note number generation
-> guarded `creditNotes` insert
-> credit-note cache invalidation.

## Issue Raised

`createCreditNoteRecord` validated customer/order relationships before entering the retrying insert path. Credit-note number generation also used the global database executor, so creation did not have one clear transaction boundary for validation, numbering, and insert.

## Implementation

- Moved customer validation, optional order validation, number generation, and insert into one transaction per retry attempt.
- Set tenant context before locked reads.
- Added row locks on the tenant-scoped customer and optional order rows.
- Changed `generateCreditNoteNumber` to accept a `TransactionExecutor`, defaulting to `db` for existing callers.
- Generated the credit-note number using the transaction executor.
- Added an explicit insert-return guard.
- Kept activity logging after the successful transaction using the transaction-returned credit note and customer name.
- Added source contract coverage for transaction -> tenant context -> locks -> transaction-local numbering -> insert -> guard ordering.

## Standards Checked

- Domain ownership: credit-note creation remains in the financial domain.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: the protected workflow spine is documented above.
- Query/cache contract: unchanged; create still invalidates the credit-note query family.
- Tenant isolation: tenant context is set before locked reads, and customer/order predicates include `organizationId`.
- Transactional finance integrity: validation, numbering, and insert now share one transaction attempt.
- UI states: unchanged; this slice protects existing create behavior from stale server acceptance.
- Operator-safe errors: kept existing customer/order/customer-match messages; added an explicit create failure guard.
- Diff reviewability: one server mutation refactor, one numbering helper parameter, one focused source contract, one closeout note.

## Smells Removed

- Pre-transaction customer validation.
- Pre-transaction order validation.
- Number generation tied only to the global database executor.
- Implicit insert success assumption.

## Smells Deferred

- Number generation still relies on duplicate-key retry for first-number and high-concurrency collisions; a sequence-backed allocator would be a broader schema slice.
- Credit-note mutation invalidation remains duplicated in the hook layer and should be centralized next.
- Browser QA was not run because this slice changed server transaction ordering and tests, not UI layout or interaction behavior.

## Gates

- Passed after correcting a compacted-source index assertion: `./node_modules/.bin/vitest run tests/unit/financial/finance-projection-trace.test.ts tests/unit/financial/credit-note-feedback-contract.test.ts` (2 files, 17 tests).
- Passed: `./node_modules/.bin/vitest run tests/unit/financial` (17 files, 68 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.

## Goal Adaptation

Declined goal changes. This completes the credit-note lifecycle transaction-hardening sequence before cache-contract cleanup.

## Residual Risk

Credit-note create, update, issue, apply, and void now have transaction-bound validation around their critical rows. The next credit-note slice should centralize mutation invalidation in the hook layer.
