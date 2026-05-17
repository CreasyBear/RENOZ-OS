# Reliability Maintainer Sprint 28: Jobs Task Dialog State Hook Extraction

## Status

Closed and commit-ready.

## Problem

`ProjectTasksTab` still owned create/edit dialog state: the create dialog open
flag, selected editing task, create dialog remount key, edit dialog open
derivation, add-task opener, edit-task opener, and edit dialog close clearing.

That left UI state ownership embedded beside read state, route filters, view
model construction, quick add, status mutation, reorder mutation, delete
mutation, task grouping, and presentation.

## Workflow Spine Protected

Project detail -> Tasks tab -> add or edit task -> task dialog opens -> dialog
success refetches project tasks -> task list reflects the updated project work.

## Touched Domains

- Jobs/projects task dialog state ownership.
- Jobs/projects task parent tab orchestration boundary.
- Jobs task dialog-state boundary contracts.
- Reliability closeout documentation.

## Business Value Protected

Task creation and editing are the operator's main way to keep project/service
work current. Pulling dialog state out of the parent tab keeps that workflow
visible while making the parent easier to reason about as task reads and
mutations continue to evolve.

## Scope Constraints

- No task dialog form, mutation, validation, copy, or pending-close behavior
  intentionally changed.
- No route, server-function, schema, database, query-key, or cache-key definition
  changes.
- No task filtering, sorting, grouping, quick-add, status, reorder, delete, or
  project completion behavior intentionally changed.
- No tenant, inventory movement, finance, stock costing, or serialized lineage
  write path changed.

## Changes

- Added `project-task-dialog-state.ts` with `useProjectTaskDialogState`.
- Added pure dialog-state helpers for create dialog remount keys, edit dialog
  open derivation, and edit close clearing.
- Updated `ProjectTasksTab` to consume a `taskDialogs` controller instead of
  owning `useState` directly.
- Updated add-task, empty-state, workstream edit, create dialog, and edit dialog
  call sites to use the focused dialog-state owner.
- Added dialog-state helper and boundary tests.

## Standards Checked

- Domain ownership: Jobs/project task dialog state ownership remains in the Jobs
  domain.
- Route -> container/page -> hook -> server function -> schema/database -> query
  key/cache policy: this slice is UI state only; route, hook-to-server mutation
  contracts, schema/database, and query-key definitions are unchanged.
- Tenant isolation: unchanged; no data-access path was modified.
- Inventory and finance integrity: unchanged; no inventory or financial write
  path was modified.
- Serialized lineage continuity: unchanged.
- Honest UI states: preserved through the same create/edit dialog open, close,
  remount, and success-refetch behavior.
- Operator-safe error handling: unchanged; create/update errors remain owned by
  `task-dialogs.tsx`.
- Mutation/cache contracts: unchanged; dialog success still calls `refetch()`,
  and existing create/update mutation hooks retain their cache policy.
- Reviewable diff: parent state ownership removal plus focused hook/helper
  module and source/behavior tests.

## Smells Removed

- `ProjectTasksTab` no longer imports or calls `useState`.
- Create dialog open state no longer lives beside task read/filter/group logic.
- Selected edit task state no longer lives beside mutation orchestration.
- Create dialog remount key and edit dialog open derivation now have named,
  tested helpers.
- `ProjectTasksTab` now sits at 317 lines, down from 322 before this sprint and
  1553 before the Jobs/tasks extraction sequence.

## Smells Deferred

- `ProjectTasksTab` still renders both create-dialog instances because the empty
  state branch returns early and the non-empty branch owns the main layout.
- `task-dialogs.tsx` remains a large form/dialog implementation and should be
  split separately by create/edit form responsibilities, not inside this parent
  orchestration slice.
- Browser QA for dialog opening was deferred because this slice did not change
  rendered copy, form inputs, validation, or mutation behavior.

## Gates

- Targeted ESLint:
  `./node_modules/.bin/eslint src/components/domain/jobs/projects/project-tasks-tab.tsx src/components/domain/jobs/projects/project-task-dialog-state.ts tests/unit/jobs/project-task-dialog-state.test.ts tests/unit/jobs/project-task-dialog-state-boundary-contract.test.ts --report-unused-disable-directives`
  - Passed.
- Focused tests:
  `./node_modules/.bin/vitest run tests/unit/jobs/project-task-dialog-state.test.ts tests/unit/jobs/project-task-dialog-state-boundary-contract.test.ts`
  - Passed: 2 files, 4 tests.
- Widened Jobs task tests:
  `./node_modules/.bin/vitest run tests/unit/jobs/project-task-dialog-state.test.ts tests/unit/jobs/project-task-dialog-state-boundary-contract.test.ts tests/unit/jobs/project-task-delete-state.test.ts tests/unit/jobs/project-task-delete-mutation-boundary-contract.test.ts tests/unit/jobs/project-task-reorder-state.test.ts tests/unit/jobs/project-task-reorder-mutation-boundary-contract.test.ts tests/unit/jobs/project-task-status-state.test.ts tests/unit/jobs/project-task-status-mutation-boundary-contract.test.ts tests/unit/jobs/project-task-quick-add.test.ts tests/unit/jobs/project-task-quick-add-boundary-contract.test.ts tests/unit/jobs/project-task-route-state.test.ts tests/unit/jobs/project-task-route-state-boundary-contract.test.ts tests/unit/jobs/project-task-view-model.test.ts tests/unit/jobs/project-task-view-model-boundary-contract.test.ts tests/unit/jobs/project-task-completion-cta-boundary-contract.test.ts tests/unit/jobs/project-task-states-boundary-contract.test.ts tests/unit/jobs/project-task-workstream-group-boundary-contract.test.ts tests/unit/jobs/project-task-filter-controls-boundary-contract.test.ts tests/unit/jobs/project-task-summary-cards-boundary-contract.test.ts tests/unit/jobs/project-tasks-mutation-contract.test.ts tests/unit/jobs/project-tasks-read-feedback-contract.test.ts tests/unit/jobs/query-normalization-wave6d.test.tsx`
  - Passed: 22 files, 41 tests.
- Typecheck:
  `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
  - Passed.
- Pending dialog guard:
  `node scripts/check-pending-dialog-guards.mjs`
  - Passed.
- Diff hygiene:
  `git diff --check`
  - Passed before closeout documentation; final staged diff check rerun before
    commit.
- Full unit/build:
  - Skipped. This slice is local dialog state ownership covered by direct helper
    tests, boundary contracts, widened Jobs task tests, targeted ESLint,
    typecheck, pending dialog guard, and diff hygiene.

## Goal Adaptation

No goal adaptation made. This continues the active repo-maintainer goal by
shrinking the Jobs tasks parent surface and giving create/edit dialog state a
focused, tested owner.

## Residual Risk

Low behavioral risk because the same create/edit dialogs, open/close state,
selected editing task, success refetch, and pending-close guard remain in place.

Medium maintainability risk remains in `task-dialogs.tsx` because create and
edit forms still share one large dialog module.
