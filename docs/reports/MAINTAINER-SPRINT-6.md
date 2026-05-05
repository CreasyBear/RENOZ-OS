# Reports Maintainer Sprint 6

## Status

Closed after Issue 1.

## Issue 1: Forecast Table CSV Utility Consolidation

### Problem

`ForecastTable` was the remaining reports-domain CSV export path using raw `row.join(',')` and manual Blob/link download code. That duplicated the shared CSV utility and could produce malformed CSV when table values contain commas, quotes, or line breaks.

### Workflow Spine

Pipeline forecast route
-> `PipelineForecastPage`
-> `ForecastTable`
-> sorted forecast rows and totals
-> shared CSV utility
-> escaped CSV content and DOM-safe download.

### Scope Constraints

- Touched only the default `ForecastTable` CSV export implementation.
- Preserved the existing `onExportCsv` override contract.
- Did not change forecast query hooks, pipeline schemas, report metrics, sorting, table rendering, generated-report exports, query keys, or cache policy.

### Changes

- Imported `generateCSV`, `downloadCSV`, and `formatDateForFilename` from `@/lib/utils/csv`.
- Replaced raw CSV string joining and manual Blob/link handling in `ForecastTable`.
- Extended the CSV export contract to protect the default table export and the `onExportCsv` override.

### Standards Checked

- Domain ownership: `ForecastTable` still owns table-level default export behavior; shared CSV utility owns escaping/download mechanics.
- Route/page -> component -> utility spine: protected by the CSV contract.
- Query/cache policy: unchanged; no hooks or query keys touched.
- Tenant isolation: unchanged; no server/database paths touched.
- Inventory/finance integrity: no transactional inventory, serial, or finance writes touched.
- UI state: no empty-state behavior changed; export button remains unavailable when table data is empty.
- Error handling: generated-report mutation feedback remains delegated to the reports formatter.
- Diff reviewability: one table export handler plus contract and sprint note.

### Gates Run

- Focused CSV/report contracts:
  - `tests/unit/reports/csv-export-empty-state-contract.test.ts`
  - `tests/unit/reports/generated-report-feedback-contract.test.ts`
  - `tests/unit/reports/query-normalization-wave4e.test.tsx`
  - Result: 3 files, 12 tests passed.
- Full reports unit suite:
  - `tests/unit/reports`
  - Result: 7 files, 20 tests passed.
- `bun run typecheck`
- `bun run lint`
- Targeted source scans for shared CSV utility usage, preserved `onExportCsv` override, removed manual Blob download path, removed raw `row.join(",")`, and shared CSV escaping/download helpers.
- `git diff --check`

### Gates Skipped

- Browser QA: skipped because this slice changed source-covered export implementation behind an existing button, not layout or rendered structure.
- Serialized gates: retired from default closeout and not applicable to this reports table CSV utility slice.

### Smells Removed

- Raw `row.join(',')` CSV generation in `ForecastTable`.
- Manual Blob/link download logic in `ForecastTable`.
- Final reports-domain local CSV export path outside the shared utility.

### Deferred

- Export success toast for `ForecastTable` is deferred because the component currently has no toast dependency and no prior feedback behavior; adding one would be a UI behavior change outside this utility consolidation.
- Generated report PDF/Excel no-data policy remains a separate product decision.

### Residual Risk

- Export success toast for `ForecastTable` remains deferred to avoid a UI behavior change in a utility-consolidation slice.
- Generated report PDF/Excel no-data policy remains a separate product decision.
