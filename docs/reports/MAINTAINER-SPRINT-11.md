# Reports Maintainer Sprint 11

## Status

Closed after Issue 1.

## Issue 1: Procurement Analytics Read Feedback Boundary

### Problem

`useProcurementDashboard` already normalizes dashboard read failures, but the procurement reports presenter accepted a generic `Error` and rendered `error.message` directly. That left the reports UI boundary brittle: a future caller or partial cached-error path could accidentally surface internal database or server wording on the procurement analytics screen.

### Workflow Spine

`/reports/procurement`
-> `ProcurementReportsPage`
-> `useProcurementDashboard`
-> supplier procurement analytics server function
-> normalized read query error
-> `ProcurementReports`
-> operator-safe full error or cached-warning message.

### Touched Domains

- Reports/procurement analytics presenter.
- Reports/procurement page read-warning handoff.
- Reports/procurement read feedback helper.

### Business Value Protected

Procurement analytics is an operational view for supplier spend, efficiency, and savings. If the dashboard read path fails, operators should see stable recovery copy instead of database or server internals that make the app feel brittle.

### Scope Constraints

- Did not change procurement analytics queries, supplier server functions, schema, query keys, cache timing, report exports, scheduling, or custom-report creation.
- Did not alter `useProcurementDashboard` behavior because it already normalizes always-shaped read failures.
- Did not broaden into non-reports procurement widgets.

### Changes

- Added a procurement analytics read-feedback formatter.
- Routed full-page procurement analytics errors through the formatter.
- Routed cached-data warning copy through the same formatter.
- Added a source contract and pure helper assertions for unsafe-message fallback behavior.

### Standards Checked

- Domain ownership: read feedback formatting stays in the reports procurement boundary.
- Route/page -> hook -> server/schema -> query key/cache policy: existing hook/server/cache contract remains unchanged and is referenced by the contract test.
- Query/cache policy: unchanged; `useProcurementDashboard` still uses centralized procurement dashboard query keys.
- Tenant isolation: unchanged; no server query or organization scope changed.
- Inventory/finance integrity: no inventory, serial, movement, valuation, or finance writes touched.
- UI state: full error and cached-warning states now share one operator-safe formatter.
- Error handling: unsafe database/internal read messages fall back to stable procurement analytics copy.
- Diff reviewability: one helper, two call sites, one source contract, one sprint note.

### Gates Run

- Focused reports/procurement read feedback and procurement query-normalization contracts: `./node_modules/.bin/vitest run tests/unit/reports/procurement-analytics-read-feedback-contract.test.ts tests/unit/procurement/query-normalization-wave3f.test.tsx` passed, 2 files / 5 tests.
- Full reports unit suite: `./node_modules/.bin/vitest run tests/unit/reports` passed, 11 files / 30 tests.
- TypeScript: `bun run typecheck` passed.
- ESLint: `bun run lint` passed.
- Targeted source scan for procurement read formatter usage, removed presenter `{error.message}` rendering, normalized dashboard hook, centralized query key, and unsafe-message fallback passed.
- Diff hygiene: `git diff --check` passed.

### Gates Skipped

- Browser QA skipped because this is read-error copy hardening with no layout or interaction change.

### Smells Removed

- Direct `error.message` rendering in the procurement analytics report presenter.
- Cached procurement analytics warning copy derived directly from an arbitrary error object.

### Deferred

- Broader procurement-domain widgets outside reports still need their own read-state pass.
- Job costing cached-warning copy remains normalized by its hook but still uses direct `error.message`; that can be a separate jobs/reports slice.

### Goal Adaptation

- Declined. The standing maintainer process already covers operator-safe errors, workflow-spine contracts, source evidence, and bounded domain slices.

### Residual Risk

- The formatter is intentionally local to procurement analytics; other reports surfaces still need their own read-feedback passes.
- If future procurement analytics callers want richer recovery actions, the UI still only provides stable copy rather than a repair workflow.
