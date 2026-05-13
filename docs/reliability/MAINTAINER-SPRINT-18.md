# Reliability Maintainer Sprint 18: Jobs Task Filter Controls Extraction

## Status

Closed and commit-ready.

## Problem

`ProjectTasksTab` still owned task status/priority display config, default filter
state, filter popover UI, sort dropdown UI, and active filter chip UI. Those
controls are cohesive task-list presentation, but they were embedded beside task
read state, route search sync, task enrichment, grouping, mutation, undo delete,
reorder, dialogs, and read feedback.

That made the parent tasks tab harder to review because visual filter controls
and shared display labels were mixed into the workflow orchestration surface.

## Workflow Spine Protected

Project detail -> Tasks tab -> URL task search state -> task filter/sort controls
-> filtered task list -> grouped workstream task board.

## Touched Domains

- Jobs/projects task filter, sort, and active chip presentation boundary.
- Jobs/projects task status and priority display config.
- Jobs task read/mutation source contracts, through focused regression coverage.
- Reliability closeout documentation.

## Business Value Protected

The tasks tab helps RENOZ Energy coordinate project/service work and spot blocked
or overdue operator commitments. Filter and sort controls are the operator's
main way to focus on the right work. Giving those controls a narrow owner makes
future task UX cleanup safer without touching task status mutation, undo delete,
route search sync, cache updates, or server behavior.

## Scope Constraints

- No route, hook, server-function, schema, database, query-key, or cache-policy
  changes.
- No filtering, sorting, grouping, status mutation, delete, reorder, or quick-add
  behavior changed.
- No tenant, inventory movement, finance, stock costing, or serialized lineage
  write path changed.
- The parent tab still owns route search synchronization and passes the current
  filter/sort state into the extracted controls.

## Changes

- Added `project-task-config.ts` for default task filters, priority fallback,
  priority display config, and status display config.
- Added `ProjectTaskFilterPopover`, `ProjectTaskSortDropdown`, and
  `ProjectTaskActiveFilterChips` as the owners of task list controls.
- Updated `ProjectTasksTab` to use the extracted task config and control
  presenters.
- Added a boundary contract that prevents filter/sort/chip UI and typed config
  iteration from drifting back into the parent tab.

## Standards Checked

- Domain ownership: Jobs/project task presentation remains in the Jobs domain.
- Route -> container/page -> hook -> server function -> schema/database -> query
  key/cache policy: unchanged for this slice.
- Tenant isolation: unchanged; no data-access path was modified.
- Inventory and finance integrity: unchanged; no inventory or financial write
  path was modified.
- Serialized lineage continuity: unchanged.
- Honest UI states: preserved for active filters, filtered empty state, degraded
  read feedback, and empty task state because the slice only moved control UI and
  display config.
- Operator-safe error handling: unchanged; task read and mutation error helpers
  still protect operator-facing messages.
- Mutation/cache contracts: unchanged; task status, delete, reorder, and quick
  add hooks were not modified.
- Reviewable diff: presenter/config extraction plus focused source contract.

## Smells Removed

- Filter popover UI no longer lives in the mixed parent tasks tab.
- Sort dropdown UI no longer lives in the mixed parent tasks tab.
- Active filter chip rendering no longer lives in the mixed parent tasks tab.
- Status/priority display config is now reusable by future task card or
  workstream group extractions.
- `ProjectTasksTab` now sits at 1133 lines, down from 1441 before this sprint
  and 1553 before the Jobs/tasks extraction sequence.

## Smells Deferred

- `ProjectTasksTab` remains a large mixed-concern surface. High-value next
  candidates are task card/workstream grouping, empty/error presentation, and
  undoable delete orchestration.
- Route search parsing and URL synchronization remain inline because moving them
  would touch routing behavior and deserves a separate slice.
- The undoable delete flow remains inline until its cache and operator recovery
  behavior is deliberately mapped.

## Gates

- Targeted ESLint:
  `./node_modules/.bin/eslint src/components/domain/jobs/projects/project-tasks-tab.tsx src/components/domain/jobs/projects/project-task-config.ts src/components/domain/jobs/projects/project-task-filter-controls.tsx tests/unit/jobs/project-task-filter-controls-boundary-contract.test.ts tests/unit/jobs/project-task-summary-cards-boundary-contract.test.ts --report-unused-disable-directives`
  - Passed.
- Focused tests:
  `./node_modules/.bin/vitest run tests/unit/jobs/project-task-filter-controls-boundary-contract.test.ts tests/unit/jobs/project-task-summary-cards-boundary-contract.test.ts tests/unit/jobs/project-tasks-mutation-contract.test.ts tests/unit/jobs/project-tasks-read-feedback-contract.test.ts tests/unit/jobs/query-normalization-wave6d.test.tsx`
  - Passed: 5 files, 9 tests, 2.03s.
- Typecheck:
  `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
  - Passed.
- Diff hygiene:
  `git diff --check`
  - Passed.
- Reliability guard scripts:
  - Skipped. This slice did not touch route casts, pending-dialog guards,
    read-path query guards, or serialized read auto-upsert policy.
- Full unit:
  - Skipped. The slice is a local presentation/config extraction covered by
    focused source contracts, task read feedback tests, task mutation contracts,
    ESLint, typecheck, and diff hygiene.

## Goal Adaptation

No goal adaptation made. This continues the active repo-maintainer goal by
shrinking the largest Jobs UI surface and giving reusable task display config a
clear Jobs/projects owner.

## Residual Risk

Low behavioral risk because the extracted controls receive the same filter,
sort, and count values and call the same parent callbacks.

Medium maintainability risk remains in `ProjectTasksTab` because task card
rendering, workstream grouping, route state, mutations, undo-delete, and dialog
orchestration still share one file.
