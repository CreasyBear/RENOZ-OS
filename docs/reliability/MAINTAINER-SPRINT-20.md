# Reliability Maintainer Sprint 20: Jobs Task State Presenter Extraction

## Status

Closed and commit-ready.

## Problem

`ProjectTasksTab` still owned local loading, unavailable, cached-read warning,
empty task, and filtered-empty presentation. Those states were cohesive UI
surfaces, but they were embedded beside task read orchestration, URL search
state, task enrichment, grouping, mutation, undo delete, reorder, and dialogs.

Keeping read-warning copy inline also made the source contract depend on the
parent tab instead of the state presenter that actually renders the operator
message.

## Workflow Spine Protected

Project detail -> Tasks tab -> project task read hook -> state presenter
selection -> loading, unavailable, cached, empty, or filtered-empty operator
state.

## Touched Domains

- Jobs/projects task loading, empty, filtered-empty, and read-warning
  presentation boundary.
- Jobs task read feedback source contract.
- Reliability closeout documentation.

## Business Value Protected

The tasks tab supports project/service execution by telling operators whether
tasks are unavailable, stale but still visible, genuinely empty, or hidden by
filters. Isolating those states makes future error-state and onboarding work
safer without touching task mutations, cache policy, route search, or the task
board.

## Scope Constraints

- No route, hook, server-function, schema, database, query-key, or cache-policy
  changes.
- No filtering, sorting, grouping, status mutation, delete, reorder mutation, or
  quick-add behavior changed.
- No tenant, inventory movement, finance, stock costing, or serialized lineage
  write path changed.
- The parent tab still decides which state applies and passes retry/add/clear
  callbacks into the state presenters.

## Changes

- Added `ProjectTasksLoadingState`, `ProjectTasksUnavailableState`,
  `ProjectTasksCachedWarning`, `ProjectTasksEmptyState`, and
  `ProjectTasksFilteredEmptyState`.
- Updated `ProjectTasksTab` to render those focused state presenters.
- Moved project task read-error formatting usage from the parent tab into the
  state presenter module.
- Updated the task read feedback contract to assert the new owner.
- Added a boundary contract that prevents loading/empty/read-warning state UI
  from drifting back into the parent tab.

## Standards Checked

- Domain ownership: Jobs/project task presentation remains in the Jobs domain.
- Route -> container/page -> hook -> server function -> schema/database -> query
  key/cache policy: unchanged for this slice.
- Tenant isolation: unchanged; no data-access path was modified.
- Inventory and finance integrity: unchanged; no inventory or financial write
  path was modified.
- Serialized lineage continuity: unchanged.
- Honest UI states: preserved and made more explicit for loading, unavailable,
  cached read, empty, and filtered-empty task states.
- Operator-safe error handling: preserved through
  `getProjectTasksReadErrorMessage(error)` inside the state presenter module.
- Mutation/cache contracts: unchanged; task status, delete, reorder, and quick
  add hooks were not modified.
- Reviewable diff: parent deletion plus focused state presenters and source
  contract updates.

## Smells Removed

- Loading skeleton UI no longer lives in the parent tasks tab.
- Unavailable and cached-read warning UI no longer live in the parent tasks tab.
- Empty and filtered-empty task presentation no longer live in the parent tasks
  tab.
- The task read-feedback contract now follows the module that renders the read
  warning.
- `ProjectTasksTab` now sits at 644 lines, down from 701 before this sprint and
  1553 before the Jobs/tasks extraction sequence.

## Smells Deferred

- `ProjectTasksTab` still owns route search parsing/synchronization, task
  enrichment, grouping calculation, quick add, status mutation, undoable delete,
  reorder mutation, dialogs, and the all-tasks-complete CTA.
- Route state and task enrichment remain inline because moving them would touch
  routing/data-shaping behavior and deserves a separate slice.
- The undoable delete flow remains inline until its cache and operator recovery
  behavior is deliberately mapped.

## Gates

- Targeted ESLint:
  `./node_modules/.bin/eslint src/components/domain/jobs/projects/project-tasks-tab.tsx src/components/domain/jobs/projects/project-task-states.tsx tests/unit/jobs/project-task-states-boundary-contract.test.ts tests/unit/jobs/project-tasks-read-feedback-contract.test.ts --report-unused-disable-directives`
  - Passed.
- Focused tests:
  `./node_modules/.bin/vitest run tests/unit/jobs/project-task-states-boundary-contract.test.ts tests/unit/jobs/project-task-workstream-group-boundary-contract.test.ts tests/unit/jobs/project-task-filter-controls-boundary-contract.test.ts tests/unit/jobs/project-task-summary-cards-boundary-contract.test.ts tests/unit/jobs/project-tasks-mutation-contract.test.ts tests/unit/jobs/project-tasks-read-feedback-contract.test.ts tests/unit/jobs/query-normalization-wave6d.test.tsx`
  - Passed: 7 files, 11 tests, 2.66s.
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
  - Skipped. The slice is a local presentation extraction covered by focused
    source contracts, task read feedback tests, task mutation contracts, ESLint,
    typecheck, and diff hygiene.

## Goal Adaptation

No goal adaptation made. This continues the active repo-maintainer goal by
shrinking the largest Jobs UI surface and giving task operator states a clear
Jobs/projects owner.

## Residual Risk

Low behavioral risk because the extracted state presenters receive the same
error and callback values and preserve the same rendered copy.

Medium maintainability risk remains in `ProjectTasksTab` because route state,
task enrichment, grouping calculation, mutations, undo-delete, dialogs, and the
all-tasks-complete CTA still share one file.
