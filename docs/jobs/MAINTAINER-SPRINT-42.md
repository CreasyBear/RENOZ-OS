# Jobs Maintainer Sprint 42: Task Edit Form Hook Boundary

## Status

Closed in commit-ready state.

## Problem

`TaskEditDialog` still owned update form orchestration inline: `useUpdateTask`,
`useTanStackForm`, validation toasts, task reset-on-open, operator-safe update
error formatting, success toast, submit error state, and pending-close behavior.

That left the edit renderer with the same mixed ownership smell recently removed
from create: field rendering and user-invite composition were mixed with mutation
payload construction and form lifecycle decisions.

## Workflow Spine

Project detail -> Tasks tab -> Edit Task dialog -> reset form from selected task
-> submit update form -> job-scoped update mutation -> success toast -> close
dialog -> parent success callback.

## Touched Domains

- Jobs/projects task edit dialog.
- Jobs/projects task edit form and mutation orchestration.
- Jobs task mutation/form-state boundary contracts.
- Jobs maintainer closeout docs.

## Business Value Protected

Task edits keep project execution current after work changes, ownership shifts,
or priorities move. The update mutation needs to remain job-scoped and
operator-safe while the renderer stays simple enough to inspect before future
behavior work.

## Scope Constraints

- No task update mutation input changed.
- No reset-on-open behavior, success toast copy, submit-error copy,
  pending-close behavior, validation toast copy, or parent success callback
  behavior intentionally changed.
- No user lookup, query key, cache policy, server function, schema, or database
  behavior changed.
- No field order, labels, placeholders, layout classes, user-invite behavior, or
  dialog copy intentionally changed.
- No tenant, inventory, finance, stock movement, or serialized lineage behavior
  changed.

## Changes

- Added `project-task-edit-dialog-form.ts`.
- Moved edit form construction, reset-on-open, update mutation execution,
  validation toasts, submit error state, success toast, and pending close guard
  into `useProjectTaskEditDialogForm`.
- Kept `TaskEditDialog` responsible for task presence handling, user lookup,
  user invite state, and visible field composition.
- Updated mutation, form-state, and edit-dialog boundary contracts to point edit
  mutation ownership at the new hook.
- Added a focused boundary contract for the edit form hook.

## Standards Checked

- Domain ownership: Jobs/project task edit mutation orchestration stays in the
  Jobs task edit dialog module group.
- Route -> container/page -> hook -> server function -> schema/database -> query
  key/cache policy: preserved. The edit dialog still calls the same
  `useUpdateTask` mutation through the new local hook; server, schema, database,
  and query-key/cache behavior are unchanged.
- Tenant isolation/data integrity: unchanged because no server or data-access
  path changed.
- Inventory and finance integrity: unchanged.
- Serialized lineage continuity: unchanged.
- Honest UI states: preserved through the same loading/pending state,
  reset-on-open behavior, submit error, and pending-close guard.
- Operator-safe error handling: preserved through
  `formatProjectTaskMutationError(error, 'update')`, now owned by the hook.
- Mutation/cache contract: unchanged; `useUpdateTask` continues to own the
  mutation/cache behavior.
- Reviewability: update mutation orchestration now has a focused boundary
  contract matching the create dialog pattern.

## Smells Removed

- `TaskEditDialog` no longer owns `useUpdateTask` inline.
- `TaskEditDialog` no longer owns `useTanStackForm` inline.
- `TaskEditDialog` no longer owns update mutation payload construction inline.
- `TaskEditDialog` no longer owns reset-on-open, update validation toasts,
  success toast, submit-error state, or pending-close handler inline.
- `task-edit-dialog.tsx` is now 140 lines, down from 188 before this slice.

## Deferred

- `TaskEditDialog` still owns user lookup and user invite state because that
  state coordinates visible field composition.
- Shared create/edit form hook abstraction is deferred. The create and edit
  submit paths differ enough that separate focused hooks are clearer right now.
- Browser QA is deferred because this was a preserved-behavior hook extraction
  with unchanged controls, labels, mutation inputs, success/error copy, and
  dialog behavior.

## Gates

- Targeted ESLint:
  `./node_modules/.bin/eslint src/components/domain/jobs/projects/task-edit-dialog.tsx src/components/domain/jobs/projects/project-task-edit-dialog-form.ts tests/unit/jobs/project-task-edit-dialog-form-boundary-contract.test.ts tests/unit/jobs/project-task-edit-dialog-boundary-contract.test.ts tests/unit/jobs/project-task-dialog-form-state-boundary-contract.test.ts tests/unit/jobs/project-tasks-mutation-contract.test.ts --report-unused-disable-directives`
  - Passed.
- Focused tests:
  `./node_modules/.bin/vitest run tests/unit/jobs/project-task-edit-dialog-form-boundary-contract.test.ts tests/unit/jobs/project-task-edit-dialog-boundary-contract.test.ts tests/unit/jobs/project-task-dialog-form-state-boundary-contract.test.ts tests/unit/jobs/project-tasks-mutation-contract.test.ts`
  - Passed: 4 files, 5 tests.
- Typecheck:
  `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
  - Passed.
- Pending dialog guard:
  `node scripts/check-pending-dialog-guards.mjs`
  - Passed.
- Widened Jobs tests:
  `./node_modules/.bin/vitest run tests/unit/jobs`
  - Passed: 92 files, 284 tests.
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
keeping Jobs task editing aligned with the clearer dialog renderer -> local hook
-> mutation/server ownership pattern.

## Residual Risk

Low behavior risk because the same update payload, reset-on-open behavior,
validation copy, success toast, pending-close guard, and error formatter are
preserved. Low-medium maintainability risk remains from duplicated create/edit
hook structure, but that duplication is currently more readable than a shared
abstraction with conditional submit semantics.
