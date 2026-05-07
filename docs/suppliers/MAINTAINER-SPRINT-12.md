# Suppliers Maintainer Sprint 12: Approval Type Filter Contract

## Status

Closed in commit-ready state.

## Issue 1: Purchase-Order Approval Type Filter Was Rejected

### Problem

The approval route and schemas already preserve `purchase_order` as a valid approval type value, but the server list functions rejected every non-`all` type with a "not implemented" validation error. Since persisted approvals are currently purchase-order approvals, `purchase_order` should be a supported no-op filter. Only stale or future unsupported values such as `amendment` should be rejected or normalized.

### Workflow Spine

Approvals route search
-> approvals page filters
-> `usePendingApprovals`
-> `listPendingApprovals` / cursor list
-> purchase-order approval query
-> centralized approval query key and safe read state.

### Touched Domains

- Suppliers / purchase-order approvals.
- Approvals route search and page filters.
- Approval query/read tests.

### Business Value Protected

Approvals are part of procurement control. Operators should not hit a server validation error for the only approval type the product currently supports, especially when stale URLs or future filter UI carry that value through the route.

### Scope Constraints

- Do not add amendment approvals.
- Do not change approval query joins, status filtering, priority filtering, search behavior, pagination, cursor semantics, permission checks, mutations, approval rules, schemas, database tables, or cache invalidation.
- Keep unsupported amendment URLs normalized by the page.

### Changes

- Added `assertSupportedApprovalTypeFilter` in the supplier approvals server functions.
- Treated `purchase_order` as a supported no-op filter in both page and cursor list functions.
- Preserved explicit unsupported handling for `amendment`.
- Routed `purchase_order` route search state through the approvals page into `usePendingApprovals`.
- Added an approval type filter contract test.
- Repaired stale approvals consumer test mocks for `useBulkReject` and updated the detail-error expectation to the current safe fallback copy.

### Standards Checked

- Domain ownership: approval type support lives in the supplier approvals server function and route page, not in ad hoc hook workarounds.
- Route -> page -> hook -> server function -> schema/database -> query key/cache policy: preserved and clarified.
- Query/cache policy: existing `queryKeys.approvals.pending(filters)` behavior is preserved; the supported type now participates honestly in filters.
- Tenant isolation/data integrity: unchanged. Organization-scoped approval reads and joins were not changed.
- UI states/error handling: improved. Supported purchase-order filters no longer trigger unsupported validation failures.
- Reviewability: one server helper, one page filter path, one focused contract, and stale test repair.

### Smells Removed

- "Type filtering not implemented" server rejection for the current persisted approval type.
- Route search state that accepted `purchase_order` but collapsed it before the hook/server boundary.
- Stale consumer test mock missing `useBulkReject`.

### Deferred

- Amendment approval support remains out of scope and still requires a real schema/database/product workflow before enabling.
- Approval dashboard UI still does not expose a type filter, because only purchase-order approvals are currently supported.
- Browser QA was not selected because this is route/server filter contract behavior with no intended layout change.

### Gates

- Passed: `bun run test:vitest tests/unit/approvals/approval-type-filter-contract.test.ts tests/unit/approvals/query-normalization-wave3e-consumers.test.tsx tests/unit/approvals/query-normalization-wave3e.test.tsx tests/unit/root-input-normalization-sweep.test.ts` - 4 files, 79 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted scan confirming the old server-side type-filter not-implemented path is gone.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. This is a direct application of the standing maintainer goal: clear route-to-server contract, honest UI/server state, and reviewable domain-sliced cleanup. Serialized gates are retired and were not part of this closeout.

### Residual Risk

Low for purchase-order approval type filtering. Medium for future approval types: enabling amendments should wait for a real data model and product workflow instead of reusing this no-op path.
