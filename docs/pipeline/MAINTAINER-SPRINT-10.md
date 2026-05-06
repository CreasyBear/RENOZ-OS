# Pipeline Maintainer Sprint 10

## Status

Closed in commit-ready state.

## Issue 1: Quick Opportunity Dialog Surfaced Raw Create And Update Errors

### Problem

`OpportunityQuickDialog` is used from the pipeline board and opportunity detail as the fast create/edit surface. Its create and update catch branches displayed raw thrown `error.message` copy, making the quick workflow less operator-safe than the opportunity detail command surface.

### Workflow Spine

Pipeline board or opportunity detail
-> `OpportunityQuickDialog`
-> `useCreateOpportunity` or `useUpdateOpportunity`
-> opportunity server function
-> opportunity query/cache invalidation
-> operator-safe toast feedback.

### Touched Domains

- Pipeline quick opportunity dialog feedback.
- Pipeline opportunity mutation formatter action map.
- Pipeline opportunity feedback contract tests.
- Pipeline maintainer closeout docs.

### Business Value Protected

Quick opportunity creation and editing are intake workflows for sales activity. Operators should be able to recover from validation, permission, conflict, or backend failures without seeing raw infrastructure details.

### Scope Constraints

- Do not change quick dialog layout, pending guards, customer selection, create/update payloads, form validation, server functions, schemas, database predicates, query keys, cache invalidation, or success copy.
- Keep this as quick opportunity dialog feedback only. Kanban/list, bulk operations, and activity feedback remain separate slices.

### Changes

- Added a `create` action fallback to `formatPipelineOpportunityMutationError`.
- Routed quick opportunity create failures through the Pipeline opportunity formatter.
- Routed quick opportunity update failures through the same formatter.
- Extended the opportunity mutation feedback contract to cover quick dialog create/update wiring.

### Standards Checked

- Domain ownership: quick dialog create/update feedback now uses the Pipeline opportunity formatter.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: checked board/detail consumers -> quick dialog -> create/update hooks; server, schema, database, query-key, and cache policy stayed unchanged.
- Tenant isolation/data integrity: unchanged; no server predicates, schemas, or writes touched.
- Query/cache contract: unchanged; create/update invalidation stayed in existing mutation hooks.
- Transactional inventory and finance integrity: unchanged; no inventory, fulfillment, order conversion, finance, or costing path touched.
- Honest UI states/operator-safe errors: improved for quick create/edit failures.
- Reviewability: bounded diff across one formatter, one dialog, one focused test, and this closeout.

### Smells Removed

- Raw thrown create opportunity error message in `OpportunityQuickDialog`.
- Raw thrown update opportunity error message in `OpportunityQuickDialog`.
- Missing create fallback in the Pipeline opportunity mutation formatter.

### Deferred

- Pipeline kanban/list mutations, bulk operations feedback, activity scheduling, and documents tab read-state copy remain separate workflow slices.
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

Low for quick opportunity create/update feedback. Moderate across Pipeline because kanban/list, bulk operations, and activity workflows still need separate bounded cleanup.
