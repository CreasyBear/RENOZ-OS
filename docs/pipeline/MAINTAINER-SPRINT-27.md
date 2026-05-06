# Pipeline Maintainer Sprint 27

## Status

Closed in commit-ready state.

## Issue 1: Quote Mutation Cache Invalidation Groups Were Repeated Inline

### Problem

Pipeline quote mutations repeated the same opportunity-list, quote-version/opportunity, and expiry cache invalidation groups across create, restore, expiration update, validity extension, and send flows. The invalidation breadth was already intentional, but the duplication made future quote cache changes hard to audit.

### Workflow Spine

Quote mutation hook
-> quote server function
-> shared quote cache invalidation helpers
-> quote versions, opportunity detail, opportunity lists, expiry alerts, documents, activities.

### Touched Domains

- Pipeline quote mutation hooks.
- Pipeline quote mutation cache contract tests.
- Pipeline maintainer closeout docs.

### Business Value Protected

Quote creation, restoration, expiry changes, PDF generation, and sending support pricing recovery and customer communication. Cache refresh behavior must remain consistent so operators do not see stale quote, opportunity, document, or activity state after quote writes.

### Scope Constraints

- Do not change mutation inputs, server functions, schemas, query keys, invalidation breadth, success semantics, error handling, UI rendering, or read hooks.
- Keep this as quote mutation cache invalidation deduplication only.

### Changes

- Added `invalidateOpportunityListCaches`.
- Added `invalidateQuoteVersionsAndOpportunity`.
- Added `invalidateQuoteExpiryCaches`.
- Replaced repeated quote mutation invalidation groups with the shared helpers.
- Added a focused source contract that preserves the repeated group call counts and cache-key families.

### Standards Checked

- Domain ownership: quote mutation cache behavior now has local helpers in the Pipeline quote mutation hook file.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: improved hook cache policy reviewability; server functions, schemas, database predicates, and query key shapes stayed unchanged.
- Tenant isolation/data integrity: unchanged; no server predicates, schemas, or writes touched.
- Query/cache contract: preserved invalidation breadth while removing repeated inline groups.
- Transactional inventory and finance integrity: unchanged; no inventory, fulfillment, order conversion, finance, or costing path touched.
- Honest UI states/operator-safe errors: unchanged; mutation feedback stayed centralized from prior sprints.
- Reviewability: bounded diff across one hook, focused tests, and this closeout.

### Smells Removed

- Repeated opportunity list invalidation group in quote mutations.
- Repeated quote versions + opportunity detail invalidation group in quote mutations.
- Repeated expiring + expired quote invalidation group in quote mutations.
- Missing source contract for quote mutation invalidation grouping.

### Deferred

- Broader Pipeline opportunity mutation invalidation audit remains separate.
- Browser QA remains deferred because this source-covered slice changes cache invalidation structure, not layout or interaction flow.
- Full `bun run test:unit` and `bun run build` remain deferred to larger release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/pipeline/quote-mutation-cache-contract.test.ts tests/unit/pipeline/use-quote-mutations.test.tsx tests/unit/pipeline/quote-mutation-feedback-contract.test.ts` - 3 files, 6 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for quote mutation invalidation helper ownership and single cache-key invalidation definitions.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The serialized-gates adaptation from Sprint 18 stands: serialized gates are conditional, not routine, and this sprint did not touch serial identity or inventory lineage.

### Residual Risk

Low for quote mutation invalidation duplication. Broader Pipeline opportunity mutation invalidation remains worth auditing, especially optimistic stage and convert-to-order invalidation.
