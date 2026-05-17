# Jobs Maintainer Sprint 43: Project Tasks Tab Controller Boundary

## Status

Closed in commit-ready state.

## Problem

After the task dialog cleanup, `ProjectTasksTab` was the next Jobs task surface
mixing too many responsibilities. It owned task/workstream/site-visit/user reads,
route filter state, quick-add wiring, dialog state, delete/status/reorder
mutation hooks, view-model enrichment, filtering, sorting, grouping, and the
rendered task UI.

That made the tab harder to inspect before future behavior work. The renderer
should read like the operator workflow; the non-rendering controller logic
should own data and handler preparation.

## Workflow Spine

Project detail -> Tasks tab -> read project tasks/workstreams/site visits/users
-> route filters/sort -> quick add/delete/status/reorder handlers -> enrich,
filter, sort, and group tasks -> render empty/unavailable/list states -> open
create/edit dialogs.

## Touched Domains

- Jobs/projects tasks tab.
- Jobs/projects task tab controller hook.
- Jobs task route/filter/view-model/mutation/dialog boundary contracts.
- Jobs maintainer closeout docs.

## Business Value Protected

The Tasks tab is where operators coordinate execution across project work,
site visits, and workstreams. Keeping task data derivation and action wiring
separate from rendering makes the workflow easier to reason about and safer to
change when task UX or task operations need improvement.

## Scope Constraints

- No task read, quick-add, delete, status, reorder, create, or edit mutation
  behavior changed.
- No query key, cache policy, server function, schema, route search parsing, or
  database behavior changed.
- No field labels, empty-state copy, cached-warning copy, unavailable-state
  copy, grouping labels, sorting semantics, filter semantics, CTA behavior, or
  dialog behavior intentionally changed.
- No tenant, inventory, finance, stock movement, or serialized lineage behavior
  changed.

## Changes

- Added `project-tasks-tab-controller.ts`.
- Moved task reads, option reads, user lookup, route state, quick-add hook,
  dialog state, delete/status/reorder mutation hooks, task enrichment, counts,
  filtering, sorting, grouping, active-filter detection, all-complete detection,
  and cold-read unavailable-state detection into
  `useProjectTasksTabController`.
- Kept `ProjectTasksTab` responsible for rendering loading, unavailable, empty,
  filtered, grouped-list, cross-project link, and create/edit dialog surfaces.
- Updated boundary contracts so controller ownership is explicit instead of
  expecting every hook directly in the renderer.

## Standards Checked

- Domain ownership: Jobs/project task tab controller stays beside the renderer in
  the Jobs projects domain.
- Route -> container/page -> hook -> server function -> schema/database -> query
  key/cache policy: improved at the local UI layer. The renderer now calls one
  tab controller hook; underlying hooks, server functions, schema/database, and
  query-key/cache policy are unchanged.
- Tenant isolation/data integrity: unchanged because no server or data-access
  path changed.
- Inventory and finance integrity: unchanged.
- Serialized lineage continuity: unchanged.
- Honest UI states: preserved through the same loading, unavailable, cached
  warning, empty, filtered-empty, grouped, and all-complete states.
- Operator-safe error handling: preserved because task states and mutation hooks
  still own read/mutation error formatting.
- Mutation/cache contracts: unchanged; focused mutation hooks still own quick
  add, delete, status, reorder, create, and edit behavior.
- Reviewability: task tab renderer now has a controller boundary that makes
  non-rendering workflow prep auditable in one place.

## Smells Removed

- `ProjectTasksTab` no longer imports task/workstream/site-visit/user read hooks
  directly.
- `ProjectTasksTab` no longer imports route-state, quick-add, dialog-state,
  delete/status/reorder mutation hooks directly.
- `ProjectTasksTab` no longer imports view-model enrichment/filter/sort/group
  helpers directly.
- `ProjectTasksTab` no longer owns the `useMemo` derivation chain inline.
- `project-tasks-tab.tsx` is now 250 lines, down from 317 before this slice.

## Deferred

- The renderer still owns empty-state and full-list JSX. That is acceptable for
  this slice because the operator UI flow remains visible and readable.
- `project-task-workstream-group.tsx` remains the largest Jobs task component at
  408 lines and may be a future Jobs slice.
- Browser QA is deferred because this was a preserved-behavior controller
  extraction with unchanged UI copy, routes, handlers, mutation inputs, and
  rendered state intent.

## Gates

- Targeted ESLint:
  `./node_modules/.bin/eslint src/components/domain/jobs/projects/project-tasks-tab.tsx src/components/domain/jobs/projects/project-tasks-tab-controller.ts tests/unit/jobs/project-task-view-model-boundary-contract.test.ts tests/unit/jobs/project-task-route-state-boundary-contract.test.ts tests/unit/jobs/project-task-delete-mutation-boundary-contract.test.ts tests/unit/jobs/project-task-status-mutation-boundary-contract.test.ts tests/unit/jobs/project-task-reorder-mutation-boundary-contract.test.ts tests/unit/jobs/project-task-quick-add-boundary-contract.test.ts tests/unit/jobs/project-task-dialog-state-boundary-contract.test.ts --report-unused-disable-directives`
  - Passed.
- Focused tests:
  `./node_modules/.bin/vitest run tests/unit/jobs/project-task-view-model-boundary-contract.test.ts tests/unit/jobs/project-task-route-state-boundary-contract.test.ts tests/unit/jobs/project-task-delete-mutation-boundary-contract.test.ts tests/unit/jobs/project-task-status-mutation-boundary-contract.test.ts tests/unit/jobs/project-task-reorder-mutation-boundary-contract.test.ts tests/unit/jobs/project-task-quick-add-boundary-contract.test.ts tests/unit/jobs/project-task-dialog-state-boundary-contract.test.ts`
  - Passed: 7 files, 7 tests.
- Typecheck:
  `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
  - Passed.
- Widened Jobs tests:
  `./node_modules/.bin/vitest run tests/unit/jobs`
  - Passed: 92 files, 284 tests.
- Diff hygiene:
  `git diff --check`
  - Passed before closeout documentation; final staged diff check rerun before
    commit.
- Full unit/build/browser QA:
  - Skipped. This slice did not change app route loading, server functions,
    schemas, database, shared cache contracts, production build behavior, or
    rendered layout intent.

## Goal Adaptation

No goal adaptation made. This continues the active repo-maintainer goal by
moving the Jobs task tab toward a clearer container/controller -> renderer ->
focused mutation/read hook pattern.

## Residual Risk

Low behavior risk because the same hooks, derived values, handlers, UI states,
copy, and dialog props are preserved. Medium maintainability risk remains in
`project-task-workstream-group.tsx`, which is now the largest Jobs task surface
and still likely hides rendering/action complexity.
