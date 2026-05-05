# Reports Maintainer Sprint 7

## Status

Closed after Issue 1.

## Issue 1: Report Page Scheduled-Report Failure Feedback

### Problem

Report pages could submit scheduled-report forms without consistent operator-safe failure feedback. Procurement and customer reports still showed generic `Failed to schedule report` copy, while several other report pages delegated directly to `useCreateScheduledReport` without a page-level formatted failure toast.

### Workflow Spine

`/reports/*`
-> report page/container schedule action
-> `ScheduledReportForm`
-> report page `handleScheduleSubmit`
-> `useCreateScheduledReport`
-> scheduled report server function/schema/database
-> centralized scheduled-report query keys
-> safe failure toast when scheduling fails.

### Scope Constraints

- Touched only report-page scheduled-report submit failure feedback.
- Did not change scheduled report form fields, schemas, server functions, cache invalidation, query keys, scheduling defaults, or generated report behavior.
- Preserved existing success toasts where they already existed and did not introduce new success behavior across every page.

### Changes

- Added `formatReportScheduleError` beside the reports scheduled-report formatter.
- Wired report-page schedule submit failures through the formatter for:
  - pipeline forecast
  - procurement
  - customer reports
  - expiring warranties
  - win/loss analysis
  - financial summary
  - job costing
  - warranty analytics
- Removed generic `Failed to schedule report` copy from procurement and customer report schedule paths.
- Extended the scheduled-report management contract to cover report-page schedule feedback.

### Standards Checked

- Domain ownership: scheduling feedback stays in the reports formatter and report page/container handlers.
- Route/page -> form -> hook -> server/schema -> query key spine: protected by the scheduled-report contract.
- Query/cache policy: unchanged; `useCreateScheduledReport` still owns cache updates.
- Tenant isolation: unchanged; scheduled-report server functions continue to use auth and organization scope.
- Inventory/finance integrity: no inventory, serial, or finance writes touched.
- UI state: failed scheduling now produces explicit operator-safe feedback across report pages.
- Error handling: unsafe database/internal messages stay behind fallback copy.
- Diff reviewability: one formatter helper plus bounded page submit handlers and contract/doc updates.

### Gates Run

- Focused scheduled-report feedback contracts:
  - `tests/unit/reports/scheduled-report-management-feedback-contract.test.ts`
  - `tests/unit/reports/generated-report-feedback-contract.test.ts`
  - `tests/unit/reports/warranty-analytics-generated-report-feedback-contract.test.ts`
  - Result: 3 files, 9 tests passed.
- Full reports unit suite:
  - `tests/unit/reports`
  - Result: 7 files, 21 tests passed.
- `bun run typecheck`
- `bun run lint`
- Targeted source scans for removed generic schedule failures, report-page formatter usage, propagated submit errors, scheduled-report hook/cache policy, and scheduled-report server authorization.
- `git diff --check`

### Gates Skipped

- Browser QA: skipped because this slice changed source-covered toast feedback behind existing form submit paths, not layout or rendered structure.
- Serialized gates: retired from default closeout and not applicable to this reports scheduling feedback slice.

### Smells Removed

- Generic report-page `Failed to schedule report` toasts.
- Silent report-page scheduled-report submit failures.
- Repeated page-level fallback policy.

### Deferred

- Custom report creation feedback in procurement still has generic copy and should be handled in a custom-reports slice.
- Success toasts for schedule creation remain inconsistent by page; this sprint only standardizes failure feedback.

### Residual Risk

- Custom report creation feedback in procurement still has generic copy.
- Success toasts for schedule creation remain inconsistent by page.
