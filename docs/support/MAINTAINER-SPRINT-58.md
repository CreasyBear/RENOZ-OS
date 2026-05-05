# Support Maintainer Sprint 58

This sprint follows Sprint 57's CSAT dashboard read-state cleanup into the core support metrics read states. The target is support landing and dashboard metrics: raw query errors should not leak to operators, stale support metrics should stay visible with a degraded warning, and hard support-metrics failures should not render fake zero/empty dashboard panels.

Status: Closed after Issue 1.

## Business Value

Support metrics drive queue triage, SLA visibility, and daily support prioritization. Operators should know when metrics are unavailable without seeing internal error text or trusting false zero counts.

## Workflow Spine

`/support` and `/support/dashboard`
-> `SupportLandingPage` / `SupportDashboardPage`
-> `SupportMetricsReadStateAlert`
-> `useSupportMetrics`
-> `getSupportMetrics` server function and schema
-> support issue and SLA aggregate reads
-> `queryKeys.support.supportMetricsWithDates`
-> operator-safe hard-error and stale-data states.

## Architecture Constraints

- Keep this sprint to support metrics read states.
- Do not change support metrics server functions, schemas, aggregate SQL, query keys, or cache policy.
- Keep route-level query state classification in the routes and display copy in a domain component.
- Serialized gates are not part of this slice's gate set; this diff does not touch serialized lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or repair scripts.

## Issue Ledger

### 1. Support Metrics Honest Read States

Problem:

- Support landing and dashboard displayed raw `error.message` text for support metrics query failures.
- Dashboard hard failures still rendered zero/empty support metric panels, which could look like real operational data.
- Stale support metrics during a refresh failure were not distinguished from a hard load failure.

Workflow protected:

Support landing/dashboard route -> support metrics hook -> support metrics server function/schema -> support metrics query key -> operator-safe hard-error and stale-data states.

Implemented slice:

- Added `SupportMetricsReadStateAlert` as the shared support-domain read-state display.
- Split support metrics state in landing and dashboard into hard-error and stale-warning branches.
- Replaced raw error rendering with safe, retryable unavailable and stale refresh alerts.
- Suppressed support dashboard metric panels when no support metrics data exists after a hard failure.
- Added a source contract for support metrics read-state behavior.

Out of scope:

- Support metrics aggregation behavior.
- Support metrics query/cache policy.
- CSAT dashboard read states, closed in Sprint 57.
- Browser QA and visual spacing.

Closeout:

- Touched domains: support landing route, support dashboard route, support metrics read-state component, support tests, support sprint evidence.
- Workflow protected: `/support` and `/support/dashboard` -> `useSupportMetrics` -> `getSupportMetrics` server function/schema -> `queryKeys.support.supportMetricsWithDates` -> operator-safe hard-error and stale-data display.
- Business value protected: operators no longer see internal support metrics failure text or fake zero/empty dashboard metrics after a hard metrics failure.
- Architecture standards checked: routes own query-state classification; shared support component owns display copy; hook, server function, schema, SQL aggregates, and query key policy unchanged.
- Tenant isolation and data integrity checked: no organization predicate, support issue aggregate read, SLA aggregate read, database write path, or permission boundary changed.
- Query/cache contract checked: `useSupportMetrics` still uses the same date-scoped support metrics query key and normalized read-error behavior.
- Smells removed: raw support metrics errors in landing/dashboard; hard dashboard metrics failure rendering fake zero/empty panels; no stale-data branch for support metrics refresh errors.
- Smells deferred: browser visual QA remains needed before a visual release; broader support issue/detail raw read-state copy remains a future domain slice.
- Gates run: focused support metrics/read-state and recent CSAT/query normalization contracts, 3 files / 6 tests; full support unit suite, 58 files / 192 tests; `bun run typecheck`; `bun run lint`; targeted source scans; `git diff --check`.
- Gates skipped: browser QA, because this sprint changes route read-state branching and shared alert copy with source/contract coverage, but no dev server was already running.
- Goal adaptations: declined. The Sprint 57 serialized-gate adaptation still applies; this slice does not touch those contracts.
- Residual risk: dashboard visual spacing around hard/stale alerts still needs browser QA before a visual release, and broader support issue/detail raw read-state copy remains a future domain slice.
