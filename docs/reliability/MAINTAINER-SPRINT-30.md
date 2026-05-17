# Reliability Maintainer Sprint 30: Jobs Task Dialog Field Renderer Extraction

## Status

Closed and commit-ready.

## Problem

`task-dialogs.tsx` still duplicated create/edit field rendering for task
priority, assignee invite, due date, and estimated hours, while also owning the
edit-only status field rendering.

That kept repeated field semantics, sentinel values, invite-user branching,
calendar date formatting, and number-field configuration embedded directly in a
large dialog renderer.

## Workflow Spine Protected

Project detail -> Tasks tab -> create or edit task dialog -> operator sets task
status/priority/assignee/due date/estimated hours -> submit mutation -> project
tasks refetch or operator-safe failure feedback.

## Touched Domains

- Jobs/projects task dialog field rendering.
- Jobs task create/edit form field ownership.
- Jobs task dialog field boundary contracts.
- Reliability closeout documentation.

## Business Value Protected

Task create/edit forms are core operator surfaces for project and service work.
Extracting repeated field rendering makes the form easier to change safely while
preserving the operator's existing controls and values.

## Scope Constraints

- No task dialog copy, field order, layout classes, mutation inputs, toast
  behavior, validation schema, or pending-close behavior intentionally changed.
- No route, server-function, schema, database, query-key, or cache-key definition
  changes.
- No task list read state, filtering, sorting, grouping, quick-add, status
  mutation, reorder, delete, or project completion behavior intentionally
  changed.
- No tenant, inventory movement, finance, stock costing, or serialized lineage
  write path changed.

## Changes

- Added `project-task-dialog-fields.tsx`.
- Moved shared priority select rendering into `ProjectTaskPriorityField`.
- Moved edit status select rendering into `ProjectTaskStatusField`.
- Moved create/edit assignee select and invite-user sentinel handling into
  `ProjectTaskAssigneeField`.
- Moved create/edit due-date picker rendering into `ProjectTaskDueDateField`,
  preserving create `''` and edit `null` empty values.
- Moved estimated-hours number field rendering into
  `ProjectTaskEstimatedHoursField`.
- Updated `task-dialogs.tsx` to delegate field rendering to those focused
  components.
- Added a boundary contract for dialog field ownership.

## Standards Checked

- Domain ownership: Jobs/project task dialog field rendering remains in the Jobs
  domain.
- Route -> container/page -> hook -> server function -> schema/database -> query
  key/cache policy: this slice is UI rendering only; route, hook-to-server,
  server, schema/database, and query-key definitions are unchanged.
- Tenant isolation: unchanged; no data-access path was modified.
- Inventory and finance integrity: unchanged; no inventory or financial write
  path was modified.
- Serialized lineage continuity: unchanged.
- Honest UI states: preserved; no loading, empty, failed, blocked, degraded, or
  pending-close state was changed.
- Operator-safe error handling: unchanged; create/update errors still use
  `formatProjectTaskMutationError`.
- Mutation/cache contracts: unchanged; create/update hooks and success refetch
  behavior remain in place.
- Reviewable diff: large renderer deletion plus focused field renderer module and
  boundary test.

## Smells Removed

- `task-dialogs.tsx` no longer imports calendar popover/date formatting utilities
  directly.
- Repeated create/edit priority select rendering now has one owner.
- Repeated create/edit assignee invite rendering now has one owner.
- Repeated create/edit due-date picker rendering now has one owner.
- Repeated create/edit estimated-hours rendering now has one owner.
- `task-dialogs.tsx` now sits at 599 lines, down from 787 before this sprint and
  854 before the dialog cleanup sequence.

## Smells Deferred

- `task-dialogs.tsx` still owns both create and edit dialog renderer shells.
- Workstream/site-visit create-only fields remain inline because they are not
  shared with edit and carry nested-dialog behavior.
- Browser QA is deferred for this slice because rendered labels, controls, field
  order, and mutation behavior are intended to be unchanged; a larger visual
  layout split should include browser QA.

## Gates

- Targeted ESLint:
  `./node_modules/.bin/eslint src/components/domain/jobs/projects/task-dialogs.tsx src/components/domain/jobs/projects/project-task-dialog-fields.tsx tests/unit/jobs/project-task-dialog-fields-boundary-contract.test.ts --report-unused-disable-directives`
  - Passed.
- Focused tests:
  `./node_modules/.bin/vitest run tests/unit/jobs/project-task-dialog-fields-boundary-contract.test.ts`
  - Passed: 1 file, 1 test.
- Widened Jobs task tests:
  `./node_modules/.bin/vitest run tests/unit/jobs/project-task-dialog-fields-boundary-contract.test.ts tests/unit/jobs/project-task-dialog-form-state.test.ts tests/unit/jobs/project-task-dialog-form-state-boundary-contract.test.ts tests/unit/jobs/project-task-dialog-state.test.ts tests/unit/jobs/project-task-dialog-state-boundary-contract.test.ts tests/unit/jobs/project-task-delete-state.test.ts tests/unit/jobs/project-task-delete-mutation-boundary-contract.test.ts tests/unit/jobs/project-task-reorder-state.test.ts tests/unit/jobs/project-task-reorder-mutation-boundary-contract.test.ts tests/unit/jobs/project-task-status-state.test.ts tests/unit/jobs/project-task-status-mutation-boundary-contract.test.ts tests/unit/jobs/project-task-quick-add.test.ts tests/unit/jobs/project-task-quick-add-boundary-contract.test.ts tests/unit/jobs/project-task-route-state.test.ts tests/unit/jobs/project-task-route-state-boundary-contract.test.ts tests/unit/jobs/project-task-view-model.test.ts tests/unit/jobs/project-task-view-model-boundary-contract.test.ts tests/unit/jobs/project-task-completion-cta-boundary-contract.test.ts tests/unit/jobs/project-task-states-boundary-contract.test.ts tests/unit/jobs/project-task-workstream-group-boundary-contract.test.ts tests/unit/jobs/project-task-filter-controls-boundary-contract.test.ts tests/unit/jobs/project-task-summary-cards-boundary-contract.test.ts tests/unit/jobs/project-tasks-mutation-contract.test.ts tests/unit/jobs/project-tasks-read-feedback-contract.test.ts tests/unit/jobs/query-normalization-wave6d.test.tsx`
  - Passed: 25 files, 48 tests.
- Typecheck:
  `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
  - Passed after correcting the `FormFieldWithType` type import to the source
    forms type module.
- Pending dialog guard:
  `node scripts/check-pending-dialog-guards.mjs`
  - Passed.
- Diff hygiene:
  `git diff --check`
  - Passed before closeout documentation; final staged diff check rerun before
    commit.
- Full unit/build:
  - Skipped. This slice is local dialog field renderer ownership covered by a
    boundary contract, widened Jobs task tests, targeted ESLint, typecheck,
    pending dialog guard, and diff hygiene.

## Goal Adaptation

No goal adaptation made. This continues the active repo-maintainer goal by
shrinking a large Jobs dialog renderer and giving repeated create/edit fields
focused owners.

## Residual Risk

Low behavioral risk because field labels, option labels, empty-value behavior,
date formatting, number constraints, mutation inputs, pending-close guards, and
success/error handling are preserved.

Medium maintainability risk remains because create and edit dialog shells still
share one file and workstream/site-visit nested dialog logic remains inline.
