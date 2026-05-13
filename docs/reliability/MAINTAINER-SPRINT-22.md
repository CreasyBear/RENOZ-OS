# Reliability Maintainer Sprint 22: Jobs Task View Model Extraction

## Status

Closed and commit-ready.

## Problem

`ProjectTasksTab` still owned the full client-side task list derivation pipeline:
raw task enrichment, workstream labels, assignee labels, site visit numbers,
status/priority counts, pending-delete exclusion, filters, sorting, grouping,
active-filter detection, and all-tasks-complete detection.

Those calculations are core task-list view-model behavior, but they do not need
direct access to route state, read hooks, mutation execution, cache writes,
toasts, dialogs, or presentation components. Keeping them inline made the parent
tab harder to review and kept pure workflow rules trapped inside a mixed React
surface.

## Workflow Spine Protected

Project detail -> Tasks tab -> project task read hook -> task view-model
derivation -> filters/sorting/grouping -> task board, empty states, summary, and
completion CTA.

## Touched Domains

- Jobs/projects task list view-model derivation.
- Jobs/projects task parent tab orchestration boundary.
- Jobs task source and behavior contracts for view-model ownership.
- Reliability closeout documentation.

## Business Value Protected

The tasks tab helps RENOZ Energy coordinate project/service execution by showing
operators the right task list, counts, filters, workstreams, assignees, and
project completion signal. Isolating those derivations makes future task UX,
filtering, and route-state work safer because the pure list rules can now be
tested without exercising task mutations, dialogs, or cache writes.

## Scope Constraints

- No route, hook, server-function, schema, database, query-key, or cache-policy
  changes.
- No task filtering, sorting, grouping, status mutation, delete, reorder,
  quick-add, dialog, or project completion behavior intentionally changed.
- No tenant, inventory movement, finance, stock costing, or serialized lineage
  write path changed.
- `ProjectTasksTab` still owns route search state, hook orchestration, mutation
  callbacks, undoable delete timers, and dialogs.

## Changes

- Added `project-task-view-model.ts` with pure helpers for:
  - task enrichment with workstream, assignee, and site visit display data
  - status/priority counts
  - active-filter detection
  - pending-delete, status, priority, and assignee filtering
  - due-date, priority, created-date, and title sorting
  - workstream grouping with `Unassigned` last
  - all-tasks-complete detection
- Updated `ProjectTasksTab` to call the view-model helpers while keeping hook,
  route, mutation, cache, toast, and dialog ownership in the parent.
- Added direct unit coverage for the view-model behavior.
- Added a source boundary contract that prevents task derivation logic from
  drifting back into the parent tab.

## Standards Checked

- Domain ownership: Jobs/project task view-model logic remains in the Jobs
  domain.
- Route -> container/page -> hook -> server function -> schema/database -> query
  key/cache policy: unchanged for this slice.
- Tenant isolation: unchanged; no data-access path was modified.
- Inventory and finance integrity: unchanged; no inventory or financial write
  path was modified.
- Serialized lineage continuity: unchanged.
- Honest UI states: preserved through identical filtered/empty/grouped task
  inputs, now produced by explicit helpers.
- Operator-safe error handling: unchanged; read and mutation error helpers were
  not modified.
- Mutation/cache contracts: unchanged; task status, delete, reorder, quick add,
  and project completion execution were not modified.
- Reviewable diff: parent derivation deletion plus focused pure helper module
  and behavior/boundary tests.

## Smells Removed

- Task enrichment no longer lives beside route search and mutation code.
- Task counts, active-filter detection, filtering, sorting, grouping, and
  all-complete detection now have a pure Jobs/projects owner.
- The rules for unassigned grouping and priority sort order are covered by unit
  tests instead of being implicit inside the React tab.
- `ProjectTasksTab` now sits at 537 lines, down from 625 before this sprint and
  1553 before the Jobs/tasks extraction sequence.

## Smells Deferred

- `ProjectTasksTab` still owns URL search parsing/synchronization.
- `ProjectTasksTab` still owns quick add, status mutation, undoable delete,
  reorder mutation, and dialogs.
- The undoable delete flow remains inline until its cache and operator recovery
  behavior is deliberately mapped.
- Route-state helpers remain inline because moving them touches route search
  contracts and deserves a separate slice.

## Gates

- Targeted ESLint:
  `./node_modules/.bin/eslint src/components/domain/jobs/projects/project-tasks-tab.tsx src/components/domain/jobs/projects/project-task-view-model.ts tests/unit/jobs/project-task-view-model.test.ts tests/unit/jobs/project-task-view-model-boundary-contract.test.ts --report-unused-disable-directives`
  - Passed.
- New focused tests:
  `./node_modules/.bin/vitest run tests/unit/jobs/project-task-view-model.test.ts tests/unit/jobs/project-task-view-model-boundary-contract.test.ts`
  - Passed: 2 files, 7 tests, 789ms.
- Widened Jobs task tests:
  `./node_modules/.bin/vitest run tests/unit/jobs/project-task-view-model.test.ts tests/unit/jobs/project-task-view-model-boundary-contract.test.ts tests/unit/jobs/project-task-completion-cta-boundary-contract.test.ts tests/unit/jobs/project-task-states-boundary-contract.test.ts tests/unit/jobs/project-task-workstream-group-boundary-contract.test.ts tests/unit/jobs/project-task-filter-controls-boundary-contract.test.ts tests/unit/jobs/project-task-summary-cards-boundary-contract.test.ts tests/unit/jobs/project-tasks-mutation-contract.test.ts tests/unit/jobs/project-tasks-read-feedback-contract.test.ts tests/unit/jobs/query-normalization-wave6d.test.tsx`
  - Passed: 10 files, 19 tests, 3.10s.
- Typecheck:
  `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
  - Passed.
- Diff hygiene:
  `git diff --check`
  - Passed before closeout documentation; final staged diff check rerun before
    commit.
- Reliability guard scripts:
  - Skipped. This slice did not touch route casts, pending dialog guards,
    read-path query guard policy, serialized read auto-upsert policy, server
    functions, cache keys, or database contracts.
- Full unit:
  - Skipped. This slice is pure local task derivation covered by direct behavior
    tests, boundary contracts, widened Jobs task tests, targeted ESLint,
    typecheck, and diff hygiene.

## Goal Adaptation

No goal adaptation made. This continues the active repo-maintainer goal by
shrinking the Jobs tasks parent surface and moving pure task-list rules into a
tested domain module.

## Residual Risk

Low behavioral risk because the helper module preserves the same list derivation
rules and focused tests cover the main transformation, filter, sort, group, and
completion decisions.

Medium maintainability risk remains in `ProjectTasksTab` because route state,
mutations, undo-delete timers, reorder behavior, quick add, and dialogs still
share one file.
