# Reports Maintainer Sprint 10

## Status

Closed after Issue 1.

## Issue 1: Generated-Report Metric Validation Copy

### Problem

On-demand generated reports validated requested metrics by catching the metric registry error and appending its raw message to a `ValidationError`. Because generated-report mutation formatting can surface 400-level validation messages, an unsupported metric could leak registry/internal wording to operators instead of a stable recovery message.

### Workflow Spine

report page export action
-> `useGenerateReport`
-> `generateReport`
-> `generateReportSchema`
-> date range validation
-> generated-report metric validation
-> `calculateMetricsAggregator`
-> PDF/CSV/Excel artifact response
-> generated-report formatter on failure.

### Touched Domains

- Reports generated-report server function.
- Reports generated-report source contract tests.

### Business Value Protected

Report export failures should tell operators what to do, not expose implementation details from the metric registry. RENOZ reporting stays dependable when a saved page/export path references a metric that has been removed or renamed.

### Scope Constraints

- Did not change generated-report schema shape, supported metrics, artifact rendering, storage, signed URLs, or report page UI.
- Did not alter scheduled-report CRUD or background execution behavior.
- Did not change metric aggregation after validation passes.

### Changes

- Added a named generated-report metric validation helper.
- Kept metric de-duplication before aggregation.
- Replaced raw registry error appendage with one operator-safe validation message.
- Added a source contract covering validation copy, auth/schema spine, deduplicated metrics, and aggregator handoff.

### Standards Checked

- Domain ownership: generated-report validation stays in the reports server function that owns generation.
- Route/page -> hook -> server/schema -> query key/cache policy: page/hook/cache behavior unchanged; server validation is explicit before aggregation.
- Query/cache policy: unchanged; generated reports are mutation responses and do not write query cache here.
- Tenant isolation: unchanged; `generateReport` still authenticates before organization-scoped aggregation.
- Inventory/finance integrity: no inventory, serial, movement, valuation, or finance writes touched.
- UI state: generated-report failures now receive stable validation copy for unsupported metrics.
- Error handling: registry error text no longer becomes operator-facing validation copy.
- Diff reviewability: one helper, one source contract, one sprint note.

### Gates Run

- Focused generated-report metric validation and feedback contracts: `./node_modules/.bin/vitest run tests/unit/reports/generated-report-metric-validation-contract.test.ts tests/unit/reports/generated-report-feedback-contract.test.ts` passed, 2 files / 5 tests.
- Full reports unit suite: `./node_modules/.bin/vitest run tests/unit/reports` passed, 10 files / 28 tests.
- TypeScript: `bun run typecheck` passed.
- ESLint: `bun run lint` passed.
- Targeted source scan for generated-report metric validation helper, removed raw metric registry error appendage, auth/schema spine, and aggregator handoff passed.
- Diff hygiene: `git diff --check` passed.

### Gates Skipped

- Browser QA skipped because this is server validation copy with no rendered UI or layout change.

### Smells Removed

- Raw `getMetric` error text embedded in a generated-report `ValidationError`.
- Inline metric validation loop inside the generation handler.

### Deferred

- Metric catalog UX remains outside this slice.
- Scheduled/background report execution may still deserve a separate pass if it has distinct metric-validation copy.

### Goal Adaptation

- Declined. The standing maintainer process already covers operator-safe errors, workflow-spine contracts, focused tests, and evidence-based closeout.

### Residual Risk

- Operators will now receive one stable validation message for unsupported metrics; the UI still does not point them to a metric catalog or repair flow.
- Scheduled/background report execution may need a separate pass if it validates metrics through a distinct path.
