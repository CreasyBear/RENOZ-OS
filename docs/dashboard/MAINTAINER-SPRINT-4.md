# Dashboard Maintainer Sprint 4: Diagnostic Log Removal

## Status

Closed in commit-ready state.

## Issue 1: Dashboard Hooks Emitted Raw Diagnostic Payloads

### Problem

Dashboard Sprint 1 deferred dev-only query diagnostics in overview surfaces. `useDashboardMetrics`, `useMetricsComparison`, and `useEnhancedComparison` logged raw server-function results in development. `OverviewContainer` also logged a JSON query-state snapshot containing query errors and data presence on every relevant state change. These logs were useful during repair, but they had become noisy, test-visible, and outside the operator-safe read-state contract.

### Workflow Spine

Dashboard route
-> dashboard metrics hooks and overview container
-> server read results and query states
-> normalized read-state handling
-> UI presenter.

### Touched Domains

- Dashboard metrics hooks.
- Dashboard overview container.
- Dashboard diagnostic logging contract test.
- Dashboard maintainer closeout docs.

### Business Value Protected

The dashboard is the operator's first surface for revenue, pipeline, stock, jobs, and orders. Removing raw diagnostic logs keeps dashboard reliability evidence in tests and explicit UI states instead of noisy console output that can hide real failures.

### Scope Constraints

- Do not change dashboard server reads, query keys, stale times, read-result normalization, retry handlers, summary warnings, presenter props, or UI layout.
- Do not add a new logging abstraction.
- Keep this slice limited to removing stale diagnostic logging from dashboard hooks/containers.

### Changes

- Removed raw-result `console.debug` calls from dashboard metrics hooks.
- Removed overview query-state JSON logging and its now-unneeded effect dependencies.
- Added a focused source contract preventing raw dashboard read payload/query-state logging from returning.

### Standards Checked

- Domain ownership: dashboard read-state handling remains in dashboard hooks and containers; debug output is no longer part of the workflow.
- Route -> container/page -> hook -> server function -> schema/database -> query/cache policy: unchanged for reads and cache keys.
- Tenant isolation/data integrity: unchanged; no server/database behavior changed.
- Transactional inventory/finance integrity: unchanged; dashboard read-only slice.
- Serialized lineage continuity: not touched.
- Honest UI/error handling: improved by relying on explicit UI state and tests rather than console diagnostics.
- Query/cache contract: unchanged.
- Reviewability: bounded removal plus one source contract and one closeout note.

### Smells Removed

- Raw dashboard server result logging in hooks.
- Query-state JSON logging from `OverviewContainer`.
- Test-visible dashboard console noise from overview reconciliation tests.

### Deferred

- Shared persisted-state sync still logs failed localStorage syncs; that belongs to a shared persistence/error-boundary slice.
- Console examples inside comments remain untouched.
- Browser QA remains deferred because this removes development diagnostics without changing rendered dashboard behavior.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/dashboard/diagnostic-logging-contract.test.ts tests/unit/dashboard/query-normalization-wave7d.test.tsx tests/unit/dashboard/dashboard-feedback-contract.test.ts tests/unit/dashboard/overview-cache-contract.test.ts`.
- Passed: `./node_modules/.bin/eslint src/hooks/dashboard/use-dashboard-metrics.ts src/components/domain/dashboard/overview/overview-container.tsx tests/unit/dashboard/diagnostic-logging-contract.test.ts --report-unused-disable-directives`.
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. This sprint continues the standing maintainer goal by removing stale diagnostic noise and keeping read-state evidence explicit.

### Residual Risk

Low. The slice removes diagnostics only; dashboard read behavior and UI props are unchanged.
