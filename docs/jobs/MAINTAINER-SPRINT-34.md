# Jobs Maintainer Sprint 34: Job Template Assignment Cache Scope

## Status

Closed in commit-ready state.

## Issue 1: Create From Template Refreshed the Whole Job Calendar Cache

### Problem

`useCreateJobFromTemplate` creates a job assignment from a template, with optional task, material, checklist, and SLA state. Its cache refresh covered job and assignment lists, but then invalidated the entire Job Calendar cache family. That mixed assignment scheduling refresh with unrelated calendar OAuth/config state and left the template-created task/material families implicit.

### Workflow Spine

Job template settings/UI
-> `useCreateJobFromTemplate`
-> `createJobFromTemplate`
-> `job_assignments`, `job_tasks`, `job_materials`, checklist/SLA rows
-> Jobs / Job Assignments / Job Calendar / Job Tasks / Job Materials query-key families.

### Touched Domains

- Jobs template hooks.
- Jobs template cache contract tests.
- Jobs maintainer closeout docs.

### Business Value Protected

RENOZ operators use job templates to turn repeatable installation and service work into executable assignments. Creating from a template should make the new assignment visible in job lists, active project views, scheduling views, task boards, and material views without refreshing unrelated external-calendar account state.

### Scope Constraints

- Do not change template server behavior or transaction semantics.
- Do not change template response shape.
- Do not alter settings UI, job template forms, or calendar OAuth mutation flows.
- Keep checklist aggregate cache review deferred because this slice only follows currently exposed query-key families.

### Changes

- Added `invalidateJobFromTemplateViews` to make the create-from-template cache contract explicit.
- Replaced `queryKeys.jobCalendar.all` with focused job-calendar assignment view families.
- Added refreshes for active jobs/projects, assignment selectors, task list/kanban/personal-task families, and the new job's task/material detail families.
- Extended the existing job template settings contract to reject root calendar invalidation and require the narrower cache spine.

### Standards Checked

- Domain ownership: Jobs template hooks own create-from-template cache policy.
- Route/container/page -> hook -> server function -> schema/database -> query key/cache policy: hook cache policy now matches the server-created assignment/task/material workflow.
- Tenant isolation/data integrity: no auth, tenant, transaction, or database write logic changed.
- Transactional inventory/finance integrity: no stock or finance mutations changed; template material rows are only cache-refreshed.
- UI states/error handling: existing read/mutation error contracts remain unchanged.
- Reviewability: one hook helper, one source contract update, one closeout note.

### Smells Removed

- Root Job Calendar invalidation from create-from-template.
- Implicit task/material cache impact after template-created assignment rows.
- Cache policy hidden as three inline invalidations in the mutation callback.

### Deferred

- Checklist cache coverage for template-applied checklists needs a separate read-path/query-key review.
- Calendar OAuth mutation root invalidations remain deferred to a calendar-specific sprint.
- `use-jobs-view-sync` broad polling invalidations remain deferred to a cross-view synchronization-policy sprint.

### Gates

- Passed: focused job template settings contract.
- Passed: focused ESLint on touched Jobs template hook and contract.
- Passed: full typecheck.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. This sprint continues the local cache-contract cleanup under the standing maintainer goal.

### Residual Risk

Low to medium. The template-created job now refreshes relevant exposed job/task/material families, but checklist cache behavior still needs a dedicated audit because the current hook file has separate checklist query-key families.
