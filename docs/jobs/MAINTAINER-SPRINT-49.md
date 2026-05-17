# Jobs Maintainer Sprint 49: Timeline Mobile Cards Boundary

## Status

Closed in commit-ready state.

## Problem

After the timeline task bar extraction, `project-timeline-gantt.tsx` still owned
the mobile fallback card list inline: sorting, date labels, duration badge copy,
status styling, progress text, and item click callback wiring.

That mobile branch is a separate presenter surface from the desktop Gantt rows.
Keeping it inline made the main Gantt component harder to scan because mobile
card composition sat between timeline setup and desktop layout.

## Workflow Spine

Project detail -> Overview tab -> Expected Timeline -> mobile viewport ->
timeline mobile cards -> sorted tasks/visits -> date range, duration, status,
progress -> optional item click.

## Touched Domains

- Jobs/projects timeline Gantt presenter.
- Jobs/projects timeline mobile cards presenter.
- Jobs timeline boundary and mobile card tests.
- Jobs maintainer closeout docs.

## Business Value Protected

Mobile operators need the same timeline facts without horizontal Gantt
interaction. Extracting the mobile card surface makes that fallback easier to
review and test independently from desktop drag/resize behavior.

## Scope Constraints

- No task/visit input shape, mobile sort order, mobile date labels, duration
  copy, status styling, progress display, click callback, empty state, desktop
  Gantt rendering, drag behavior, resize behavior, route, server function,
  schema, database, query key, cache policy, tenant, inventory, finance, stock
  movement, or serialized lineage behavior intentionally changed.
- No browser QA was attempted because this slice is a preserved-behavior
  presenter extraction with focused render/click tests.

## Changes

- Added `project-timeline-gantt-mobile-cards.tsx`.
- Moved mobile timeline card sorting, date-range text, duration badge, status
  metadata, progress text, and item click callback wiring into
  `ProjectTimelineGanttMobileCards`.
- Updated `ProjectTimelineGantt` to compose the mobile cards component only in
  the mobile branch, while keeping header/progress/desktop layout/scroll logic
  in the main presenter.
- Updated the timeline boundary contract so mobile fallback rendering stays out
  of the main Gantt presenter.
- Added focused mobile card tests for sorted rendering, duration labels, status
  and progress metadata, and click callback propagation.

## Standards Checked

- Domain ownership: timeline mobile-card presentation stays beside the Gantt
  presenter in the Jobs projects domain.
- Route -> container/page -> hook -> server function -> schema/database -> query
  key/cache policy: unchanged. This is a local presenter extraction.
- Tenant isolation/data integrity: unchanged because no server or data-access
  path changed.
- Inventory and finance integrity: unchanged.
- Serialized lineage continuity: unchanged.
- Honest UI states: unchanged because no empty, progress, mobile, or desktop
  state behavior changed.
- Operator-safe error handling: unchanged.
- Mutation/cache contract: unchanged.
- Reviewability: the mobile timeline fallback can now be tested without reading
  the full desktop Gantt presenter.

## Smells Removed

- `ProjectTimelineGantt` no longer owns mobile card sorting inline.
- `ProjectTimelineGantt` no longer owns mobile duration badge copy inline.
- `ProjectTimelineGantt` no longer owns mobile card status/progress rendering
  inline.
- `ProjectTimelineGantt` no longer imports `differenceInDays`.
- `project-timeline-gantt.tsx` is now 397 lines, down from 453 before this
  slice.

## Deferred

- Desktop header controls, progress summary, date header row, desktop task row
  layout, today marker, legend, and scroll behavior remain in
  `ProjectTimelineGantt`.
- Browser mobile QA is deferred because this was a preserved-behavior extraction
  and the mobile card component has focused render/click tests.

## Gates

- Targeted ESLint:
  `./node_modules/.bin/eslint src/components/domain/jobs/projects/project-timeline-gantt.tsx src/components/domain/jobs/projects/project-timeline-gantt-mobile-cards.tsx tests/unit/jobs/project-timeline-gantt-boundary-contract.test.ts tests/unit/jobs/project-timeline-gantt-mobile-cards.test.tsx --report-unused-disable-directives`
  - Passed.
- Focused tests:
  `./node_modules/.bin/vitest run tests/unit/jobs/project-timeline-gantt-boundary-contract.test.ts tests/unit/jobs/project-timeline-gantt-mobile-cards.test.tsx tests/unit/jobs/project-timeline-gantt-task-bar.test.tsx`
  - Passed: 3 files, 6 tests.
- Typecheck:
  `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
  - Passed.
- Widened Jobs tests:
  `./node_modules/.bin/vitest run tests/unit/jobs`
  - Passed: 98 files, 299 tests.
- Diff hygiene:
  `git diff --check`
  - Passed before closeout documentation; final staged diff check rerun before
    commit.
- Full unit/build/browser QA:
  - Skipped. This slice did not change app route loading, server functions,
    schemas, database, shared cache contracts, production build behavior,
    rendered intent, or pointer interaction intent.

## Goal Adaptation

No goal adaptation made. This continues the active repo-maintainer goal by
removing another local presentation concern from a large Jobs timeline surface.

## Residual Risk

Low behavior risk because mobile card sort, copy, status metadata, progress
metadata, click callback, and desktop timeline behavior are preserved. Medium
maintainability risk remains in the main Gantt presenter because desktop header,
date row, task rows, today marker, scroll behavior, and legend are still inline.
