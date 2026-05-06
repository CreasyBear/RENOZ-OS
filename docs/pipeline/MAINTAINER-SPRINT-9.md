# Pipeline Maintainer Sprint 9

## Status

Closed in commit-ready state.

## Issue 1: Opportunity Detail Core Actions Used Local Generic Failure Copy

### Problem

After stage transitions moved to the Pipeline opportunity formatter, the same `useOpportunityDetail` hook still used local generic failure copy for deleting an opportunity, updating opportunity fields, and converting a won opportunity to an order. These actions are part of the same opportunity-detail command surface and should share the same operator-safe formatter boundary.

### Workflow Spine

Opportunity detail route
-> `OpportunityDetailContainer`
-> `useOpportunityDetail`
-> delete/update/convert opportunity mutation
-> opportunity/order server function
-> query/cache invalidation
-> operator-safe toast feedback.

### Touched Domains

- Pipeline opportunity detail delete/update/convert feedback.
- Pipeline opportunity mutation formatter action map.
- Pipeline opportunity feedback contract tests.
- Pipeline maintainer closeout docs.

### Business Value Protected

Deleting, editing, and converting opportunities affect sales pipeline state and order handoff. Operators need action-specific recovery copy without raw backend details when these commands fail.

### Scope Constraints

- Do not change delete/update/convert payloads, navigation, success copy, server functions, schemas, database predicates, query keys, cache invalidation, or order creation behavior.
- Keep this as opportunity detail core action feedback only. Kanban/list, quick dialog, bulk operations, and activity feedback remain separate slices.

### Changes

- Extended `PipelineOpportunityMutationAction` with `delete`, `update`, and `convertToOrder`.
- Added action-specific fallbacks for opportunity delete, update, and convert-to-order failures.
- Routed the three `useOpportunityDetail` catch branches through `formatPipelineOpportunityMutationError`.
- Extended the opportunity mutation feedback contract to cover these actions.

### Standards Checked

- Domain ownership: opportunity detail command feedback now uses the Pipeline opportunity formatter.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: checked opportunity detail route/container -> `useOpportunityDetail` -> delete/update/convert mutation hooks; server, schema, database, query-key, and cache policy stayed unchanged.
- Tenant isolation/data integrity: unchanged; no server predicates, schemas, or writes touched.
- Query/cache contract: unchanged; mutation invalidation stayed in the existing mutation hooks.
- Transactional inventory and finance integrity: unchanged; no inventory, fulfillment, finance, or costing path touched. Convert-to-order business behavior was not changed.
- Honest UI states/operator-safe errors: improved for opportunity delete, update, and convert-to-order failures.
- Reviewability: bounded diff across one formatter, one hook, one focused test, and this closeout.

### Smells Removed

- Local generic delete opportunity failure toast in `useOpportunityDetail`.
- Local generic update opportunity failure toast in `useOpportunityDetail`.
- Local generic convert-to-order failure toast in `useOpportunityDetail`.

### Deferred

- Pipeline kanban/list mutations, quick opportunity dialog feedback, bulk operations feedback, activity scheduling, and documents tab read-state copy remain separate workflow slices.
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

Low for opportunity detail command feedback. Moderate across Pipeline because kanban/list, quick dialog, bulk operations, and activity workflows still need separate bounded cleanup.
