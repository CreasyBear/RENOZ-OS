# Jobs Maintainer Sprint 40: Task Create Template Field Boundary

## Status

Closed in commit-ready state.

## Problem

After extracting create scope fields, `TaskCreateDialog` still owned the
template prefill select rendering inline. That kept template option sentinel
handling, select primitives, and the "From template" field UI inside the create
mutation shell.

The create shell should decide what applying a template means for form state,
but the field rendering itself does not need to live beside mutation submit,
pending-close behavior, nested dialog state, and success handling.

## Workflow Spine

Project detail -> Tasks tab -> Add Task dialog -> optional template prefill ->
title/description form state update -> create task mutation -> existing success
close/reset path.

## Touched Domains

- Jobs/projects task create dialog.
- Jobs/projects task create template field rendering.
- Jobs task create dialog boundary tests.
- Jobs maintainer closeout docs.

## Business Value Protected

Task templates reduce repeated operator typing when similar project/service
tasks need to be created. Keeping the template field boundary focused makes the
prefill path easier to inspect without changing what task data is submitted.

## Scope Constraints

- No template option construction changed.
- No title or description prefill value changed.
- No task create mutation input changed.
- No job template hook, query key, server function, schema, or cache behavior
  changed.
- No task field label, select sentinel, field order, layout class, toast
  behavior, validation schema, pending-close behavior, create-more behavior, or
  success refetch intentionally changed.
- No tenant, inventory, finance, stock movement, or serialized lineage behavior
  changed.

## Changes

- Added `project-task-create-template-field.tsx`.
- Moved the create-only template select rendering into
  `ProjectTaskCreateTemplateField`.
- Kept `TaskCreateDialog` responsible for building template options and applying
  the selected template to form state.
- Removed select primitive and `FormField` imports from `TaskCreateDialog`.
- Added a boundary contract for the template field component.
- Updated the create dialog boundary contract so the new component is part of
  the create dialog shell contract.

## Standards Checked

- Domain ownership: Jobs/project task template prefill rendering stays in the
  Jobs domain beside the create dialog.
- Route -> container/page -> hook -> server function -> schema/database -> query
  key/cache policy: unchanged; this is a UI boundary extraction only.
- Tenant isolation/data integrity: unchanged because no read/write path changed.
- Inventory and finance integrity: unchanged.
- Serialized lineage continuity: unchanged.
- Honest UI states: preserved; the no-template path still renders nothing and
  the template field still starts from the same sentinel value.
- Operator-safe error handling: unchanged through the existing create mutation
  error formatter in `TaskCreateDialog`.
- Query/cache contract: unchanged; job templates still come from the existing
  `useJobTemplates` hook and task create still uses `useCreateTask`.
- Reviewability: create-template field behavior now has a focused component and
  boundary test.

## Smells Removed

- `TaskCreateDialog` no longer owns template select rendering inline.
- `TaskCreateDialog` no longer imports select primitives solely for template
  prefill.
- `TaskCreateDialog` no longer imports `FormField`.
- `task-create-dialog.tsx` is now 309 lines, down from 336 before this slice and
  398 before the create-scope extraction sequence.

## Deferred

- `TaskCreateDialog` still owns template option building and the form-state
  effect of applying a template. That remains appropriate for this slice because
  it coordinates create-form state.
- `TaskCreateDialog` still owns create mutation orchestration, create-more
  reset, selected site visit state, and nested dialog open state.
- Browser QA is deferred because this was a component extraction with preserved
  copy, labels, controls, sentinel values, and form-state updates.

## Gates

- Targeted ESLint:
  `./node_modules/.bin/eslint src/components/domain/jobs/projects/task-create-dialog.tsx src/components/domain/jobs/projects/project-task-create-template-field.tsx tests/unit/jobs/project-task-create-template-field-boundary-contract.test.ts tests/unit/jobs/project-task-create-dialog-boundary-contract.test.ts --report-unused-disable-directives`
  - Passed.
- Focused tests:
  `./node_modules/.bin/vitest run tests/unit/jobs/project-task-create-template-field-boundary-contract.test.ts tests/unit/jobs/project-task-create-dialog-boundary-contract.test.ts`
  - Passed: 2 files, 2 tests.
- Typecheck:
  `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
  - Passed.
- Pending dialog guard:
  `node scripts/check-pending-dialog-guards.mjs`
  - Passed.
- Widened Jobs tests:
  `./node_modules/.bin/vitest run tests/unit/jobs`
  - Passed: 90 files, 282 tests.
- Diff hygiene:
  `git diff --check`
  - Passed before closeout documentation; final staged diff check rerun before
    commit.
- Full unit/build/browser QA:
  - Skipped. This slice did not change app route loading, server functions,
    schemas, database, shared cache contracts, production build behavior, or
    rendered layout intent beyond moving existing JSX into a component.

## Goal Adaptation

No goal adaptation made. This continues the active repo-maintainer goal by
splitting Jobs task creation along a clearer create-shell versus template-field
rendering boundary.

## Residual Risk

Low behavior risk because the same template labels, sentinel value, option
selection behavior, title/description updates, mutation inputs, and success/error
paths are preserved. Medium maintainability risk remains in `TaskCreateDialog`
because template option building, create-more reset, mutation orchestration, and
nested dialog state still live in the create shell.
