# Reports Maintainer Sprint 2

## Status

Closed after Issue 1.

## Issue 1: Generated Report Failure Feedback Consistency

### Problem

Several report pages still used the generated-report mutation but either swallowed PDF/Excel failures or showed generic copy that did not use the reports-domain mutation formatter. Financial summary also opened generated report URLs without the `noopener,noreferrer` window contract used by the other report pages.

### Workflow Spine

`/reports/*`
-> report page/container export action
-> reports-domain generated report hook/server function
-> schema-validated report input
-> report aggregation/upload/signed URL
-> generated report URL open
-> sanitized failure toast when generation fails.

### Scope Constraints

- Touched only generated report feedback/open behavior in the reports domain.
- Did not change report metrics, date ranges, schemas, server generation, uploads, signed URL creation, cache policy, scheduling behavior, or CSV export behavior.
- Added a reports-domain generated-report formatter instead of pushing page-specific raw error handling into every report page.

### Changes

- Added `formatGeneratedReportError` beside the reports mutation formatter.
- Wired generated PDF/Excel export failures through the formatter for:
  - pipeline forecast
  - procurement
  - customer reports
  - expiring warranties
  - win/loss analysis
  - job costing
  - financial summary
- Preserved successful generated report URL opening and tightened financial summary to `noopener,noreferrer`.
- Added a source contract covering the generated-report feedback spine and unsafe message fallback.

### Standards Checked

- Domain ownership: kept formatter in `src/hooks/reports`.
- Route/page -> hook -> server/schema spine: protected by the contract test.
- Query/cache policy: unchanged; this slice only touches mutation feedback.
- Tenant isolation: unchanged; server authorization and tenant scoping not modified.
- Inventory/finance integrity: no transactional data writes touched.
- UI state: failed generated reports now produce honest operator feedback.
- Error handling: unsafe internals stay behind fallback copy.
- Diff reviewability: one reports-domain helper plus bounded page call sites.

### Gates Run

- Focused generated-report feedback contracts:
  - `tests/unit/reports/generated-report-feedback-contract.test.ts`
  - `tests/unit/reports/warranty-analytics-generated-report-feedback-contract.test.ts`
  - `tests/unit/reports/generate-report-response.test.ts`
  - Result: 3 files, 6 tests passed.
- Full reports unit suite:
  - `tests/unit/reports`
  - Result: 5 files, 15 tests passed.
- `bun run typecheck`
- `bun run lint`
- Targeted source scans for silent catches, old generic generated-report failure copy, formatter usage, and generated URL `noopener,noreferrer`.
- `git diff --check`

### Gates Skipped

- Browser QA: skipped because this slice changed source-covered mutation feedback and URL-open contracts, not layout or interaction structure.
- Serialized gates: retired from default closeout and not applicable to this reports feedback slice.

### Smells Removed

- Silent generated-report failure handlers.
- Generic generated-report failure copy on report pages using the shared reports formatter.
- Missing `noopener,noreferrer` on financial generated report URL open.

### Deferred

- Scheduled report create/execute/delete/update feedback in settings and report pages still has mixed generic copy.
- CSV export empty-state behavior is inconsistent across report pages.
- Browser QA was not part of this source-contract slice unless later visual changes require it.

### Residual Risk

- The generated-report server function still uses generic metrics for several report pages; this sprint only made failures honest and safe.
- Scheduled report create/execute/delete/update actions still need a dedicated reports-settings feedback pass.
- CSV empty-state behavior still varies by report page.
