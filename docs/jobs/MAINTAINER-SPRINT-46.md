# Jobs Maintainer Sprint 46: Site Visit Task List Config Boundary

## Status

Closed in commit-ready state.

## Problem

After centralizing task display helpers, `task-list.tsx` still carried local
status and priority config while the project task board used
`project-task-config.ts`.

That created a product-language fork in the same Jobs task domain. Project task
surfaces said `To Do` and `Done`; the site-visit task list said `Pending` and
`Completed`. The icons and colors were also duplicated. Task status language
should be one domain contract, not copied presenter state.

## Workflow Spine

Project detail -> Site visit detail -> Tasks card -> `TaskList` -> task status
and priority metadata -> operator reads task state and decides what needs action.

## Touched Domains

- Jobs/projects site-visit task list presenter.
- Jobs/projects canonical task status and priority config.
- Jobs task list boundary and rendering tests.
- Jobs maintainer closeout docs.

## Business Value Protected

Site visits are field execution surfaces. Operators should not see different
words for the same task state depending on whether they enter from the project
task board or the site-visit detail page. Consistent status language makes task
state easier to scan and reduces avoidable ambiguity.

## Scope Constraints

- No task read, site-visit read, click, toggle, edit, delete, reorder, or
  mutation behavior changed.
- No route, server function, schema, database, query key, cache policy, tenant,
  inventory, finance, stock movement, or serialized lineage behavior changed.
- No loading state, empty state, due-date display helper, assignee display
  helper, estimated-hours display, avatar rendering, task sorting, or layout
  structure intentionally changed.
- User-facing task status labels in `TaskList` intentionally changed from the
  local copies to canonical project task labels: `Pending` -> `To Do` and
  `Completed` -> `Done`.

## Changes

- Removed local `STATUS_CONFIG` and `PRIORITY_CONFIG` from `task-list.tsx`.
- Reused `PROJECT_TASK_STATUS_CONFIG` and `PROJECT_TASK_PRIORITY_CONFIG` from
  `project-task-config.ts`.
- Reused `getTaskPriority` for null/unknown priority fallback.
- Changed the local `Task` type to reference `JobTaskStatus` and
  `JobTaskPriority` instead of duplicating literal unions.
- Added `project-task-list-boundary-contract.test.tsx` to protect canonical
  config ownership and render canonical status labels.

## Standards Checked

- Domain ownership: task status and priority language now lives in the canonical
  Jobs project task config.
- Route -> container/page -> hook -> server function -> schema/database -> query
  key/cache policy: unchanged. This is a presenter config ownership cleanup.
- Tenant isolation/data integrity: unchanged because no server or data-access
  path changed.
- Inventory and finance integrity: unchanged.
- Serialized lineage continuity: unchanged.
- Honest UI states: improved by using one task status vocabulary across task
  surfaces.
- Operator-safe error handling: unchanged.
- Mutation/cache contract: unchanged.
- Reviewability: status/priority semantics are now tested at the TaskList
  boundary instead of hidden in a local presenter config.

## Smells Removed

- Removed duplicate task status config from `task-list.tsx`.
- Removed duplicate task priority config from `task-list.tsx`.
- Removed duplicated literal status and priority unions from the local task type.
- Removed direct status/priority icon ownership from the site-visit task list.
- `task-list.tsx` is now 231 lines, down from 269 before this slice.

## Deferred

- `project-timeline-gantt.tsx` still has task status visual config specific to
  timeline bars. That surface has different timeline-specific fields and should
  be evaluated separately.
- Other project-level status configs remain outside this slice because they
  represent project status or BOM status, not task status.
- Browser QA is deferred because this slice changes local presenter config and
  status text only; no route, server, schema, query/cache, or layout structure
  changed.

## Gates

- Targeted ESLint:
  `./node_modules/.bin/eslint src/components/domain/jobs/projects/task-list.tsx tests/unit/jobs/project-task-list-boundary-contract.test.tsx --report-unused-disable-directives`
  - Passed.
- Focused tests:
  `./node_modules/.bin/vitest run tests/unit/jobs/project-task-list-boundary-contract.test.tsx tests/unit/jobs/project-task-workstream-group-boundary-contract.test.ts`
  - Passed: 2 files, 3 tests.
- Typecheck:
  `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
  - Passed.
- Widened Jobs tests:
  `./node_modules/.bin/vitest run tests/unit/jobs`
  - Passed: 94 files, 290 tests.
- Diff hygiene:
  `git diff --check`
  - Passed before closeout documentation; final staged diff check rerun before
    commit.
- Full unit/build/browser QA:
  - Skipped. This slice did not change app route loading, server functions,
    schemas, database, shared cache contracts, production build behavior, or
    layout structure.

## Goal Adaptation

No goal adaptation made. This continues the active repo-maintainer goal by
removing another local vocabulary/config fork exposed by the Jobs task
presentation cleanup.

## Residual Risk

Low behavior risk because data, handlers, sorting, layout, due dates, assignees,
and task metadata structure are unchanged. Low product risk remains from the
intentional visible label normalization on site-visit task lists; the render
test locks this to the canonical vocabulary.
