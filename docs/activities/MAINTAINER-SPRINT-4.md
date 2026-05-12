# Activity Maintainer Sprint 4

## Status

Closed in commit-ready state.

## Issue 1: Activity Helper Cache Scope

### Problem

`useInvalidateActivities().all()` still invalidated `queryKeys.activities.all`, and `useInvalidateActivities().stats()` still predicate-scanned the query cache for activity stats and leaderboard keys. That kept the generic activity helper functional, but it hid the actual activity surfaces affected by a mutation and preserved a broad root refresh path after communications-owned activity writes had already moved to explicit prefixes.

### Workflow Spine

Activity mutation or related entity mutation
-> `useInvalidateActivities`
-> centralized activity query keys
-> feed, detail, customer, opportunity, entity, user, stats, and leaderboard cache families
-> operator-facing activity timelines and analytics refresh without activity-root invalidation.

### Touched Domains

- Activity cache invalidation helper.
- Centralized activity query key family prefixes.
- Activity cache contract tests.

### Business Value Protected

Activities are the operational record that helps RENOZ operators reconstruct customer, opportunity, user, and internal workflow context. Cache refreshes need to be broad enough to keep activity surfaces honest, but narrow and named enough that future maintainers can see which operating views a mutation refreshes.

### Scope Constraints

- Do not change activity server functions, schemas, filters, stale times, or pagination behavior.
- Do not change communications mutation behavior beyond preserving the Sprint 28 cache contract.
- Do not introduce a cross-domain cache abstraction for one activity-domain helper.
- Do not reopen serialized gates as routine evidence.

### Changes

- Added explicit activity query family prefixes for details, customers, opportunities, entities, and users while preserving existing concrete key shapes.
- Replaced `useInvalidateActivities().all()` root invalidation with explicit invalidation of feed, detail, customer, opportunity, entity, user, stats, and leaderboard families.
- Replaced stats predicate scanning with direct stats and leaderboard prefix invalidation.
- Added a focused activity cache contract test that rejects `queryKeys.activities.all` invalidation and cache predicate scanning.

### Standards Checked

- Domain ownership: activity-wide invalidation policy remains inside `src/hooks/activities/use-activities.ts`, backed by centralized activity query keys.
- Route -> container/page -> hook -> server flow: unchanged; this slice only changed post-mutation cache refresh surfaces.
- Query/cache policy: the generic helper now states its cache contract through named key families instead of the activity root or predicate scanning.
- Tenant isolation/data integrity: no server function, schema, query predicate, tenant filter, or database path changed.
- Inventory/finance integrity: no inventory, valuation, finance, or closeout path changed.
- Serialized lineage: not touched; serialized gates remain retired from routine closeout.
- UI states/error handling: no user-facing copy or presenter state changed.
- Reviewability: the diff is limited to activity query keys, the activity invalidation helper, focused tests, and this closeout note.

### Smells Removed

- Activity-root invalidation from the generic activity invalidation helper.
- Cache predicate scanning for activity stats and leaderboard refresh.
- Missing explicit prefixes for activity detail, customer, opportunity, entity, and user key families.

### Deferred

- Activity mutation hooks outside this helper may still deserve their own cache-contract pass; this sprint narrowed the shared helper first because it is the reusable policy surface.
- Browser QA remains deferred because this slice changes cache invalidation wiring only, with no layout or interaction surface.
- A broader query-key audit across all domains remains deferred to avoid turning this activity-domain sprint into unbounded cleanup.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/activities/activity-cache-contract.test.tsx tests/unit/activities/use-quick-log-invalidation.test.ts tests/unit/communications/activity-cache-contract.test.tsx tests/unit/communications/query-normalization-wave4c.test.tsx` - 4 files, 13 tests.
- Passed: `./node_modules/.bin/eslint src/hooks/activities/use-activities.ts src/lib/query-keys.ts tests/unit/activities/activity-cache-contract.test.tsx --report-unused-disable-directives`.
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`.
- Passed: `git diff --check`.
- Skipped: browser QA, reliability, finance, document, release, deploy, and serialized gates because this slice did not touch those contracts.

### Goal Adaptation

Declined. The standing maintainer goal already covers centralized query keys, safe mutation/cache contracts, reviewable diffs, and risk-selected evidence. The local-only posture remains in effect for this sprint.

### Residual Risk

The helper now refreshes every named activity query family known in `queryKeys.activities`. If new activity families are added later, maintainers must add them to both the centralized key family list and the activity cache contract test so `useInvalidateActivities().all()` does not silently become stale.
