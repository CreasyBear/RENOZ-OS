# Operations Maintainer Sprint 81: Project Delete Write Scope

## Status

Closed in commit-ready state.

## Issue 1: Project Delete Soft-Write Relied On A Tenant-Scoped Pre-Read

### Problem

`deleteProject` verified that the project belonged to the current organization and was not already deleted, but the soft-delete update itself only filtered by project ID. That left the write predicate weaker than the read predicate in an operator-sensitive destructive workflow.

### Workflow Spine

Project list or project detail
-> delete confirmation
-> `useDeleteProject`
-> `deleteProject`
-> `projects.status/deletedAt`
-> project detail/list cache cleanup and invalidation
-> formatted operator feedback.

### Touched Domains

- Jobs project delete server function.
- Project action mutation/source contract test.
- Operations maintainer closeout docs.

### Business Value Protected

Deleting a project is a destructive operational action. The write now explicitly preserves tenant scope and excludes already-deleted records at the database update boundary, not only during the pre-read.

### Scope Constraints

- Do not change delete confirmation UI, success/failure formatting, hook invalidation, soft-delete semantics, or activity logging payloads.
- Do not change project create/edit/completion behavior.
- Do not convert soft delete to hard delete.

### Changes

- Changed the `deleteProject` soft-delete update predicate to require:
  - `projects.id = data.projectId`
  - `projects.organizationId = ctx.organizationId`
  - `projects.deletedAt IS NULL`
- Added a post-update not-found guard before delete activity logging.
- Extended the project action mutation contract test to guard the scoped delete write.

### Standards Checked

- Domain ownership: unchanged; project delete remains server-owned under the projects function.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: active delete path, hook invalidation, server predicate, and database columns were checked.
- Tenant isolation/data integrity: improved. The destructive write now carries tenant and not-deleted predicates.
- Safe mutation/cache contracts: preserved. `useDeleteProject` cache removal/list invalidation behavior was not changed.
- Honest UI states/operator-safe errors: preserved from Sprint 78.
- Reviewability: the diff is bounded to one server predicate, one guard, one contract test assertion, and this closeout.

### Smells Removed

- Soft-delete update scoped only by project ID after a tenant-scoped pre-read.
- Missing post-update guard before activity logging.

### Deferred

- Other project server functions with pre-read/write separation remain future slices only if tied to an active workflow.
- Browser QA was not run because this is a server predicate hardening with no UI change.

### Verification

- Passed: `./node_modules/.bin/vitest run tests/unit/jobs/project-actions-mutation-contract.test.ts` - 1 file, 2 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The standing maintainer goal already covers tenant isolation, safe mutation contracts, meaningful tests, and sprint closeout.

### Residual Risk

Low. The delete write now matches the pre-read scope. The remaining project-domain risk is broader server consistency, which should continue to be addressed through workflow-specific slices.
