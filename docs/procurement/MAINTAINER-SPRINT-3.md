# Procurement Maintainer Sprint 3

## Status

Closed in commit-ready state.

## Issue 1: Receiving Dashboard Read-Error Safety

### Problem

Sprint 2 hardened the main procurement dashboard, but `ReceivingDashboard` still rendered `error.message` directly when the ordered purchase-order list failed. `usePurchaseOrders` already normalizes list read failures, but the receiving presenter accepted a generic `Error` and could leak raw database or infrastructure copy if the normalized hook path was bypassed.

### Workflow Spine

Procurement receiving route
-> `ReceivingDashboardContainer`
-> `usePurchaseOrders` with `status: ['ordered']`
-> `listPurchaseOrders`
-> centralized purchase-order list query key and read-path normalization
-> `ReceivingDashboard`
-> operator-safe receiving error state.

### Touched Domains

- Procurement receiving dashboard presenter.
- Procurement receiving read-state copy helper.
- Procurement receiving read-state tests.

### Business Value Protected

Goods receiving is the bridge from purchase orders into inventory availability. If the awaiting-receipt list fails, operators need a stable recovery message that does not expose database constraints, transport failures, or internal server wording while they are trying to receive stock.

### Scope Constraints

- Do not change receiving route behavior, ordered purchase-order filters, polling interval, query keys, cache policy, metrics summary behavior, selection state, bulk receiving, single receiving, inventory writes, or serialization requirements.
- Preserve normalized purchase-order list read copy when the error is a `ReadQueryError`.
- Hide non-read/raw errors behind receiving-owned fallback copy.
- Keep the slice inside the receiving presenter read-error boundary.

### Changes

- Added `receiving-dashboard-error-messages.ts` with receiving-owned fallback copy and a guarded read-error helper.
- Changed `ReceivingDashboard` to render the helper result instead of arbitrary `error.message`.
- Added focused coverage proving normalized purchase-order list read copy is preserved and raw database-style receiving read errors are suppressed.

### Standards Checked

- Domain ownership: receiving dashboard read-error copy now lives beside the receiving presenter.
- Route -> container/page -> hook -> server flow: preserved.
- Query/cache policy: no query keys, stale times, refetch intervals, invalidations, or cache ownership changed.
- Tenant isolation/data integrity: no server function, auth boundary, organization predicate, write path, inventory side effect, finance side effect, bulk receiving behavior, or serialized lineage changed.
- UI states/error handling: receiving hard-error state now trusts only read-path-normalized messages.
- Reviewability: the diff is limited to one helper, one presenter message call site, focused tests, and this closeout note.

### Smells Removed

- Direct `error.message` rendering in the receiving dashboard hard-error state.
- Missing regression coverage for unsafe receiving dashboard read-error suppression.

### Deferred

- Receiving mutation and serialization boundaries were not touched; they remain governed by the existing purchase-order receiving contracts.
- Browser QA was not selected because this was source-covered error-copy behavior with no intended route, layout, or interaction change.

### Gates

- Passed: focused receiving dashboard/read contract, `./node_modules/.bin/vitest run tests/unit/procurement/receiving-dashboard-read-state.test.tsx` - 1 file, 2 tests.
- Passed: receiving and purchase-order normalization set, `./node_modules/.bin/vitest run tests/unit/procurement/receiving-dashboard-read-state.test.tsx tests/unit/purchase-orders/query-normalization-wave3c.test.tsx tests/unit/purchase-orders/query-normalization-wave3c-consumers.test.tsx tests/unit/purchase-orders/receiving-metrics.test.ts` - 4 files, 11 tests.
- Passed: broader procurement/purchase-order/approval suite, `./node_modules/.bin/vitest run tests/unit/procurement tests/unit/purchase-orders tests/unit/approvals tests/unit/suppliers/query-normalization-wave7c.test.tsx` - 43 files, 124 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for receiving direct `error.message`, helper usage, fallback copy, and unsafe database-error suppression coverage.
- Note: the broader suite still emits the existing `--localstorage-file` jsdom warning; tests pass.
- Skipped: browser QA because this is error-copy behavior in an existing failure state with focused render coverage.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not deliberately change serialized lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or repair scripts.

### Goal Adaptation

Declined. The runtime gate practice from Sprint 2 still applies: serialized gates are conditional evidence for serialized lineage or inventory identity work, not routine evidence for read-state display slices.

### Residual Risk

Low for the receiving dashboard hard-error state. Broader procurement/purchase-order receiving mutation flows were not changed in this sprint.
