# Financial Maintainer Sprint 49: Invoice Read Feedback Boundary

## Status

Closed in commit-ready state.

## Issue 1: Invoice Read Errors Exposed Raw Error Messages

### Problem

The invoice list cold-load error state and invoice detail payment-history tab displayed raw `Error.message` values directly. That could leak transport, database, row-level-security, or stack detail into operator-facing finance UI instead of preserving the repo's read-path policy.

### Workflow Spine

`/invoices`
-> `InvoiceListContainer`
-> `useInvoices`
-> `listInvoices`
-> tenant-scoped invoice reads
-> operator-safe invoice read fallback copy.

`/invoices/:invoiceId`
-> `InvoiceDetailContainer`
-> `InvoiceDetailView`
-> `useOrderPayments`
-> tenant-scoped payment-history reads
-> operator-safe invoice payment-history fallback copy.

### Touched Domains

- Financial/invoice list UI.
- Financial/invoice detail payment-history UI.
- Invoice read-feedback helper.
- Invoice read-feedback contract test.
- Financial maintainer closeout docs.

### Business Value Protected

Invoices and payment history are finance-control surfaces. When those reads fail, RENOZ operators need stable next-step copy that keeps them working without exposing internal persistence or tenant-isolation details.

### Scope Constraints

- Do not change invoice list/detail queries, payment-history queries, mutation behavior, cache keys, tenant scoping, or payment reconciliation logic.
- Keep the slice limited to read-feedback presentation and contract coverage.
- Preserve existing stale-data behavior for invoice list refresh failures.

### Changes

- Added invoice-domain read-error fallback helpers for invoice list and invoice payment history.
- Routed invoice list cold-load failure messaging through the invoice helper.
- Routed invoice detail payment-history read failure messaging through the invoice helper.
- Added a contract test that proves unsafe read errors fall back and the UI surfaces remain behind the helper.

### Standards Checked

- Domain ownership: invoice read-feedback copy now lives in the invoice domain instead of inline presenter branches.
- Route -> container/page -> hook -> server function -> schema/database -> query/cache policy: checked through invoice list and invoice detail payment-history read spines.
- Tenant isolation/data integrity: unchanged; server-side reads remain untouched and raw persistence detail is no longer surfaced in these UI paths.
- Transactional inventory/finance integrity: unchanged; finance reads and mutations are not modified.
- Serialized lineage continuity: not touched.
- Honest UI/error handling: improved by replacing raw read errors with operator-safe fallback copy.
- Query/cache contract: unchanged; existing query keys and invalidation behavior are preserved.
- Reviewability: one helper, two UI call sites, one focused contract, one closeout note.

### Smells Removed

- Direct `invoicesError.message` rendering in the invoice list cold-load state.
- Direct `paymentsError.message` rendering in invoice detail payment history.
- Duplicate inline invoice-list fallback copy.

### Deferred

- Broader invoice detail optional-read fallback review remains a separate finance slice.
- Browser QA remains deferred because this changes read-failure copy only and is covered by source-level contract plus type/lint gates.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/invoices/invoice-read-feedback-contract.test.ts tests/unit/invoices/invoice-detail-feedback-contract.test.ts tests/unit/invoices/invoice-bulk-feedback-contract.test.ts`.
- Passed: `./node_modules/.bin/eslint src/components/domain/invoices/invoice-read-error-messages.ts src/components/domain/invoices/list/invoice-list-container.tsx src/components/domain/invoices/detail/invoice-detail-view.tsx tests/unit/invoices/invoice-read-feedback-contract.test.ts --report-unused-disable-directives`.
- Passed: source scan for raw invoice list/payment-history read error message rendering.
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. This sprint continues operator-safe error handling under the standing maintainer goal.

### Residual Risk

Low. Behavior changes only when invoice or payment-history reads fail, and the new fallback strings are bounded to those read surfaces.
