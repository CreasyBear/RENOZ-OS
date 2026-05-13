# Reliability Maintainer Sprint 25: Jobs Task Status Mutation Hook Extraction

## Status

Closed and commit-ready.

## Problem

`ProjectTasksTab` still owned the task status toggle mutation path: next-status
selection, optimistic project-task cache writes, rollback, mutation execution,
completion-prompt toast behavior, and operator-safe status failure formatting.

That was a mutation/cache contract embedded beside read hooks, route state,
view-model derivation, quick add, undoable delete, reorder, dialogs, and
presentation. It made the parent tab harder to review and kept one of the
highest-risk task workflows inline.

## Workflow Spine Protected

Project detail -> Tasks tab -> task status toggle -> optimistic project-task
cache update -> status mutation -> completion prompt or rollback -> task board.

## Touched Domains

- Jobs/projects task status mutation ownership.
- Jobs/projects task parent tab orchestration boundary.
- Jobs task mutation and completion CTA source contracts.
- Reliability closeout documentation.

## Business Value Protected

Task completion is the operator signal that project work is moving forward.
Isolating status mutation ownership makes the optimistic cache update, rollback,
completion prompt, and operator-safe failure path explicit without touching task
delete, reorder, quick add, server functions, database state, or route contracts.

## Scope Constraints

- No route, server-function, schema, database, query-key, or cache-key definition
  changes.
- No task filtering, sorting, grouping, delete, reorder, quick-add, dialog, or
  project completion behavior intentionally changed.
- No tenant, inventory movement, finance, stock costing, or serialized lineage
  write path changed.
- The hook preserves the existing visible-task completion behavior used by the
  parent tab before this extraction.

## Changes

- Added `project-task-status-mutation.ts` with
  `useProjectTaskStatusMutation`.
- Added `project-task-status-state.ts` for pure next-status and
  all-visible-tasks-complete decisions.
- Updated `ProjectTasksTab` to consume `handleToggleTask` from the status
  mutation hook.
- Updated existing source contracts so task status error ownership and
  all-complete toast ownership follow the new status mutation owner.
- Added status helper and boundary tests.

## Standards Checked

- Domain ownership: Jobs/project task status mutation ownership remains in the
  Jobs domain.
- Route -> container/page -> hook -> server function -> schema/database -> query
  key/cache policy: task status mutation ownership is now behind a focused hook;
  route, server, schema/database, and query-key definitions are unchanged.
- Tenant isolation: unchanged; no data-access path was modified.
- Inventory and finance integrity: unchanged; no inventory or financial write
  path was modified.
- Serialized lineage continuity: unchanged.
- Honest UI states: preserved through the same task completed/reopened and all
  tasks complete toast behavior.
- Operator-safe error handling: preserved through
  `formatProjectTaskMutationError(error, 'status')` inside the status mutation
  hook.
- Mutation/cache contracts: the status hook still reads and writes
  `queryKeys.projectTasks.byProject(projectId)`, rolls back on error, and calls
  `useUpdateProjectTaskStatus(projectId)`.
- Reviewable diff: parent status mutation deletion plus focused hook/helper
  modules and source/behavior tests.

## Smells Removed

- `ProjectTasksTab` no longer imports `useUpdateProjectTaskStatus`,
  `useQueryClient`, `queryKeys`, or `ProjectTaskResponse`.
- Optimistic project-task cache update and rollback no longer live beside
  delete/reorder/dialog code.
- The next-status rule and visible-completion decision now have direct behavior
  coverage.
- `ProjectTasksTab` now sits at 413 lines, down from 459 before this sprint and
  1553 before the Jobs/tasks extraction sequence.

## Smells Deferred

- `ProjectTasksTab` still owns undoable delete, reorder mutation, and dialogs.
- The undoable delete flow remains inline until its cache and operator recovery
  behavior is deliberately mapped.
- Reorder remains inline because moving it should preserve job-scoped ordering
  and task id derivation in a separate slice.

## Gates

- Targeted ESLint:
  `./node_modules/.bin/eslint src/components/domain/jobs/projects/project-tasks-tab.tsx src/components/domain/jobs/projects/project-task-status-mutation.ts src/components/domain/jobs/projects/project-task-status-state.ts tests/unit/jobs/project-task-status-state.test.ts tests/unit/jobs/project-task-status-mutation-boundary-contract.test.ts tests/unit/jobs/project-task-completion-cta-boundary-contract.test.ts tests/unit/jobs/project-tasks-mutation-contract.test.ts --report-unused-disable-directives`
  - Passed.
- Focused tests:
  `./node_modules/.bin/vitest run tests/unit/jobs/project-task-status-state.test.ts tests/unit/jobs/project-task-status-mutation-boundary-contract.test.ts tests/unit/jobs/project-task-completion-cta-boundary-contract.test.ts tests/unit/jobs/project-tasks-mutation-contract.test.ts`
  - Passed: 4 files, 6 tests, 1.26s.
- Widened Jobs task tests:
  `./node_modules/.bin/vitest run tests/unit/jobs/project-task-status-state.test.ts tests/unit/jobs/project-task-status-mutation-boundary-contract.test.ts tests/unit/jobs/project-task-quick-add.test.ts tests/unit/jobs/project-task-quick-add-boundary-contract.test.ts tests/unit/jobs/project-task-route-state.test.ts tests/unit/jobs/project-task-route-state-boundary-contract.test.ts tests/unit/jobs/project-task-view-model.test.ts tests/unit/jobs/project-task-view-model-boundary-contract.test.ts tests/unit/jobs/project-task-completion-cta-boundary-contract.test.ts tests/unit/jobs/project-task-states-boundary-contract.test.ts tests/unit/jobs/project-task-workstream-group-boundary-contract.test.ts tests/unit/jobs/project-task-filter-controls-boundary-contract.test.ts tests/unit/jobs/project-task-summary-cards-boundary-contract.test.ts tests/unit/jobs/project-tasks-mutation-contract.test.ts tests/unit/jobs/project-tasks-read-feedback-contract.test.ts tests/unit/jobs/query-normalization-wave6d.test.tsx`
  - Passed: 16 files, 31 tests, 4.07s.
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
  - Skipped. This slice is local task status mutation ownership covered by
    direct helper tests, boundary contracts, focused mutation source coverage,
    widened Jobs task tests, targeted ESLint, typecheck, and diff hygiene.

## Goal Adaptation

No goal adaptation made. This continues the active repo-maintainer goal by
shrinking the Jobs tasks parent surface and giving task status mutation/cache
behavior a focused, tested owner.

## Residual Risk

Low behavioral risk because the hook preserves the same next-status rule,
optimistic cache write, rollback, status mutation input, completion prompt, and
error copy.

Medium maintainability risk remains in `ProjectTasksTab` because undo-delete
timers, reorder behavior, and dialogs still share one file.
