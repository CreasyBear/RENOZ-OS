# Jobs Maintainer Sprint 10

## Status

Closed in commit-ready state.

## Issue 1: Project Tasks Warning Surfaced Raw Read Errors

### Problem

The project tasks hook normalizes read failures with the shared read-path policy, and the task tab already distinguishes blocking unavailable tasks from cached tasks. The task tab still rendered arbitrary `error.message` values in all three warning states, which could leak database, tenant, or runtime details inside project execution.

### Workflow Spine

Project detail route
-> project tasks tab
-> `useProjectTasks`
-> `getProjectTasks` server function
-> job tasks schema/database
-> `queryKeys.projectTasks.byProject(projectId)`
-> tasks unavailable or cached-tasks warning.

### Touched Domains

- Jobs/project tasks read feedback.
- Shared projects read-feedback helper.
- Project tasks read-feedback contract tests.
- Jobs maintainer closeout docs.

### Business Value Protected

Project tasks coordinate the actual work needed to deliver an installation or service project. If task reads fail, operators should keep cached tasks visible where available and see safe recovery copy instead of raw persistence or runtime details.

### Scope Constraints

- Do not change task server functions, schemas, tenant checks, query keys, cache invalidation, task board behavior, filtering, sorting, drag/drop, mutation feedback, or dialogs.
- Preserve the blocking unavailable and cached-tasks behavior from existing query-normalization tests.
- Do not run serialized gates; this sprint does not touch serialized inventory or lineage workflows.

### Changes

- Extended `project-read-error-messages.ts` with `getProjectTasksReadErrorMessage`.
- Routed the project task blocking and cached warning messages through the read-feedback helper.
- Preserved normalized read-query messages while suppressing arbitrary thrown errors.
- Added a focused project tasks read-feedback contract test.

### Standards Checked

- Domain ownership: project task read feedback remains in `src/components/domain/jobs/projects`.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved; `useProjectTasks` still normalizes reads and uses centralized project task query keys.
- Tenant isolation/data integrity: unchanged; no server function, tenant predicate, schema, or database behavior changed.
- Query/cache contract: unchanged; project task query key and invalidation behavior remain untouched.
- Honest UI states/operator-safe errors: improved; unavailable and cached warning states keep their behavior with safe copy.
- Reviewability: bounded diff across one helper, one tab, one focused test, and this closeout.

### Smells Removed

- Raw `error.message` rendering in project task read warnings.
- Three duplicated task warning call sites without a domain-owned read-feedback helper.
- Missing read-feedback contract coverage for project task warnings.

### Deferred

- Other Jobs read-feedback surfaces still need separate slices: schedule and time cards.
- Browser QA remains deferred because this slice changes read-failure copy routing only.
- Full `bun run test:unit` and `bun run build` remain deferred to broader release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/jobs/project-tasks-read-feedback-contract.test.ts tests/unit/jobs/query-normalization-wave6d.test.tsx` (2 files, 5 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for removed raw project tasks `error.message` rendering.
- Passed: `git diff --check`.

### Goal Adaptation

Accepted in execution. Serialized gates remain retired as routine evidence and were not run for this unrelated Jobs read-feedback slice. The standing maintainer goal remains otherwise unchanged.

### Residual Risk

Low for project tasks read feedback. Moderate for the broader Jobs area because schedule and time-card read-warning surfaces still need separate cleanup.
