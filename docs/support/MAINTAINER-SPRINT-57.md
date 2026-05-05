# Support Maintainer Sprint 57

This sprint follows Sprint 56's issue-detail CSAT wiring into the support dashboard CSAT read states. The target is CSAT dashboard metrics and low-rating alerts: dashboard refresh should include CSAT, stale CSAT data should remain visible with a degraded warning, and hard CSAT failures should offer retry.

Status: Closed after Issue 1.

## Business Value

CSAT dashboard widgets help operators see customer support health and follow up on poor outcomes. They should not hide stale-but-useful CSAT data behind a hard error, and the dashboard refresh action should refresh the CSAT widgets as well as the main support metrics.

## Workflow Spine

`/support/dashboard`
-> `SupportDashboardPage`
-> `CsatMetricsWidget` / `CsatLowRatingAlerts`
-> `useCsatMetrics`
-> `getCsatMetrics` server function and schema
-> CSAT database aggregates and low-rating rows
-> `queryKeys.support.csatMetricsWithFilters`
-> honest dashboard hard-error, degraded, and retry states.

## Architecture Constraints

- Keep this sprint to CSAT dashboard read states.
- Do not change CSAT server functions, schemas, metrics aggregation, query keys, or dashboard layout structure.
- Keep route-level query state decisions in the route and widget display in the widgets.
- Serialized gates are not part of this slice's gate set; run them only when a future diff touches serialized lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or related repair scripts.

## Issue Ledger

### 1. CSAT Dashboard Honest Read States

Problem:

- The dashboard Refresh button only refetched support metrics, not CSAT metrics.
- `CsatMetricsWidget` and `CsatLowRatingAlerts` treated any query error as a hard error, even when stale CSAT metrics were still available.
- Hard CSAT widget failures had no retry path.

Workflow protected:

Support dashboard route -> CSAT metrics hook -> CSAT metrics server function/schema -> CSAT metrics query key -> metrics widget and low-rating alerts with hard-error, degraded, and retry states.

Implemented slice:

- Added `refetchCsatMetrics` to the dashboard route.
- Changed dashboard Refresh to refetch both support metrics and CSAT metrics.
- Split CSAT dashboard state into `csatHardError` and `csatWarning`.
- Passed degraded warning copy and retry callbacks into both CSAT widgets.
- Added hard-error alerts with retry actions to CSAT metrics and low-rating widgets.
- Added stale-data warnings while keeping existing CSAT data visible.
- Added a source contract to protect the dashboard CSAT read-state behavior.

Out of scope:

- CSAT metric aggregation behavior.
- Support overview metric read-state cleanup.
- Browser QA and visual layout tuning.
- CSAT issue-detail behavior, closed in Sprint 56.

Closeout:

- Touched domains: support dashboard route, CSAT metrics widget, CSAT low-rating alerts, support tests, support sprint evidence.
- Workflow protected: dashboard route -> CSAT widgets -> `useCsatMetrics` -> `getCsatMetrics` server function/schema -> `queryKeys.support.csatMetricsWithFilters` -> honest hard-error/degraded/retry display.
- Business value protected: operators can refresh CSAT from the dashboard and continue using last-known CSAT data when refresh fails.
- Architecture standards checked: route owns query-state classification; widgets own display states; CSAT hook, server function, schema, database aggregation, and query key policy unchanged.
- Tenant isolation and data integrity checked: no organization predicate, CSAT aggregate query, low-rating query, database write path, or permission boundary changed.
- Query/cache contract checked: `useCsatMetrics` still uses the same filtered CSAT metrics query key and normalized read-error behavior.
- Smells removed: dashboard Refresh ignoring CSAT; CSAT widgets hiding stale data on refresh error; CSAT hard-error states without retry.
- Smells deferred: support overview metric read-state copy still displays raw errors; dashboard visual spacing should be browser-checked before visual release.
- Gates run: focused CSAT dashboard/read-state and recent CSAT wiring/feedback contracts, 6 files / 9 tests; full support unit suite, 57 files / 191 tests; `bun run typecheck`; `bun run lint`; targeted source scans; `git diff --check`.
- Gates skipped: browser QA, because this sprint is read-state behavior with source/contract coverage and no dev server was already running.
- Goal adaptations: accepted maintainer direction that serialized gates stay retired from default sprint closeout and run only for slices touching serialized lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or related repair scripts.
- Residual risk: support overview metric hard-error copy still needs review, and dashboard visual QA remains a follow-up before a visual release.
