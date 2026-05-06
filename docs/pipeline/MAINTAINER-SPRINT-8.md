# Pipeline Maintainer Sprint 8

## Status

Closed in commit-ready state.

## Issue 1: Opportunity Detail Stage Changes Used Local Generic Failure Copy

### Problem

`useOpportunityDetail` owns stage transitions for the opportunity detail workflow, including normal stage advancement and won/lost confirmation. Both mutation failure branches used local `Failed to update stage` copy. Stage changes already rely on optimistic locking, so failure feedback should preserve safe conflict, validation, and permission guidance without exposing backend details.

### Workflow Spine

Opportunity detail route
-> `OpportunityDetailContainer`
-> `useOpportunityDetail`
-> `useUpdateOpportunityStage`
-> opportunity stage server function
-> opportunity query/cache invalidation
-> operator-safe toast feedback.

### Touched Domains

- Pipeline opportunity detail stage feedback.
- Pipeline opportunity mutation formatter.
- Pipeline opportunity feedback contract tests.
- Pipeline maintainer closeout docs.

### Business Value Protected

Stage movement is the core sales pipeline workflow. Operators need clear feedback when an opportunity changed concurrently, is blocked by validation, or cannot be updated, especially when won/lost transitions affect reporting and follow-up.

### Scope Constraints

- Do not change stage transition payloads, won/lost dialog behavior, optimistic locking version lookup, server functions, schemas, database predicates, query keys, cache invalidation, or success copy.
- Keep this as opportunity detail stage feedback only. Delete, update, convert-to-order, kanban/list, and activity feedback remain separate slices.

### Changes

- Added `formatPipelineOpportunityMutationError` with stage-specific fallback and opportunity code messages.
- Exported the opportunity formatter from the Pipeline hooks barrel.
- Routed both opportunity detail stage mutation catch branches through the formatter.
- Added a focused opportunity mutation feedback contract test.

### Standards Checked

- Domain ownership: opportunity stage feedback now uses a Pipeline opportunity formatter.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: checked opportunity detail route/container -> `useOpportunityDetail` -> `useUpdateOpportunityStage`; server, schema, database, query-key, and cache policy stayed unchanged.
- Tenant isolation/data integrity: unchanged; no server predicates, schemas, or writes touched.
- Query/cache contract: unchanged; stage mutation invalidation stayed in `useUpdateOpportunityStage`.
- Transactional inventory and finance integrity: unchanged; no inventory, fulfillment, order conversion, finance, or costing path touched.
- Honest UI states/operator-safe errors: improved for normal stage advancement and won/lost confirmation failures.
- Reviewability: bounded diff across one formatter, one hook, one focused test, and this closeout.

### Smells Removed

- Two local generic `Failed to update stage` toasts in `useOpportunityDetail`.
- Missing Pipeline-owned opportunity mutation formatter for stage feedback.

### Deferred

- Opportunity delete, update, convert-to-order, kanban/list mutations, activity scheduling, and documents tab read-state copy remain separate workflow slices.
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

Low for opportunity detail stage feedback. Moderate across Pipeline because adjacent opportunity actions still have generic feedback and should be handled through separate bounded sprints.
