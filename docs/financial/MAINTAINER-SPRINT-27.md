# Financial Maintainer Sprint 27

## Slice

Credit-note mutation cache contract extraction.

## Why This Matters

Credit-note mutations affect multiple operator surfaces: credit-note lists/details, customer finance context, and order balance context when a credit note is tied or applied to an order. That cache policy should live in the financial hook instead of being patched from individual containers.

## Business Value Protected

This protects finance operators from stale credit-note and order-balance views after creating, issuing, applying, or voiding credit notes. The UI should reflect the transaction-hardened server state without each screen remembering a different invalidation recipe.

## Workflow Spine

`/financial/credit-notes`
-> `useCreateCreditNote`, `useApplyCreditNote`, `useIssueCreditNote`, `useVoidCreditNote`
-> credit-note server functions
-> `creditNotes`
-> `invalidateCreditNoteQueries`
-> credit-note list/detail, customer detail, source order detail, applied order detail, and order lists.

## Issue Raised

`useCreateCreditNote`, `useApplyCreditNote`, `useIssueCreditNote`, and `useVoidCreditNote` repeated partial invalidation blocks. The list container added manual order invalidation after apply because the hook contract did not own the full workflow cache impact.

## Implementation

- Added `invalidateCreditNoteQueries(queryClient, options)`.
- Centralized invalidation for the credit-note query family.
- Invalidated credit-note detail when a mutation has a credit note id.
- Invalidated customer detail when a mutation result includes `customerId`.
- Invalidated source and applied order details when a mutation result includes `orderId` or `appliedToOrderId`.
- Invalidated order lists when any order detail is affected.
- Routed create, apply, issue, and void hooks through the shared helper.
- Removed manual apply invalidation from the credit-note list container.
- Extended the credit-note feedback/source contract to pin the helper and ensure containers no longer patch the cache manually.

## Standards Checked

- Domain ownership: credit-note cache policy is centralized in the financial hook.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: the protected workflow spine is documented above.
- Query/cache contract: list/detail/customer/order invalidation now has one helper.
- Tenant isolation: unchanged; this slice did not alter server predicates.
- Transactional finance integrity: unchanged; this protects UI reflection of the transaction-hardened lifecycle.
- UI states: unchanged; successful mutations now refresh affected surfaces consistently.
- Operator-safe errors: unchanged; the mutation error formatter remains the boundary.
- Diff reviewability: one hook extraction, one container cleanup, one focused source contract, one closeout note.

## Smells Removed

- Repeated credit-note invalidation blocks across mutation hooks.
- Manual order invalidation in `CreditNotesListContainer` after apply.
- Create mutation refreshing only the credit-note family despite returning customer/order context.

## Smells Deferred

- PDF generation remains a download-only mutation and does not update cached credit-note state.
- Broader financial dashboard and AR-aging invalidation should be reviewed as a reporting freshness slice, not folded into credit-note lifecycle cleanup.
- Browser QA was not run because this slice changed hook cache policy and tests, not UI layout or interaction behavior.

## Gates

- Passed after removing an unnecessary order-id cast from the helper: `./node_modules/.bin/vitest run tests/unit/financial/credit-note-feedback-contract.test.ts tests/unit/financial/finance-projection-trace.test.ts` (2 files, 17 tests).
- Passed after the helper type cleanup: `./node_modules/.bin/vitest run tests/unit/financial` (17 files, 68 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.

## Goal Adaptation

Declined goal changes. This completes the credit-note transaction-hardening follow-through by aligning the hook cache contract with server behavior.

## Residual Risk

Credit-note lifecycle mutations are transaction-bound and hook invalidation is centralized. The next financial slice should review reporting freshness for dashboards, AR aging, and close readiness after credit-note changes.
