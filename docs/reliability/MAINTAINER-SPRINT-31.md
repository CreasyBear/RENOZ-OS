# Reliability Maintainer Sprint 31: Jobs Task Edit Dialog Module Split

## Status

Closed and commit-ready.

## Problem

`task-dialogs.tsx` still owned both create and edit dialog shells. Even after
field and form-state extraction, the edit task mutation, edit reset effect,
edit-specific pending-close guard, update error formatting, and edit invite-user
dialog were still mixed into the create dialog module.

That kept two related but distinct workflow shells in one file and made future
create-only workstream/site-visit cleanup harder to review.

## Workflow Spine Protected

Project detail -> Tasks tab -> edit task -> focused edit dialog shell -> update
task mutation with `{ taskId, jobId }` -> success closes and refetches project
tasks or failure shows operator-safe copy.

## Touched Domains

- Jobs/projects task edit dialog module ownership.
- Jobs/projects task dialog public export boundary.
- Jobs task mutation source contract for create/update dialog owners.
- Jobs task dialog field/form-state boundary contracts.
- Reliability closeout documentation.

## Business Value Protected

Task editing is how operators correct project/service work as reality changes.
Giving edit its own module keeps the update workflow easier to inspect while
preserving the existing import path used by task tabs and the projects barrel.

## Scope Constraints

- No task dialog copy, field order, layout classes, mutation inputs, toast
  behavior, validation schema, pending-close behavior, or success refetch
  intentionally changed.
- Existing consumers can still import `TaskEditDialog` and `TaskEditDialogProps`
  from `./task-dialogs`.
- No route, server-function, schema, database, query-key, or cache-key definition
  changes.
- No task list read state, filtering, sorting, grouping, quick-add, status
  mutation, reorder, delete, or project completion behavior intentionally
  changed.
- No tenant, inventory movement, finance, stock costing, or serialized lineage
  write path changed.

## Changes

- Added `task-edit-dialog.tsx`.
- Moved `TaskEditDialog` and `TaskEditDialogProps` into the focused edit dialog
  module.
- Kept `task-dialogs.tsx` as the stable public export surface by re-exporting
  `TaskEditDialog` and `TaskEditDialogProps`.
- Removed edit-only imports from `task-dialogs.tsx`, including `useEffect`,
  `Edit3`, `useUpdateTask`, edit reset helpers, and edit-specific field imports.
- Updated dialog field/form-state/mutation contracts to read the new edit module
  where edit behavior now lives.
- Added an edit dialog boundary contract.

## Standards Checked

- Domain ownership: Jobs/project task edit dialog ownership remains in the Jobs
  domain.
- Route -> container/page -> hook -> server function -> schema/database -> query
  key/cache policy: this slice is a UI module split; hook-to-server mutation,
  server, schema/database, and query-key definitions are unchanged.
- Tenant isolation: unchanged; no data-access path was modified.
- Inventory and finance integrity: unchanged; no inventory or financial write
  path was modified.
- Serialized lineage continuity: unchanged.
- Honest UI states: preserved; no loading, empty, failed, blocked, degraded, or
  pending-close state was changed.
- Operator-safe error handling: preserved through
  `formatProjectTaskMutationError(error, 'update')` in the edit module.
- Mutation/cache contracts: edit still calls `useUpdateTask()` with the task's
  `taskId` and `jobId`; success close and parent refetch behavior are unchanged.
- Reviewable diff: moved edit shell into a focused module with stable re-export
  and boundary contract updates.

## Smells Removed

- `task-dialogs.tsx` no longer owns edit task mutation flow.
- `task-dialogs.tsx` no longer imports `useEffect`, `Edit3`, or `useUpdateTask`.
- Edit reset effect and update error handling now live with the edit dialog.
- `task-dialogs.tsx` now sits at 424 lines, down from 599 before this sprint,
  787 before field extraction, and 854 before the dialog cleanup sequence.

## Smells Deferred

