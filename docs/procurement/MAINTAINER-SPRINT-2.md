# Procurement Maintainer Sprint 2

## Status

Closed in commit-ready state.

## Issue 1: Procurement Dashboard Read-Error Safety

### Problem

Sprint 1 hardened procurement alerts, but the main dashboard widgets still rendered arbitrary `error.message` values in spend, order, supplier, approval, and full-page aggregate failure states. The hooks normalize these read failures, but the presenter and page boundaries accepted generic `Error` objects and could leak database or infrastructure wording if a caller bypassed the normalized hook path.

### Workflow Spine

Procurement dashboard route
-> `useSpendMetrics`, `useOrderMetrics`, `useSupplierMetrics`, `usePendingApprovals`
-> procurement/approval server functions
-> centralized query keys and read-path normalization
-> `DashboardWidgets`
-> operator-safe widget or full-page error states.

### Touched Domains

- Procurement dashboard route.
- Procurement dashboard widget presenter.
- Procurement dashboard read-state copy helper.
- Procurement dashboard read-state tests.

### Business Value Protected

The procurement dashboard is the operator overview for spend, purchase-order flow, supplier performance, and approval backlog. When these reads fail, operators need stable recovery copy, not raw database constraints, server wording, or transport details.

### Scope Constraints

- Do not change procurement fetching, query keys, stale/refetch policy, cache contracts, dashboard mapping, approval filtering, or server functions.
- Preserve normalized read-path copy when the error is a `ReadQueryError`.
- Hide non-read/raw errors behind procurement-owned fallback copy.
- Keep the slice inside procurement read-state/display boundaries.

### Changes

- Added `procurement-dashboard-error-messages.ts` with procurement-owned fallback copy and guarded read-error helpers for spend, order, supplier, approval, and full-page dashboard failures.
- Changed `DashboardWidgets` to use the helper in both stale-metric and no-metric error branches.
- Changed the procurement dashboard route aggregate error state to use the same safe dashboard read-error helper.
- Added focused render coverage proving raw database-style errors are suppressed across widget and full-page dashboard failure states.

### Standards Checked

- Domain ownership: dashboard read-error copy now lives in a procurement-owned helper.
- Route -> container/page -> hook -> server flow: preserved and documented by the route/widget boundary.
- Query/cache policy: no query keys, stale times, refetch intervals, invalidations, or cache ownership changed.
- Tenant isolation/data integrity: no server function, auth boundary, organization predicate, write path, inventory side effect, finance side effect, or serialized lineage changed.
- UI states/error handling: dashboard widget and aggregate failure states now trust only read-path-normalized messages.
- Reviewability: the diff is limited to one helper, two dashboard consumers, focused tests, and this closeout note.

### Smells Removed

- Direct `error.message` rendering in spend metrics widget failures.
- Direct `error.message` rendering in order metrics widget failures.
- Direct `error.message` rendering in supplier metrics widget failures.
- Direct `error.message` rendering in approval widget failures.
- Direct first-error rendering in the full-page procurement dashboard failure state.
- Missing regression coverage for unsafe procurement dashboard read-error suppression.

### Deferred

- `src/components/domain/procurement/receiving/receiving-dashboard.tsx` still has a direct receiving read-error `error.message` path and should be handled as a separate receiving slice.
- Browser QA was not selected because this was source-covered error-copy behavior with no intended route, layout, or interaction change.

### Gates

- Passed: focused procurement dashboard/read contracts, `./node_modules/.bin/vitest run tests/unit/procurement/procurement-dashboard-read-state.test.tsx` - 1 file, 4 tests.
- Passed: procurement read-state/query-normalization set, `./node_modules/.bin/vitest run tests/unit/procurement/procurement-dashboard-read-state.test.tsx tests/unit/procurement/procurement-alerts-read-state.test.tsx tests/unit/procurement/query-normalization-wave3f.test.tsx tests/unit/procurement/query-normalization-wave3f-consumers.test.tsx` - 4 files, 13 tests.
- Passed: broader procurement/purchase-order/approval suite, `./node_modules/.bin/vitest run tests/unit/procurement tests/unit/purchase-orders tests/unit/approvals tests/unit/suppliers/query-normalization-wave7c.test.tsx` - 42 files, 122 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for dashboard direct `error.message`, helper usage, fallback copy, and unsafe database-error suppression coverage.
- Note: the broader suite still emits the existing `--localstorage-file` jsdom warning; tests pass.
- Skipped: browser QA because this is error-copy behavior in existing failure states with focused render coverage.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not deliberately change serialized lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or repair scripts.

### Goal Adaptation

Accepted in runtime practice. Serialized lineage remains a product invariant, but serialized gates are not routine sprint evidence anymore; they should run only when a slice deliberately changes serialized lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or related repair scripts.

### Residual Risk

Low for the procurement dashboard metric widgets and aggregate page error state. The next procurement read-state cleanup should address the receiving dashboard boundary.
