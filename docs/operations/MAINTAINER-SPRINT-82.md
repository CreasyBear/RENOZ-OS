# Operations Maintainer Sprint 82: Project Member Tenant Scope

## Status

Closed in commit-ready state.

## Issue 1: Project Member Mutations Trusted Project Scope But Not User Scope

### Problem

`addProjectMember` verified that the project belonged to the current organization, but it did not verify that the target user belonged to that same organization. Project member changes also allowed soft-deleted projects through the project pre-read, and `removeProjectMember` returned success even when no scoped membership row was removed.

### Workflow Spine

Project detail/team-management hook
-> `useAddProjectMember` / `useRemoveProjectMember`
-> `addProjectMember` / `removeProjectMember`
-> `projects`, `users`, `project_members`
-> `queryKeys.projects.members(projectId)` and `queryKeys.projects.detail(projectId)`
-> formatted operator-safe mutation feedback.

No active presenter currently invokes the member mutation hooks; this sprint hardens the exposed hook/server contract before the team-management UI is built or reconnected.

### Touched Domains

- Jobs project member server functions.
- Project mutation error formatter.
- Project member mutation contract tests.
- Operations maintainer closeout docs.

### Business Value Protected

Project membership controls who is attached to operational work. RENOZ should not accidentally assign users across tenants, mutate archived projects, or report a successful removal when the membership did not exist in the current organization.

### Scope Constraints

- Do not build new project team-management UI.
- Do not change project detail/sidebar display behavior.
- Do not change the `project_members` schema or role enum.
- Do not change broader project create/edit/delete/completion semantics.
- Do not reopen serialized gates for this non-serialized project membership slice.

### Changes

- Added a shared project-member mutation preflight that requires:
  - `projects.id = projectId`
  - `projects.organizationId = organizationId`
  - `projects.deletedAt IS NULL`
- Added target-user validation for member assignment:
  - `users.id = userId`
  - `users.organizationId = organizationId`
  - `users.deletedAt IS NULL`
- Changed project member upsert updates to preserve `organizationId` and refresh `updatedAt` when changing an existing role.
- Changed member removal to use a scoped delete with `.returning({ id })` and throw `NotFoundError` if no membership row was removed.
- Normalized the remaining plain `Error("Project not found")` in `completeProject` to `NotFoundError`.
- Added `addMember` and `removeMember` project mutation formatter actions with member-specific not-found copy for future UI call sites.

### Standards Checked

- Domain ownership: unchanged; project membership remains owned by the projects server function and jobs hooks.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: checked the exported member hooks, server functions, `project_members` schema, users/project tenant predicates, and cache invalidations.
- Tenant isolation/data integrity: improved. Assignment now proves both project and user belong to the current organization, and removal proves a scoped membership row was deleted.
- Safe mutation/cache contracts: preserved. Add/remove still invalidate project members and project detail caches.
- Honest UI states/operator-safe errors: improved. Member formatter actions now exist with accurate member not-found copy, and server not-found paths use typed `NotFoundError`.
- Reviewability: the diff is bounded to one server-function slice, one formatter extension, one focused contract test, and this closeout.

### Smells Removed

- Cross-tenant user assignment risk in `addProjectMember`.
- Member changes allowed against soft-deleted projects.
- `removeProjectMember` returning success without delete evidence.
- Remaining raw `Error("Project not found")` in the project server function.
- Missing project member action entries and member-specific not-found feedback in the project mutation formatter.

### Deferred

- Project team-management UI remains disconnected from these hooks.
- Broader project list/detail soft-delete visibility is a separate workflow slice.
- User eligibility policy beyond same-organization and not-deleted status is deferred until the UI defines whether installers, staff, or both should be assignable.

### Verification

- Passed: `./node_modules/.bin/vitest run tests/unit/jobs/project-members-mutation-contract.test.ts tests/unit/jobs/project-actions-mutation-contract.test.ts tests/unit/jobs/project-create-edit-mutation-contract.test.ts` - 3 files, 6 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Skipped: serialized gates. They are retired as routine closeout evidence and this slice did not touch serialized lineage, inventory identity, or warranty/RMA serial continuity.

### Goal Adaptation

Adapted execution, not objective. Serialized gates are no longer part of routine maintainer closeout evidence; the standing goal still requires tenant isolation, safe mutation/cache contracts, operator-safe errors, and meaningful tests.

### Residual Risk

Low for the exposed project member mutation contract. Medium for the broader project domain because soft-deleted project visibility and a real team-management UI still need their own workflow slices.
