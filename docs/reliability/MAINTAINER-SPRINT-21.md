# Reliability Maintainer Sprint 21: Jobs Task Completion CTA Extraction

## Status

Closed and commit-ready.

## Problem

`ProjectTasksTab` still owned the all-tasks-complete project completion CTA
after the task board, filters, summaries, and operator states had been moved
behind focused presenters. That CTA is a cohesive completion prompt, but it does
not need direct ownership of task reads, URL search state, task enrichment,
grouping, status mutation, undoable delete, reorder mutation, or dialogs.

Keeping the CTA inline made the parent tab retain one more presentation concern
beside workflow orchestration and made future task-closeout UX changes harder to
review independently.

## Workflow Spine Protected

Project detail -> Tasks tab -> task read and grouping -> all tasks complete
decision -> completion CTA presenter -> project completion callback.

## Touched Domains

- Jobs/projects task completion CTA presentation boundary.
- Jobs/projects task parent tab orchestration boundary.
- Jobs task completion CTA source contract.
- Reliability closeout documentation.

## Business Value Protected

The tasks tab supports project/service execution by giving operators a clear
moment to complete a project only after every task is completed. Isolating that
prompt keeps the closeout UI easy to improve without touching task mutation,
cache policy, route search, task grouping, or project completion callback
wiring.

## Scope Constraints

- No route, hook, server-function, schema, database, query-key, or cache-policy
  changes.
- No task filtering, sorting, grouping, status mutation, delete, reorder
  mutation, quick-add behavior, or project completion behavior changed.
- No tenant, inventory movement, finance, stock costing, or serialized lineage
  write path changed.
- The parent tab still decides whether all tasks are complete and whether a
  project completion callback is available.

## Changes

- Added `ProjectTaskCompletionCta` as the owner of the all-tasks-complete card,
  iconography, operator copy, and completion button.
- Updated `ProjectTasksTab` to render the focused CTA presenter and keep only
  the completion-state guard and callback wiring.
- Added a boundary contract that prevents the completion CTA markup from
  drifting back into the parent tab while preserving the parent completion toast
  contract.

## Standards Checked

- Domain ownership: Jobs/project task completion presentation remains in the
  Jobs domain.
- Route -> container/page -> hook -> server function -> schema/database -> query
  key/cache policy: unchanged for this slice.
- Tenant isolation: unchanged; no data-access path was modified.
- Inventory and finance integrity: unchanged; no inventory or financial write
  path was modified.
- Serialized lineage continuity: unchanged.
- Honest UI states: preserved for the all-tasks-complete closeout prompt.
- Operator-safe error handling: unchanged; this slice does not touch read or
  mutation error paths.
- Mutation/cache contracts: unchanged; task status, delete, reorder, quick add,
  and project completion execution were not modified.
- Reviewable diff: parent deletion plus focused CTA presenter and source
  contract.

## Smells Removed

- All-tasks-complete CTA markup no longer lives in the mixed parent tasks tab.
- Completion CTA card imports and `CheckCircle2` icon ownership no longer sit
  beside route state, task read orchestration, grouping, and mutations.
- The CTA now has a source contract matching the focused module that renders the
  operator closeout prompt.
- `ProjectTasksTab` now sits at 625 lines, down from 644 before this sprint and
  1553 before the Jobs/tasks extraction sequence.

## Smells Deferred

- `ProjectTasksTab` still owns route search parsing/synchronization, task
  enrichment, grouping calculation, quick add, status mutation, undoable delete,
  reorder mutation, and dialogs.
- Route state and task enrichment remain inline because moving them would touch
  routing/data-shaping behavior and deserves a separate slice.
- The undoable delete flow remains inline until its cache and operator recovery
  behavior is deliberately mapped.

## Gates

- Diff hygiene:
  `git diff --check`
  - Passed.
- Direct typecheck:
  `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
  - Passed.
- Direct ESLint:
  `./node_modules/.bin/eslint src --ext .ts,.tsx --report-unused-disable-directives`
  - Passed.
- Focused tests:
  `./node_modules/.bin/vitest run tests/unit/jobs/project-task-completion-cta-boundary-contract.test.ts tests/unit/jobs/project-task-states-boundary-contract.test.ts tests/unit/jobs/project-task-workstream-group-boundary-contract.test.ts tests/unit/jobs/project-task-filter-controls-boundary-contract.test.ts tests/unit/jobs/project-task-summary-cards-boundary-contract.test.ts tests/unit/jobs/project-tasks-mutation-contract.test.ts tests/unit/jobs/project-tasks-read-feedback-contract.test.ts tests/unit/jobs/query-normalization-wave6d.test.tsx`
  - Passed: 8 files, 12 tests, 3.34s.
- Reliability guard scripts:
  - `node scripts/check-route-casts.mjs`: passed.
  - `node scripts/check-pending-dialog-guards.mjs`: passed.
  - `node scripts/check-read-path-query-guards.mjs`: passed.
  - `node scripts/check-serialized-read-auto-upsert.mjs`: passed.
- Bun wrapper scripts:
  - `bun run typecheck` and `bun run lint` were attempted but blocked by this
    runtime's `CouldntReadCurrentDirectory` Bun failure before invoking the
    underlying project tools. Direct `tsc` and ESLint binaries passed.
- Full unit:
  - Skipped. The slice is a local presentation extraction covered by focused
    source contracts, task read feedback tests, task mutation contracts, full
    ESLint, typecheck, reliability guards, and diff hygiene.

## Goal Adaptation

No goal adaptation made. This continues the active repo-maintainer goal by
shrinking the Jobs tasks parent surface and giving the task completion closeout
prompt a clear Jobs/projects owner.

## Residual Risk

Low behavioral risk because the extracted CTA receives the same completion
callback and preserves the same operator copy and button.

Medium maintainability risk remains in `ProjectTasksTab` because route state,
task enrichment, grouping calculation, mutations, undo-delete, and dialogs still
share one file.
