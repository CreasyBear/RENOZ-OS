# Reports Maintainer Sprint 17

## Status

Closed after Issue 1.

## Issue 1: Custom Report Execution Unexpected Failure Boundary

### Problem

`executeCustomReport` rethrew unexpected execution failures as `Failed to execute custom report: ${error.message}`. Known validation and not-found errors were explicit, but database/query failures could still be embedded into a server error before client-side report mutation formatting had a chance to apply fallback copy.

### Workflow Spine

custom report execution request
-> `useExecuteCustomReport`
-> `executeCustomReport`
-> `executeCustomReportSchema`
-> org-scoped custom report read
-> supported source validation
-> procurement report query execution
-> known validation/not-found error or logged stable execution failure.

### Touched Domains

- Reports custom-report execution server boundary.
- Reports mutation feedback contract tests.

### Business Value Protected

Custom reports are saved operational reporting tools. Operators should receive a stable recovery message when a report execution fails unexpectedly, while maintainers retain enough server-side context to debug the failed report.

### Scope Constraints

- Do not change custom report schemas, report definitions, supported source list, query shape, pagination limit, hook cache policy, or UI wiring.
- Do not change generated reports, scheduled reports, report favorites, or report page layout.

### Changes

- Preserved known `NotFoundError` and `ValidationError` propagation.
- Added structured logging for unexpected execution failures with report and organization context.
- Replaced the wrapped raw `error.message` throw with a stable `ServerError`.
- Extended the execution source contract to prevent reintroducing raw execution error text.
- Extended the custom report mutation formatter contract for the old wrapped execution-error shape.

### Standards Checked

- Domain ownership: custom-report execution failure handling stays beside the execution server function and reports mutation formatter contracts.
- Route/page -> hook -> server/schema -> query key/cache policy: route/page, `useExecuteCustomReport`, schema, result cache key, and cache write policy are unchanged.
- Query/cache policy: unchanged; successful executions still populate `queryKeys.reports.customReports.results`.
- Tenant isolation: unchanged; execution still reads the custom report by `ctx.organizationId`.
- Inventory/finance integrity: no inventory, warehouse, finance, stock, valuation, warranty, or RMA write path changed.
- UI state: unchanged; this slice hardens the server mutation boundary that feeds existing operator-safe mutation formatting.
- Error handling: unexpected execution failures are logged for maintainers and exposed as stable execution-unavailable copy.
- Diff reviewability: one server catch block, two focused contract updates, one sprint note.

### Gates Run

- Focused custom report execution and feedback contracts: `./node_modules/.bin/vitest run tests/unit/reports/custom-report-execution-source-contract.test.ts tests/unit/reports/custom-report-feedback-contract.test.ts` passed, 2 files / 6 tests.
- Full reports unit suite: `./node_modules/.bin/vitest run tests/unit/reports` passed, 16 files / 42 tests.
- TypeScript: `bun run typecheck` passed.
- ESLint: `bun run lint` passed.
- Targeted source scan for stable execution error, logged context, removed raw execution wrapper, and custom report cache policy passed.
- Diff hygiene: `git diff --check` passed.

### Gates Skipped

- Browser QA skipped because this is a server mutation-boundary hardening slice with no rendered UI or layout change.
- Additional reliability, finance, document, release, and deploy gates were not selected because this slice does not touch those contracts.

### Smells Removed

- Unexpected custom report execution failures no longer embed arbitrary caught error text into a thrown server error.
- Execution failure diagnostics no longer rely on the operator-facing error message carrying the original database/query text.

### Deferred

- Custom report update/delete/execute UI remains mostly dormant in current report pages.
- Only procurement remains a supported custom report source.
- The broader custom report builder remains outside this execution-boundary slice.

### Goal Adaptation

- Declined. The standing maintainer process already covers operator-safe errors, tenant boundaries, workflow-spine contracts, meaningful tests, and risk-selected gates.

### Residual Risk

- Runtime execution against live procurement data was not browser-tested because no page interaction changed.
- If future UI wires custom report execution directly, it should reuse the existing custom report mutation formatter and result cache contract.
