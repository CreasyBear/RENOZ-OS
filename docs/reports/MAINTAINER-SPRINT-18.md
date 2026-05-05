# Reports Maintainer Sprint 18

## Status

Closed after Issue 1.

## Issue 1: Target Progress Metric Calculation Honesty

### Problem

Target progress calculation swallowed metric aggregation failures and returned `0` as the current value. That made an unavailable KPI metric look like a real zero-progress target, which can mislead operators reviewing dashboard and target settings progress.

### Workflow Spine

dashboard or targets settings
-> `TargetProgressWidget`
-> `useTargetProgress`
-> `getTargetProgress`
-> `getTargetProgressSchema` / target progress response schema
-> org-scoped active target query
-> metric aggregator
-> explicit target-level unavailable state or calculated progress.

### Touched Domains

- Reports target progress server contract.
- Reports target progress schema.
- Dashboard target progress presenter.

### Business Value Protected

Targets are management signals for revenue, orders, customers, pipeline, warranty, and operational performance. A metric read failure should not become a fake zero that pushes a target behind or underperforming.

### Scope Constraints

- Do not change target CRUD, permissions, route wiring, query keys, mutation invalidation, or active target filters.
- Do not change metric aggregator definitions.
- Do not fail the entire target progress response when one target metric cannot be calculated.
- Do not broaden into dashboard metric cards outside the target progress widget.

### Changes

- Added an explicit target-progress `unavailable` status.
- Added optional overall unavailable-count metadata to the target progress response.
- Stopped swallowing metric aggregation failures inside `calculateMetricValue`.
- Marked individual target progress rows unavailable when their metric calculation fails.
- Kept target-level diagnostics in server logs.
- Rendered unavailable target rows without displaying a fake `0 / target` value.
- Added focused schema, source, and component coverage.

### Standards Checked

- Domain ownership: reports owns the target progress calculation and schema contract; dashboard owns the shared target-progress presenter.
- Route/page -> hook -> server/schema -> query key/cache policy: route usage, `useTargetProgress`, `getTargetProgress`, schema, and centralized progress query key remain intact.
- Query/cache policy: unchanged; target mutations still invalidate `queryKeys.reports.targets.progress()`.
- Tenant isolation: unchanged; progress still reads active targets by `ctx.organizationId`.
- Inventory/finance integrity: no inventory, warehouse, finance, stock, valuation, warranty, or RMA write path changed.
- UI state: target-level unavailable progress is distinct from behind, on-track, ahead, completed, and empty states.
- Error handling: failed metric aggregation is logged server-side and represented as unavailable instead of fake zero progress.
- Diff reviewability: one schema extension, one server calculation boundary, one presenter state, focused contracts, and one sprint note.

### Gates Run

- Focused target progress contracts: `./node_modules/.bin/vitest run tests/unit/reports/target-progress-schema.test.ts tests/unit/reports/target-progress-calculation-contract.test.ts tests/unit/dashboard/target-progress-widget.test.tsx tests/unit/finance-dashboard/query-normalization-wave6f.test.tsx` passed, 4 files / 8 tests.
- Full reports unit suite: `./node_modules/.bin/vitest run tests/unit/reports` passed, 17 files / 44 tests.
- Dashboard unit suite: `./node_modules/.bin/vitest run tests/unit/dashboard` passed, 7 files / 26 tests.
- TypeScript: `bun run typecheck` passed.
- ESLint: `bun run lint` passed.
- Targeted source scan for unavailable status, removed fake-zero fallback, target progress query key/cache policy, and unavailable presenter copy passed.
- Diff hygiene: `git diff --check` passed.

### Gates Skipped

- Browser QA skipped because this is a source-covered target-progress state hardening slice with no layout redesign.
- Additional reliability, finance, document, release, and deploy gates were not selected because this slice does not touch those contracts.

### Smells Removed

- Metric aggregation failures no longer return `0` as if the target's actual progress were known.
- Dashboard target progress no longer displays `$0 / target` or `0 / target` for unavailable target metrics.
- Overall target progress now has optional unavailable-count evidence for degraded progress responses.

### Deferred

- The metric aggregator still determines which target metrics are calculable.
- Targets settings mutation toasts still use generic failure copy and remain outside this progress-read slice.
- Browser-level visual confirmation of the unavailable target row remains deferred.

### Goal Adaptation

- Declined. The standing maintainer process already covers honest UI states, server/schema contracts, query/cache checks, focused tests, and evidence-based closeout.

### Residual Risk

- Existing users may now see unavailable target rows for metrics that were previously shown as zero; that is intentionally more honest but may reveal unsupported metric mappings that need follow-up.
- Overall progress percentage now excludes unavailable rows from the denominator while still reporting active target total and unavailable count.
