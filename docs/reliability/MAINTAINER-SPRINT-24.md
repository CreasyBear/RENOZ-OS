# Reliability Maintainer Sprint 24: Jobs Task Quick Add Hook Extraction

## Status

Closed and commit-ready.

## Problem

`ProjectTasksTab` still owned the quick-add create-task path: default site visit
selection, `useCreateTask`, project task cache invalidation, no-site-visit
operator copy, and create failure formatting. That was a mutation/cache concern
embedded beside task reads, route state, view-model derivation, status/delete/
reorder mutations, dialogs, and presentation.

Keeping quick add inline made the parent tab harder to review and kept one
create-task mutation contract coupled to unrelated UI orchestration.

## Workflow Spine Protected

Project detail -> Tasks tab -> site visits -> quick-add hook -> create task
mutation -> project task cache invalidation -> task list refresh.

## Touched Domains

- Jobs/projects quick-add task creation ownership.
- Jobs/projects task parent tab orchestration boundary.
- Jobs task mutation source contract for create ownership.
- Reliability closeout documentation.

## Business Value Protected

Quick add is the lowest-friction way for operators to capture project work while
coordinating site visits. Giving that path a focused hook keeps its default site
visit rule, cache invalidation, and operator-safe failure copy explicit without
touching task status, delete, reorder, route state, server functions, or database
contracts.

## Scope Constraints

- No route, server-function, schema, database, query-key, or cache-key definition
  changes.
- No task filtering, sorting, grouping, status mutation, delete, reorder,
  dialog, or project completion behavior intentionally changed.
- No tenant, inventory movement, finance, stock costing, or serialized lineage
  write path changed.
- The hook preserves the existing default site visit behavior: use the only site
  visit when exactly one exists; otherwise use the first available site visit;
  show the existing operator error when none exists.

## Changes

- Added `project-task-quick-add.ts` with `useProjectTaskQuickAdd`.
- Added `project-task-quick-add-default.ts` for the pure default site visit
  selector, keeping helper tests free from hook/server import side effects.
- Updated `ProjectTasksTab` to consume `handleQuickAdd` and
  `isQuickAddPending` from the quick-add hook.
- Updated the existing project task mutation source contract so create mutation
  error ownership follows the quick-add hook while status/delete/reorder remain
  on the parent tab.
- Added quick-add helper and boundary tests.

## Standards Checked

- Domain ownership: Jobs/project task quick-add mutation ownership remains in
  the Jobs domain.
- Route -> container/page -> hook -> server function -> schema/database -> query
  key/cache policy: quick-add create ownership is now behind a focused hook;
  route, server, schema/database, and query-key definitions are unchanged.
- Tenant isolation: unchanged; no data-access path was modified.
- Inventory and finance integrity: unchanged; no inventory or financial write
  path was modified.
- Serialized lineage continuity: unchanged.
- Honest UI states: preserved through the same no-site-visit operator copy and
  quick-add pending state.
- Operator-safe error handling: preserved through
  `formatProjectTaskMutationError(error, 'create')` inside the quick-add hook.
- Mutation/cache contracts: quick-add still calls `useCreateTask` and
  invalidates `queryKeys.projectTasks.byProject(projectId)` after success.
- Reviewable diff: parent quick-add deletion plus focused hook/helper module and
  source/behavior tests.

## Smells Removed

- `ProjectTasksTab` no longer imports `useCreateTask` or `toastError`.
- Quick-add create mutation, no-site-visit copy, and create error formatting no
  longer live beside status/delete/reorder mutation handlers.
- The default site visit rule now has direct behavior coverage.
- `ProjectTasksTab` now sits at 459 lines, down from 482 before this sprint and
  1553 before the Jobs/tasks extraction sequence.

## Smells Deferred

- `ProjectTasksTab` still owns status mutation, optimistic project-task cache
  updates, undoable delete, reorder mutation, and dialogs.
- The undoable delete flow remains inline until its cache and operator recovery
  behavior is deliberately mapped.
- The status/reorder mutation handlers remain inline because moving them touches
  optimistic cache writes, toasts, and project completion prompting.

## Gates

- Targeted ESLint:
  `./node_modules/.bin/eslint src/components/domain/jobs/projects/project-tasks-tab.tsx src/components/domain/jobs/projects/project-task-quick-add.ts src/components/domain/jobs/projects/project-task-quick-add-default.ts tests/unit/jobs/project-task-quick-add.test.ts tests/unit/jobs/project-task-quick-add-boundary-contract.test.ts tests/unit/jobs/project-tasks-mutation-contract.test.ts --report-unused-disable-directives`
  - Passed.
- New focused tests:
  `./node_modules/.bin/vitest run tests/unit/jobs/project-task-quick-add.test.ts tests/unit/jobs/project-task-quick-add-boundary-contract.test.ts`
  - Passed: 2 files, 4 tests, 664ms.
- Focused mutation contract rerun:
  `./node_modules/.bin/vitest run tests/unit/jobs/project-task-quick-add.test.ts tests/unit/jobs/project-task-quick-add-boundary-contract.test.ts tests/unit/jobs/project-tasks-mutation-contract.test.ts`
  - Passed: 3 files, 6 tests, 997ms.
- Widened Jobs task tests:
  `./node_modules/.bin/vitest run tests/unit/jobs/project-task-quick-add.test.ts tests/unit/jobs/project-task-quick-add-boundary-contract.test.ts tests/unit/jobs/project-task-route-state.test.ts tests/unit/jobs/project-task-route-state-boundary-contract.test.ts tests/unit/jobs/project-task-view-model.test.ts tests/unit/jobs/project-task-view-model-boundary-contract.test.ts tests/unit/jobs/project-task-completion-cta-boundary-contract.test.ts tests/unit/jobs/project-task-states-boundary-contract.test.ts tests/unit/jobs/project-task-workstream-group-boundary-contract.test.ts tests/unit/jobs/project-task-filter-controls-boundary-contract.test.ts tests/unit/jobs/project-task-summary-cards-boundary-contract.test.ts tests/unit/jobs/project-tasks-mutation-contract.test.ts tests/unit/jobs/project-tasks-read-feedback-contract.test.ts tests/unit/jobs/query-normalization-wave6d.test.tsx`
  - Passed: 14 files, 28 tests, 2.72s.
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
  - Skipped. This slice is local quick-add ownership covered by direct helper
    tests, boundary contracts, focused mutation source coverage, widened Jobs
    task tests, targeted ESLint, typecheck, and diff hygiene.

## Goal Adaptation

No goal adaptation made. This continues the active repo-maintainer goal by
shrinking the Jobs tasks parent surface and giving quick-add mutation/cache
behavior a focused, tested owner.

## Residual Risk

Low behavioral risk because the hook preserves the same create input, default
site visit behavior, cache invalidation, pending state, and error copy.

Medium maintainability risk remains in `ProjectTasksTab` because status
mutation, undo-delete timers, reorder behavior, and dialogs still share one
file.
