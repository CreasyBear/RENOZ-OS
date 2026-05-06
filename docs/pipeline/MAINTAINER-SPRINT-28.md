# Pipeline Maintainer Sprint 28

## Status

Closed in commit-ready state.

## Issue 1: Opportunity Mutation Metrics Invalidation Was Repeated Inline

### Problem

`use-opportunity-mutations` already centralized opportunity list invalidation, but every opportunity mutation still invalidated Pipeline metrics inline. Create, update, delete, stage change, bulk stage change, and convert-to-order all share that metrics refresh requirement, so keeping it scattered made cache policy harder to audit.

### Workflow Spine

Opportunity mutation hook
-> opportunity server function
-> shared opportunity list + Pipeline metrics invalidation helpers
-> opportunity lists/details/orders/metrics caches.

### Touched Domains

- Pipeline opportunity mutation hooks.
- Pipeline opportunity mutation cache contract tests.
- Pipeline maintainer closeout docs.

### Business Value Protected

Opportunity mutations change sales pipeline totals, stage distribution, and conversion state. Metrics refresh must stay consistent across all opportunity writes so operators see current pipeline value and counts.

### Scope Constraints

- Do not change mutation inputs, server functions, schemas, query keys, invalidation breadth, optimistic update behavior, rollback behavior, success semantics, error handling, UI rendering, or read hooks.
- Keep this as opportunity mutation metrics invalidation deduplication only.

### Changes

- Typed the existing opportunity list invalidation helper with `QueryClient`.
- Added `invalidatePipelineMetrics(queryClient)`.
- Replaced six inline Pipeline metrics invalidations with the shared helper.
- Added a focused source contract for opportunity list and metrics invalidation helper ownership.

### Standards Checked

- Domain ownership: opportunity mutation metrics refresh behavior now has a local helper in the Pipeline opportunity mutation hook file.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: improved hook cache policy reviewability; server functions, schemas, database predicates, query keys, optimistic updates, and rollback behavior stayed unchanged.
- Tenant isolation/data integrity: unchanged; no server predicates, schemas, or writes touched.
- Query/cache contract: preserved invalidation breadth while centralizing repeated metrics invalidation.
- Transactional inventory and finance integrity: unchanged; no inventory, fulfillment, order conversion, finance, or costing path touched.
- Honest UI states/operator-safe errors: unchanged; mutation feedback stayed centralized from prior sprints.
- Reviewability: bounded diff across one hook, focused tests, and this closeout.

### Smells Removed

- Six repeated inline Pipeline metrics invalidations across opportunity mutations.
- Loose helper typing via `ReturnType<typeof useQueryClient>`.
- Missing source contract for opportunity mutation metrics invalidation helper ownership.

### Deferred

- Deeper opportunity mutation invalidation audit remains separate, including whether detail/order/list invalidation breadth should be adjusted.
- Browser QA remains deferred because this source-covered slice changes cache invalidation structure, not layout or interaction flow.
- Full `bun run test:unit` and `bun run build` remain deferred to larger release/predeploy sweeps.

### Verification

- Failed then corrected: `bun run test:vitest tests/unit/pipeline/opportunity-mutation-cache-contract.test.ts tests/unit/pipeline/opportunity-mutation-feedback-contract.test.ts` initially overcounted existing `infiniteLists()` references in the new source contract.
- Passed after correction: `bun run test:vitest tests/unit/pipeline/opportunity-mutation-cache-contract.test.ts tests/unit/pipeline/opportunity-mutation-feedback-contract.test.ts` - 2 files, 4 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for opportunity mutation invalidation helper ownership and single Pipeline metrics invalidation definition.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The serialized-gates adaptation from Sprint 18 stands: serialized gates are conditional, not routine, and this sprint did not touch serial identity or inventory lineage.

### Residual Risk

Low for metrics invalidation duplication. Moderate for broader opportunity mutation cache policy because this sprint intentionally preserved, rather than re-evaluated, detail/order/list invalidation breadth.
