# Reports Maintainer Sprint 5

## Status

Closed after Issue 1.

## Issue 1: Local CSV Utility Consolidation

### Problem

Expiring warranties and job costing reports still hand-rolled CSV generation/download after the CSV empty-state sprint. Job costing used raw `row.join(',')`, which can corrupt CSV output when job titles or customer names contain commas, quotes, or line breaks. Expiring warranties duplicated download logic already covered by the shared CSV utility.

### Workflow Spine

`/reports/expiring-warranties` and `/reports/job-costing`
-> report container/page export action
-> local report read hook
-> centralized query key backed read data
-> shared CSV utility
-> escaped CSV content and DOM-safe download
-> no-data or success toast.

### Scope Constraints

- Touched only local CSV utility usage in the two reports changed by Sprint 4.
- Did not change report filters, date ranges, data-fetch hooks, server functions, generated report mutation handling, query keys, or cache policy.
- Did not extract every report CSV export because procurement and customer already use the shared utility, while `ForecastTable` is a local table tool outside this slice.

### Changes

- Expiring warranties now uses `generateCSV`, `downloadCSV`, and `formatDateForFilename` from `@/lib/utils/csv`.
- Removed expiring warranties local CSV generation/download helpers.
- Job costing now uses the shared CSV utility instead of raw `row.join(',')` and manual Blob/link handling.
- Updated the CSV export contract to protect shared utility usage and prevent the fragile raw join from returning.

### Standards Checked

- Domain ownership: reports UI owns export actions; CSV escaping/download behavior belongs to shared utility.
- Route/page -> hook -> query key spine: unchanged and still protected by the CSV contract.
- Query/cache policy: unchanged; no query invalidation or cache keys touched.
- Tenant isolation: unchanged; no server/database paths touched.
- Inventory/finance integrity: no transactional inventory, serial, or finance writes touched.
- UI state: Sprint 4 no-data/success feedback preserved.
- Error handling: generated-report mutation feedback remains delegated to the reports formatter.
- Diff reviewability: two bounded report export handlers plus contract and sprint note.

### Gates Run

- Focused CSV/export contracts:
  - `tests/unit/reports/csv-export-empty-state-contract.test.ts`
  - `tests/unit/reports/generated-report-feedback-contract.test.ts`
  - `tests/unit/reports/warranty-analytics-generated-report-feedback-contract.test.ts`
  - Result: 3 files, 7 tests passed.
- Full reports unit suite:
  - `tests/unit/reports`
  - Result: 7 files, 20 tests passed.
- `bun run typecheck`
- `bun run lint`
- Targeted source scans for shared CSV utility imports, removed local helpers, removed raw `row.join(',')`, removed manual Blob download path, shared CSV escaping, and preserved read-hook/query-key coverage.
- `git diff --check`

### Gates Skipped

- Browser QA: skipped because this slice changed source-covered export implementation behind existing controls, not layout or rendered structure.
- Serialized gates: retired from default closeout and not applicable to this reports CSV utility slice.

### Smells Removed

- Duplicate expiring warranties CSV generation/download logic.
- Fragile job costing CSV raw `row.join(',')`.
- Manual job costing Blob/link download code.

### Deferred

- `ForecastTable` still has a local CSV export path because it is a generic table-level export tool and outside the current reports page slice.
- Generated report PDF/Excel no-data policy remains a separate product decision.

### Residual Risk

- `ForecastTable` still has a local CSV export path outside this page-level reports slice.
- Generated report PDF/Excel no-data policy remains a separate product decision.
