# Jobs Maintainer Sprint 45: Task Display Utility Boundary

## Status

Closed in commit-ready state.

## Problem

After the sortable card extraction, task due-date and assignee-initials
formatting existed in two Jobs project task surfaces:
`project-task-sortable-card.tsx` and `task-list.tsx`.

The duplicated helpers were already semantically inconsistent. The workstream
card used distance-based overdue copy, while the site-visit task list used
calendar-day overdue copy. Neither helper made invalid dates explicit before
formatting. That is small code debt, but it leaks into operator trust because
task urgency and ownership labels need to read consistently wherever tasks
appear.

## Workflow Spine

Project detail -> Tasks tab or site-visit task list -> task card/list metadata
-> due-date urgency copy -> assignee avatar fallback -> operator decides what
needs action.

## Touched Domains

- Jobs/projects task display formatting.
- Jobs/projects sortable task card presenter.
- Jobs/projects site-visit task list presenter.
- Jobs task boundary and display utility tests.
- Jobs maintainer closeout docs.

## Business Value Protected

Task due dates and assignment labels are operational cues. Consistent due-date
copy helps operators triage overdue and soon-due work without reconciling two
versions of the same task state. Invalid date handling keeps a bad task date
from taking down a task surface.

## Scope Constraints

- No task read, toggle, edit, delete, reorder, or click behavior changed.
- No server function, schema, database, query key, cache policy, tenant,
  inventory, finance, stock movement, or serialized lineage behavior changed.
- No task status or priority config changed.
- No card/list layout classes, action menus, avatar components, links, or
  empty/loading states intentionally changed.
- User-facing due-date copy was intentionally standardized to calendar-day
  overdue copy across both task surfaces.

## Changes

- Added `project-task-display-utils.ts`.
- Moved task due-date formatting into `formatProjectTaskDueDate`.
- Moved task assignee initials formatting into `getProjectTaskInitials`.
- Added invalid-date handling that returns `Invalid due date` instead of
  allowing later formatting to throw.
- Updated `ProjectTaskSortableCard` and `TaskList` to use the shared utility.
- Updated the workstream boundary contract so task display formatting is
  centralized instead of reappearing in each presenter.
- Added focused utility tests for missing dates, invalid dates, today, tomorrow,
  soon, overdue, later dates, and initials fallback behavior.

## Standards Checked

- Domain ownership: task display helpers live beside the Jobs project task
  presenters that consume them.
- Route -> container/page -> hook -> server function -> schema/database -> query
  key/cache policy: unchanged. This is a local presenter utility extraction.
- Tenant isolation/data integrity: unchanged because no server or data-access
  path changed.
- Inventory and finance integrity: unchanged.
- Serialized lineage continuity: unchanged.
- Honest UI states: improved for invalid due-date values, which now render an
  explicit invalid date label rather than risking a formatter exception.
- Operator-safe error handling: improved at the display layer for malformed due
  dates.
- Mutation/cache contract: unchanged.
- Reviewability: overdue and initials semantics now have a focused unit test
  instead of being embedded in JSX presenters.

## Smells Removed

- Removed duplicate `formatDueDate` helpers from task card and task list
  presenters.
- Removed duplicate `getInitials` helpers from task card and task list
  presenters.
- Removed direct `date-fns` imports from both task presenters.
- Standardized overdue copy across the two task surfaces.
- `project-task-sortable-card.tsx` is now 258 lines, down from 275.
- `task-list.tsx` is now 269 lines, down from 294.

## Deferred

- `sidebar/team-card.tsx` still has a local team-member initials helper. That is
  not a task-display surface, so it remains outside this slice.
- Task card metadata and action menu extraction remain deferred until the next
  behavior or readability pressure justifies another split.
- Browser QA is deferred because this slice changes display utility ownership
  and minor due-date copy semantics, not routing, data loading, mutation flows,
  layout structure, or server behavior.

## Gates

- Targeted ESLint:
  `./node_modules/.bin/eslint src/components/domain/jobs/projects/project-task-display-utils.ts src/components/domain/jobs/projects/project-task-sortable-card.tsx src/components/domain/jobs/projects/task-list.tsx tests/unit/jobs/project-task-display-utils.test.ts tests/unit/jobs/project-task-workstream-group-boundary-contract.test.ts --report-unused-disable-directives`
  - Passed.
- Focused tests:
  `./node_modules/.bin/vitest run tests/unit/jobs/project-task-display-utils.test.ts tests/unit/jobs/project-task-workstream-group-boundary-contract.test.ts`
  - Passed: 2 files, 5 tests.
- Typecheck:
  `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
  - Passed.
- Widened Jobs tests:
  `./node_modules/.bin/vitest run tests/unit/jobs`
  - Passed: 93 files, 288 tests.
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
removing duplicated display semantics exposed by the Sprint 44 task-card
boundary.

## Residual Risk

Low behavior risk because task data, callbacks, links, action surfaces, loading
states, and layout classes are unchanged. Low-medium product risk remains that
operators may notice the workstream card overdue label is now calendar-day copy
instead of distance-based copy, but the standardized copy is clearer for
day-level task triage.
