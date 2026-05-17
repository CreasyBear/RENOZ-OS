# Reliability Maintainer Sprint 32: Jobs Task Create Dialog Module Split

## Status

Closed and commit-ready.

## Problem

After the edit dialog split, `task-dialogs.tsx` still owned the create dialog
shell: create mutation, site-visit and workstream reads, template prefill,
create-more reset, nested site-visit/workstream/user-invite dialogs, pending
close guard, and create failure formatting.

That left `task-dialogs.tsx` as a misleading mixed owner: mostly create logic,
plus a re-exported edit dialog. The public import path was stable, but the file
name no longer described the true responsibility.

## Workflow Spine Protected

Project detail -> Tasks tab -> create task -> focused create dialog shell ->
project/site-visit/workstream scoped create mutation -> success closes or resets
for create-more -> parent refetches project tasks or failure shows
operator-safe copy.

## Touched Domains

- Jobs/projects task create dialog module ownership.
- Jobs/projects task dialog public export boundary.
- Jobs task mutation source contract for create/update dialog owners.
- Jobs task dialog field/form-state boundary contracts.
- Reliability closeout documentation.

## Business Value Protected

Task creation is a primary operator workflow for keeping project and service
execution current. Giving create its own module makes nested project/site-visit
creation behavior and create mutation handling easier to inspect without
breaking existing imports.

## Scope Constraints

- No task dialog copy, field order, layout classes, mutation inputs, toast
  behavior, validation schema, pending-close behavior, template prefill behavior,
  create-more behavior, or success refetch intentionally changed.
- Existing consumers can still import `TaskCreateDialog`,
  `TaskCreateDialogProps`, `TaskEditDialog`, and `TaskEditDialogProps` from
  `./task-dialogs`.
- No route, server-function, schema, database, query-key, or cache-key definition
  changes.
- No task list read state, filtering, sorting, grouping, quick-add, status
  mutation, reorder, delete, or project completion behavior intentionally
  changed.
- No tenant, inventory movement, finance, stock costing, or serialized lineage
  write path changed.

## Changes

- Added `task-create-dialog.tsx`.
- Moved `TaskCreateDialog` and `TaskCreateDialogProps` into the focused create
  dialog module.
- Reduced `task-dialogs.tsx` to a compatibility export surface for create and
  edit task dialogs.
- Updated dialog field/form-state/mutation contracts to read create behavior
  from `task-create-dialog.tsx` and edit behavior from `task-edit-dialog.tsx`.
- Added a create dialog boundary contract.

## Standards Checked

- Domain ownership: Jobs/project task create dialog ownership remains in the
  Jobs domain.
- Route -> container/page -> hook -> server function -> schema/database -> query
  key/cache policy: this slice is a UI module split; hook-to-server mutation,
  server, schema/database, and query-key definitions are unchanged.
- Tenant isolation: unchanged; no data-access path was modified.
- Inventory and finance integrity: unchanged; no inventory or financial write
  path was modified.
- Serialized lineage continuity: unchanged.
- Honest UI states: preserved; loading state, nested dialog state, create-more
  state, and pending-close behavior remain in place.
- Operator-safe error handling: preserved through
  `formatProjectTaskMutationError(error, 'create')` in the create module.
- Mutation/cache contracts: create still calls `useCreateTask()` with the same
  project/site-visit/workstream/task inputs; success still calls `onSuccess`.
- Reviewable diff: moved create shell into a focused module with stable
  re-export and boundary contract updates.

## Smells Removed

- `task-dialogs.tsx` no longer owns create task mutation flow.
- `task-dialogs.tsx` no longer imports form, query, mutation, dialog, or toast
  dependencies.
- Create and edit dialog shells now each have focused modules.
- `task-dialogs.tsx` now sits at 2 lines, down from 424 before this sprint, 599
  before the edit split, and 854 before the dialog cleanup sequence.

## Smells Deferred

