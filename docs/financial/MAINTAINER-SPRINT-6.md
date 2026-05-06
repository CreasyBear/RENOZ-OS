# Financial Maintainer Sprint 6

## Slice

Invoice status mutation feedback and permission hardening.

## Why This Matters

Invoice status drives collection workflow, dashboard summaries, customer-facing invoice state, and downstream finance actions. Status updates should require finance-update authority and produce safe, actionable operator feedback when the server rejects a transition.

## Workflow Spine

`/financial/invoices/$invoiceId`
-> `InvoiceDetailContainer`
-> `useInvoiceDetail`
-> `useUpdateInvoiceStatus`
-> `src/server/functions/invoices/update-invoice-status.ts`
-> `orders.invoiceStatus`
-> `queryKeys.invoices.lists`, `queryKeys.invoices.detail(invoiceId)`, `queryKeys.invoices.summary`
-> operator-safe success/error behavior.

## Issue Raised

The invoice status mutation had two gaps:

- server status updates used session-only auth while mutating finance state
- server-side mutation failures did not have invoice-owned error feedback at the hook boundary

This made status transitions less safe than reminder sending and left operators with weaker failure handling.

## Implementation

- Added `updateStatus` to `formatInvoiceMutationError`.
- Wired `useUpdateInvoiceStatus` `onError` through the invoice-owned formatter.
- Required `PERMISSIONS.financial.update` in `updateInvoiceStatus`.
- Added `tests/unit/invoices/invoice-status-feedback-contract.test.ts` to cover unsafe internals, safe transition guidance, cache invalidation, tenant guard evidence, status transition validation, and permission boundary.

## Standards Checked

- Domain ownership: invoice status copy lives in `src/hooks/invoices/_mutation-errors.ts`.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved and documented above.
- Query/cache contract: unchanged; successful status updates still invalidate invoice lists, invoice detail, and invoice summary.
- Tenant isolation: unchanged; status update still filters by organization and deleted state.
- Permission boundary: strengthened; status update now requires `financial.update`.
- Transactional finance integrity: unchanged; paid status remains blocked unless created from a real payment, refund, or credit note.
- UI states: rejected server transitions now surface operator-safe invoice feedback.
- Diff reviewability: one formatter action, one hook feedback addition, one server auth line/import, one focused test, one closeout doc.

## Smells Removed

- Session-only auth on a state-mutating invoice status action.
- Missing hook-level error feedback for rejected invoice status updates.

## Smells Deferred

- Bulk invoice status updates use the same server function but still have separate raw batching feedback and should be handled in their own bulk slice.
- `markInvoiceViewed` remains session-authenticated because it tracks engagement rather than operator finance workflow; revisit only if that route is exposed beyond authenticated app usage.
- Invoice payment-recording feedback remains in the order payment flow and should be audited separately.

## Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/invoices/invoice-status-feedback-contract.test.ts` (3 tests).
- Passed: `./node_modules/.bin/vitest run tests/unit/invoices` (4 files, 12 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.

## Goal Adaptation

Declined goal changes. This sprint applies the standing maintainer posture with focused invoice-domain evidence and a permission-boundary improvement.

## Residual Risk

Tightening invoice status mutation to `financial.update` may expose stale role assignments for operators who previously relied on general session access. That is an intended production boundary; fix role grants rather than weakening the mutation.
