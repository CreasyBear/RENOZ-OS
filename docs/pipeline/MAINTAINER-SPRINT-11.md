# Pipeline Maintainer Sprint 11

## Status

Closed in commit-ready state.

## Issue 1: Kanban Stage And Delete Actions Used Local Failure Copy

### Problem

`PipelineKanbanContainer` handles drag/drop stage changes and list-view delete actions from the main pipeline board. Stage failures used local generic copy, and delete failures surfaced raw thrown `error.message` copy. These actions should follow the same opportunity formatter contract as opportunity detail and quick dialog actions.

### Workflow Spine

Pipeline board
-> `PipelineKanbanContainer`
-> `useUpdateOpportunityStage` or `useDeleteOpportunity`
-> opportunity server function
-> opportunity query/cache invalidation
-> operator-safe toast feedback.

### Touched Domains

- Pipeline kanban/list-view stage and delete feedback.
- Pipeline opportunity formatter usage.
- Pipeline opportunity feedback contract tests.
- Pipeline maintainer closeout docs.

### Business Value Protected

The board is the primary operator surface for moving deals through the sales pipeline. Stage and delete failures should be safe, consistent, and action-specific without leaking backend details.

### Scope Constraints

- Do not change board layout, filters, drag/drop behavior, confirmation behavior, mutation payloads, server functions, schemas, database predicates, query keys, cache invalidation, or success copy.
- Keep this as kanban/list stage-delete feedback only. Opportunities list bulk actions and bulk operations dialog remain separate slices.

### Changes

- Imported `formatPipelineOpportunityMutationError` into `PipelineKanbanContainer`.
- Routed board stage-change failures through the formatter with the `stage` action.
- Routed board/list delete failures through the formatter with the `delete` action.
- Extended the opportunity mutation feedback contract to cover kanban stage/delete wiring.

### Standards Checked

- Domain ownership: kanban stage/delete feedback now uses the Pipeline opportunity formatter.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: checked pipeline route/container -> kanban container -> stage/delete mutation hooks; server, schema, database, query-key, and cache policy stayed unchanged.
- Tenant isolation/data integrity: unchanged; no server predicates, schemas, or writes touched.
- Query/cache contract: unchanged; mutation invalidation stayed in existing mutation hooks.
- Transactional inventory and finance integrity: unchanged; no inventory, fulfillment, order conversion, finance, or costing path touched.
- Honest UI states/operator-safe errors: improved for board stage and delete failures.
- Reviewability: bounded diff across one container, one focused test, and this closeout.

### Smells Removed

- Local generic board stage-change failure toast.
- Raw thrown delete opportunity failure toast in the kanban/list container.

### Deferred

- Opportunities list bulk delete/stage feedback, bulk operations dialog feedback, activity scheduling, and documents tab read-state copy remain separate workflow slices.
- Browser QA remains deferred because this source-covered slice changes toast message selection, not layout or interaction structure.
- Full `bun run test:unit` and `bun run build` remain deferred to larger release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/pipeline/opportunity-mutation-feedback-contract.test.ts tests/unit/pipeline/quote-mutation-feedback-contract.test.ts` - 2 files, 6 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The standing maintainer goal already covers operator-safe errors, domain ownership, safe mutation/cache contracts, meaningful tests, reviewable diffs, and evidence-based closeout.

### Residual Risk

Low for kanban stage/delete feedback. Moderate across Pipeline because opportunities list bulk actions, bulk operations, and activity workflows still need separate bounded cleanup.
