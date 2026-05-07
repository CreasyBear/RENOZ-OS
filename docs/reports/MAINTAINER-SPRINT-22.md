# Reports Maintainer Sprint 22: Scheduled Report Status Honesty

## Status

Closed in commit-ready state.

## Issue 1: Scheduled Report Status Endpoint Ignored Persisted Run Outcomes

### Problem

`getScheduledReportStatus` returned `lastRunStatus: null` and `lastRunMessage: null` even though the scheduled report table stores `lastRunAt`, `lastSuccessAt`, `lastErrorAt`, and `lastError`. That made the endpoint less useful than the persisted data and left a TODO in an operator-facing reports workflow.

### Workflow Spine

Scheduled reports settings / reports landing
-> `useScheduledReportStatus`
-> `getScheduledReportStatus`
-> `scheduled_reports` persisted run outcome fields
-> report status query key/cache policy.

### Touched Domains

- Reports scheduled-report status helper.
- Reports scheduled-report server function.
- Reports scheduled-report status tests.
- Reports sprint evidence.

### Business Value Protected

Operators need to know whether scheduled report delivery is pending, running, successful, or failed. Returning null status hides available operational evidence and weakens recovery when scheduled reports fail.

### Scope Constraints

- Do not query Trigger.dev job history in this sprint.
- Do not change scheduled report CRUD, scheduling cadence, manual execution, generated reports, storage, email delivery, schemas, database columns, query keys, cache invalidation, or report list UI.
- Use only persisted `scheduled_reports` outcome fields already maintained by the scheduled report job.

### Changes

- Added `deriveScheduledReportStatus` in `src/lib/reports/scheduled-report-status.ts`.
- Derived `pending`, `running`, `success`, and `failed` from persisted run/success/error timestamps.
- Returned persisted failure text as `lastRunMessage` when the latest outcome failed.
- Updated `getScheduledReportStatus` to select `lastSuccessAt`, `lastErrorAt`, and `lastError`.
- Removed the null-status TODO path.
- Added focused unit and source-contract coverage for the helper and endpoint wiring.

### Standards Checked

- Domain ownership: scheduled-report outcome derivation now lives in the reports domain instead of inline endpoint placeholders.
- Route -> hook -> server -> schema/database -> query/cache policy: `useScheduledReportStatus` and `queryKeys.reports.scheduledReports.status(id)` are unchanged; the server now maps persisted outcome fields into the existing response schema.
- Tenant isolation/data integrity: organization predicate and read permission remain unchanged; no writes or schedule execution behavior changed.
- Query/cache contract: status query key, stale time, and focus refetch behavior remain unchanged.
- UI states/error handling: no UI change; consumers can now receive honest status/message values.
- Reviewability: helper, server mapping, tests, and closeout only; no migration.

### Smells Removed

- `getScheduledReportStatus` ignored persisted success/error fields.
- Null status/message placeholders on a status endpoint.
- TODO in an operator-facing scheduled-report read path.

### Deferred

- Trigger.dev job-history reconciliation remains a future integration slice if persisted scheduled-report fields prove insufficient.
- Browser QA was not selected because this is a server read-contract fix with no intended UI interaction change.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/reports/scheduled-report-status.test.ts tests/unit/reports/query-normalization-wave4e.test.tsx` - 2 files, 12 tests.
- Passed: focused ESLint on scheduled report helper/server/tests.
- Passed: `bun run typecheck`.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. This is the first post-inventory reports sprint in this run and fits the standing maintainer goal without changing it.

### Residual Risk

Low for persisted status honesty. Moderate for exact external-job reconciliation because the helper relies on the scheduled report table fields, not Trigger.dev run history.
