# Reports Maintainer Sprint 12

## Status

Closed after Issue 1.

## Issue 1: Job Costing Read Feedback Boundary

### Problem

`useJobCostingReport` already normalizes always-shaped read failures, but `JobCostingReportPage` rendered direct `error.message` copy in both the full failure state and the cached-data warning. That made the report boundary less robust than the procurement analytics screen and left a route for database/internal wording to leak into an operator-facing costing view.

### Workflow Spine

`/reports/job-costing`
-> `JobCostingReportPage`
-> `useJobCostingReport`
-> jobs costing server function
-> normalized read query error
-> job costing full error or cached-warning state
-> operator-safe read feedback.

### Touched Domains

- Reports/job costing page read states.
- Reports read feedback helpers.
- Reports/procurement read formatter wrapper.

### Business Value Protected

Job costing is where RENOZ checks profitability and margin on installation/service work. If the read path is degraded or unavailable, operators should see stable recovery copy rather than internals that reduce trust in the numbers and the platform.

### Scope Constraints

- Did not change job costing server queries, schemas, query keys, cache timing, exports, scheduling, or table rendering.
- Did not change `useJobCostingReport` behavior because it already normalizes always-shaped failures.
- Did not broaden into non-reports jobs pages.

### Changes

- Added a shared reports read-error formatter for unsafe message fallback.
- Converted the procurement analytics read formatter into a thin reports-domain wrapper.
- Added a job costing read formatter.
- Routed job costing full-error and cached-warning copy through the formatter.
- Added a source contract and pure helper assertions for unsafe-message fallback behavior.

### Standards Checked

- Domain ownership: reports read-feedback logic is shared inside `src/components/domain/reports`.
- Route/page -> hook -> server/schema -> query key/cache policy: hook/server/cache behavior remains unchanged and is covered by source assertions.
- Query/cache policy: unchanged; `useJobCostingReport` still uses centralized `queryKeys.jobCosting.list`.
- Tenant isolation: unchanged; no server query or organization scope changed.
- Inventory/finance integrity: no inventory, serial, movement, valuation, or finance writes touched.
- UI state: full error and cached-warning states now share one operator-safe formatter.
- Error handling: unsafe database/internal read messages fall back to stable job costing copy.
- Diff reviewability: one shared helper, one job wrapper, one procurement wrapper simplification, two call sites, one contract, one sprint note.

### Gates Run

- Focused job costing/procurement read-feedback and jobs query-normalization contracts: `./node_modules/.bin/vitest run tests/unit/reports/job-costing-read-feedback-contract.test.ts tests/unit/reports/procurement-analytics-read-feedback-contract.test.ts tests/unit/jobs/query-normalization-wave4b-admin.test.tsx` passed, 3 files / 13 tests.
- Full reports unit suite: `./node_modules/.bin/vitest run tests/unit/reports` passed, 12 files / 32 tests.
- TypeScript: `bun run typecheck` passed.
- ESLint: `bun run lint` passed.
- Targeted source scan for shared reports read formatter, job costing formatter usage, removed job costing direct `error.message` branch, normalized job costing hook, centralized job costing query key, and procurement formatter compatibility passed.
- Diff hygiene: `git diff --check` passed.

### Gates Skipped

- Browser QA skipped because this is read-error copy hardening with no layout or interaction change.

### Smells Removed

- Direct `error.message` rendering in job costing full-error and cached-warning states.
- Duplicated unsafe read-message logic inside the procurement-specific helper.

### Deferred

- Other reports surfaces still need their own read-feedback passes.
- Job costing remains a large mixed-concern page; this slice intentionally did not split layout, table, export, and scheduling responsibilities.

### Goal Adaptation

- Declined. The standing maintainer process already covers operator-safe errors, workflow-spine contracts, source evidence, and bounded domain slices.

### Residual Risk

- Other reports surfaces still need their own read-feedback passes before the reports domain can claim consistent read-error handling.
- Job costing remains a large mixed-concern page; extraction remains deferred because this slice only protected read feedback.
