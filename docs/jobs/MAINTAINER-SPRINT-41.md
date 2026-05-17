# Jobs Maintainer Sprint 41: Task Create Form Hook Boundary

## Status

Closed in commit-ready state.

## Problem

After template and scope field extraction, `TaskCreateDialog` still owned create
form orchestration inline: `useCreateTask`, `useTanStackForm`, validation toasts,
operator-safe create error formatting, success navigation, create-more reset,
submit error state, and pending-close behavior.

That made the renderer a mixed owner. It was responsible for fetching field
options and drawing the dialog, but also for mutation execution and form
lifecycle decisions.

## Workflow Spine

Project detail -> Tasks tab -> Add Task dialog -> submit task form -> project and
optional site-visit/workstream scoped create mutation -> success toast and View
Tasks route action -> create-more reset or close -> parent success callback.

## Touched Domains

- Jobs/projects task create dialog.
- Jobs/projects task create form and mutation orchestration.
- Jobs task mutation/form-state boundary contracts.
- Jobs maintainer closeout docs.

## Business Value Protected

Task creation is a core operator path for project, installation, and support
execution. The create mutation needs to stay operator-safe, scoped, and
reviewable so task ownership and follow-up do not disappear behind an overloaded
dialog renderer.

## Scope Constraints

- No task create mutation input changed.
- No success toast copy, route target, create-more reset behavior, submit-error
  copy, pending-close behavior, or validation toast copy intentionally changed.
- No job template, workstream, site-visit, user lookup, query key, cache policy,
  server function, schema, or database behavior changed.
- No field order, labels, placeholders, layout classes, nested dialog behavior,
  or create-more UI intentionally changed.
- No tenant, inventory, finance, stock movement, or serialized lineage behavior
  changed.

## Changes

- Added `project-task-create-dialog-form.ts`.
- Moved create form construction, create mutation execution, validation toasts,
  create-more reset, success navigation, pending close guard, submit error state,
  template application, and workstream field assignment into
  `useProjectTaskCreateDialogForm`.
- Kept `TaskCreateDialog` responsible for data reads, selected site visit state,
  nested dialog open state, and rendering.
- Updated mutation, form-state, create-dialog, and template-field boundary
  contracts to point create mutation ownership at the new hook.
- Added a focused boundary contract for the create form hook.

## Standards Checked

- Domain ownership: Jobs/project task create mutation orchestration stays in the
  Jobs task create dialog module group.
- Route -> container/page -> hook -> server function -> schema/database -> query
  key/cache policy: preserved. The create dialog still calls the same
  `useCreateTask` mutation through the new local hook; server, schema, database,
  and query-key/cache behavior are unchanged.
- Tenant isolation/data integrity: unchanged because no server or data-access
  path changed.
- Inventory and finance integrity: unchanged.
- Serialized lineage continuity: unchanged.
- Honest UI states: preserved through the same loading state, submit error, and
  pending-close guard.
- Operator-safe error handling: preserved through
  `formatProjectTaskMutationError(error, 'create')`, now owned by the hook.
- Mutation/cache contract: unchanged; `useCreateTask` continues to own the
  mutation/cache behavior.
- Reviewability: mutation orchestration now has a focused boundary contract.

## Smells Removed

- `TaskCreateDialog` no longer owns `useCreateTask` inline.
- `TaskCreateDialog` no longer owns `useTanStackForm` inline.
- `TaskCreateDialog` no longer owns create mutation payload construction inline.
- `TaskCreateDialog` no longer owns create validation toasts, create success
  navigation, create-more reset, submit-error state, or pending-close handler
  inline.
- `task-create-dialog.tsx` is now 253 lines, down from 309 before this slice and
  398 before the create-dialog cleanup sequence.

## Deferred

- `TaskCreateDialog` still owns data reads for templates, site visits,
  workstreams, and users because those option sets feed rendering and nested
  dialog choices.
- `TaskCreateDialog` still owns selected site visit state and nested dialog open
  state. That remains acceptable for this slice because those states coordinate
  visible dialog composition.
- Edit dialog form orchestration still follows the older inline pattern. It is a
  future slice if edit-dialog complexity becomes the next highest Jobs smell.
- Browser QA is deferred because this was a preserved-behavior hook extraction
  with unchanged controls, labels, mutation inputs, success/error copy, and route
  target.

## Gates

- Targeted ESLint:
  `./node_modules/.bin/eslint src/components/domain/jobs/projects/task-create-dialog.tsx src/components/domain/jobs/projects/project-task-create-dialog-form.ts tests/unit/jobs/project-task-create-dialog-form-boundary-contract.test.ts tests/unit/jobs/project-task-create-dialog-boundary-contract.test.ts tests/unit/jobs/project-task-create-template-field-boundary-contract.test.ts tests/unit/jobs/project-task-dialog-form-state-boundary-contract.test.ts tests/unit/jobs/project-tasks-mutation-contract.test.ts --report-unused-disable-directives`
  - Passed.
- Focused tests:
  `./node_modules/.bin/vitest run tests/unit/jobs/project-task-create-dialog-form-boundary-contract.test.ts tests/unit/jobs/project-task-create-dialog-boundary-contract.test.ts tests/unit/jobs/project-task-create-template-field-boundary-contract.test.ts tests/unit/jobs/project-task-dialog-form-state-boundary-contract.test.ts tests/unit/jobs/project-tasks-mutation-contract.test.ts`
  - Passed: 5 files, 6 tests.
- Typecheck:
  `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
  - Passed.
- Pending dialog guard:
  `node scripts/check-pending-dialog-guards.mjs`
  - Passed.
- Widened Jobs tests:
  `./node_modules/.bin/vitest run tests/unit/jobs`
  - First run exposed a stale template-field boundary assertion that still
    expected template application in the renderer. The contract was corrected to
    point that behavior at the new form hook.
  - Final run passed: 91 files, 283 tests.
- Diff hygiene:
  `git diff --check`
  - Passed before closeout documentation; final staged diff check rerun before
    commit.
- Full unit/build/browser QA:
  - Skipped. This slice did not change app route loading, server functions,
    schemas, database, shared cache contracts, production build behavior, or
    rendered layout intent.

## Goal Adaptation

No goal adaptation made. This continues the active repo-maintainer goal by
moving Jobs task creation toward clearer route/container -> local hook ->
mutation/server ownership.

## Residual Risk

Low behavior risk because the same mutation payload, validation copy, success
toast, route action, create-more reset, pending-close guard, and error formatter
are preserved. Medium maintainability risk remains in `TaskCreateDialog` because
read ownership and visible nested-dialog composition still live in the renderer,
but the mutation/form lifecycle is now separated.
