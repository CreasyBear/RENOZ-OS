# Reliability Maintainer Sprint 26: Jobs Task Reorder Mutation Hook Extraction

## Status

Closed and commit-ready.

## Problem

`ProjectTasksTab` still owned task reorder mutation behavior: resolving the
job-scoped reorder id from the first reordered task, calling `useReorderTasks`,
and showing success or operator-safe reorder failure toasts.

That kept a job-scoped mutation contract embedded beside read hooks, route
state, view-model derivation, quick add, status mutation, undoable delete,
dialogs, and presentation.

## Workflow Spine Protected

Project detail -> Tasks tab -> workstream group drag reorder -> reorder hook ->
job-scoped task reorder mutation -> operator success or error feedback.

## Touched Domains

- Jobs/projects task reorder mutation ownership.
- Jobs/projects task parent tab orchestration boundary.
- Jobs task mutation source contract for reorder ownership.
- Reliability closeout documentation.

## Business Value Protected

Task ordering helps operators coordinate project/service work inside a
workstream. Isolating reorder ownership protects the job-scoped reorder id
derivation and operator feedback without touching task reads, route state,
status updates, delete recovery, server functions, or database contracts.

## Scope Constraints

- No route, server-function, schema, database, query-key, or cache-key definition
  changes.
- No task filtering, sorting, grouping, status mutation, delete, quick-add,
  dialog, or project completion behavior intentionally changed.
- No tenant, inventory movement, finance, stock costing, or serialized lineage
  write path changed.
- The hook preserves the existing behavior: find the first reordered task,
  reorder by that task's `jobId`, and no-op when no job id can be resolved.

## Changes

- Added `project-task-reorder-mutation.ts` with
  `useProjectTaskReorderMutation`.
- Added `project-task-reorder-state.ts` for pure reorder job id derivation.
- Updated `ProjectTasksTab` to consume `handleReorderTasks` from the reorder
  mutation hook.
- Updated the existing project task mutation source contract so reorder error
  ownership follows the new reorder mutation owner while delete remains on the
  parent tab.
- Added reorder helper and boundary tests.

## Standards Checked

- Domain ownership: Jobs/project task reorder mutation ownership remains in the
  Jobs domain.
- Route -> container/page -> hook -> server function -> schema/database -> query
  key/cache policy: task reorder mutation ownership is now behind a focused
  hook; route, server, schema/database, and query-key definitions are unchanged.
- Tenant isolation: unchanged; no data-access path was modified.
- Inventory and finance integrity: unchanged; no inventory or financial write
  path was modified.
- Serialized lineage continuity: unchanged.
- Honest UI states: preserved through the same task order updated and reorder
  failure feedback.
- Operator-safe error handling: preserved through
  `formatProjectTaskMutationError(error, 'reorder')` inside the reorder hook.
- Mutation/cache contracts: reorder still calls `useReorderTasks` with the
  resolved `jobId` and current `taskIds`.
- Reviewable diff: parent reorder deletion plus focused hook/helper modules and
  source/behavior tests.

## Smells Removed

- `ProjectTasksTab` no longer imports `useReorderTasks`.
- Job id derivation for reorder no longer lives beside delete recovery and
  dialog code.
- Reorder success/error feedback now has a focused Jobs/projects owner.
- `ProjectTasksTab` now sits at 393 lines, down from 413 before this sprint and
  1553 before the Jobs/tasks extraction sequence.

## Smells Deferred

- `ProjectTasksTab` still owns undoable delete and dialogs.
- The undoable delete flow remains inline until its cache and operator recovery
  behavior is deliberately mapped.
- Dialog state remains inline until create/edit dialog ownership can be moved
  without obscuring task read and mutation flow.

## Gates

- Targeted ESLint:
  `./node_modules/.bin/eslint src/components/domain/jobs/projects/project-tasks-tab.tsx src/components/domain/jobs/projects/project-task-reorder-mutation.ts src/components/domain/jobs/projects/project-task-reorder-state.ts tests/unit/jobs/project-task-reorder-state.test.ts tests/unit/jobs/project-task-reorder-mutation-boundary-contract.test.ts tests/unit/jobs/project-tasks-mutation-contract.test.ts --report-unused-disable-directives`
  - Passed.
- Focused tests:
  `./node_modules/.bin/vitest run tests/unit/jobs/project-task-reorder-state.test.ts tests/unit/jobs/project-task-reorder-mutation-boundary-contract.test.ts tests/unit/jobs/project-tasks-mutation-contract.test.ts`
  - Passed: 3 files, 5 tests, 1.37s.
- Widened Jobs task tests:
  `./node_modules/.bin/vitest run tests/unit/jobs/project-task-reorder-state.test.ts tests/unit/jobs/project-task-reorder-mutation-boundary-contract.test.ts tests/unit/jobs/project-task-status-state.test.ts tests/unit/jobs/project-task-status-mutation-boundary-contract.test.ts tests/unit/jobs/project-task-quick-add.test.ts tests/unit/jobs/project-task-quick-add-boundary-contract.test.ts tests/unit/jobs/project-task-route-state.test.ts tests/unit/jobs/project-task-route-state-boundary-contract.test.ts tests/unit/jobs/project-task-view-model.test.ts tests/unit/jobs/project-task-view-model-boundary-contract.test.ts tests/unit/jobs/project-task-completion-cta-boundary-contract.test.ts tests/unit/jobs/project-task-states-boundary-contract.test.ts tests/unit/jobs/project-task-workstream-group-boundary-contract.test.ts tests/unit/jobs/project-task-filter-controls-boundary-contract.test.ts tests/unit/jobs/project-task-summary-cards-boundary-contract.test.ts tests/unit/jobs/project-tasks-mutation-contract.test.ts tests/unit/jobs/project-tasks-read-feedback-contract.test.ts tests/unit/jobs/query-normalization-wave6d.test.tsx`
  - Passed: 18 files, 34 tests, 5.89s.
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
  - Skipped. This slice is local task reorder mutation ownership covered by
    direct helper tests, boundary contracts, focused mutation source coverage,
    widened Jobs task tests, targeted ESLint, typecheck, and diff hygiene.

## Goal Adaptation

No goal adaptation made. This continues the active repo-maintainer goal by
shrinking the Jobs tasks parent surface and giving task reorder mutation behavior
a focused, tested owner.

## Residual Risk

Low behavioral risk because the hook preserves the same job id derivation,
reorder mutation input, success toast, and operator-safe error copy.

Medium maintainability risk remains in `ProjectTasksTab` because undo-delete
timers and dialogs still share one file.
