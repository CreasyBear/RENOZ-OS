# Reliability Maintainer Sprint 23: Jobs Task Route State Extraction

## Status

Closed and commit-ready.

## Problem

`ProjectTasksTab` still owned URL search parsing and navigation payloads for
task filters and sorting. The route contract was valid, but it lived beside read
hooks, quick add, task mutations, undoable delete timers, view-model derivation,
dialogs, and presentation.

That made route-state behavior harder to test directly and kept task URL
contracts embedded in a mixed workflow component.

## Workflow Spine Protected

Project detail route -> Tasks tab -> task route search state -> filter/sort UI
controls -> URL search params -> task view model and task board.

## Touched Domains

- Jobs/projects task filter and sort route-state ownership.
- Jobs/projects task parent tab orchestration boundary.
- Jobs task source and behavior contracts for route search parsing and updates.
- Reliability closeout documentation.

## Business Value Protected

The tasks tab helps operators return to the same filtered/sorted task context
when coordinating project or service work. Keeping the task URL contract explicit
and tested protects operator continuity without touching task reads, mutations,
cache keys, server functions, or database state.

## Scope Constraints

- No route schema, server-function, schema, database, query-key, or cache-policy
  changes.
- No task filtering, sorting, grouping, status mutation, delete, reorder,
  quick-add, dialog, or project completion behavior intentionally changed.
- No tenant, inventory movement, finance, stock costing, or serialized lineage
  write path changed.
- The extraction preserves the existing local-state behavior: URL params seed
  task filter/sort state, and UI changes update both local state and route
  search params.

## Changes

- Added `project-task-route-state.ts` with:
  - typed parsing for task status, priority, assignee, and sort search params
  - search payload builders for filter and sort updates
  - `useProjectTaskRouteState(projectId)` as the owner of project task route
    search hooks and navigation payloads
- Updated `ProjectTasksTab` to consume `filters`, `sortBy`, `updateFilters`, and
  `updateSort` from the route-state hook.
- Added direct behavior coverage for task route-state parsing and search payload
  builders.
- Added a source boundary contract that prevents task route-state code from
  drifting back into the parent tab.

## Standards Checked

- Domain ownership: Jobs/project task route-state logic remains in the Jobs
  domain.
- Route -> container/page -> hook -> server function -> schema/database -> query
  key/cache policy: route search ownership is now behind a focused task hook;
  server, schema/database, and query/cache policy are unchanged.
- Tenant isolation: unchanged; no data-access path was modified.
- Inventory and finance integrity: unchanged; no inventory or financial write
  path was modified.
- Serialized lineage continuity: unchanged.
- Honest UI states: preserved; the same filters and sort values feed the same
  view-model and task UI.
- Operator-safe error handling: unchanged; read and mutation error helpers were
  not modified.
- Mutation/cache contracts: unchanged; task status, delete, reorder, quick add,
  and project completion execution were not modified.
- Reviewable diff: parent route-state deletion plus focused hook/helper module
  and behavior/boundary tests.

## Smells Removed

- `ProjectTasksTab` no longer imports or calls `useSearch` or `useNavigate`.
- Task status, priority, assignee, and sort URL parsing no longer live beside
  task mutation and dialog code.
- Filter and sort navigation payloads now have direct unit coverage.
- `ProjectTasksTab` now sits at 482 lines, down from 537 before this sprint and
  1553 before the Jobs/tasks extraction sequence.

## Smells Deferred

- `ProjectTasksTab` still owns quick add, status mutation, undoable delete,
  reorder mutation, and dialogs.
- The undoable delete flow remains inline until its cache and operator recovery
  behavior is deliberately mapped.
- The task mutation handlers remain inline because moving them touches optimistic
  cache writes, toasts, and project completion prompting.

## Gates

- Targeted ESLint:
  `./node_modules/.bin/eslint src/components/domain/jobs/projects/project-tasks-tab.tsx src/components/domain/jobs/projects/project-task-route-state.ts tests/unit/jobs/project-task-route-state.test.ts tests/unit/jobs/project-task-route-state-boundary-contract.test.ts --report-unused-disable-directives`
  - Passed.
- New focused tests:
  `./node_modules/.bin/vitest run tests/unit/jobs/project-task-route-state.test.ts tests/unit/jobs/project-task-route-state-boundary-contract.test.ts`
  - Passed: 2 files, 5 tests, 818ms.
- Widened Jobs task tests:
  `./node_modules/.bin/vitest run tests/unit/jobs/project-task-route-state.test.ts tests/unit/jobs/project-task-route-state-boundary-contract.test.ts tests/unit/jobs/project-task-view-model.test.ts tests/unit/jobs/project-task-view-model-boundary-contract.test.ts tests/unit/jobs/project-task-completion-cta-boundary-contract.test.ts tests/unit/jobs/project-task-states-boundary-contract.test.ts tests/unit/jobs/project-task-workstream-group-boundary-contract.test.ts tests/unit/jobs/project-task-filter-controls-boundary-contract.test.ts tests/unit/jobs/project-task-summary-cards-boundary-contract.test.ts tests/unit/jobs/project-tasks-mutation-contract.test.ts tests/unit/jobs/project-tasks-read-feedback-contract.test.ts tests/unit/jobs/query-normalization-wave6d.test.tsx`
  - Passed: 12 files, 24 tests, 5.65s.
- Typecheck:
  `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
  - Passed.
- Diff hygiene:
  `git diff --check`
  - Passed before closeout documentation; final staged diff check rerun before
    commit.
- Reliability guard scripts:
  - Skipped. This slice did not change route schemas, route casts, pending
    dialog guards, read-path query guard policy, serialized read auto-upsert
    policy, server functions, cache keys, or database contracts.
- Full unit:
  - Skipped. This slice is local task route-state ownership covered by direct
    helper tests, boundary contracts, widened Jobs task tests, targeted ESLint,
    typecheck, and diff hygiene.

## Goal Adaptation

No goal adaptation made. This continues the active repo-maintainer goal by
shrinking the Jobs tasks parent surface and giving task URL state a focused,
tested owner.

## Residual Risk

Low behavioral risk because the route-state hook preserves the same search param
names, defaults, local-state seeding, and navigation payload behavior.

Medium maintainability risk remains in `ProjectTasksTab` because quick add,
task mutations, undo-delete timers, reorder behavior, and dialogs still share
one file.
