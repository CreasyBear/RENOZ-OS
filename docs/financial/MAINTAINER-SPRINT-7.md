# Financial Maintainer Sprint 7

## Slice

Bulk invoice operation feedback hardening.

## Why This Matters

Bulk invoice actions can send customer reminders or update finance status across many invoices at once. Operators need safe aggregate feedback, safe per-invoice failure records, and one clear toast path rather than duplicate or raw error messages.

## Workflow Spine

`/financial/invoices`
-> `InvoiceListContainer`
-> `InvoiceBulkOperationsDialog`
-> `useBulkSendReminders` / `useBulkUpdateInvoiceStatus`
-> `sendInvoiceReminder` / `updateInvoiceStatus`
-> `orders`, `customers`, `emailHistory`
-> `queryKeys.invoices.lists`, `queryKeys.invoices.summary`, `queryKeys.invoices.detail(id)`
-> operator-safe aggregate feedback.

## Issue Raised

Bulk invoice operations had three feedback weaknesses:

- per-invoice batch failures stored raw thrown messages in `BulkOperationResult.errors`
- bulk hook `onError` handlers surfaced raw thrown messages
- the dialog catch path could add a second raw toast after the hook already handled failure feedback

## Implementation

- Added bulk-level invoice actions to `formatInvoiceMutationError`.
- Sanitized per-invoice batch failure records via the invoice formatter.
- Routed bulk reminder/status top-level failures through invoice-owned formatter actions.
- Removed the dialog-level raw failure toast so the owning mutation hook remains the single feedback boundary.
- Added `tests/unit/invoices/invoice-bulk-feedback-contract.test.ts`.

## Standards Checked

- Domain ownership: bulk invoice copy lives in `src/hooks/invoices/_mutation-errors.ts`.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved and documented above.
- Query/cache contract: unchanged; bulk operations still invalidate invoice lists, invoice summary, and selected invoice detail keys.
- Tenant isolation: unchanged; bulk operations still delegate to tenant-scoped reminder/status server functions.
- Permission boundary: preserved from prior invoice sprints; both delegated server mutations require `financial.update`.
- Transactional finance integrity: unchanged; this slice did not alter invoice status persistence or reminder email history semantics.
- UI states: failure feedback now has one hook-owned toast path; dialog remains open for retry on failure.
- Diff reviewability: one formatter extension, one hook sanitization change, one dialog catch cleanup, one focused test, one closeout doc.

## Smells Removed

- Raw per-invoice batch error strings.
- Raw bulk reminder/status top-level error toasts.
- Duplicate dialog-level failure toast after hook-level bulk mutation failure handling.

## Smells Deferred

- Bulk operation result details are not currently displayed to the operator; if surfaced later, the stored `errors` field is now safer but still needs deliberate UX.
- Bulk status updates still allow status choices that individual invoice transition validation may reject per row; a preflight eligibility UX can be a future slice.
- Invoice payment-recording feedback remains outside this bulk invoice path.

## Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/invoices/invoice-bulk-feedback-contract.test.ts` (3 tests).
- Passed: `./node_modules/.bin/vitest run tests/unit/invoices` (5 files, 15 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.

## Goal Adaptation

Declined goal changes. This sprint applies the standing maintainer posture with focused invoice-domain evidence.

## Residual Risk

Sanitized per-row errors preserve safe workflow guidance but do not yet provide structured remediation grouping. A future operator UX pass should group rejected rows by reason before showing them.
