# Reports Maintainer Sprint 9

## Status

Closed after Issue 1.

## Issue 1: Custom-Report Execution Source Honesty

### Problem

Custom-report update/delete/execute hooks exist, but no report page currently wires update/delete/execute UI actions. The executable risk inside that adjacent surface was server-side: `executeCustomReport` returned a successful empty report when a saved custom-report definition had an unsupported source. That made a broken definition look like a valid zero-row report.

### Workflow Spine

custom report execution request
-> `useExecuteCustomReport`
-> `executeCustomReport`
-> `executeCustomReportSchema`
-> org-scoped custom report lookup
-> saved report definition source validation
-> procurement query execution or operator-safe validation failure
-> custom-report results query key.

### Touched Domains

- Reports custom-report execution.
- Reports custom-report source validation.

### Business Value Protected

Procurement reporting should not silently turn a broken saved report definition into a blank operational result. Operators need to know when a saved report definition is unsupported so they can recreate or repair it instead of treating missing supplier/procurement rows as business truth.

### Scope Constraints

- Did not invent update/delete/execute UI where no component currently wires those actions.
- Did not change create/update/delete schemas, list/detail reads, query keys, or cache invalidation.
- Did not broaden supported custom-report sources beyond the existing procurement implementation.
- Did not touch procurement analytics SQL except for the execution precondition.

### Changes

- Added explicit supported custom-report source resolution for execution.
- Converted missing, non-string, blank, and unsupported saved definition sources into `ValidationError` failures.
- Removed the fake successful empty-result path for unknown sources.
- Added a source contract covering fail-closed source validation, tenant scope, auth, and known-error propagation.

### Standards Checked

- Domain ownership: source validation stays beside custom-report execution.
- Route/page -> hook -> server/schema -> query key spine: hook/cache policy remains unchanged; execution server contract is now explicit.
- Query/cache policy: unchanged; `useExecuteCustomReport` still writes result data to `queryKeys.reports.customReports.results(...)` only on success.
- Tenant isolation: unchanged; execution still reads custom reports by `ctx.organizationId`.
- Inventory/finance integrity: no inventory, serial, movement, valuation, or finance writes touched.
- UI state: unsupported saved definitions now fail instead of masquerading as empty successful results.
- Error handling: known `ValidationError` and `NotFoundError` paths continue to propagate for mutation formatting.
- Diff reviewability: one server precondition helper, one contract, one sprint note.

### Gates Run

- Focused custom-report execution and feedback contracts: `./node_modules/.bin/vitest run tests/unit/reports/custom-report-execution-source-contract.test.ts tests/unit/reports/custom-report-feedback-contract.test.ts` passed, 2 files / 5 tests.
- Full reports unit suite: `./node_modules/.bin/vitest run tests/unit/reports` passed, 9 files / 26 tests.
- TypeScript: `bun run typecheck` passed.
- ESLint: `bun run lint` passed.
- Targeted source scan for supported custom-report sources, source validation, removed fake empty-result fallback, execution auth, tenant scope, and result cache key passed.
- Diff hygiene: `git diff --check` passed.

### Gates Skipped

- Browser QA skipped because this is a server execution precondition with no rendered UI or layout change.

### Smells Removed

- Fake empty successful result for unsupported custom-report sources.
- Ad hoc source truth embedded as a late `if`/fallback branch instead of a named execution precondition.

### Deferred

- Custom-report update/delete/execute UI actions remain unwired and need a separate product decision before page-level feedback can be improved.
- Additional custom-report sources remain unsupported until implemented with explicit query contracts.

### Goal Adaptation

- Declined. The current maintainer process already supports this slice: small domain ownership, honest UI/data states, tenant isolation, cache-contract checks, operator-safe errors, meaningful tests, and evidence-based closeout.

### Residual Risk

- Existing saved custom reports with unsupported sources will now fail honestly instead of returning blank results; operators may need to recreate those reports.
- Execution remains procurement-only until another source is implemented with its own query contract.