- `task-create-dialog.tsx` still owns create-only workstream/site-visit nested
  dialog behavior.
- Create-only workstream/site-visit field rendering is still inline because it
  is not shared with edit and carries nested-dialog behavior.
- Browser QA is deferred because this is a module split with preserved imports,
  props, labels, controls, mutation inputs, nested dialogs, and pending-close
  behavior.

## Gates

- Targeted ESLint:
  `./node_modules/.bin/eslint src/components/domain/jobs/projects/task-dialogs.tsx src/components/domain/jobs/projects/task-create-dialog.tsx src/components/domain/jobs/projects/task-edit-dialog.tsx tests/unit/jobs/project-task-create-dialog-boundary-contract.test.ts tests/unit/jobs/project-task-edit-dialog-boundary-contract.test.ts tests/unit/jobs/project-task-dialog-fields-boundary-contract.test.ts tests/unit/jobs/project-task-dialog-form-state-boundary-contract.test.ts tests/unit/jobs/project-tasks-mutation-contract.test.ts --report-unused-disable-directives`
  - Passed.
- Focused tests:
  `./node_modules/.bin/vitest run tests/unit/jobs/project-task-create-dialog-boundary-contract.test.ts tests/unit/jobs/project-task-edit-dialog-boundary-contract.test.ts tests/unit/jobs/project-task-dialog-fields-boundary-contract.test.ts tests/unit/jobs/project-task-dialog-form-state-boundary-contract.test.ts tests/unit/jobs/project-tasks-mutation-contract.test.ts`
  - Passed: 5 files, 6 tests.
- Widened Jobs task tests:
  `./node_modules/.bin/vitest run tests/unit/jobs/project-task-create-dialog-boundary-contract.test.ts tests/unit/jobs/project-task-edit-dialog-boundary-contract.test.ts tests/unit/jobs/project-task-dialog-fields-boundary-contract.test.ts tests/unit/jobs/project-task-dialog-form-state.test.ts tests/unit/jobs/project-task-dialog-form-state-boundary-contract.test.ts tests/unit/jobs/project-task-dialog-state.test.ts tests/unit/jobs/project-task-dialog-state-boundary-contract.test.ts tests/unit/jobs/project-task-delete-state.test.ts tests/unit/jobs/project-task-delete-mutation-boundary-contract.test.ts tests/unit/jobs/project-task-reorder-state.test.ts tests/unit/jobs/project-task-reorder-mutation-boundary-contract.test.ts tests/unit/jobs/project-task-status-state.test.ts tests/unit/jobs/project-task-status-mutation-boundary-contract.test.ts tests/unit/jobs/project-task-quick-add.test.ts tests/unit/jobs/project-task-quick-add-boundary-contract.test.ts tests/unit/jobs/project-task-route-state.test.ts tests/unit/jobs/project-task-route-state-boundary-contract.test.ts tests/unit/jobs/project-task-view-model.test.ts tests/unit/jobs/project-task-view-model-boundary-contract.test.ts tests/unit/jobs/project-task-completion-cta-boundary-contract.test.ts tests/unit/jobs/project-task-states-boundary-contract.test.ts tests/unit/jobs/project-task-workstream-group-boundary-contract.test.ts tests/unit/jobs/project-task-filter-controls-boundary-contract.test.ts tests/unit/jobs/project-task-summary-cards-boundary-contract.test.ts tests/unit/jobs/project-tasks-mutation-contract.test.ts tests/unit/jobs/project-tasks-read-feedback-contract.test.ts tests/unit/jobs/query-normalization-wave6d.test.tsx`
  - Passed: 27 files, 50 tests.
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

Low behavioral risk because the same create dialog props, fields, validation,
mutation input, template prefill, nested dialogs, success refetch path,
pending-close guard, and operator-safe error handling are preserved.

Medium maintainability risk remains in `task-create-dialog.tsx` because
create-only workstream/site-visit nested dialog behavior is still inline.
