# Reports Maintainer Sprint 21

## Status

Closed in commit-ready state.

## Issue 1: Reports Mutation Implementation-Message Boundary

### Problem

Reports mutation and export surfaces already route through reports-owned formatters, but the shared reports formatter still allowed implementation-shaped 4xx messages through if they did not match the older database-leak patterns. Generated reports, scheduled reports, custom reports, and target settings can touch financial, warranty, procurement, customer, and operational analytics. Operators should receive action-specific recovery copy instead of JavaScript runtime text, SQL details, or stack-shaped internals.

### Workflow Spine

Reports page, settings route, or export action
-> reports hook or route mutation
-> `formatReportsMutationError` or action-specific wrapper
-> reports server function/schema failure
-> safe validation/code copy or action-specific fallback
-> operator toast, form summary, or export failure message.

### Touched Domains

- Reports mutation feedback formatting.
- Generated report export feedback.
- Scheduled report management feedback.
- Custom report feedback.
- Target settings feedback.
- Reports mutation feedback tests.
- Reports maintainer closeout docs.

### Business Value Protected

Reports are how RENOZ Energy monitors sales pipeline, procurement, warranty exposure, financial summaries, job costing, and target progress. Failed report generation or management actions should explain retry/correction paths without leaking SQL, runtime, database, or stack implementation details.

### Scope Constraints

- Do not change report hooks, report generation, scheduled report server functions, custom report execution, target persistence, schemas, query keys, cache invalidation, permissions, export formats, or UI layout.
- Preserve safe validation field messages, known code mappings, and action-specific fallback copy.
- Treat implementation-shaped messages as unsafe even when a server layer reports them with a 4xx status.

### Changes

- Extended the reports unsafe-message classifier to include SQL phrases, JavaScript runtime error names, `not a function`, `Cannot read/set properties of undefined/null`, and stack-frame-shaped text.
- Added focused base formatter coverage for TypeError and SQL-shaped report mutation messages.
- Added wrapper coverage for generated report, scheduled report, custom report, and target mutation fallbacks.
- Kept existing report formatter wiring, generated export, scheduled report, custom report, and target contracts intact.

### Standards Checked

- Domain ownership: reports mutation feedback remains owned by `src/hooks/reports/_mutation-errors.ts`.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved. This sprint changes only client feedback formatting after existing mutation/export failures.
- Query/cache policy: unchanged. No report query keys, invalidations, stale behavior, or mutation cache contracts changed.
- Tenant isolation/data integrity: unchanged. No organization predicates, report definitions, generated report artifacts, scheduled report records, target records, or persistence behavior changed.
- UI states/error handling: strengthened. Reports mutation/export feedback no longer passes through implementation-shaped messages.
- Reviewability: one formatter branch, focused test expansions, and this closeout note.

### Smells Removed

- Permissive 4xx raw-message pass-through for implementation-shaped reports mutation errors.
- Missing focused tests for JavaScript runtime and SQL-shaped reports feedback.

### Deferred

- Reports read-state issues outside this formatter remain separate slices.
- Finance, jobs, admin, mobile, and API route raw-error debt remains outside this reports slice.
- Browser QA was deferred because this is formatter behavior with no intended visual layout change.

### Gates

- Passed: focused reports mutation formatter set, `./node_modules/.bin/vitest run tests/unit/reports/warranty-analytics-generated-report-feedback-contract.test.ts tests/unit/reports/generated-report-feedback-contract.test.ts tests/unit/reports/scheduled-report-management-feedback-contract.test.ts tests/unit/reports/custom-report-feedback-contract.test.ts tests/unit/reports/target-settings-mutation-feedback-contract.test.ts` - 5 files, 15 tests.
- Passed: broader reports suite, `./node_modules/.bin/vitest run tests/unit/reports` - 19 files, 48 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: browser QA, finance, document, release, and deploy gates because this slice does not change visual layout, financial persistence behavior, document generation, release packaging, or deployment.

### Goal Adaptation

Declined. The standing maintainer process already covers operator-safe errors, reports-domain ownership, meaningful tests, reviewable diffs, and risk-selected evidence.

### Residual Risk

Low for reports mutation formatter safety. Moderate across reports read surfaces and adjacent finance/jobs workflows, which still need separate live-evidence triage before further cleanup.
