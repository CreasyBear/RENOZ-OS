# Financial Maintainer Sprint 28

## Slice

Applied credit-note reporting freshness contract.

## Why This Matters

Applying a credit note changes an order balance, which drives AR aging, financial dashboard AR/overdue metrics, outstanding invoice lists, top-customer outstanding amounts, and payment reminder candidate selection. Transactional mutation correctness is not enough if reporting screens continue showing pre-application balances.

## Business Value Protected

This protects finance operators from chasing already-adjusted invoices, reading stale AR totals, or sending payment reminders for balances that were reduced by an applied credit note.

## Workflow Spine

`/financial/credit-notes`
-> `useApplyCreditNote`
-> `applyCreditNoteToInvoice`
-> `creditNotes` and order financial projection
-> `orders.balance_due`
-> `invalidateCreditNoteQueries(..., { refreshReporting: true })`
-> AR aging, financial dashboard metrics, outstanding invoices, top customers, reminder candidates, credit-note/customer/order caches.

## Issue Raised

Sprint 27 centralized credit-note list/detail/customer/order invalidation, but reporting surfaces were still outside the mutation contract. The query-key factory also lacked explicit reporting roots for several report families, pushing maintainers toward either filter-specific invalidation or broad `financial.all` invalidation.

## Implementation

- Added financial query-key roots for AR aging and dashboard metrics.
- Added explicit list keys under outstanding invoices and top customers while preserving scoped roots for invalidation.
- Added a reminder-candidate root under the reminders query family.
- Routed financial dashboard hooks through the new list keys.
- Extended `invalidateCreditNoteQueries` with a `refreshReporting` option.
- Enabled reporting invalidation only for credit-note application, the lifecycle step that recalculates order balances.
- Invalidated AR aging, dashboard metrics, outstanding invoices, top customers, and reminder candidates after applying a credit note.
- Extended financial source contracts to pin the reporting roots and credit-note reporting refresh behavior.

## Standards Checked

- Domain ownership: financial reporting cache roots live in the central query-key factory.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: the protected workflow spine is documented above.
- Query/cache contract: applied credit notes now refresh transactional and reporting surfaces without broad `financial.all` invalidation.
- Tenant isolation: unchanged; this slice does not alter server predicates.
- Transactional finance integrity: unchanged; this follows the transaction-hardened credit-note application path.
- UI states: unchanged; affected reporting screens will refetch under their existing states.
- Operator-safe errors: unchanged; no error-copy boundary moved.
- Diff reviewability: query-key root cleanup, one hook option, two focused source contracts, one closeout note.

## Smells Removed

- Reporting surfaces depending on order balances were not represented in the credit-note application cache contract.
- Filtered report keys had no clean root keys for scoped invalidation.

## Smells Deferred

- Close readiness invalidation is intentionally not included; the current close-readiness read model checks inventory layer and serialized allocation integrity, not credit-note or order-balance state.
- Revenue-by-period invalidation is intentionally not included; applied credit notes are adjustments, not cash payments or order revenue.
- Statement regeneration freshness is deferred because generated statements are explicit history artifacts, not a live query surface refreshed by credit-note application.
- Browser QA was not run because this slice changes hook cache policy and query-key contracts, not visible layout or interaction behavior.

## Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/financial/credit-note-feedback-contract.test.ts tests/unit/financial/query-key-contract.test.tsx tests/unit/financial/finance-projection-trace.test.ts` (3 files, 21 tests).
- Passed: `./node_modules/.bin/vitest run tests/unit/financial` (17 files, 69 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.

## Goal Adaptation

Accepted the runtime adaptation that serialized gates are retired as routine evidence. This slice does not touch serialized lineage continuity.

## Residual Risk

Payment-plan and cash-payment mutations may need the same reporting freshness review in a later slice so all order-balance-changing finance actions have a consistent reporting cache contract.
