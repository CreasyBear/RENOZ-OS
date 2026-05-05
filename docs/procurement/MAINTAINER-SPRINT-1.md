# Procurement Maintainer Sprint 1

## Status

Closed in commit-ready state.

## Issue 1: Procurement Alerts Read-Error Safety

### Problem

`ProcurementAlerts` rendered `error.message` directly in both the hard-error empty-alert state and the stale-alert warning state. The `useProcurementAlerts` hook normalizes read failures, but the presenter still accepted arbitrary `Error` values and could leak database or infrastructure copy if a caller bypassed the normalized hook path.

### Workflow Spine

Procurement dashboard route
-> `useProcurementAlerts`
-> `getProcurementAlerts`
-> centralized query key and read-path normalization
-> `ProcurementAlerts`
-> operator-safe empty-alert or stale-alert state.

### Touched Domains

- Procurement alert presenter.
- Procurement alert read-state copy helper.
- Procurement alert read-state tests.

### Business Value Protected

Procurement alerts are an operator attention surface for supplier issues, overdue approvals, delayed deliveries, and stock-related warnings. Failure copy must be safe and actionable without exposing database, constraint, stack, or infrastructure details.

### Scope Constraints

- Do not change alert fetching, query keys, stale/refetch policy, alert sorting, grouping, severity rendering, dismiss behavior, dashboard routing, server functions, or procurement dashboard data mapping.
- Preserve normalized read-path copy when the error is a `ReadQueryError`.
- Hide non-read/raw errors behind procurement-owned fallback copy.

### Changes

- Added `procurement-alert-error-messages.ts` with `getProcurementAlertsErrorMessage`.
- Changed `ProcurementAlerts` to use the helper in both hard-error and stale-warning states.
- Added focused coverage proving normalized read copy is preserved and raw database-style errors are suppressed in both rendered alert error states.

### Standards Checked

- Domain ownership: procurement alert read-error copy now lives in a procurement-owned helper.
- Route -> container/page -> hook -> server flow: unchanged.
- Query/cache policy: no query keys, stale times, refetch intervals, invalidations, or cache ownership changed.
- Tenant isolation/data integrity: no server function, auth boundary, organization predicate, write path, inventory side effect, or finance side effect changed.
- UI states/error handling: procurement alert failure states now trust only read-path-normalized messages.
- Reviewability: the diff is limited to one helper, two presenter message call sites, focused tests, and this closeout note.

### Smells Removed

- Direct `error.message` rendering in procurement alert empty-error state.
- Direct `error.message` rendering in procurement alert stale-warning state.
- Missing regression coverage for unsafe procurement alert read-error suppression.

### Deferred

- Other procurement dashboard widgets still have inline `error.message` fallback paths and should be handled as separate widget-specific read-state slices.
- Browser QA was not selected because this was source-covered error-copy behavior with no route/layout/interaction change.

### Gates

- Passed: focused procurement alert/read contracts, `./node_modules/.bin/vitest run tests/unit/procurement/procurement-alerts-read-state.test.tsx tests/unit/procurement/query-normalization-wave3f.test.tsx tests/unit/procurement/query-normalization-wave3f-consumers.test.tsx` - 3 files, 9 tests.
- Passed: broader procurement/purchase-order/approval suite, `./node_modules/.bin/vitest run tests/unit/procurement tests/unit/purchase-orders tests/unit/approvals tests/unit/suppliers/query-normalization-wave7c.test.tsx` - 41 files, 118 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for `getProcurementAlertsErrorMessage`, fallback copy, removed direct alert `error.message`, and unsafe database-error suppression coverage.
- Note: the broader suite still emits the existing `--localstorage-file` jsdom warning; tests pass.
- Skipped: browser QA because this is error-copy behavior in existing alert states with focused render coverage.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not deliberately change serialized lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or repair scripts.

### Goal Adaptation

Declined. The standing maintainer goal already covers operator-safe errors, read-path contracts, modular domain ownership, meaningful tests, and risk-selected evidence.

### Residual Risk

Low for procurement alerts. Dashboard metric widgets still need their own read-state hardening pass.
