# Operations Maintainer Sprint 66: Project Tasks Job Scope

## Status

Closed in commit-ready state.

## Issue 1: Project Task Mutations Used Weak Job Scope And Unsafe Feedback

### Problem

The project tasks tab displayed project-level tasks correctly, but task delete and reorder paths used `siteVisitId` as the job id even though the task response already carries the real job assignment id. That made cache invalidation and reorder/delete contracts fragile. Task create/update/status/delete/reorder failures also used raw or generic operator feedback, and the server delete mutation accepted only task identity even though the hook already had the job id.

### Workflow Spine

Jobs project tasks workflow
-> `ProjectTasksTab`, `TaskCreateDialog`, `TaskEditDialog`
-> `useProjectTasks`, `useCreateTask`, `useUpdateTask`, `useUpdateProjectTaskStatus`, `useDeleteProjectTask`, `useReorderTasks`
-> `createTask`, `updateTask`, `deleteTask`, `reorderTasks`, `getProjectTasks`
-> `createTaskSchema`, `updateTaskSchema`, `deleteTaskSchema`, `reorderTasksSchema`, `jobTasks`
-> `queryKeys.projectTasks.byProject`, `queryKeys.jobTasks.list`, and task detail/my-tasks keys
-> tenant- and job-scoped task writes with safe mutation feedback.

### Touched Domains

- Jobs project tasks UI and dialogs.
- Jobs task TanStack Query hooks.
- Job task server functions and schemas.
- Jobs mutation error formatting.
- Focused jobs contract tests.
- Operations maintainer closeout docs.

### Business Value Protected

Project tasks coordinate RENOZ Energy installation, commissioning, support, and service work. Operators now reorder and delete against the real job assignment backing the task, get safer failure feedback, and avoid stale-success behavior when task ids do not belong to the expected job.

### Scope Constraints

- Do not change the project tasks read contract, degraded-state behavior, or query key shape.
- Do not rewrite task board grouping, filtering, undo-delete timing, or task dialog layout.
- Keep the slice limited to project task mutation feedback, job-scope propagation, delete/reorder server predicates, and related cache contracts.
- Preserve non-project task and kanban callers by making update `jobId` optional while still passing it where project workflows have it.

### Changes

- Added `formatProjectTaskMutationError` with action-specific create/update/delete/reorder/status fallbacks and safe server-code messages.
- Exported the project task mutation formatter through the jobs hook barrel.
- Replaced raw task create/update dialog feedback with safe formatter output.
- Replaced generic project task quick-add/status/delete/reorder feedback with safe formatter output.
- Fixed project task delete to use `task.jobId` instead of `task.siteVisitId`.
- Fixed project task reorder to use `firstTask.jobId` instead of `firstTask.siteVisitId`.
- Added optional `jobId` to task update input and passed it through project task status/edit updates.
- Added required `jobId` to task delete input and passed it through `useDeleteTask`.
- Added job-scope predicates to task update when `jobId` is provided.
- Added job-scope predicates to task delete select and final delete.
- Made task reorder fail on stale/cross-job task ids instead of silently succeeding.
- Added focused contract coverage for safe mutation feedback, job id propagation, hook cache contracts, schema input scope, server predicates, and reorder stale-id handling.

### Standards Checked

- Domain ownership: project task mutation concerns remain inside jobs task UI, hooks, schemas, and server functions.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: checked and strengthened for project task create/update/status/delete/reorder.
- Tenant isolation/data integrity: strengthened. Delete and scoped updates now carry job predicates in addition to tenant scope where project workflows know the job.
- Safe mutation/cache contracts: strengthened. Project task operations retain project task, alerts, job task list, detail, and my-tasks invalidation patterns while correcting the job id used by delete/reorder.
- Honest UI states: read-state behavior preserved; mutation failure feedback is safer.
- Transactional inventory and finance integrity: not touched.
- Reviewability: the diff is limited to task mutation contracts, one formatter extension, one focused test, and this closeout note.

### Smells Removed

- Project task delete using `siteVisitId` as a job id.
- Project task reorder using `siteVisitId` as a job id.
- Raw create/update task dialog error feedback.
- Generic quick-add/status/delete/reorder task failure feedback.
- Delete task server input without job scope.
- Delete final predicate by task id and tenant only.
- Reorder silently succeeding when a provided task id did not belong to the requested job.

### Deferred

- Project task creation still has broader product-rule questions around site visit, project, workstream, and placeholder-job semantics.
- Task deletion still uses the existing undo timeout behavior; this sprint did not change that UX.
- Broader task board drag-and-drop and edit-dialog polish remains a separate workflow slice.

### Gates

- Passed: `bun test tests/unit/jobs/project-tasks-mutation-contract.test.ts` - 1 file, 2 tests.
- Passed: `./node_modules/.bin/vitest run tests/unit/jobs/project-tasks-mutation-contract.test.ts tests/unit/jobs/query-normalization-wave6d.test.tsx` - 2 files, 5 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: full unit suite and build because this slice is a focused project task mutation contract change covered by targeted tests plus type/lint gates.
- Skipped: browser QA because no layout or successful board interaction changed; the incorrect id propagation and feedback contracts are covered by focused tests.

### Goal Adaptation

Declined. The standing maintainer goal already covers domain ownership, safe mutation/cache contracts, tenant isolation, data integrity, operator-safe errors, meaningful tests, and reviewable diffs.

### Residual Risk

Medium. The task mutation contract is safer, but project task creation and workstream assignment semantics remain complex enough to deserve a separate product-rule sprint rather than incidental cleanup here.
