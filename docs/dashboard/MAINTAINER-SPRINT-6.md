# Dashboard Maintainer Sprint 6: Dashboard Query Key Catalog Boundary

## Status

Closed and commit-ready.

## Problem

`src/lib/query-keys.ts` remained a shared cache monolith after the communications
catalog extraction. The dashboard section still owned executive overview,
realtime dashboard roots, recent item popovers, inventory counts, tracked
products, targets, metrics, scheduled reports, layouts, and onboarding cache
keys inline in the aggregate.

That kept a high-traffic cross-domain dashboard surface coupled to the global
query-key implementation instead of a dashboard-owned catalog.

## Workflow Spine Protected

Dashboard route and dashboard hooks -> public `queryKeys.dashboard` adapter ->
extracted `dashboardQueryKeys` catalog -> exact TanStack query tuples ->
unchanged overview, realtime, metrics, target, layout, onboarding, and
scheduled-report cache behavior.

## Touched Domains

- Shared query-key aggregate adapter.
- Dashboard query-key catalog implementation.
- Dashboard overview cache contract tests.
- Dashboard business overview, dashboard read-state, and realtime cache
  contract coverage.

## Business Value Protected

The dashboard is the executive operations surface for revenue, pipeline,
fulfillment, inventory pressure, customer health, targets, and operational
follow-up. Keeping its cache identity exact protects fast decision-making
without letting dashboard cache contracts stay buried in the shared monolith.

## Scope Constraints

- No caller syntax changed; callers still use `queryKeys.dashboard.*`.
- No query tuple shape changed.
- No dashboard route, hook, server function, schema/database, or UI behavior
  changed.
- No realtime invalidation behavior changed.
- No dashboard metrics, target, layout, onboarding, or scheduled-report
  semantics changed.
- No reports query-key catalog migration was attempted.

## Changes

- Added `src/lib/query-key-catalog/dashboard.ts` as the dashboard cache catalog
  owner.
- Moved dashboard filter types into the dashboard catalog and re-exported them
  through `src/lib/query-keys.ts` for compatibility.
- Replaced the inline `queryKeys.dashboard` aggregate section with the extracted
  catalog adapter.
- Added a contract test that pins public adapter identity to
  `dashboardQueryKeys`.
- Added source-boundary assertions that keep dashboard cache roots out of the
  aggregate implementation.
- Added representative tuple assertions for metrics, target progress,
  scheduled-report status, and user layout keys.

## Standards Checked

- Domain ownership: dashboard cache contracts now live in a dashboard-owned
  catalog.
- Route -> container/page -> hook -> server function -> schema/database flow:
  unchanged; only the shared query-key owner moved.
- Tenant isolation: unchanged; no data access or authorization path changed.
- Transactional inventory and finance integrity: unchanged; dashboard reads and
  realtime invalidation roots were preserved.
- Serialized lineage continuity: unchanged; no serialized inventory mutation
  path changed.
- Query/cache contracts: public adapter identity and representative dashboard
  tuple shapes are pinned by tests.
- Honest UI states: unchanged; dashboard read-state tests stayed in the focused
  gate.
- Operator-safe errors: unchanged; no mutation or error boundary behavior
  changed.
- Reviewable diff: one catalog extraction, one aggregate adapter replacement,
  and focused contract-test additions.

## Smells Removed

- Reduced `src/lib/query-keys.ts` from 1,962 lines to 1,834 lines.
- Removed the inline dashboard catalog from the global query-key monolith.
- Removed `queryKeys.dashboard` self-reference coupling inside dashboard
  query-key construction.
- Moved dashboard-specific filter types out of the aggregate file.

## Smells Deferred

- `src/lib/query-keys.ts` still owns remaining inline catalogs for domains such
  as reports, financials, customers, orders, jobs, suppliers, and warranty.
- Large server monoliths remain outside this dashboard cache slice.
- Large frontend workflow components remain outside this dashboard cache slice.
- Reports query keys overlap conceptually with dashboard targets and scheduled
  reports; they should move in a separate reports-owned slice.

## Gates

- Focused ESLint:
  `./node_modules/.bin/eslint src/lib/query-keys.ts src/lib/query-key-catalog/dashboard.ts tests/unit/dashboard/overview-cache-contract.test.ts tests/unit/dashboard/business-overview-cache-contract.test.ts tests/unit/dashboard/dashboard-feedback-contract.test.ts tests/unit/dashboard/query-normalization-wave5c.test.tsx tests/unit/dashboard/query-normalization-wave7d.test.tsx --report-unused-disable-directives`
  - Passed.
- Focused dashboard and realtime tests:
  `./node_modules/.bin/vitest run tests/unit/dashboard/overview-cache-contract.test.ts tests/unit/dashboard/business-overview-cache-contract.test.ts tests/unit/dashboard/dashboard-feedback-contract.test.ts tests/unit/dashboard/query-normalization-wave5c.test.tsx tests/unit/dashboard/query-normalization-wave7d.test.tsx tests/unit/inventory/inventory-realtime-cache-contract.test.ts tests/unit/orders/orders-realtime-cache-contract.test.ts tests/unit/pipeline/pipeline-realtime-cache-contract.test.ts`
  - Passed, 8 files / 16 tests.
- Full source lint:
  `npm run lint`
  - Passed.
- Typecheck:
  `npm run typecheck`
  - Passed.
- Diff whitespace:
  `git diff --check`
  - Passed.
- Full unit suite:
  `npm run test:unit`
  - Passed, 766 files / 2,546 tests.

## Goal Adaptation

No standing goal change. The sprint continues the current product-owner goal:
small domain-sliced monolith reduction, stable workflow protection, explicit
ownership boundaries, and evidence-backed closeout.

## Residual Risk

Low behavior risk because the public adapter name, realtime roots, overview key,
and representative tuple shapes are pinned, and no runtime caller path changed.
Medium architecture risk remains because the global query-key aggregate is still
large and several non-dashboard catalogs remain inline.
