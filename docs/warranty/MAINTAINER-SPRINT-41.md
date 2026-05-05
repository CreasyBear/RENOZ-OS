# Maintainer Sprint 41 - Warranty Analytics Stale Read States

## Slice

Warranty analytics hooks already normalize query failures and use centralized query keys, but the dashboard presenter treated every panel `isError` as a hard failure. That can hide cached warranty analytics during a failed refresh instead of disclosing that operators are looking at stale-but-useful data.

## Workflow Spine Protected

`/reports/warranties`
-> `WarrantyAnalyticsPage`
-> `WarrantyAnalyticsView`
-> warranty analytics chart presenters
-> `useWarrantyAnalyticsDashboard`
-> warranty analytics server functions and schemas
-> warranty analytics database reads
-> `queryKeys.warrantyAnalytics`
-> hard-error or stale-data dashboard states.

## Business Value Protected

Warranty analytics helps RENOZ understand battery warranty exposure, claim patterns, SLA performance, cycle-count behavior, and extension economics. During a refresh failure, operators should keep seeing the last known metrics with an explicit degraded warning instead of losing the panel to a generic error state.

## Touched Domains

- Warranty analytics report view.
- Warranty analytics chart presenters.
- Warranty analytics read-state contract tests.
- Warranty sprint evidence.

## Change

- Changed warranty analytics panels to treat `isError && !data` as the hard-error condition.
- Added panel-level stale warnings when cached analytics remain visible during refresh failure.
- Added retry wiring to the summary metrics hard-error state.
- Added focused source coverage for the route/view/chart/hook/server/query-key read-state contract.

## Standards Checked

- Domain ownership: the report view owns wiring, chart presenters own hard/stale/empty panel display, and hooks own query normalization.
- Route -> container -> hook -> server flow: `/reports/warranties` continues through `WarrantyAnalyticsPage`, `WarrantyAnalyticsView`, `useWarrantyAnalyticsDashboard`, warranty analytics server functions, schemas, database reads, and centralized query keys.
- Query/cache policy: no query keys, stale times, filters, or cache invalidation behavior changed.
- Tenant isolation/data integrity: no organization predicates, warranty/claim/extension queries, SQL aggregations, or financial calculations changed.
- UI states/error handling: hard failures require missing data; stale data remains visible with explicit degraded copy and retry where available.
- Reviewability: the diff is limited to the analytics presenter, pure view summary retry wiring, one focused test, and this closeout note.

## Smells Removed

- Removed panel-level `isError` branches that hid cached analytics during refresh failure.
- Removed generic summary hard-error behavior without retry.
- Added consistent stale-data copy across summary, claims, SLA, cycle-count, finance, extension, and resolution panels.

## Deferred

- The warranty analytics chart presenters still live under `components/domain/support`, which is a domain-boundary smell for a reports/warranty surface.
- Export failure feedback still uses raw mutation error copy and should be a separate mutation-feedback slice.
- Browser visual QA remains deferred.

## Gates

- Focused warranty analytics read-state and query-normalization tests: `./node_modules/.bin/vitest run tests/unit/warranty/warranty-analytics-read-state-contract.test.ts tests/unit/warranty/query-normalization-wave3-analytics.test.tsx` passed, 2 files and 5 tests.
- Warranty unit suite: `./node_modules/.bin/vitest run tests/unit/warranty` passed, 47 files and 141 tests.
- Typecheck: `bun run typecheck` passed.
- Full lint: `bun run lint` passed.
- Source scans: confirmed every analytics panel uses `isError && !data` for hard failures, stale-warning copy exists for each cached analytics panel, summary retry is wired, and no plain `if (isError) {` panel branch remains.
- Serialized/reliability gates: skipped by current maintainer direction; this slice does not touch serialized lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or repair scripts.
- Browser QA: skipped because this is a source-covered read-state behavior slice; visual spacing of the new warning alerts remains deferred.
- Diff hygiene: `git diff --check` passed.

## Goal Adaptation

No change to the maintainer goal. This is a bounded warranty-domain read-state cleanup using the current domain-triggered gate policy.

## Residual Risk

Browser visual QA remains unrun. The warranty analytics chart presenters still live under the support component directory, and export failure feedback still uses raw mutation error copy; both are separate follow-up slices.
