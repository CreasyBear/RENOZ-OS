# Reliability Maintainer Sprint 17: Jobs Task Summary Presenter Extraction

## Status

Closed and commit-ready.

## Problem

`ProjectTasksTab` is now the largest Jobs UI surface. It owns route search state,
read feedback, quick add, task transformation, filtering, sorting, grouping,
status mutation, undoable deletion, reorder mutation, dialogs, empty states, and
summary metrics.

The task summary cards were cohesive operator overview presentation. Keeping
that metric calculation and card layout inline forced the parent tab to own one
more responsibility that does not need mutation, routing, cache, or dialog
context.

## Workflow Spine Protected

Project detail -> Tasks tab -> project task read hook -> enriched task list ->
summary metrics presenter -> operator sees total, progress, estimated hours, and
overdue risk.

## Touched Domains

- Jobs/projects task summary presentation boundary.
- Jobs task read/mutation source contracts, through focused regression coverage.
- Reliability closeout documentation.

## Business Value Protected

The tasks tab helps RENOZ Energy coordinate project/service work without losing
track of operator commitments. The summary cards are the fast scan surface for
task load, completion progress, labor estimate, and overdue risk. Moving them
behind a focused presenter makes future task UX cleanup safer without touching
status mutation, undo delete, route search, or cache behavior.

## Scope Constraints

- No route, hook, server-function, schema, database, query-key, or cache-policy
  changes.
- No task filtering, sorting, grouping, status mutation, delete, reorder, or
  quick-add behavior changed.
- No tenant, inventory movement, finance, stock costing, or serialized lineage
  write path changed.
- The parent tab still owns task enrichment and passes `allTasks` to the summary
  presenter.

## Changes

- Added `ProjectTaskSummaryCards` as the owner of project task summary metrics
  and summary card layout.
- Updated `ProjectTasksTab` to render the extracted summary presenter through a
  single `tasks` prop.
- Added a boundary contract that prevents total/progress/hour/overdue summary UI
  from drifting back into the parent tab.

## Standards Checked

- Domain ownership: Jobs/project task presentation remains in the Jobs domain.
- Route -> container/page -> hook -> server function -> schema/database -> query
  key/cache policy: unchanged for this slice.
- Tenant isolation: unchanged; no data-access path was modified.
- Inventory and finance integrity: unchanged; no inventory or financial write
  path was modified.
- Serialized lineage continuity: unchanged.
- Honest UI states: preserved for degraded read feedback, empty task state, and
  active filter behavior because the slice only moved summary metrics.
- Operator-safe error handling: unchanged; task read and mutation error helpers
  still protect operator-facing messages.
- Mutation/cache contracts: unchanged; task status, delete, reorder, and quick
  add hooks were not modified.
- Reviewable diff: pure presenter extraction plus focused source contract.

## Smells Removed

- Task summary metric calculation no longer lives in the mixed parent tasks tab.
- Summary card copy and layout now have a narrow owner.
- `ProjectTasksTab` now sits at 1441 lines, down from 1553 before this sprint.

## Smells Deferred

- `ProjectTasksTab` remains a large mixed-concern surface. High-value next
  candidates are filter controls, active filter chips, empty/error presentation,
  and task card/workstream grouping ownership.
- Task status config and priority config are still local to the parent tab
  because this slice did not move the task card or filter controls that also use
  them.
- The undoable delete flow remains inline and should stay there until its cache
  and operator recovery behavior is deliberately mapped.

## Gates

- Targeted ESLint:
  `./node_modules/.bin/eslint src/components/domain/jobs/projects/project-tasks-tab.tsx src/components/domain/jobs/projects/project-task-summary-cards.tsx tests/unit/jobs/project-task-summary-cards-boundary-contract.test.ts --report-unused-disable-directives`
  - Passed.
- Focused tests:
  `./node_modules/.bin/vitest run tests/unit/jobs/project-task-summary-cards-boundary-contract.test.ts tests/unit/jobs/project-tasks-mutation-contract.test.ts tests/unit/jobs/project-tasks-read-feedback-contract.test.ts tests/unit/jobs/query-normalization-wave6d.test.tsx`
  - Passed: 4 files, 8 tests, 1.94s.
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
  - Skipped. The slice is a pure presentation extraction covered by focused
    source contracts, task read feedback tests, task mutation contracts, ESLint,
    typecheck, and diff hygiene.

## Goal Adaptation

No goal adaptation made. This continues the active repo-maintainer goal by
shrinking the largest Jobs UI surface through a small, reviewable, tested
presenter extraction.

## Residual Risk

Low behavioral risk because the extracted presenter receives the same `allTasks`
array and preserves the existing metric calculations and rendered labels.

Medium maintainability risk remains in `ProjectTasksTab` because routing,
filtering, grouping, mutation, undo-delete, and dialog orchestration still share
one file.
