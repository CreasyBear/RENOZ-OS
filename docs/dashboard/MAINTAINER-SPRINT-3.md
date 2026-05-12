# Dashboard Maintainer Sprint 3: Overview Query-Key Ownership

## Status

Closed in commit-ready state.

## Issue 1: Overview Won-This-Month Metric Used an Inline Query Key

### Problem

`OverviewContainer` queried the current-month revenue attribution summary with an inline `['dashboard', 'overview', 'wonThisMonth', ...]` key. The shape was stable, but it kept dashboard overview cache ownership local to the container instead of the centralized query-key registry used by the rest of the dashboard hooks.

### Workflow Spine

`/dashboard`
-> `OverviewContainer`
-> `getRevenueAttribution`
-> dashboard overview won-this-month query
-> centralized `queryKeys.dashboard.overviewWonThisMonth`.

### Touched Domains

- Dashboard overview container.
- Central query-key registry.
- Dashboard cache contract test.
- Dashboard maintainer closeout docs.

### Business Value Protected

The dashboard overview is the operator's first read on monthly won work, pending orders, low stock, cash, projects, and sales health. A named overview metric key keeps refresh and future realtime/dashboard work aligned to the actual executive metric instead of a hidden local array.

### Scope Constraints

- Do not change the revenue attribution server function, date range calculation, read-result normalization, dashboard rendering, summary copy, or stale time.
- Do not broaden dashboard refresh behavior.
- Keep this slice limited to query-key centralization for the won-this-month read.

### Changes

- Added `queryKeys.dashboard.overview()`.
- Added `queryKeys.dashboard.overviewWonThisMonth(dateFrom, dateTo)`.
- Replaced the inline overview query key in `OverviewContainer` with the centralized helper.
- Added a focused dashboard cache contract for key shape and container usage.

### Standards Checked

- Domain ownership: dashboard overview metric cache ownership now lives in `queryKeys.dashboard`.
- Route -> container/page -> hook -> server function -> schema/database -> query/cache policy: checked through dashboard route, overview container, revenue attribution server read, and named query key.
- Tenant isolation/data integrity: unchanged; server auth/tenant behavior was not touched.
- Transactional inventory/finance integrity: unchanged; this is a read-key centralization slice.
- Serialized lineage continuity: not touched.
- Honest UI/error handling: read-result fallback behavior unchanged.
- Query/cache contract: improved and covered by focused contract.
- Reviewability: one query-key helper addition, one container replacement, one contract, one closeout note.

### Smells Removed

- Inline dashboard overview query-key array in a container.
- Hidden ownership for the won-this-month dashboard read.

### Deferred

- `useXeroPaymentEvents` still appends pagination inline to `queryKeys.financial.xeroPaymentEvents()`; that belongs to a financial/Xero slice.
- Dev-only query diagnostic logs in overview containers remain deferred from Dashboard Sprint 1.
- Browser QA remains deferred because this changes cache-key ownership only.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/dashboard/overview-cache-contract.test.ts tests/unit/dashboard/query-normalization-wave7d.test.tsx tests/unit/dashboard/overview-metrics.test.ts tests/unit/dashboard/overview-stats.test.tsx`.
- Passed: `./node_modules/.bin/eslint src/lib/query-keys.ts src/components/domain/dashboard/overview/overview-container.tsx tests/unit/dashboard/overview-cache-contract.test.ts --report-unused-disable-directives`.
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. This sprint continues centralized query-key cleanup under the standing maintainer goal.

### Residual Risk

Low. The cache key shape is preserved exactly; the ownership moved into the central registry.
