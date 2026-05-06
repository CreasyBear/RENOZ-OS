# Financial Maintainer Sprint 1

## Slice

Credit note mutation feedback hardening.

## Why This Matters

Credit notes affect customer balances, invoice application, refunds, and reconciliation. Operators should get clear, safe action feedback when issuing, applying, voiding, or generating credit note PDFs. Raw thrown messages at this boundary can leak database/provider internals and make a finance failure harder to recover from.

## Workflow Spine

`/financial/credit-notes`
-> `CreditNotesListContainer`
-> `useCreditNotes` / `useIssueCreditNote` / `useApplyCreditNote` / `useVoidCreditNote` / `useGenerateCreditNotePdf`
-> `src/server/functions/financial/credit-notes.tsx`
-> `_shared/credit-note-read`, `_shared/credit-note-mutations`, `_shared/credit-note-pdf`
-> `creditNotes` / `orders` / `customers`
-> `queryKeys.financial.creditNotes*`, `queryKeys.orders.*`
-> operator-safe success/error toasts.

`/financial/credit-notes/$id`
-> `CreditNoteDetailContainer`
-> same credit note hook and server-function spine
-> detail cache invalidation and retryable operator feedback.

## Issue Raised

The list and detail credit note containers surfaced raw mutation error messages:

- issue credit note
- apply credit note to invoice
- void credit note
- generate credit note PDF

Those actions sit on finance state and should not expose database constraints, stack-shaped client errors, or provider internals.

## Implementation

- Added `src/lib/mutation-error-feedback.ts` as a shared operator-safe mutation feedback primitive.
- Added `src/hooks/financial/_mutation-errors.ts` as the finance-owned credit note wrapper.
- Exported `formatCreditNoteMutationError` from `src/hooks/financial`.
- Wired credit note list and detail mutation toasts through the finance formatter.
- Added a focused contract test for formatter behavior and container wiring.

## Standards Checked

- Domain ownership: finance owns credit note action copy through `src/hooks/financial/_mutation-errors.ts`.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved and documented above.
- Query/cache contract: unchanged; existing credit note and order invalidations remain in `use-credit-notes.ts`, with list-container apply success preserving affected order invalidation.
- Tenant isolation: unchanged; server functions still scope credit note, order, and customer reads/writes by organization.
- Transactional finance integrity: unchanged; apply still updates the credit note and recalculates order financial projection in one transaction.
- UI states: error toasts now distinguish safe operator guidance from unsafe implementation details.
- Diff reviewability: formatter primitive, finance wrapper, two container call sites, one focused test, one closeout doc.

## Smells Removed

- Raw `error.message || ...` mutation toasts in credit note list actions.
- Raw `err.message || ...` mutation toasts in credit note detail actions.
- Repeated finance action fallback copy embedded directly in UI containers.

## Smells Deferred

- Credit note read error presentation still passes `error.message` through the list presenter; it is already fed by `normalizeReadQueryError`, but read-state copy can be audited in a separate finance slice.
- Payment plan route mutation toasts still surface raw messages and should be the next finance feedback slice.
- Existing domain formatters duplicate similar parsing logic; this sprint introduced a shared primitive for finance, but broader consolidation should happen only when touching those domains.

## Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/financial/credit-note-feedback-contract.test.ts` (3 tests).
- Passed: `./node_modules/.bin/vitest run tests/unit/financial` (16 files, 54 tests; existing localstorage-file warning emitted by the test environment).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.

## Goal Adaptation

Accepted the current maintainer-runtime adaptation that serialized gate evidence is closed work and should not appear in routine closeout for unrelated slices. The standing goal still protects serialized lineage when that domain is deliberately touched, but this finance slice does not carry that gate as skipped evidence.

## Residual Risk

The shared mutation feedback primitive is currently exercised through the new finance wrapper. As more domains migrate to it, add direct utility-level tests or refactor existing domain formatter tests onto the shared contract.
