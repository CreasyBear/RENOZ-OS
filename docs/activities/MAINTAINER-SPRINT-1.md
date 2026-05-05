# Activity Maintainer Sprint 1

## Status

Closed in commit-ready state.

## Issue 1: Shared Activity Read-State Feedback

### Problem

`UnifiedActivityTimeline` and `ActivityFeed` rendered generic `Failed to load activities` titles and displayed raw `error.message` values. Activity hooks already normalize read failures, but the shared display boundaries could still expose raw system strings if a non-normalized error reached the presenter.

### Workflow Spine

Activity feed/timeline consumers
-> activity presenter components
-> activity hooks
-> activity server functions
-> normalized read-query errors
-> shared activity read-error formatter
-> operator-safe activity error UI.

### Touched Domains

- Shared activity timeline read feedback.
- Shared activity feed read feedback.
- Activity hook read fallback copy for feed/history paths.
- Service read-state contracts that consume activity history.

### Business Value Protected

Activity history is the audit trail operators use to understand what happened across customers, orders, service systems, opportunities, and support workflows. When activity reads fail, the app should show safe, consistent unavailable copy instead of database, infrastructure, or generic failure wording.

### Scope Constraints

- Do not change activity server functions, schemas, query keys, pagination, filters, grouping, virtualization, or entity-link behavior.
- Do not change service-system detail activity query wiring from the previous sprint.
- Do not broaden into activity logging mutation feedback.
- Do not reopen serialized gates as routine evidence for this shared read-state slice.

### Changes

- Added `ACTIVITY_READ_MESSAGES` and `formatActivityReadError(error, fallback)`.
- Exported the helper from `src/lib/activities/index.ts`.
- Routed `UnifiedActivityTimeline` error copy through the helper with `Activity history unavailable`.
- Routed `ActivityFeed` error copy through the helper with `Activity feed unavailable`.
- Reused the same constants in `useActivityFeed`, `useEntityActivities`, and the audit branch of `useUnifiedActivities`.
- Added formatter and source/render contracts for activity read states.

### Standards Checked

- Domain ownership: shared activity read-state copy now lives in `src/lib/activities/read-error-messages.ts`.
- Route -> container/page -> hook -> server flow: activity components still consume activity hooks; hooks still normalize read failures; server reads are unchanged.
- Query/cache policy: activity feed, entity activity, unified activity, pipeline activity timeline, and service query keys are unchanged.
- Tenant isolation/data integrity: no server function, schema, query predicate, mutation, or transaction changed.
- Inventory/finance integrity: no inventory, valuation, finance, or closeout path changed.
- Serialized lineage: not touched.
- UI states/error handling: raw non-normalized errors fall back to safe activity copy; normalized read-query errors can still display their safe normalized message.
- Reviewability: the diff is limited to one shared activity helper, two presenter display boundaries, feed/history hook fallback constants, focused tests, and this closeout note.

### Smells Removed

- Raw `error.message` display in `UnifiedActivityTimeline`.
- Raw `error.message` display in `ActivityFeed`.
- Generic `Failed to load activities` copy in shared activity read-error states.
- Drift between activity hook fallback copy and activity presenter fallback copy for feed/history reads.

### Deferred

- Activity logging mutation feedback still has raw/generic failure copy and should be handled as a separate mutation slice.
- Other activity analytics widgets may need their own read-state review.
- Browser QA was not selected because this was source-covered copy/error-state wiring with no layout or interaction structure change.

### Gates

- Passed: focused activity/service read-state contracts, `./node_modules/.bin/vitest run tests/unit/activities/activity-read-error-messages.test.ts tests/unit/activities/activity-read-state-contract.test.tsx tests/unit/activities/unified-activity-timeline.test.tsx tests/unit/activities/use-activities-guards.test.tsx tests/unit/service/service-read-error-messages.test.ts tests/unit/service/service-read-state-contract.test.ts` - 6 files, 15 tests.
- Passed: `./node_modules/.bin/vitest run tests/unit/activities` - 14 files, 37 tests.
- Passed: `./node_modules/.bin/vitest run tests/unit/service` - 9 files, 19 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for `formatActivityReadError`, `ACTIVITY_READ_MESSAGES`, removed raw activity presenter error messages, removed generic failed-load activity copy, and preserved feed/history normalized hook fallback copy.
- Passed: `git diff --check`.
- Skipped: browser QA because this was source-covered read-state wiring with no layout change.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not touch those contracts. Serialized gates remain retired as routine evidence and should only reopen for deliberate serialized lineage, inventory identity, or invariant changes.

### Goal Adaptation

Declined. This is a bounded shared-activity maintainer slice under the existing honest UI state, operator-safe error, and reviewable-diff standards.

### Residual Risk

The activity feed error state is covered by source contract rather than a mounted presenter test because importing the presenter directly pulls the broad hooks barrel and initializes email infrastructure in this test environment. Runtime coverage remains on the isolated `UnifiedActivityTimeline`; the feed contract is still source-verified.
