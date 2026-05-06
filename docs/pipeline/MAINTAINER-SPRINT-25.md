# Pipeline Maintainer Sprint 25

## Status

Closed in commit-ready state.

## Issue 1: Activity Analytics Used an Inline Pipeline Query Key

### Problem

`useActivityAnalytics` built its query key inline with `[...] as const` while adjacent Pipeline activity hooks used centralized `queryKeys.pipeline.*` factories. That left one read hook outside the query-key contract and made cache policy harder to audit.

### Workflow Spine

Activity analytics hook
-> centralized Pipeline query key
-> activity analytics server function
-> read result normalization
-> activity analytics consumers.

### Touched Domains

- Pipeline activity analytics read hook.
- Central query key factory.
- Pipeline activity query-key contract tests.
- Pipeline maintainer closeout docs.

### Business Value Protected

Activity analytics help identify sales follow-through and stale opportunity behavior. A centralized query key keeps analytics cache identity reviewable and aligned with the rest of the Pipeline activity read hooks.

### Scope Constraints

- Do not change analytics filters, server function inputs, result shape, read-error handling, stale time, enabled behavior, cache invalidation, UI rendering, schemas, or database predicates.
- Keep this as query-key centralization only.

### Changes

- Added `queryKeys.pipeline.activityAnalytics(filters)`.
- Replaced the inline `useActivityAnalytics` query key with the new query key factory.
- Added a focused source/runtime contract for the activity analytics query key.

### Standards Checked

- Domain ownership: activity analytics cache identity now lives in the central query key factory.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: improved the hook -> query key contract; server functions, schemas, database predicates, and read behavior stayed unchanged.
- Tenant isolation/data integrity: unchanged; no server predicates, schemas, or writes touched.
- Query/cache contract: improved by removing an inline query key; key shape intentionally preserves the same `['pipeline', 'activity-analytics', filters]` structure.
- Transactional inventory and finance integrity: unchanged; no inventory, fulfillment, order conversion, finance, or costing path touched.
- Honest UI states/operator-safe errors: unchanged; read-error behavior stayed centralized from Sprint 21.
- Reviewability: bounded diff across the query key factory, one hook, focused tests, and this closeout.

### Smells Removed

- Inline Pipeline activity analytics query key in `use-activities`.
- Missing contract coverage for Pipeline activity analytics cache identity.

### Deferred

- Broader Pipeline mutation invalidation audit remains separate.
- Browser QA remains deferred because this source-covered slice changes cache identity plumbing, not layout or interaction flow.
- Full `bun run test:unit` and `bun run build` remain deferred to larger release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/pipeline/pipeline-activity-query-key-contract.test.ts tests/unit/activities/activity-read-state-contract.test.tsx` - 2 files, 3 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for removed inline activity analytics query key in `use-activities`.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The serialized-gates adaptation from Sprint 18 stands: serialized gates are conditional, not routine, and this sprint did not touch serial identity or inventory lineage.

### Residual Risk

Low for activity analytics cache identity. There are still broader Pipeline cache invalidation patterns worth auditing separately, especially mutation invalidation breadth.
