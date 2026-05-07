# Dashboard Maintainer Sprint 1

## Slice

Dashboard widget and display errors should use dashboard-owned operator-safe feedback instead of rendering raw query messages.

## Business Value

The dashboard is the quick operational readout for sales, finance-adjacent metrics, activity, targets, AI insights, and mobile status. When one widget fails, operators should get useful recovery copy without seeing query, database, or implementation details.

## Workflow Spine

```text
dashboard widgets/display containers
  -> dashboard hooks/query sources
  -> server functions/reporting reads
  -> query key/cache policy
  -> widget-level degraded and retry UI
```

## Triage Findings

- Multiple dashboard widgets rendered `error.message` directly.
- The repeated smell was local to display feedback; query ownership, tenant scope, and cache policy were not changed.
- Dev-only diagnostic logging still includes raw query messages and remains out of scope for this operator-facing slice.

## Implementation

- Added `dashboard-error-messages.ts` for dashboard display feedback.
- Routed chart, activity, KPI, AI insights, target progress, drill-down, mobile dashboard, and widget-grid errors through the helper.
- Added a focused dashboard feedback contract test.

## Closeout

Touched domains: dashboard.

Workflow protected: dashboard widget degraded states and retry surfaces.

Business value: operators get safe, consistent dashboard failure copy while preserving retry affordances.

Standards checked: dashboard component -> hook/query -> cache policy flow, honest UI states, operator-safe error handling, meaningful tests, reviewable diff.

Smells removed: raw dashboard display `error.message` rendering across widget and dashboard shell surfaces.

Deferred: dev-only query diagnostic logs in overview containers still expose raw query messages to development logs; observability cleanup is a separate slice.

Verification: `bun run test:vitest tests/unit/dashboard/dashboard-feedback-contract.test.ts`, `bun run typecheck`, `bun run lint`, targeted dashboard display raw-error scan, `git diff --check`.

Goal adaptation: none.

Residual risk: no browser QA yet; this slice changes copy boundaries, not widget layout or query behavior.
