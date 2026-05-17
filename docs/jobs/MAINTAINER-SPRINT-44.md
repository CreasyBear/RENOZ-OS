# Jobs Maintainer Sprint 44: Task Workstream Sortable Card Boundary

## Status

Closed in commit-ready state.

## Problem

After the Tasks tab controller extraction, `project-task-workstream-group.tsx`
was the next largest Jobs task surface. It mixed workstream-level ownership with
individual task-card rendering: drag context, reorder handling, header stats,
sortable card setup, due-date formatting, assignee avatar fallback, priority and
status badges, site-visit links, checkbox toggles, edit/delete menu actions, and
card layout.

That made a local workstream board harder to inspect before future task behavior
work. The group should own the workstream lane and reorder context. The sortable
task card should own the per-task presentation.

## Workflow Spine

Project detail -> Tasks tab -> grouped workstream list -> workstream header
stats -> drag/reorder context -> sortable task card -> toggle/edit/delete task
actions -> optional site-visit link.

## Touched Domains

- Jobs/projects task workstream group.
- Jobs/projects sortable task card presenter.
- Jobs task workstream boundary contract.
- Jobs maintainer closeout docs.

## Business Value Protected

Workstream task boards support day-to-day project execution: what is active,
blocked, overdue, assigned, tied to a site visit, ready to complete, or ready to
edit/delete. Keeping lane orchestration separate from task-card rendering makes
that workflow easier to change without risking reorder behavior or task action
wiring.

## Scope Constraints

- No task read, toggle, edit, delete, or reorder mutation behavior changed.
- No DnD sensor, activation distance, collision detection, reorder array
  behavior, or reorder callback payload intentionally changed.
- No task title, description, status, priority, due-date, estimated-hours,
  assignee, site-visit, action-menu, checkbox, progress, empty-group, or header
  rendering behavior intentionally changed.
- No query key, cache policy, server function, schema, database, tenant,
  inventory, finance, stock movement, or serialized lineage behavior changed.

## Changes

- Added `project-task-sortable-card.tsx`.
- Moved sortable task-card setup, card styling, due-date formatting, assignee
  initials, priority/status config usage, task metadata rendering, site-visit
  link rendering, checkbox toggle surface, and edit/delete menu rendering into
  `ProjectTaskSortableCard`.
- Kept `ProjectTaskWorkstreamGroup` responsible for workstream stats, header
  rendering, DnD context, sortable context, drag-end reorder calculation, and
  task card composition.
- Updated the boundary contract so the Tasks tab stays out of DnD/card details,
  the workstream group owns lane orchestration, and the card presenter owns
  per-task rendering.

## Standards Checked

- Domain ownership: Jobs/project task workstream and card presenters stay beside
  the Tasks tab in the Jobs projects domain.
- Route -> container/page -> hook -> server function -> schema/database -> query
  key/cache policy: improved at the local presenter layer. The route, tab
  controller, hooks, server functions, schemas, database, query keys, and cache
  policy are unchanged.
- Tenant isolation/data integrity: unchanged because no server or data-access
  path changed.
- Inventory and finance integrity: unchanged.
- Serialized lineage continuity: unchanged.
- Honest UI states: preserved because empty group behavior, task metadata, and
  visible task action states are unchanged.
- Operator-safe error handling: unchanged because mutation hooks and parent
  handlers still own task action outcomes.
- Mutation/cache contract: unchanged; task toggle, edit, delete, and reorder
  handlers are passed through exactly as before.
- Reviewability: the group can now be reviewed as lane orchestration, while the
  card can be reviewed as per-task presentation.

## Smells Removed

- `ProjectTaskWorkstreamGroup` no longer owns per-task due-date formatting.
- `ProjectTaskWorkstreamGroup` no longer owns assignee fallback formatting.
- `ProjectTaskWorkstreamGroup` no longer imports task priority/status configs.
- `ProjectTaskWorkstreamGroup` no longer owns sortable card content JSX.
- `ProjectTaskWorkstreamGroup` no longer owns task action menu JSX.
- `project-task-workstream-group.tsx` is now 151 lines, down from 408 before
  this slice.

## Deferred

- `ProjectTaskSortableCard` is 275 lines and may eventually split card metadata,
  action menu, or due-date formatting if future task-card behavior grows.
- `task-list.tsx` still has similar `formatDueDate` and `getInitials` helpers.
  Consolidation is deferred because this slice only moved the workstream card
  boundary without changing shared task-list behavior.
- Browser QA is deferred because this was a preserved-behavior presenter
  extraction with unchanged controls, labels, handlers, routes, and rendered
  state intent.

## Gates

- Targeted ESLint:
  `./node_modules/.bin/eslint src/components/domain/jobs/projects/project-task-workstream-group.tsx src/components/domain/jobs/projects/project-task-sortable-card.tsx tests/unit/jobs/project-task-workstream-group-boundary-contract.test.ts --report-unused-disable-directives`
  - Passed.
- Focused boundary test:
  `./node_modules/.bin/vitest run tests/unit/jobs/project-task-workstream-group-boundary-contract.test.ts`
  - Passed: 1 file, 1 test.
- Typecheck:
  `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
  - Passed.
- Widened Jobs tests:
  `./node_modules/.bin/vitest run tests/unit/jobs`
  - Passed: 92 files, 284 tests.
- Diff hygiene:
  `git diff --check`
  - Passed before commit.
- Full unit/build/browser QA:
  - Skipped. This slice did not change app route loading, server functions,
    schemas, database, shared cache contracts, production build behavior, or
    rendered layout intent.

## Goal Adaptation

No goal adaptation made. This continues the active repo-maintainer goal by
closing an exposed Jobs task boundary after Sprint 43 identified the workstream
group as the next maintainability risk.

## Residual Risk

Low behavior risk because task data, callbacks, reorder payloads, DnD context,
copy, classes, links, and action surfaces are preserved. Medium maintainability
risk remains in broader Jobs project surfaces such as schedule, files, project
detail, and note/dialog modules, which still carry large mixed UI concerns.
