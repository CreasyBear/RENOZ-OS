# Jobs Maintainer Sprint 48: Timeline Gantt Task Bar Boundary

## Status

Closed in commit-ready state.

## Problem

After Sprint 47 moved timeline constants and date helpers out of
`project-timeline-gantt.tsx`, the presenter still owned the interactive task bar:
visibility clipping, bar position and width math, drag state, pointer listeners,
move and resize semantics, progress rendering, and status styling composition.

That made the Gantt presenter harder to review because project-level layout,
mobile rendering, desktop rows, scroll behavior, and bar interaction all lived
in one file. The bar is the consequence-bearing interaction surface; it deserves
a focused component and tests.

## Workflow Spine

Project detail -> Overview tab -> Expected Timeline -> task/visit row ->
timeline task bar -> click item or drag/resize by timeline cells -> parent
`onDateChange` receives updated dates.

## Touched Domains

- Jobs/projects timeline Gantt presenter.
- Jobs/projects timeline task bar interaction component.
- Jobs/projects timeline config and schema-aligned task type.
- Jobs timeline boundary and task bar tests.
- Jobs maintainer closeout docs.

## Business Value Protected

The timeline is where project execution dates become visible and adjustable.
Moving task-bar interaction into a focused component makes the drag/move/resize
contract easier to test and review before future scheduling or visit planning
work touches it.

## Scope Constraints

- No task/visit input shape, visible bar positioning, visibility clipping,
  progress rendering, status styling, click behavior, drag behavior, resize
  behavior, visit move-only behavior, row layout, mobile fallback, today
  scrolling, view-mode controls, zoom controls, route, server function, schema,
  database, query key, cache policy, tenant, inventory, finance, stock movement,
  or serialized lineage behavior intentionally changed.
- No browser interaction QA was attempted because this slice preserves pointer
  semantics and covers the extracted bar with focused unit tests.

## Changes

- Added `project-timeline-gantt-task-bar.tsx`.
- Moved task bar visibility, position/width calculation, drag state, pointer
  listener setup, move/resize date calculation, progress stripe rendering, and
  bar title/progress rendering into `ProjectTimelineGanttTaskBar`.
- Updated `ProjectTimelineGantt` to compose `ProjectTimelineGanttTaskBar` while
  keeping mobile card list, desktop layout, scroll behavior, view controls, and
  legend rendering in the presenter.
- Moved `TimelineTask` ownership to `project-timeline-gantt-config.ts` as an
  alias of the schema-level `ProjectTimelineTask`, so the Gantt component and
  extracted bar share the schema-derived task shape.
- Updated the timeline boundary contract to keep pointer interaction out of the
  Gantt presenter.
- Added focused task bar tests for visible positioning/progress, out-of-window
  non-rendering, and whole-cell drag movement.

## Standards Checked

- Domain ownership: timeline task bar interaction stays beside the Gantt
  presenter in the Jobs projects domain.
- Route -> container/page -> hook -> server function -> schema/database -> query
  key/cache policy: unchanged. This is a local presenter/component extraction.
- Tenant isolation/data integrity: unchanged because no server or data-access
  path changed.
- Inventory and finance integrity: unchanged.
- Serialized lineage continuity: unchanged.
- Honest UI states: unchanged because no loading, empty, progress, timeline, or
  mobile state behavior changed.
- Operator-safe error handling: unchanged.
- Mutation/cache contract: unchanged; `onDateChange` callback semantics are
  preserved.
- Reviewability: the most interaction-heavy part of the Gantt now has a focused
  component and a direct unit test for whole-cell drag movement.

## Smells Removed

- `ProjectTimelineGantt` no longer owns task bar pointer listener setup inline.
- `ProjectTimelineGantt` no longer owns task bar drag/resize state inline.
- `ProjectTimelineGantt` no longer owns task bar visibility and position math
  inline.
- `ProjectTimelineGantt` no longer owns task bar progress/title rendering inline.
- `ProjectTimelineGantt` now imports the schema-aligned `TimelineTask` type from
  the Gantt config module.
- `project-timeline-gantt.tsx` is now 453 lines, down from 602 before this
  slice.

## Deferred

- `MobileGanttCardList` remains inline. It is a separate mobile presentation
  concern and can be split in a future slice.
- Desktop header, row rendering, today marker, legend, and scroll behavior remain
  in `ProjectTimelineGantt`; those are future boundaries.
- Browser QA is deferred because no rendered structure or pointer behavior was
  intentionally changed, and the extracted pointer movement contract now has a
  focused unit test.

## Gates

- Targeted ESLint:
  `./node_modules/.bin/eslint src/components/domain/jobs/projects/project-timeline-gantt.tsx src/components/domain/jobs/projects/project-timeline-gantt-config.ts src/components/domain/jobs/projects/project-timeline-gantt-task-bar.tsx tests/unit/jobs/project-timeline-gantt-boundary-contract.test.ts tests/unit/jobs/project-timeline-gantt-task-bar.test.tsx --report-unused-disable-directives`
  - Passed.
- Focused tests:
  `./node_modules/.bin/vitest run tests/unit/jobs/project-timeline-gantt-boundary-contract.test.ts tests/unit/jobs/project-timeline-gantt-config.test.ts tests/unit/jobs/project-timeline-gantt-task-bar.test.tsx`
  - Passed: 3 files, 7 tests.
- Typecheck:
  `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
  - Passed.
- Widened Jobs tests:
  `./node_modules/.bin/vitest run tests/unit/jobs`
  - Passed: 97 files, 297 tests.
- Diff hygiene:
  `git diff --check`
  - Passed before closeout documentation; final staged diff check rerun before
    commit.
- Full unit/build/browser QA:
  - Skipped. This slice did not change app route loading, server functions,
    schemas, database, shared cache contracts, production build behavior,
    rendered structure, or pointer interaction intent.

## Goal Adaptation

No goal adaptation made. This continues the active repo-maintainer goal by
turning a high-risk interactive chunk of the Jobs timeline into a focused,
tested component.

## Residual Risk

Low behavior risk because the task bar math, pointer logic, styling, click
surface, and callback shape were moved without intentional semantic changes.
Medium maintainability risk remains in `ProjectTimelineGantt` because desktop
row layout, mobile cards, view controls, and legend rendering are still inline.
