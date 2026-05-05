# Purchase Orders Maintainer Sprint 15

## Status

Closed in commit-ready state.

## Issue 1: Exported Bulk Reject Row-Failure Safety

### Problem

Sprint 14 hardened server-side bulk approval row failures but left `useBulkReject` as an exported hook that still captured local caught exception text into `failed[].reason`. No current purchase-order route uses that hook, but exported mutation contracts should not wait for a UI to start displaying unsafe row reasons.

### Workflow Spine

Future approval bulk reject caller
-> `useBulkReject`
-> `rejectPurchaseOrderAtLevel`
-> local per-row success/failure aggregation
-> safe rejected/failed result
-> existing approval and purchase-order cache invalidation.

### Touched Domains

- Supplier approval mutation hook.
- Approval bulk row-failure formatter.
- Approval hook tests.

### Business Value Protected

Approval bulk actions are operational cleanup paths. If bulk reject becomes operator-visible, failed-row reasons should already be safe to display and should not leak database, constraint, stack, or infrastructure copy.

### Scope Constraints

- Do not change approval rejection server behavior, schemas, route behavior, exported hook names, query keys, cache invalidation, approval authorization, purchase-order status transitions, or approval read hooks.
- Preserve `rejected` and `failed` result shape.
- Keep `useBulkReject` sequential behavior unchanged; only normalize failed-row reason copy.

### Changes

- Added `approval-mutation-errors.ts` with `formatApprovalBulkFailureReason`.
- Changed `useBulkReject` to use the approval formatter instead of raw `error.message`.
- Added focused coverage proving unsafe database-style errors return safe row reasons, typed not-found approval copy is preserved, and the hook remains wired to the formatter.

### Standards Checked

- Domain ownership: approval mutation feedback now has a supplier approval-owned client helper.
- Route -> container/page -> hook -> server flow: no current route flow changed; the exported hook contract is now safer for future callers.
- Query/cache policy: no query keys, invalidations, stale times, optimistic updates, or cache ownership changed.
- Tenant isolation/data integrity: no server function, auth boundary, organization predicate, approval write, purchase-order status update, inventory side effect, or finance side effect changed.
- UI states/error handling: future callers of `useBulkReject` no longer receive raw row exception text.
- Reviewability: the diff is limited to one hook helper, one hook row-reason line, focused tests, and this closeout note.

### Smells Removed

- Raw `error.message` capture from exported `useBulkReject` row failures.
- Sprint 14 residual risk around the unused bulk reject hook.

### Deferred

- There is still no route-level bulk reject workflow to dogfood. If one is added later, it should get UI-level feedback tests and workflow QA.
- Browser QA was not selected because this exported hook is not currently route-visible and no rendered UI changed.

### Gates

- Passed: focused approval hook/server contracts, `./node_modules/.bin/vitest run tests/unit/approvals/bulk-reject-failure.test.tsx tests/unit/purchase-orders/bulk-approval-failure.test.ts tests/unit/approvals/query-normalization-wave3e.test.tsx tests/unit/approvals/query-normalization-wave3e-consumers.test.tsx` - 4 files, 12 tests.
- Passed: broader purchase-order/procurement/approval suite, `./node_modules/.bin/vitest run tests/unit/purchase-orders tests/unit/procurement tests/unit/approvals tests/unit/suppliers/use-purchase-orders.test.tsx tests/unit/suppliers/query-normalization-wave7c.test.tsx` - 40 files, 115 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for `formatApprovalBulkFailureReason`, helper ownership, removed raw `error.message` row reason, fallback copy, typed not-found copy, and unsafe database-error suppression coverage.
- Note: the broader suite still emits the existing `--localstorage-file` jsdom warning; tests pass.
- Skipped: browser QA because this is exported hook result-contract behavior with no route/layout/rendered change.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not deliberately change serialized lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or repair scripts.

### Goal Adaptation

Declined. The standing maintainer goal already covers safe mutation contracts, operator-safe errors, hook/server ownership, meaningful tests, and risk-selected evidence.

### Residual Risk

Low. `useBulkReject` is safer as an exported hook, but a future route-level bulk reject UX will still need explicit operator feedback and workflow tests.
