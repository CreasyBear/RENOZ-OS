# Jobs Maintainer Sprint 39: Task Create Scope Fields Boundary

## Status

Closed in commit-ready state.

## Problem

`TaskCreateDialog` still owned create-only workstream and site-visit scope field
rendering inline after the create/edit dialog split. That kept nested
workstream/site-visit creation triggers, site-visit empty state copy, select
sentinel handling, and field blur behavior embedded inside the create mutation
shell.

The behavior was working, but the file remained harder to audit than it needed
to be: create mutation orchestration and create-scope field rendering were still
mixed in one module.

## Workflow Spine

Project detail -> Tasks tab -> Add Task dialog -> choose workstream and optional
site visit scope -> create missing workstream or site visit when needed -> create
task mutation -> task list refresh through the existing success callback.

## Touched Domains

- Jobs/projects task create dialog.
- Jobs/projects task create scope field rendering.
- Jobs task create dialog boundary tests.
- Jobs maintainer closeout docs.

## Business Value Protected

Task creation is an operator workflow for keeping installation, support, and
project execution organized. Workstream and site-visit scope needs to be obvious
and reliable so task ownership, scheduling context, and execution follow-up do
not drift into project-level noise.

## Scope Constraints

- No task create mutation input changed.
- No workstream or site-visit query, cache key, server function, schema, or
  database behavior changed.
- No nested dialog open/close state ownership changed.
- No task field label, select sentinel, empty-state copy, field order, layout
  class, toast behavior, validation schema, pending-close behavior, create-more
  behavior, or success refetch intentionally changed.
- No tenant, inventory, finance, stock movement, or serialized lineage behavior
  changed.

## Changes

- Added `project-task-create-scope-fields.tsx`.
- Moved create-only workstream select rendering into
  `ProjectTaskCreateScopeFields`.
- Moved create-only site-visit select and empty-state rendering into
  `ProjectTaskCreateScopeFields`.
- Kept `TaskCreateDialog` responsible for data reads, selected site visit state,
  nested dialog open state, create mutation, success handling, and error
  handling.
- Added a boundary contract for the scope field component.
- Updated the create dialog boundary contract so the new component is part of
  the create dialog shell contract.

## Standards Checked

- Domain ownership: Jobs/project task create scope rendering stays in the Jobs
  domain beside the create dialog.
- Route -> container/page -> hook -> server function -> schema/database -> query
  key/cache policy: unchanged; this is a UI boundary extraction only.
- Tenant isolation/data integrity: unchanged because no read/write path changed.
- Inventory and finance integrity: unchanged.
- Serialized lineage continuity: unchanged.
- Honest UI states: preserved; the no-site-visits state and create-workstream
  sentinel behavior moved without copy or behavior changes.
- Operator-safe error handling: unchanged through the existing create mutation
  error formatter in `TaskCreateDialog`.
- Query/cache contract: unchanged; task create still uses the existing
  `useCreateTask` mutation and parent `onSuccess` callback.
- Reviewability: create-scope field behavior now has a focused component and
  boundary test.

## Smells Removed

- `TaskCreateDialog` no longer owns workstream select rendering inline.
- `TaskCreateDialog` no longer owns site-visit scope select and empty-state
  rendering inline.
- `TaskCreateDialog` no longer imports `Button` only for the no-site-visits
  scope empty state.
- `task-create-dialog.tsx` is now 336 lines, down from 398 before this slice.

## Deferred

- `TaskCreateDialog` still owns create mutation orchestration, template prefill,
  create-more reset, selected site visit state, and nested dialog open state.
  That is acceptable for this slice because those concerns coordinate the create
  shell itself.
- Browser QA is deferred because this was a component extraction with preserved
  copy, labels, controls, sentinel values, mutation inputs, and nested dialog
  callbacks.

## Gates

- Targeted ESLint:
  `./node_modules/.bin/eslint src/components/domain/jobs/projects/task-create-dialog.tsx src/components/domain/jobs/projects/project-task-create-scope-fields.tsx tests/unit/jobs/project-task-create-scope-fields-boundary-contract.test.ts tests/unit/jobs/project-task-create-dialog-boundary-contract.test.ts --report-unused-disable-directives`
  - Passed.
- Focused tests:
  `./node_modules/.bin/vitest run tests/unit/jobs/project-task-create-scope-fields-boundary-contract.test.ts tests/unit/jobs/project-task-create-dialog-boundary-contract.test.ts`
  - Passed: 2 files, 2 tests.
- Typecheck:
  `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
  - Passed.
- Pending dialog guard:
  `node scripts/check-pending-dialog-guards.mjs`
  - Passed.
- Widened Jobs tests:
  `./node_modules/.bin/vitest run tests/unit/jobs`
  - Passed: 89 files, 281 tests.
- Diff hygiene:
  `git diff --check`
  - Passed before closeout documentation; final staged diff check rerun before
    commit.
- Full unit/build/browser QA:
  - Skipped. This slice did not change app route loading, server functions,
    schemas, database, shared cache contracts, production build behavior, or
    rendered layout beyond moving existing JSX into a component.

## Goal Adaptation

No goal adaptation made. This continues the active repo-maintainer goal by
splitting Jobs task creation along a clearer create-shell versus scope-field
rendering boundary.

## Residual Risk

Low behavior risk because the same field labels, sentinel values, callbacks,
empty-state copy, nested dialog triggers, mutation inputs, and success/error
paths are preserved. Medium maintainability risk remains in `TaskCreateDialog`
because template prefill, create-more reset, and nested dialog state still live
inside the create shell.
