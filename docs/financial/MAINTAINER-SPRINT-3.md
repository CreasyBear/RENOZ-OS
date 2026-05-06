# Financial Maintainer Sprint 3

## Slice

Credit note creation feedback and pending-state hardening.

## Why This Matters

Creating a credit note is the first finance step before issuing, applying, refunding, or reconciling customer credit. When creation fails, operators should see safe recovery guidance and keep their entered form data rather than losing the dialog before the server result returns.

## Workflow Spine

`/financial/credit-notes`
-> `CreditNotesPage`
-> `CreateCreditNoteDialog`
-> `useCreateCreditNote`
-> `src/server/functions/financial/credit-notes.tsx`
-> `_shared/credit-note-mutations`
-> `customers`, `orders`, `creditNotes`
-> `queryKeys.financial.creditNotes()`
-> operator-safe success/error toasts.

`/financial/invoices/$invoiceId`
-> `InvoiceDetailContainer`
-> `CreateCreditNoteDialog`
-> `useCreateCreditNote`
-> same credit-note server-function spine
-> invoice detail refetch and operator-safe success/error toasts.

## Issue Raised

Credit note creation still had raw mutation feedback in two active entry points:

- the credit notes page create dialog
- the invoice detail create-credit-note action

The shared create dialog also closed itself immediately after submit. On a server-side failure, an operator could lose context and entered values before seeing the error.

## Implementation

- Added `create` to the finance-owned credit note mutation formatter.
- Replaced raw create-credit-note mutation toasts in the credit notes page and invoice detail container.
- Updated `CreateCreditNoteDialog` so submit delegates to the parent mutation and waits for the parent to close it on success.
- Added explicit form reset when the dialog is closed by the parent, preserving input during failed pending mutations.
- Extended `tests/unit/financial/credit-note-feedback-contract.test.ts` to cover create feedback wiring and dialog pending-state behavior.

## Standards Checked

- Domain ownership: finance owns credit-note creation copy through `src/hooks/financial/_mutation-errors.ts`.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved and documented above.
- Query/cache contract: unchanged; `useCreateCreditNote` still invalidates the financial credit-note family.
- Tenant isolation: unchanged; credit note creation still validates customer/order ownership under the authenticated organization.
- Transactional finance integrity: unchanged; this slice did not alter credit note persistence, order projection, or payment ledgers.
- Honest UI states: create dialog no longer closes before mutation success; pending guards remain active while the mutation runs.
- Diff reviewability: one formatter action, two create call sites, one shared dialog behavior fix, one focused test extension, one closeout doc.

## Smells Removed

- Raw `error.message || 'Failed to create credit note'` toasts in active credit-note creation workflows.
- Premature dialog close on credit-note create submit.
- Create action missing from the finance-owned credit note formatter contract.

## Smells Deferred

- Credit note read error presentation still deserves a separate read-state audit.
- Invoice PDF/void mutation feedback still uses raw messages in invoice detail and should be handled in an invoice-owned slice.
- The legacy `CreditNotesList` presenter remains unused and still owns some local dialog state; leave broader deletion or consolidation for a deliberate cleanup slice.

## Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/financial/credit-note-feedback-contract.test.ts` (3 tests).
- Passed: `./node_modules/.bin/vitest run tests/unit/financial` (17 files, 57 tests; existing localstorage-file warning emitted by the test environment).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.

## Goal Adaptation

Declined goal changes. This sprint applies the standing maintainer posture with focused finance-domain evidence and a small honest-state fix.

## Residual Risk

The shared dialog is used from financial invoice detail as well as the credit notes page. Both active parents close it on success, but any future caller must do the same or provide an explicit success callback.
