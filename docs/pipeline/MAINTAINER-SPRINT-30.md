# Pipeline Maintainer Sprint 30

## Status

Closed in commit-ready state.

## Issue 1: Pipeline Board Refresh Policy Was Split Across UI Handlers

### Problem

`PipelineKanbanContainer` invalidated the same board refresh caches inline from the error retry handler and the quick opportunity dialog success handler. That kept cache policy embedded in UI callbacks instead of making the board refresh contract explicit.

### Workflow Spine

Pipeline route
-> `PipelineKanbanContainer`
-> board read retry and quick-dialog success handlers
-> opportunity list, Pipeline metrics, and optional opportunity detail cache refresh.

### Touched Domains

- Pipeline kanban container.
- Pipeline cache contract tests.
- Pipeline maintainer closeout docs.

### Business Value Protected

Pipeline operators rely on board/list rows and metrics reflecting new, edited, and retried data. Centralizing the refresh contract makes future board fixes less likely to refresh rows without metrics, or dialog success without detail data.

### Scope Constraints

- Do not change opportunity hooks, server functions, schemas, database queries, filters, mutation semantics, UI rendering, routing, or query key definitions.
- Preserve the existing invalidation breadth: opportunity lists and Pipeline metrics for retry; opportunity lists, Pipeline metrics, and the affected opportunity detail after quick-dialog success.
- Do not run or list serialized gates; this slice does not touch serial lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or repair scripts.

### Changes

- Added `invalidatePipelineBoardQueries(queryClient, opportunityId?)` inside the Pipeline kanban container.
- Replaced inline retry invalidations with the helper.
- Replaced inline quick-dialog success invalidations with the helper and optional detail refresh.
- Added a focused source contract to keep the board refresh policy centralized.

### Standards Checked

- Domain ownership: board refresh policy is now named and owned at the Pipeline container boundary.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: improved container cache policy reviewability; hooks, server functions, schemas, database, and query key factories stayed unchanged.
- Tenant isolation/data integrity: unchanged; no server predicate, auth boundary, organization scope, database write, inventory transaction, or finance path touched.
- Query/cache contract: preserved exact invalidation breadth while moving repeated policy to one helper.
- Honest UI states/operator-safe errors: unchanged; retry and success UI behavior stayed the same.
- Reviewability: bounded diff across one container, one focused test, and this closeout.

### Smells Removed

- Duplicate opportunity list and Pipeline metrics invalidations inside UI callbacks.
- Unnamed board refresh policy split across retry and success paths.
- Missing source contract around the Pipeline board refresh cache policy.

### Deferred

- Opportunity mutation hook invalidation breadth remains preserved rather than re-evaluated.
- Quote mutation cache invalidation still has its own domain policy and remains a separate slice.
- Browser QA remains deferred because this source-covered slice changes cache-policy structure, not layout or interaction behavior.
- Full `bun run test:unit` and `bun run build` remain deferred to broader release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/pipeline/pipeline-kanban-cache-contract.test.ts tests/unit/pipeline/pipeline-kanban-opportunity-type-contract.test.ts` - 2 files, 2 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan confirming the only Pipeline container board refresh invalidations live inside `invalidatePipelineBoardQueries`, with retry and quick-dialog success calling the helper.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The current maintainer goal and serialized-gate retirement posture fit this slice.

### Residual Risk

Low. This is a local cache-policy cleanup with no intended behavior change; the remaining risk is that broader Pipeline cache policy still needs periodic domain review across opportunity and quote mutations.
