# Jobs Maintainer Sprint 13

## Status

Closed in commit-ready state.

## Issue 1: My Tasks Kanban Warning Surfaced Raw Read Errors

### Problem

The My Tasks Kanban reads cross-project assigned tasks through `useMyTasksKanban`, which normalizes read failures with the shared read-path policy. The presenter still rendered arbitrary `error.message` values in its unavailable and cached-task warnings, which could leak database, tenant, assignee, or runtime details inside the operator's personal task board.

### Workflow Spine

My Tasks route
-> My Tasks Kanban presenter
-> `useMyTasksKanban`
-> `getMyTasksForKanban` server function
-> job tasks schema/database
-> `queryKeys.jobTasks.myTasks.list(filters)`
-> tasks unavailable or cached-tasks warning.

### Touched Domains

- Jobs/My Tasks read feedback.
- My Tasks read-feedback helper.
- My Tasks read-feedback contract tests.
- Jobs maintainer closeout docs.

### Business Value Protected

My Tasks is the operator's cross-project execution queue. If the assigned-task read fails, operators should keep cached tasks visible where available and see safe recovery copy instead of raw persistence, tenant, assignee, or runtime details.

### Scope Constraints

- Do not change task movement, task update mutations, route state, board columns, card rendering, server functions, schemas, tenant checks, query keys, cache invalidation, polling, or retry behavior.
- Preserve the blocking unavailable and cached-task behavior.
- Do not run serialized gates; this sprint does not touch serialized inventory or lineage workflows.

### Changes

- Added `my-tasks-read-error-messages.ts` with `getMyTasksReadErrorMessage`.
- Routed all My Tasks unavailable/cached warning messages through the read-feedback helper.
- Preserved normalized read-query messages while suppressing arbitrary thrown errors.
- Added a focused My Tasks read-feedback contract test.

### Standards Checked

- Domain ownership: My Tasks read feedback remains in `src/components/domain/jobs/my-tasks`.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved; `useMyTasksKanban` still normalizes reads and uses centralized My Tasks query keys.
- Tenant isolation/data integrity: unchanged; no server function, tenant predicate, assignee scope, schema, or database behavior changed.
- Query/cache contract: unchanged; My Tasks query key, polling, and mutation behavior remain untouched.
- Honest UI states/operator-safe errors: improved; unavailable and cached warning states keep their behavior with safe copy.
- Reviewability: bounded diff across one helper, one presenter, one focused test, and this closeout.

### Smells Removed

- Raw `error.message` rendering in My Tasks read warnings.
- Three duplicated My Tasks warning call sites without a domain-owned read-feedback helper.
- Missing read-feedback contract coverage for My Tasks warnings.

### Deferred

- Installer availability and site-visit installer-option read warnings remain separate Jobs slices.
- Browser QA remains deferred because this slice changes read-failure copy routing only.
- Full `bun run test:unit` and `bun run build` remain deferred to broader release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/jobs/my-tasks-read-feedback-contract.test.ts tests/unit/jobs/query-normalization-wave6d.test.tsx` (2 files, 5 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for removed raw My Tasks `error.message` rendering.
- Passed: `git diff --check`.

### Goal Adaptation

Accepted in execution. Serialized gates remain retired as routine evidence and were not run for this unrelated Jobs read-feedback slice. The standing maintainer goal remains otherwise unchanged.

### Residual Risk

Low for My Tasks read feedback. Moderate for broader Jobs task UX because this did not dogfood drag/drop movement or task detail navigation.
