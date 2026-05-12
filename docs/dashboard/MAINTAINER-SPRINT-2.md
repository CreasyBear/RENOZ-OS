# Dashboard Maintainer Sprint 2

## Slice

Business overview refresh should refetch the dashboard queries it renders instead of invalidating finance, pipeline, and customer analytics roots.

## Business Value

The business overview is a top-level RENOZ operating dashboard. Refreshing it should update the visible finance, pipeline, customer, operations, and recent-item cards without causing unrelated domain cache churn across finance, sales pipeline, or customer analytics surfaces.

## Workflow Spine

```text
business overview dashboard
  -> business overview container
  -> mounted finance/pipeline/customer/orders/jobs/inventory/dashboard hooks
  -> query refetch for visible dashboard reads
  -> presenter refresh state
```

## Triage Findings

- The container used `queryKeys.financial.all`, `queryKeys.pipeline.all`, and `queryKeys.customerAnalytics.all` for a manual dashboard refresh.
- The container already had all mounted query objects available.
- This is a dashboard read-refresh workflow, not a finance/pipeline/customer mutation workflow.

## Implementation

- Removed `useQueryClient` and `queryKeys` from the business overview container.
- Changed refresh to `refetch()` every mounted query that feeds the dashboard.
- Expanded `isRefreshing` to include all refreshed query families, including recent-item popovers and operations reads.
- Added a focused business overview cache contract.

## Closeout

Touched domains: dashboard, with read-only finance, pipeline, customer, orders, jobs, inventory, and dashboard hook consumers.

Workflow protected: business overview manual refresh.

Business value: operators can refresh the top-level operating readout without hidden root invalidations across unrelated domain cache surfaces.

Standards checked: route/container -> hook/query -> cache policy flow, centralized query ownership, honest refresh state, meaningful tests, reviewable diff.

Smells removed: cross-domain root invalidation from dashboard refresh.

Deferred: deeper dashboard data-shape QA and browser smoke; this slice changes cache refresh plumbing, not layout or copy.

Verification: `./node_modules/.bin/vitest run tests/unit/dashboard/business-overview-cache-contract.test.ts tests/unit/dashboard/dashboard-feedback-contract.test.ts`, `./node_modules/.bin/eslint src/components/domain/dashboard/business-overview/business-overview-container.tsx tests/unit/dashboard/business-overview-cache-contract.test.ts --report-unused-disable-directives`, targeted root-invalidation scans, `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`, `git diff --check`.

Goal adaptation: none.

Residual risk: medium. Manual refresh is now exact to mounted queries, but the dashboard still composes many domains and should eventually have a shared dashboard data dependency manifest if the surface keeps growing.
