# Customers Maintainer Sprint 17

## Status

Closed in commit-ready state.

## Issue 1: Rollback Analytics Cache Scope

### Problem

Customer bulk rollback invalidated `queryKeys.customerAnalytics.all` after restoring customer records. Sprint 10 correctly made rollback refresh customer lists, details, health, and analytics, but the analytics refresh remained a domain-root invalidation because filtered customer analytics keys did not expose family prefixes.

### Workflow Spine

Customer bulk rollback action
-> `useRollbackBulkOperation`
-> `rollbackBulkOperation`
-> restored customer records
-> customer list/detail, health, bulk-operation history, and customer analytics cache families
-> operator-visible customer health and analytics projections refresh.

### Touched Domains

- Customer rollback mutation hook.
- Customer analytics query-key family prefixes.
- Customer rollback cache contract tests.

### Business Value Protected

Bulk rollback is the recovery path when customer data changes need to be reversed. After rollback, operators should see refreshed customer health and analytics projections without hiding the affected analytics surfaces behind a root cache invalidation.

### Scope Constraints

- Do not change rollback server functions, audit-log reads, restored-customer writes, mutation error formatting, customer list/detail/health cache behavior, toast behavior, or UI layout.
- Preserve existing concrete customer analytics query key shapes.
- Keep this sprint to rollback analytics cache scope.

### Changes

- Added customer analytics family prefixes for filtered analytics surfaces while preserving existing concrete key shapes.
- Replaced rollback `queryKeys.customerAnalytics.all` invalidation with explicit invalidation of customer analytics families.
- Added a focused rollback cache contract that verifies list, health, detail, and analytics family refreshes while rejecting customer analytics root invalidation.
- Updated the existing customer mutation source contract to pin the analytics helper and reject the root key.

### Standards Checked

- Domain ownership: rollback cache policy remains in `src/hooks/customers/use-rollback.ts`; analytics key families remain centralized in `src/lib/query-keys.ts`.
- Route -> container/page -> hook -> server flow: unchanged; rollback still calls the same server function and handles the same result shape.
- Query/cache policy: rollback now names every customer analytics family it refreshes instead of invalidating the analytics root.
- Tenant isolation/data integrity: no server function, schema, tenant predicate, audit-log lookup, customer restore write, or health metric write changed.
- Inventory/finance integrity: no inventory, valuation, finance, fulfillment, support, warranty, or pipeline persistence changed.
- Serialized lineage: not touched; serialized gates remain retired from routine closeout.
- UI states/error handling: rollback toast success/error behavior is unchanged.
- Reviewability: the diff is limited to query key prefixes, rollback cache invalidation, focused tests, and this closeout note.

### Smells Removed

- Customer analytics root invalidation from rollback success.
- Missing prefixes for filtered customer analytics cache families.

### Deferred

- Forward bulk health-score update analytics invalidation remains deferred from Sprint 10 and should be reviewed separately.
- Browser QA remains deferred because this slice changes cache invalidation wiring only, not visible layout or interaction behavior.
- Broader customer analytics read-state and dashboard UX cleanup remains separate domain work.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/customers/rollback-cache-contract.test.tsx tests/unit/customers/customer-mutation-errors.test.ts tests/unit/customers/query-normalization-wave2.test.tsx` - 3 files, 17 tests.
- Passed: `./node_modules/.bin/eslint src/hooks/customers/use-rollback.ts src/lib/query-keys.ts tests/unit/customers/rollback-cache-contract.test.tsx tests/unit/customers/customer-mutation-errors.test.ts --report-unused-disable-directives`.
- Passed: targeted source scan showing `queryKeys.customerAnalytics.all` only in negative assertions for this slice.
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`.
- Passed: `git diff --check`.
- Skipped: browser QA, reliability, finance, document, release, deploy, and serialized gates because this slice did not touch those contracts.

### Goal Adaptation

Declined. The standing maintainer goal already covers centralized query keys, safe mutation/cache contracts, tenant/data-integrity checks, meaningful tests, reviewable diffs, and risk-selected evidence. The local-only posture remains in effect.

### Residual Risk

Low for rollback analytics cache scope. Moderate for broader customer analytics freshness because other customer mutations may still need analytics-family refresh review.
