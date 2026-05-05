# Reports Maintainer Sprint 3

## Status

Closed after Issue 1.

## Issue 1: Scheduled Report Management Failure Feedback

### Problem

Scheduled report management actions in settings still showed generic failure toasts or passed raw mutation messages into the form submit error. This made create, update, delete, execute, and bulk action failures less operator-safe than the generated-report paths closed in the previous sprint.

### Workflow Spine

`/settings` scheduled reports
-> `ScheduledReportsListContainer`
-> `ScheduledReportForm` / list presenter action handlers
-> reports scheduled-report hooks
-> scheduled report server functions
-> scheduled report schemas/database
-> centralized reports scheduled-report query keys
-> safe toast or inline form feedback.

### Scope Constraints

- Touched only scheduled report management failure feedback in the settings/reports seam.
- Did not change scheduled report schemas, server functions, query keys, cache invalidation, list read behavior, or generated report execution behavior.
- Did not change form layout or validation fields.

### Changes

- Added `formatScheduledReportMutationError` to the reports mutation formatter.
- Routed create/update/delete/execute/bulk scheduled report failures through the formatter.
- Replaced raw mutation `.message` inline submit error with formatted scheduled-report copy.
- Added a source contract covering formatter usage, the action spine, server tenant scope, schemas, and query keys.

### Standards Checked

- Domain ownership: formatter lives in `src/hooks/reports`.
- Route/page -> container -> hook -> server/schema -> query key spine: protected by the contract test.
- Query/cache policy: unchanged and still centralized under `queryKeys.reports.scheduledReports`.
- Tenant isolation: server functions continue using `withAuth` and `scheduledReports.organizationId = ctx.organizationId`.
- Inventory/finance integrity: not applicable; no inventory, serial, or finance writes touched.
- UI state: failed scheduled-report actions now produce honest operator-safe toasts or inline form errors.
- Error handling: unsafe database/internal messages stay behind fallback copy.
- Diff reviewability: one reports-domain helper plus bounded settings container call sites.

### Gates Run

- Focused scheduled-report management feedback contracts:
  - `tests/unit/reports/scheduled-report-management-feedback-contract.test.ts`
  - `tests/unit/reports/generated-report-feedback-contract.test.ts`
  - `tests/unit/reports/warranty-analytics-generated-report-feedback-contract.test.ts`
  - `tests/unit/reports/query-normalization-wave4e.test.tsx`
  - Result: 4 files, 15 tests passed.
- Full reports unit suite:
  - `tests/unit/reports`
  - Result: 6 files, 18 tests passed.
- `bun run typecheck`
- `bun run lint`
- Targeted source scans for old generic scheduled-report failure toasts, raw `.message` submit passthrough, formatter usage, tenant scoping, and scheduled-report query-key coverage.
- `git diff --check`

### Gates Skipped

- Browser QA: skipped because this slice changed source-covered mutation feedback and inline error formatting, not layout or interaction structure.
- Serialized gates: retired from default closeout and not applicable to this reports/settings feedback slice.

### Smells Removed

- Generic scheduled-report management failure toasts.
- Raw mutation message passthrough into scheduled report form submit error.

### Deferred

- CSV export empty-state behavior still varies by report page.
- Browser QA was not part of this source-contract slice unless later visual changes require it.

### Residual Risk

- Successful scheduled-report manual execution still does not expose generated output; this sprint only made management failures safe and clear.
- CSV export empty-state behavior still varies by report page.
