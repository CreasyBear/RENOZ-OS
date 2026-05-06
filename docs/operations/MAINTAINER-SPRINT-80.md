# Operations Maintainer Sprint 80: Project Create/Edit Mutation Contract

## Status

Closed in commit-ready state.

## Issue 1: Project Create/Edit Used Raw Failure Feedback And Update Wrote By ID Alone

### Problem

Project create and edit dialogs still converted caught errors into raw operator-facing messages. The project update server function also verified organization ownership before writing, but the update predicate itself only used project ID.

### Workflow Spine

Project create/edit dialog
-> project form schema
-> `useCreateProject` / `useUpdateProject`
-> `createProject` / `updateProject`
-> `projects`
-> project detail/list/customer/alert cache invalidation
-> formatted operator feedback.

### Touched Domains

- Jobs project create dialog.
- Jobs project edit dialog.
- Jobs project mutation error formatter.
- Project update server function.
- Project create/edit mutation contract test.
- Operations maintainer closeout docs.

### Business Value Protected

Creating and editing projects is the entry point for work execution. Operators now get consistent, permission-aware, validation-aware, non-leaky errors, and project edits carry tenant scope on the actual database write.

### Scope Constraints

- Do not change project create/edit form fields, validation schemas, success flows, navigation, or cache invalidation.
- Do not change delete/completion/document generation behavior.
- Do not refactor the project create/edit UI structure or local form schema ownership in this slice.

### Changes

- Added `create` and `update` actions to `formatProjectMutationError`.
- Updated `ProjectCreateDialog` to format create failures through the project mutation formatter.
- Updated `ProjectEditDialog` to format update failures through the project mutation formatter.
- Changed `updateProject` not-found failure to `NotFoundError`.
- Changed the project update write predicate to require both `projects.id` and `projects.organizationId`.
- Added a post-update not-found guard before activity logging.
- Added a focused create/edit mutation contract test for formatter behavior, dialog wiring, and scoped update writes.

### Standards Checked

- Domain ownership: strengthened. Project create/edit failure formatting is now owned by the project mutation formatter.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: create/edit dialog, hooks, server update, schema/database write, and cache invalidation path were checked.
- Tenant isolation/data integrity: improved. The update write now carries the organization predicate, not only the pre-read.
- Safe mutation/cache contracts: preserved. `useCreateProject` and `useUpdateProject` invalidation behavior was not changed.
- Honest UI states/operator-safe errors: improved. Raw caught error strings no longer drive create/edit submit feedback.
- Reviewability: the diff is bounded to create/edit dialog error handling, one server write predicate, one formatter, one focused test, and this closeout.

### Smells Removed

- `err instanceof Error ? err.message : 'Failed to create project'`.
- `err instanceof Error ? err.message : 'Failed to update project'`.
- `updateProject` throwing plain `Error("Project not found")`.
- Project update write scoped only by project ID after a tenant-scoped pre-read.
- Missing post-update guard before activity logging.

### Deferred

- Project create/edit form schema extraction remains a future architecture slice.
- Project delete still has its own server write predicate and should be evaluated separately if the next project-action slice stays in this area.
- Browser QA was not run because this is formatter/server predicate wiring without intended layout changes.

### Verification

- Passed: `./node_modules/.bin/vitest run tests/unit/jobs/project-create-edit-mutation-contract.test.ts tests/unit/jobs/project-actions-mutation-contract.test.ts` - 2 files, 4 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The standing maintainer goal already covers tenant isolation, operator-safe errors, safe mutation contracts, meaningful tests, and sprint closeout.

### Residual Risk

Medium-low. Create/edit are now safer and update writes are tenant-scoped. Remaining project delete server write scoping is a visible adjacent risk, but it was left out to keep this slice focused.
