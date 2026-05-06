# Financial Maintainer Sprint 4

## Slice

Invoice detail mutation feedback hardening.

## Why This Matters

Invoices are customer-facing finance documents. Generating the invoice PDF and voiding an invoice are operator-visible actions that should fail with clear, safe guidance instead of leaking database, document-generation, or implementation details.

## Workflow Spine

`/financial/invoices/$invoiceId`
-> `InvoiceDetailContainer`
-> `useGenerateOrderInvoice`
-> `src/server/functions/documents/generate-documents-sync.tsx`
-> generated document persistence/storage
-> order/invoice document cache invalidation
-> operator-safe success/error toast.

`/financial/invoices/$invoiceId`
-> `InvoiceDetailContainer`
-> `useVoidInvoice`
-> `src/server/functions/invoices/void-invoice.ts`
-> `orders.invoiceStatus`
-> `queryKeys.invoices.detail`, `queryKeys.invoices.lists`, `queryKeys.orders.lists`
-> operator-safe success/error toast.

## Issue Raised

Invoice detail still surfaced raw mutation errors for:

- generating an invoice PDF
- voiding an invoice

These actions sit on finance presentation and customer-account state. Raw thrown messages can expose implementation detail and make recovery unclear.

## Implementation

- Added `src/hooks/invoices/_mutation-errors.ts` with `formatInvoiceMutationError`.
- Exported the formatter from `src/hooks/invoices`.
- Wired invoice detail PDF generation and void-invoice error toasts through the invoice formatter.
- Added `tests/unit/invoices/invoice-detail-feedback-contract.test.ts` to cover unsafe internals, safe workflow guidance, route/container wiring, cache invalidation, tenant guard evidence, and document-generation wiring.

## Standards Checked

- Domain ownership: invoice mutation copy now lives in the invoice hook boundary.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved and documented above.
- Query/cache contract: unchanged; invoice void still invalidates invoice detail/list keys and order list keys; invoice PDF generation still invalidates resolved order document views.
- Tenant isolation: unchanged; void invoice still filters by organization and deleted state before mutation.
- Transactional finance integrity: unchanged; this slice did not alter payment, projection, credit, invoice status, or document persistence semantics.
- UI states: mutation failures now use operator-safe invoice feedback.
- Diff reviewability: one invoice formatter, one container wiring change, one focused test, one closeout doc.

## Smells Removed

- Raw `error.message || 'Failed to generate PDF'` toast in invoice detail.
- Raw `error.message || 'Failed to void invoice'` toast in invoice detail.
- Missing invoice-owned formatter boundary for detail mutations.

## Smells Deferred

- Invoice send-reminder and bulk invoice operations still have raw mutation feedback and should be handled in separate invoice slices.
- Invoice read-state and payment-recording feedback can be audited separately.
- Order detail still owns its own document-generation feedback; this sprint did not consolidate cross-domain document feedback.

## Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/invoices/invoice-detail-feedback-contract.test.ts` (3 tests).
- Passed: `./node_modules/.bin/vitest run tests/unit/invoices tests/unit/documents/use-generate-order-documents.test.tsx` (3 files, 9 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.

## Goal Adaptation

Declined goal changes. This sprint applies the standing maintainer posture with focused invoice/finance evidence.

## Residual Risk

The invoice formatter currently covers detail PDF and void actions only. Reminder sending, bulk updates, and payment recording need their own action-specific copy before the invoice domain can be considered fully hardened.
