# Jobs Maintainer Sprint 33: Job Assignment Cache Scope

## Status

Closed in commit-ready state.

## Issue 1: Core Job Assignment Mutations Refreshed Whole Jobs Families

### Problem

Core job assignment create, update, delete, and batch operations invalidated root Jobs, Job Assignments, Job Calendar, and Job Tasks cache families. A single assignment edit could therefore refresh unrelated calendar OAuth/config state, all task detail state, and every assignment query rather than only the views whose data can change.

### Workflow Spine

Jobs UI
-> core job assignment hooks
-> job assignment server functions
-> `job_assignments`
-> Jobs / Job Assignments / Job Calendar / Job Tasks query-key families
-> list, detail, kanban, timeline, active project, and task-context views.

### Touched Domains

- Jobs query-key factory.
- Jobs core assignment hooks.
- Jobs cache contract tests.
- Jobs maintainer closeout docs.

### Business Value Protected

RENOZ operators rely on job assignment state for scheduled installs, service work, warranty visits, and project execution. Mutations need to keep active projects, assignment lists, calendar ranges, timeline views, kanban selectors, and affected details honest without creating noisy refetches across unrelated job settings and OAuth state.

### Scope Constraints

- Do not change server mutation behavior or response schemas.
- Do not change Jobs UI layout, navigation, or copy.
- Do not alter calendar OAuth mutation refreshes.
- Keep real-time/polling sync cleanup deferred because it is a separate cross-view synchronization policy.

### Changes

- Added `jobs.activeProjectsAll`, job-calendar view-family prefixes, and `jobAssignments.kanbanSelectors` while preserving existing concrete query-key shapes.
- Added focused invalidation helpers for job assignment collection views, calendar assignment views, affected details, task context, and batch operation IDs.
- Replaced root invalidations in core create/update/delete/batch hooks with the focused helpers.
- Added a source-level cache contract to prevent the core job assignment hook from regressing to `jobs.all`, `jobCalendar.all`, `jobAssignments.all`, or `jobTasks.all`.

### Standards Checked

- Domain ownership: Jobs owns assignment mutation cache policy.
- Route/container/page -> hook -> server function -> schema/database -> query key/cache policy: this sprint tightens the hook -> query-key/cache policy layer with no route/server/schema changes.
- Tenant isolation/data integrity: no auth, tenant, or database write behavior changed.
- Transactional inventory/finance integrity: not touched.
- UI states/error handling: existing mutation success/error behavior remains unchanged.
- Reviewability: one query-key factory update, one hook cleanup, one focused contract, one closeout note.

### Smells Removed

- Root Jobs invalidation from core assignment mutations.
- Root Job Calendar invalidation from assignment mutations that do not own OAuth/config state.
- Root Job Assignments invalidation where list/selector/detail families are enough.
- Root Job Tasks invalidation from batch operations.

### Deferred

- `use-jobs-view-sync` still has broad cross-view polling invalidations and needs a dedicated synchronization-policy sprint.
- `use-job-scheduling` calendar OAuth mutations still use `jobCalendar.all`; that should be split separately because those flows do own external calendar state.
- Batch operations still refresh task list/kanban/personal task families broadly because batch result details are flexible and do not expose typed before/after task context.

### Gates

- Passed: focused Jobs assignment cache contract.
- Passed: focused Jobs assignment tenant/error/read contracts that cover nearby behavior.
- Passed: focused ESLint on touched Jobs files and tests.
- Passed: full typecheck.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. This sprint continues the standing local cache-contract cleanup under the repo-maintainer goal.

### Residual Risk

Medium. The hook is much narrower than root invalidation, but job assignment changes still refresh whole calendar view families because the mutation responses do not expose old/new date, installer, or range metadata.
