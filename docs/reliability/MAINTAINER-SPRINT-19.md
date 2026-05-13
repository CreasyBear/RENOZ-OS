# Reliability Maintainer Sprint 19: Jobs Task Workstream Group Extraction

## Status

Closed and commit-ready.

## Problem

`ProjectTasksTab` still owned the full task board rendering surface: sortable
task cards, task card content, due-date formatting, assignee initials, workstream
group headers, DnD sensors, and reorder id calculation. That UI is cohesive, but
it does not need direct access to task reads, URL state, mutation execution,
undoable delete timeouts, or dialogs.

Keeping the board rendering inline made the parent tab too broad and made it
harder to review task mutation and routing behavior independently from visual
task card presentation.

## Workflow Spine Protected

Project detail -> Tasks tab -> grouped task list -> workstream group presenter
-> sortable task cards -> reorder callback returns ordered task ids to the
parent mutation owner.

## Touched Domains

- Jobs/projects task card and workstream group presentation boundary.
- Jobs/projects task DnD reorder presentation callback.
- Jobs task read/mutation source contracts, through focused regression coverage.
- Reliability closeout documentation.

## Business Value Protected

The tasks tab helps RENOZ Energy coordinate project/service execution. The
workstream board is the operator's main view for what is blocked, overdue,
assigned, estimated, and ready to reorder. Giving that board a focused owner
makes future task UX and DnD fixes safer without touching the task status,
delete, reorder mutation, route search, cache, or dialog logic.

## Scope Constraints

- No route, hook, server-function, schema, database, query-key, or cache-policy
  changes.
- No filtering, sorting, grouping, status mutation, delete, reorder mutation, or
  quick-add behavior changed.
- No tenant, inventory movement, finance, stock costing, or serialized lineage
  write path changed.
- The parent tab still owns grouped task calculation, mutation callbacks, and
  undoable delete behavior.

## Changes

- Added `ProjectTaskWorkstreamGroup` as the owner of workstream group rendering,
  sortable task cards, task card content, due-date display, assignee initials,
  DnD sensors, and reorder id derivation.
- Updated `ProjectTasksTab` to render the extracted workstream group presenter
  and keep only callback wiring.
- Added a boundary contract that prevents DnD/card/workstream rendering from
  drifting back into the parent tab.

## Standards Checked

- Domain ownership: Jobs/project task presentation remains in the Jobs domain.
- Route -> container/page -> hook -> server function -> schema/database -> query
  key/cache policy: unchanged for this slice.
- Tenant isolation: unchanged; no data-access path was modified.
- Inventory and finance integrity: unchanged; no inventory or financial write
  path was modified.
- Serialized lineage continuity: unchanged.
- Honest UI states: preserved for task card status, priority, due date,
  assignee, site visit link, drag state, and group progress because the slice
  moved existing rendering intact.
- Operator-safe error handling: unchanged; task read and mutation error helpers
  still protect operator-facing messages.
- Mutation/cache contracts: unchanged; task status, delete, reorder, and quick
  add hooks were not modified.
- Reviewable diff: parent deletion plus focused workstream group presenter and
  source contract.

## Smells Removed

- Sortable task card rendering no longer lives in the mixed parent tasks tab.
- Workstream group DnD sensors and reorder id derivation now live with the group
  UI that owns drag interactions.
- Task card display helpers no longer live beside route state and mutation code.
- `ProjectTasksTab` now sits at 701 lines, down from 1133 before this sprint and
  1553 before the Jobs/tasks extraction sequence.

## Smells Deferred

- `ProjectTasksTab` still owns route search parsing/synchronization, task
  enrichment, grouping calculation, quick add, status mutation, undoable delete,
  reorder mutation, dialogs, and empty/error states.
- The undoable delete flow remains inline until its cache and operator recovery
  behavior is deliberately mapped.
- Empty/error presentation is now the next low-risk extraction candidate.

## Gates

- Targeted ESLint:
  `./node_modules/.bin/eslint src/components/domain/jobs/projects/project-tasks-tab.tsx src/components/domain/jobs/projects/project-task-workstream-group.tsx tests/unit/jobs/project-task-workstream-group-boundary-contract.test.ts tests/unit/jobs/project-task-filter-controls-boundary-contract.test.ts tests/unit/jobs/project-task-summary-cards-boundary-contract.test.ts --report-unused-disable-directives`
  - Passed.
- Focused tests:
  `./node_modules/.bin/vitest run tests/unit/jobs/project-task-workstream-group-boundary-contract.test.ts tests/unit/jobs/project-task-filter-controls-boundary-contract.test.ts tests/unit/jobs/project-task-summary-cards-boundary-contract.test.ts tests/unit/jobs/project-tasks-mutation-contract.test.ts tests/unit/jobs/project-tasks-read-feedback-contract.test.ts tests/unit/jobs/query-normalization-wave6d.test.tsx`
  - Passed: 6 files, 10 tests, 2.62s.
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
shrinking the largest Jobs UI surface and giving the task board a clear
Jobs/projects owner.

## Residual Risk

Low behavioral risk because the extracted group receives the same tasks and
callbacks and returns the same ordered task ids to the parent reorder mutation.

Medium maintainability risk remains in `ProjectTasksTab` because route state,
task enrichment, grouping calculation, mutations, undo-delete, dialogs, and
empty/error states still share one file.
