# Pipeline Maintainer Sprint 71

## Status

Closed in commit-ready state.

## Issue 1: Bulk Stage Detail Cache Scope

### Problem

`useBulkUpdateOpportunityStage` invalidated `queryKeys.pipeline.all` after updating known opportunity IDs. That refreshed stale opportunity detail views, but it also hid a broad Pipeline-root cache refresh inside an otherwise well-scoped bulk mutation.

### Workflow Spine

Pipeline bulk stage action
-> `useBulkUpdateOpportunityStage`
-> `bulkUpdateOpportunityStage`
-> known opportunity records updated by ID
-> opportunity list, pipeline metrics, and affected opportunity detail cache families
-> operator-visible board/list/detail state refresh.

### Touched Domains

- Pipeline opportunity mutation hook.
- Pipeline opportunity mutation cache contracts.
- Pipeline sprint evidence.

### Business Value Protected

Bulk stage changes are sales pipeline control actions. Operators need list/board metrics and the edited opportunity details to refresh without invalidating every Pipeline query family, especially quote, document, activity, product, and customer sub-surfaces that the bulk stage mutation does not directly own.

### Scope Constraints

- Do not change `bulkUpdateOpportunityStage` server behavior, payloads, validation, stage rules, win/loss metadata, permissions, tenant predicates, optimistic update behavior, UI flow, or mutation feedback.
- Keep this sprint to cache invalidation for known bulk stage IDs.
- Do not broaden into jobs, dashboard, quote, activity, or board-container cache policies.

### Changes

- Added `invalidatePipelineOpportunityDetails(queryClient, opportunityIds)` to centralize affected detail refreshes.
- Replaced `queryKeys.pipeline.all` invalidation in `useBulkUpdateOpportunityStage` with explicit invalidation for each affected `queryKeys.pipeline.opportunity(id)`.
- Added a runtime hook contract covering list, infinite-list, metrics, affected detail refresh, and rejection of Pipeline-root invalidation.
- Extended the existing source contract to require the detail helper and reject `queryKeys.pipeline.all`.

### Standards Checked

- Domain ownership: bulk stage cache policy remains in `src/hooks/pipeline/use-opportunity-mutations.ts`.
- Route -> container/page -> hook -> server flow: unchanged; callers still use the same hook and server function.
- Query/cache policy: bulk stage now refreshes affected detail keys instead of the Pipeline root.
- Tenant isolation/data integrity: no server function, schema, permission, tenant predicate, stage update, or win/loss write changed.
- Inventory/finance integrity: no inventory, valuation, finance, fulfillment, customer, support, or warranty persistence changed.
- Serialized lineage: not touched; serialized gates remain retired from routine closeout.
- UI states/error handling: no visible UI state or feedback behavior changed.
- Reviewability: the diff is limited to one cache helper, focused tests, and this closeout note.

### Smells Removed

- Pipeline-root cache invalidation after known-ID bulk stage updates.

### Deferred

- Jobs cache invalidation remains the largest remaining root/predicate cluster and should be a dedicated jobs-domain sprint.
- Dashboard-level refreshes still intentionally span financial, pipeline, and customer analytics surfaces and need product-level review before narrowing.
- Browser QA remains deferred because this slice changes cache invalidation wiring only.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/pipeline/opportunity-bulk-stage-cache-contract.test.tsx tests/unit/pipeline/opportunity-mutation-cache-contract.test.ts tests/unit/pipeline/opportunity-mutation-feedback-contract.test.ts` - 3 files, 5 tests.
- Passed: `./node_modules/.bin/eslint src/hooks/pipeline/use-opportunity-mutations.ts tests/unit/pipeline/opportunity-bulk-stage-cache-contract.test.tsx tests/unit/pipeline/opportunity-mutation-cache-contract.test.ts --report-unused-disable-directives`.
- Passed: targeted source scan showing `queryKeys.pipeline.all` only in negative assertions for this slice.
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`.
- Passed: `git diff --check`.
- Skipped: browser QA, reliability, finance, document, release, deploy, and serialized gates because this slice did not touch those contracts.

### Goal Adaptation

Declined. The standing maintainer goal already covers centralized query keys, safe mutation/cache contracts, tenant/data-integrity checks, meaningful tests, reviewable diffs, and risk-selected evidence. The local-only posture remains in effect.

### Residual Risk

Low for bulk stage cache scope. Medium for broader Pipeline cache consistency because dashboard and jobs-related cross-surfaces still have root invalidations that require separate domain review.
