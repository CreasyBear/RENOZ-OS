# Reliability Maintainer Sprint 27: Jobs Task Delete Mutation Hook Extraction

## Status

Closed and commit-ready.

## Problem

`ProjectTasksTab` still owned undoable delete behavior: pending deletion state,
timeout lifecycle, delayed job-scoped delete mutation, undo restoration, refetch
after deletion, and operator-safe delete failure feedback.

That kept a mutation with recovery semantics embedded beside route state, read
state, filtering, grouping, quick add, status mutation, reorder mutation,
dialogs, and presentation.

## Workflow Spine Protected

Project detail -> Tasks tab -> delete task -> optimistic pending removal -> undo
window -> job-scoped delete mutation -> refetch or restore/error feedback.

## Touched Domains

- Jobs/projects task delete mutation ownership.
- Jobs/projects task parent tab orchestration boundary.
- Jobs task pending deletion state.
- Jobs task mutation source contract for delete ownership.
- Reliability closeout documentation.

## Business Value Protected

Task deletion is a destructive operator action. Keeping the undo window,
restoration path, job-scoped delete id, and safe error copy in one focused owner
protects project/service task coordination without making the parent tab own
mutation internals.

## Scope Constraints

- No route, server-function, schema, database, query-key, or cache-key definition
  changes.
- No task filtering, sorting, grouping, create, update, status, reorder, dialog,
  or project completion behavior intentionally changed.
- No tenant, inventory movement, finance, stock costing, or serialized lineage
  write path changed.
- The hook preserves the existing behavior: add the task to pending deletions,
  wait five seconds, delete by `{ taskId, jobId }`, restore on undo/failure, and
  refetch after successful deletion.

## Changes

- Added `project-task-delete-mutation.ts` with
  `useProjectTaskDeleteMutation`.
- Added `project-task-delete-state.ts` for pure pending deletion set updates.
- Updated `ProjectTasksTab` to consume `pendingDeletions` and
  `handleDeleteTask` from the delete mutation hook.
- Moved delete timeout ownership, undo restoration, delete toast, restored toast,
  and `formatProjectTaskMutationError(error, 'delete')` out of the parent tab.
- Cleaned a stale timeout-handle edge case by removing the timeout entry when
  the delayed delete fires, whether the mutation succeeds or fails.
- Updated the existing project task mutation source contract so delete error and
  job id ownership follow the new delete mutation owner.
- Added delete helper and boundary tests.

## Standards Checked

- Domain ownership: Jobs/project task delete mutation ownership remains in the
  Jobs domain.
- Route -> container/page -> hook -> server function -> schema/database -> query
  key/cache policy: task delete mutation ownership is now behind a focused hook;
  route, server, schema/database, and query-key definitions are unchanged.
- Tenant isolation: unchanged; no data-access path was modified.
- Inventory and finance integrity: unchanged; no inventory or financial write
  path was modified.
- Serialized lineage continuity: unchanged.
- Honest UI states: preserved through pending deletion filtering, undo, restore,
  refetch, and delete failure feedback.
- Operator-safe error handling: preserved through
  `formatProjectTaskMutationError(error, 'delete')` inside the delete hook.
- Mutation/cache contracts: delete still calls `useDeleteProjectTask(projectId)`
  with the task's `taskId` and `jobId`; project task cache invalidation remains
  owned by the existing hook.
- Reviewable diff: parent delete block removal plus focused hook/helper modules
  and source/behavior tests.

## Smells Removed

- `ProjectTasksTab` no longer imports or calls `useDeleteProjectTask`.
- Pending deletion state no longer lives beside read/filter/group/render code.
- Timeout cleanup and undo restore behavior now have a focused owner.
- Delete success, restored, and failure feedback now have a focused
  Jobs/projects owner.
- `ProjectTasksTab` now sits at 322 lines, down from 393 before this sprint and
  1553 before the Jobs/tasks extraction sequence.

## Smells Deferred

- `ProjectTasksTab` still owns create/edit dialog state.
- Dialog ownership remains inline until create/edit dialog handoff can be moved
  without obscuring task read, quick-add, status, reorder, and delete flow.
- Full browser QA for the drag/delete interaction remains deferred because this
  slice did not change rendered markup or user-facing text.

## Gates

- Targeted ESLint:
  `./node_modules/.bin/eslint src/components/domain/jobs/projects/project-tasks-tab.tsx src/components/domain/jobs/projects/project-task-delete-mutation.ts src/components/domain/jobs/projects/project-task-delete-state.ts tests/unit/jobs/project-task-delete-state.test.ts tests/unit/jobs/project-task-delete-mutation-boundary-contract.test.ts tests/unit/jobs/project-tasks-mutation-contract.test.ts --report-unused-disable-directives`
  - Passed.
- Focused tests:
  `./node_modules/.bin/vitest run tests/unit/jobs/project-task-delete-state.test.ts tests/unit/jobs/project-task-delete-mutation-boundary-contract.test.ts tests/unit/jobs/project-tasks-mutation-contract.test.ts`
  - Passed: 3 files, 5 tests.
- Widened Jobs task tests:
  `./node_modules/.bin/vitest run tests/unit/jobs/project-task-delete-state.test.ts tests/unit/jobs/project-task-delete-mutation-boundary-contract.test.ts tests/unit/jobs/project-task-reorder-state.test.ts tests/unit/jobs/project-task-reorder-mutation-boundary-contract.test.ts tests/unit/jobs/project-task-status-state.test.ts tests/unit/jobs/project-task-status-mutation-boundary-contract.test.ts tests/unit/jobs/project-task-quick-add.test.ts tests/unit/jobs/project-task-quick-add-boundary-contract.test.ts tests/unit/jobs/project-task-route-state.test.ts tests/unit/jobs/project-task-route-state-boundary-contract.test.ts tests/unit/jobs/project-task-view-model.test.ts tests/unit/jobs/project-task-view-model-boundary-contract.test.ts tests/unit/jobs/project-task-completion-cta-boundary-contract.test.ts tests/unit/jobs/project-task-states-boundary-contract.test.ts tests/unit/jobs/project-task-workstream-group-boundary-contract.test.ts tests/unit/jobs/project-task-filter-controls-boundary-contract.test.ts tests/unit/jobs/project-task-summary-cards-boundary-contract.test.ts tests/unit/jobs/project-tasks-mutation-contract.test.ts tests/unit/jobs/project-tasks-read-feedback-contract.test.ts tests/unit/jobs/query-normalization-wave6d.test.tsx`
  - Passed: 20 files, 37 tests.
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
- Full unit/build:
  - Skipped. This slice is local task delete mutation ownership covered by
    direct helper tests, boundary contracts, focused mutation source coverage,
    widened Jobs task tests, targeted ESLint, typecheck, and diff hygiene.

## Goal Adaptation

No goal adaptation made. This continues the active repo-maintainer goal by
shrinking the Jobs tasks parent surface and giving undoable task deletion a
focused, tested owner.

## Residual Risk

Low behavioral risk because the hook preserves the same pending deletion,
five-second undo, job-scoped delete input, refetch, restore, and operator-safe
error behavior.

Medium maintainability risk remains in `ProjectTasksTab` because create/edit
dialog state still shares the parent file.
