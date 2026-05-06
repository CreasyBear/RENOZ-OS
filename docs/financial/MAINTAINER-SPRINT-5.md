# Financial Maintainer Sprint 5

## Slice

Invoice reminder feedback and permission hardening.

## Why This Matters

Invoice reminders send customer-facing email and mutate invoice/email history state. That action should require the same finance-update authority as other invoice collection work, and failure feedback should not expose email-provider, database, or implementation internals.

## Workflow Spine

`/financial/invoices/$invoiceId`
-> `InvoiceDetailContainer`
-> `useSendInvoiceReminder`
-> `src/server/functions/invoices/send-invoice-reminder.ts`
-> `orders`, `customers`, `organizations`, `emailHistory`
-> `queryKeys.invoices.detail(invoiceId)`
-> operator-safe success/error toast.

## Issue Raised

The single-invoice reminder hook surfaced raw mutation feedback:

- `error.message || 'Failed to send reminder'`

The server function also used session-only auth for an operation that sends external email and mutates invoice reminder/email history state.

## Implementation

- Added `sendReminder` to `formatInvoiceMutationError`.
- Wired `useSendInvoiceReminder` through the invoice-owned formatter.
- Required `PERMISSIONS.financial.update` in `sendInvoiceReminder`.
- Added `tests/unit/invoices/invoice-reminder-feedback-contract.test.ts` to cover unsafe internals, safe workflow guidance, hook wiring, tenant guards, reminder timestamp mutation, email history, and the permission boundary.

## Standards Checked

- Domain ownership: invoice reminder copy lives in `src/hooks/invoices/_mutation-errors.ts`.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved and documented above.
- Query/cache contract: unchanged; successful reminder sends still invalidate invoice detail.
- Tenant isolation: preserved; invoice and customer joins remain organization-scoped.
- Permission boundary: strengthened; reminder send now requires `financial.update`.
- Transactional finance integrity: unchanged; email history update and invoice reminder timestamp remain coordinated in the existing transaction after the external email call.
- UI states: reminder failures now use operator-safe invoice feedback.
- Diff reviewability: one formatter action, one hook call site, one server auth line/import, one focused test, one closeout doc.

## Smells Removed

- Raw reminder error toast in `useSendInvoiceReminder`.
- Session-only auth on a state-mutating invoice reminder email action.

## Smells Deferred

- Bulk invoice reminders and bulk status updates still have separate raw feedback and batching semantics; they need their own slice.
- `updateInvoiceStatus` still uses session-only auth and should be audited separately because it is broader than reminder sending.
- Email-provider failures are still thrown with provider text on the server, but the client boundary now sanitizes them. Server-side result shaping can be improved in a future slice.

## Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/invoices/invoice-reminder-feedback-contract.test.ts` (3 tests).
- Passed: `./node_modules/.bin/vitest run tests/unit/invoices` (3 files, 9 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.

## Goal Adaptation

Declined goal changes. This sprint applies the standing maintainer posture with focused invoice-domain evidence and a concrete permission-boundary improvement.

## Residual Risk

Tightening reminder sends to `financial.update` can expose stale role assignments if an operator previously depended on session-only access. That is an acceptable production boundary, but role fixtures and seeded users should be checked if access reports come in.
