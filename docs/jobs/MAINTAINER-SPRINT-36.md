# Jobs Maintainer Sprint 36: View Sync Cache Scope

## Status

Closed in commit-ready state.

## Issue 1: Cross-View Sync Used Root Jobs Cache Families

### Problem

`use-jobs-view-sync` is meant to keep jobs list, assignment, task, calendar, kanban, and timeline views synchronized after job mutations or polling refreshes. It did that by invalidating root Jobs, Job Assignments, Job Tasks, and Job Calendar namespaces. That made the synchronization policy harder to review and mixed view refresh with unrelated detail/config/OAuth cache state.

### Workflow Spine

Jobs mutation or polling sync
-> `useJobDataMutationSync` / `useRealtimeJobUpdates`
-> explicit Jobs / Assignments / Tasks / Calendar view-family query keys
-> visible Jobs list, active project, assignment selector, task board, schedule, timeline, and kanban views.

### Touched Domains

- Jobs cross-view synchronization hook.
- Jobs view-sync cache contract test.
- Jobs maintainer closeout docs.

### Business Value Protected

Operators can move between jobs lists, assignment selectors, schedule views, task boards, and timelines without stale cross-view state after job changes. The refresh policy remains broad enough for cross-view sync, but no longer refreshes unrelated root namespaces.

### Scope Constraints

- Do not redesign polling behavior or replace it with realtime transport.
- Do not change optimistic update rollback behavior.
- Do not change route, UI, or server behavior.
- Keep entity-specific detail refreshes owned by mutation hooks that have IDs.

### Changes

- Added named view-family invalidation helpers for assignment, calendar, and task views.
- Replaced root invalidations in delayed mutation sync, polling query function, and manual refresh.
- Added a focused source contract preventing regression to `jobs.all`, `jobAssignments.all`, `jobTasks.all`, or `jobCalendar.all`.

### Standards Checked

- Domain ownership: Jobs owns cross-view synchronization policy.
- Route/container/page -> hook -> server function -> schema/database -> query key/cache policy: this sprint tightens the hook cache-policy layer only.
- Tenant isolation/data integrity: no server, auth, tenant, or database behavior changed.
- Transactional inventory/finance integrity: not touched.
- UI states/error handling: polling and optimistic update behavior remain unchanged.
- Reviewability: one hook cleanup, one focused contract, one closeout note.

### Smells Removed

- Root Jobs invalidation from cross-view sync.
- Root Job Assignments invalidation from cross-view sync.
- Root Job Tasks invalidation from delayed mutation sync.
- Root Job Calendar invalidation from sync and polling paths.

### Deferred

- Polling interval and realtime architecture remain unchanged.
- Helper duplication across Jobs cache slices remains acceptable for now; extracting a shared Jobs cache policy module should wait until the shape stabilizes.
- Entity-specific detail refreshes remain mutation-owned because this hook does not receive IDs.

### Gates

- Passed: focused Jobs view-sync cache contract.
- Passed: focused Jobs assignment/calendar cache contracts that cover shared family prefixes.
- Passed: focused ESLint on touched hook and contracts.
- Passed: full typecheck.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. This sprint closes the remaining broad Jobs cache root cluster discovered during the local maintainer sweep.

### Residual Risk

Medium. Cross-view synchronization remains intentionally broad across visible view families; it is cleaner and reviewable now, but still not an entity-level cache policy.
