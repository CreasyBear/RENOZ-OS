# Pipeline Maintainer Sprint 26

## Status

Closed in commit-ready state.

## Issue 1: Activity Mutation Cache Invalidations Were Duplicated Across Hooks

### Problem

`useLogActivity`, `useUpdateActivity`, `useCompleteActivity`, and `useDeleteActivity` each repeated the same five activity-related cache invalidations. That made the cache contract harder to audit and increased the chance future activity mutation changes would update one path but miss another.

### Workflow Spine

Activity mutation hook
-> activity server function
-> shared activity cache invalidation helper
-> Pipeline activity/follow-up/opportunity/timeline/unified audit caches.

### Touched Domains

- Pipeline activity mutation hooks.
- Pipeline activity mutation cache contract tests.
- Pipeline maintainer closeout docs.

### Business Value Protected

Activity logging and follow-up completion keep opportunity work current. All activity mutations need the same cache refresh behavior so operators do not see stale follow-up, timeline, opportunity, or unified audit data after a write.

### Scope Constraints

- Do not change mutation inputs, server functions, schemas, query keys, invalidation breadth, success semantics, error handling, UI rendering, or read hooks.
- Keep this as cache invalidation deduplication only.

### Changes

- Added `invalidateOpportunityActivityCaches(queryClient, opportunityId)`.
- Replaced the four duplicated activity mutation invalidation blocks with the shared helper.
- Added a focused source contract that ensures all four mutation hooks call the helper and the helper still invalidates the five existing cache families.

### Standards Checked

- Domain ownership: activity mutation cache behavior now has one local helper in the Pipeline activity mutation hook file.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: improved hook cache policy reviewability; server functions, schemas, database predicates, and query key shapes stayed unchanged.
- Tenant isolation/data integrity: unchanged; no server predicates, schemas, or writes touched.
- Query/cache contract: preserved invalidation breadth while removing duplication.
- Transactional inventory and finance integrity: unchanged; no inventory, fulfillment, order conversion, finance, or costing path touched.
- Honest UI states/operator-safe errors: unchanged; mutation feedback stayed centralized from prior sprints.
- Reviewability: bounded diff across one hook, focused tests, and this closeout.

### Smells Removed

- Four duplicate activity mutation invalidation blocks.
- Missing source contract for the shared activity mutation invalidation breadth.

### Deferred

- Broader Pipeline opportunity and quote mutation invalidation audit remains separate.
- Browser QA remains deferred because this source-covered slice changes cache invalidation structure, not layout or interaction flow.
- Full `bun run test:unit` and `bun run build` remain deferred to larger release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/pipeline/activity-mutation-cache-contract.test.ts tests/unit/pipeline/activity-mutation-feedback-contract.test.ts` - 2 files, 4 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for centralized activity invalidation helper and single cache-key invalidation definitions.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The serialized-gates adaptation from Sprint 18 stands: serialized gates are conditional, not routine, and this sprint did not touch serial identity or inventory lineage.

### Residual Risk

Low for activity mutation invalidation duplication. Broader Pipeline mutation invalidation remains worth auditing, especially quote and opportunity mutations that fan out across documents, orders, and metrics.
