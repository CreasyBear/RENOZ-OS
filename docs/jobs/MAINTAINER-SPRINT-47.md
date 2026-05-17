# Jobs Maintainer Sprint 47: Project Timeline Gantt Config Boundary

## Status

Closed in commit-ready state.

## Problem

`project-timeline-gantt.tsx` was still a large mixed presenter. It owned
timeline interaction/rendering and also owned view-mode sizing, timeline status
styling, zoom and row constants, generated date ranges, and task date-range
formatting.

Those constants and helper semantics are part of the timeline domain contract,
not the JSX body. Keeping them inline made the Gantt harder to review before any
future behavior work on dragging, resizing, mobile cards, or timeline labels.

## Workflow Spine

Project detail -> Overview tab -> Expected Timeline -> view-mode date window ->
timeline rows -> task/visit bars -> drag/move/resize interaction -> optional
item click.

## Touched Domains

- Jobs/projects timeline Gantt presenter.
- Jobs/projects timeline Gantt config and date helpers.
- Jobs timeline boundary and helper tests.
- Jobs maintainer closeout docs.

## Business Value Protected

The project timeline is an operator planning surface: it shows when work is
expected, where tasks and visits fall, and how much progress is visible at a
glance. Separating configuration/date semantics from pointer interaction and JSX
makes the surface safer to change when project planning needs evolve.

## Scope Constraints

- No task/visit input shape, click behavior, drag behavior, resize behavior,
  today scrolling, mobile fallback, view mode labels, zoom limits, row height,
  name-column width, date-range formatting, status labels, status colors, or
  progress rendering intentionally changed.
- No route, server function, schema, database, query key, cache policy, tenant,
  inventory, finance, stock movement, or serialized lineage behavior changed.
- No browser interaction QA was attempted because this was a preserved-behavior
  extraction; pointer behavior remains in the presenter.

## Changes

- Added `project-timeline-gantt-config.ts`.
- Moved `TimelineStatus`, `ViewMode`, `VIEW_MODE_CONFIG`,
  `TIMELINE_STATUS_CONFIG`, `NAME_COLUMN_WIDTH`, `ROW_HEIGHT`, `MIN_ZOOM`,
  `MAX_ZOOM`, `getTimelineDates`, and `formatTimelineTaskDates` into the config
  module.
- Updated `ProjectTimelineGantt` to import config/date helpers while keeping
  task bar interaction, mobile cards, scrolling, keyboard behavior, and render
  composition in the presenter.
- Added focused tests for generated view dates, date-range formatting, and
  timeline status styling ownership.
- Added a boundary contract to keep config/helpers out of the Gantt presenter.

## Standards Checked

- Domain ownership: timeline-specific config stays beside the Gantt presenter in
  the Jobs projects domain.
- Route -> container/page -> hook -> server function -> schema/database -> query
  key/cache policy: unchanged. This is a local presenter/config extraction.
- Tenant isolation/data integrity: unchanged because no server or data-access
  path changed.
- Inventory and finance integrity: unchanged.
- Serialized lineage continuity: unchanged.
- Honest UI states: unchanged because no loading, empty, progress, timeline, or
  mobile state behavior changed.
- Operator-safe error handling: unchanged.
- Mutation/cache contract: unchanged.
- Reviewability: timeline display constants and date semantics can now be tested
  without reading the full interactive presenter.

## Smells Removed

- `ProjectTimelineGantt` no longer owns timeline view-mode config inline.
- `ProjectTimelineGantt` no longer owns timeline status styling inline.
- `ProjectTimelineGantt` no longer owns Gantt sizing/zoom constants inline.
- `ProjectTimelineGantt` no longer owns date range generation inline.
- `ProjectTimelineGantt` no longer owns task date-range formatting inline.
- `project-timeline-gantt.tsx` is now 602 lines, down from 661 before this
  slice.

## Deferred

- The Gantt presenter still owns task bar, mobile card list, desktop header,
  progress section, scroll behavior, and row rendering. Those are future slices,
  not safe to split in the same pass as config extraction.
- Timeline status labels remain timeline-specific because the timeline uses a
  `todo` status while project task status uses `pending`. A canonical mapping
  can be considered later if the source status conversion is audited.
- Browser QA is deferred because no rendered structure or pointer behavior was
  intentionally changed.

## Gates

- Targeted ESLint:
  `./node_modules/.bin/eslint src/components/domain/jobs/projects/project-timeline-gantt.tsx src/components/domain/jobs/projects/project-timeline-gantt-config.ts tests/unit/jobs/project-timeline-gantt-config.test.ts tests/unit/jobs/project-timeline-gantt-boundary-contract.test.ts --report-unused-disable-directives`
  - Passed.
- Focused tests:
  `./node_modules/.bin/vitest run tests/unit/jobs/project-timeline-gantt-config.test.ts tests/unit/jobs/project-timeline-gantt-boundary-contract.test.ts`
  - Passed: 2 files, 4 tests.
- Typecheck:
  `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
  - Passed.
- Widened Jobs tests:
  `./node_modules/.bin/vitest run tests/unit/jobs`
  - Passed: 96 files, 294 tests.
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
reducing another large Jobs project surface through a local, reviewable
config/helper boundary.

## Residual Risk

Low behavior risk because all user-facing labels, dimensions, helper outputs,
status classes, date-window lengths, drag behavior, click behavior, and mobile
fallback structure are preserved. Medium maintainability risk remains in the
Gantt presenter because task bar and desktop row rendering are still inline.