- `task-dialogs.tsx` still owns the create dialog shell and create-only
  workstream/site-visit nested dialog behavior.
- Create dialog rendering is still large enough to deserve its own focused
  module or smaller create-only field sections in a later slice.
- Browser QA is deferred because this is a module split with preserved imports,
  props, labels, controls, mutation inputs, and pending-close behavior.

## Gates

- Targeted ESLint:
  `./node_modules/.bin/eslint src/components/domain/jobs/projects/task-dialogs.tsx src/components/domain/jobs/projects/task-edit-dialog.tsx tests/unit/jobs/project-task-edit-dialog-boundary-contract.test.ts tests/unit/jobs/project-task-dialog-fields-boundary-contract.test.ts tests/unit/jobs/project-task-dialog-form-state-boundary-contract.test.ts tests/unit/jobs/project-tasks-mutation-contract.test.ts --report-unused-disable-directives`
  - Passed.
- Focused tests:
  `./node_modules/.bin/vitest run tests/unit/jobs/project-task-edit-dialog-boundary-contract.test.ts tests/unit/jobs/project-task-dialog-fields-boundary-contract.test.ts tests/unit/jobs/project-task-dialog-form-state-boundary-contract.test.ts tests/unit/jobs/project-tasks-mutation-contract.test.ts`
  - Passed: 4 files, 5 tests.
- Widened Jobs task tests:
  `./node_modules/.bin/vitest run tests/unit/jobs/project-task-edit-dialog-boundary-contract.test.ts tests/unit/jobs/project-task-dialog-fields-boundary-contract.test.ts tests/unit/jobs/project-task-dialog-form-state.test.ts tests/unit/jobs/project-task-dialog-form-state-boundary-contract.test.ts tests/unit/jobs/project-task-dialog-state.test.ts tests/unit/jobs/project-task-dialog-state-boundary-contract.test.ts tests/unit/jobs/project-task-delete-state.test.ts tests/unit/jobs/project-task-delete-mutation-boundary-contract.test.ts tests/unit/jobs/project-task-reorder-state.test.ts tests/unit/jobs/project-task-reorder-mutation-boundary-contract.test.ts tests/unit/jobs/project-task-status-state.test.ts tests/unit/jobs/project-task-status-mutation-boundary-contract.test.ts tests/unit/jobs/project-task-quick-add.test.ts tests/unit/jobs/project-task-quick-add-boundary-contract.test.ts tests/unit/jobs/project-task-route-state.test.ts tests/unit/jobs/project-task-route-state-boundary-contract.test.ts tests/unit/jobs/project-task-view-model.test.ts tests/unit/jobs/project-task-view-model-boundary-contract.test.ts tests/unit/jobs/project-task-completion-cta-boundary-contract.test.ts tests/unit/jobs/project-task-states-boundary-contract.test.ts tests/unit/jobs/project-task-workstream-group-boundary-contract.test.ts tests/unit/jobs/project-task-filter-controls-boundary-contract.test.ts tests/unit/jobs/project-task-summary-cards-boundary-contract.test.ts tests/unit/jobs/project-tasks-mutation-contract.test.ts tests/unit/jobs/project-tasks-read-feedback-contract.test.ts tests/unit/jobs/query-normalization-wave6d.test.tsx`
  - Passed: 26 files, 49 tests.
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
  - Skipped. This slice is a local module split covered by stable export
    contracts, widened Jobs task tests, targeted ESLint, typecheck, pending
    dialog guard, and diff hygiene.

## Goal Adaptation

No goal adaptation made. This continues the active repo-maintainer goal by
splitting a large Jobs dialog module along workflow responsibility while keeping
the public import boundary stable.

## Residual Risk

Low behavioral risk because the same edit dialog props, fields, validation,
mutation input, success close, success refetch path, pending-close guard, and
operator-safe error handling are preserved.

Medium maintainability risk remains in the create dialog shell because
workstream/site-visit nested dialog behavior is still inline.
