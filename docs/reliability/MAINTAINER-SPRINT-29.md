# Reliability Maintainer Sprint 29: Jobs Task Dialog Form State Extraction

## Status

Closed and commit-ready.

## Problem

`task-dialogs.tsx` still owned pure form-state contracts beside JSX rendering:
task create/edit schemas, job-template option flattening, create-more reset
values, edit due-date normalization, and edit task reset fallback logic.

That made a large dialog module harder to review because form contract logic was
mixed directly with nested dialog rendering, select fields, calendar controls,
mutation calls, and toast feedback.

## Workflow Spine Protected

Project detail -> Tasks tab -> create or edit task dialog -> validate form using
canonical task status/priority rules -> submit mutation -> success refetches
project tasks or failure shows operator-safe copy.

## Touched Domains

- Jobs/projects task dialog form-state ownership.
- Jobs task create/edit schema alignment with canonical task schemas.
- Jobs task template option and reset-value helpers.
- Jobs task dialog form-state tests and boundary contracts.
- Reliability closeout documentation.

## Business Value Protected

Task create/edit dialogs keep project/service work current. Pulling schema and
reset contracts out of the renderer makes the workflow easier to maintain while
preserving the operator-facing form, validation, create-more behavior, template
prefill behavior, and edit reset behavior.

## Scope Constraints

- No task dialog JSX, copy, field layout, mutation inputs, toast behavior, or
  pending-close behavior intentionally changed.
- No route, server-function, database, query-key, or cache-key definition
  changes.
- No task list read state, filtering, sorting, grouping, quick-add, status,
  reorder, delete, or project completion behavior intentionally changed.
- No tenant, inventory movement, finance, stock costing, or serialized lineage
  write path changed.

## Changes

- Added `project-task-dialog-form-state.ts`.
- Moved create/edit task dialog schemas behind focused exports.
- Switched dialog schemas to canonical `jobTaskStatusSchema` and
  `jobTaskPrioritySchema` from the Jobs schema layer.
- Added `buildProjectTaskTemplateOptions` for job-template task dropdown
  flattening.
- Added default-value and create-more reset helpers.
- Added edit due-date, status, priority, and full reset-value helpers.
- Updated `task-dialogs.tsx` to consume focused helpers instead of owning that
  pure form-state logic inline.
- Added helper tests and a boundary contract.

## Standards Checked

- Domain ownership: Jobs/project task dialog form-state ownership remains in the
  Jobs domain.
- Route -> container/page -> hook -> server function -> schema/database -> query
  key/cache policy: this slice improves schema alignment at the dialog boundary;
  route, server, database, and query-key definitions are unchanged.
- Tenant isolation: unchanged; no data-access path was modified.
- Inventory and finance integrity: unchanged; no inventory or financial write
  path was modified.
- Serialized lineage continuity: unchanged.
- Honest UI states: preserved; no rendered empty/loading/error or pending-close
  state was changed.
- Operator-safe error handling: unchanged; create/update errors still use
  `formatProjectTaskMutationError`.
- Mutation/cache contracts: unchanged; create/update hooks and success refetch
  behavior remain in place.
- Reviewable diff: renderer deletion plus focused form-state module and tests.

## Smells Removed

- `task-dialogs.tsx` no longer imports `z`.
- Inline `z.enum` task status/priority definitions no longer live in the dialog
  renderer.
- Job-template option flattening is now named and tested.
- Create-more sticky reset behavior is now named and tested.
- Edit due-date/status/priority fallback behavior is now named and tested.
- `task-dialogs.tsx` now sits at 787 lines, down from 854 before this sprint.

## Smells Deferred

- `task-dialogs.tsx` still renders both large create and edit forms in one file.
- Create and edit field groups still contain repeated assignee, priority, due
  date, and estimated-hours JSX.
- Splitting create/edit rendering or shared fields should happen in a later
  slice with browser QA because it carries more UI regression risk.

## Gates

- Targeted ESLint:
  `./node_modules/.bin/eslint src/components/domain/jobs/projects/task-dialogs.tsx src/components/domain/jobs/projects/project-task-dialog-form-state.ts tests/unit/jobs/project-task-dialog-form-state.test.ts tests/unit/jobs/project-task-dialog-form-state-boundary-contract.test.ts --report-unused-disable-directives`
  - Passed.
- Focused tests:
  `./node_modules/.bin/vitest run tests/unit/jobs/project-task-dialog-form-state.test.ts tests/unit/jobs/project-task-dialog-form-state-boundary-contract.test.ts`
  - Passed: 2 files, 6 tests.
- Widened Jobs task tests:
  `./node_modules/.bin/vitest run tests/unit/jobs/project-task-dialog-form-state.test.ts tests/unit/jobs/project-task-dialog-form-state-boundary-contract.test.ts tests/unit/jobs/project-task-dialog-state.test.ts tests/unit/jobs/project-task-dialog-state-boundary-contract.test.ts tests/unit/jobs/project-task-delete-state.test.ts tests/unit/jobs/project-task-delete-mutation-boundary-contract.test.ts tests/unit/jobs/project-task-reorder-state.test.ts tests/unit/jobs/project-task-reorder-mutation-boundary-contract.test.ts tests/unit/jobs/project-task-status-state.test.ts tests/unit/jobs/project-task-status-mutation-boundary-contract.test.ts tests/unit/jobs/project-task-quick-add.test.ts tests/unit/jobs/project-task-quick-add-boundary-contract.test.ts tests/unit/jobs/project-task-route-state.test.ts tests/unit/jobs/project-task-route-state-boundary-contract.test.ts tests/unit/jobs/project-task-view-model.test.ts tests/unit/jobs/project-task-view-model-boundary-contract.test.ts tests/unit/jobs/project-task-completion-cta-boundary-contract.test.ts tests/unit/jobs/project-task-states-boundary-contract.test.ts tests/unit/jobs/project-task-workstream-group-boundary-contract.test.ts tests/unit/jobs/project-task-filter-controls-boundary-contract.test.ts tests/unit/jobs/project-task-summary-cards-boundary-contract.test.ts tests/unit/jobs/project-tasks-mutation-contract.test.ts tests/unit/jobs/project-tasks-read-feedback-contract.test.ts tests/unit/jobs/query-normalization-wave6d.test.tsx`
  - Passed: 24 files, 47 tests.
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
  - Skipped. This slice is local dialog form-state ownership covered by direct
    helper tests, boundary contracts, widened Jobs task tests, targeted ESLint,
    typecheck, pending dialog guard, and diff hygiene.

## Goal Adaptation

No goal adaptation made. This continues the active repo-maintainer goal by
shrinking a large Jobs dialog module and aligning dialog validation with the
canonical Jobs task schema layer.

## Residual Risk

Low behavioral risk because rendered fields, mutation inputs, submit handling,
pending-close guards, and success/error feedback are unchanged.

Medium maintainability risk remains because `task-dialogs.tsx` still owns large
create/edit JSX sections that should be split by form responsibility in a later
slice.
