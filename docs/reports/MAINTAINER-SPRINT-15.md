# Reports Maintainer Sprint 15

## Status

Closed after Issue 1.

## Issue 1: Financial Summary Read-State Honesty

### Problem

`useFinancialSummaryReport` already normalizes always-shaped read failures, but `FinancialSummaryPage` ignored the query `error`. A failed financial summary read could therefore fall through to the empty-state copy, making an unavailable finance report look like there was simply no financial data for the selected period.

### Workflow Spine

`/reports/financial`
-> `FinancialSummaryPage`
-> `useFinancialSummaryReport`
-> `getFinancialSummaryReport`
-> `financialSummaryReportSchema` / finance queries
-> centralized financial-summary query key
-> full error, cached warning, or genuine empty-data state.

### Touched Domains

- Reports financial summary read state.
- Reports read feedback helpers.

### Business Value Protected

Financial summary is a business-truth surface for revenue, AR, cash, and GST. Operators should never mistake an unavailable finance read for a legitimate empty financial period.

### Scope Constraints

- Did not change financial summary server functions, schemas, query keys, aggregation logic, export behavior, scheduling behavior, period selection, or chart rendering.
- Did not change `useFinancialSummaryReport` because it already normalizes always-shaped read failures and requires a shaped result.
- Did not broaden into invoices, payments, Xero, or finance dashboards outside this report page.

### Changes

- Added a financial summary read-error wrapper using the shared reports unsafe-message guard.
- Destructured `error` and `refetch` from `useFinancialSummaryReport`.
- Added a full read-failure state before the genuine empty-data state.
- Added a cached-data warning when financial data exists alongside a query error.
- Added a source contract and pure helper assertions for unsafe-message fallback behavior.

### Standards Checked

- Domain ownership: financial summary read-feedback copy stays in a reports financial-summary helper while sharing the common reports unsafe-message guard.
- Route/page -> hook -> server/schema -> query key/cache policy: hook/server/cache behavior remains unchanged and is covered by source assertions.
- Query/cache policy: unchanged; hook still uses centralized `queryKeys.reports.financialSummary`.
- Tenant isolation: unchanged; no server query or organization scope changed.
- Inventory/finance integrity: no finance aggregation, invoice, payment, GST, or accounting writes touched.
- UI state: unavailable read, cached stale read, and genuine empty data are now distinct.
- Error handling: unsafe database/internal read messages fall back to stable financial summary copy.
- Diff reviewability: one helper, one page branch/warning, one contract, one sprint note.

### Gates Run

- Focused financial summary read-feedback and finance normalization contracts: `./node_modules/.bin/vitest run tests/unit/reports/financial-summary-read-feedback-contract.test.ts tests/unit/finance-dashboard/query-normalization-wave6f.test.tsx` passed, 2 files / 5 tests.
- Full reports unit suite: `./node_modules/.bin/vitest run tests/unit/reports` passed, 15 files / 38 tests.
- TypeScript: `bun run typecheck` passed.
- ESLint: `bun run lint` passed.
- Targeted source scan for financial summary read formatter usage, full error state before empty state, cached warning state, normalized hook, shaped result requirement, and centralized financial summary query key passed.
- Diff hygiene: `git diff --check` passed.

### Gates Skipped

- Browser QA skipped because this is read-error state hardening with no layout or interaction change beyond existing retry controls.

### Smells Removed

- Ignored `useFinancialSummaryReport().error`.
- Empty-state copy used as the fallback for failed financial reads.

### Deferred

- Broader finance dashboard and invoice/payment read states remain outside this reports slice.
- Financial summary page remains a mixed page for filters, exports, charting, scheduling, and read state.

### Goal Adaptation

- Declined. The standing maintainer process already covers honest UI states, operator-safe errors, workflow-spine contracts, source evidence, and bounded domain slices.

### Residual Risk

- Broader finance dashboard and invoice/payment read states remain outside this reports slice.
- Financial summary page still mixes filter, export, scheduling, chart, and read-state responsibilities.
