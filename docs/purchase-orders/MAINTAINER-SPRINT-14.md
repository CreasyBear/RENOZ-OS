# Purchase Orders Maintainer Sprint 14

## Status

Closed in commit-ready state.

## Issue 1: Bulk Approval Row-Failure Safety

### Problem

`bulkApproveApprovals` captured caught exception text directly into `results.failed[].reason`. The current purchase-order list UI previews failed PO numbers rather than row reasons, but the server mutation contract itself could still serialize database, constraint, stack, or infrastructure copy to any future caller.

### Workflow Spine

Purchase-order list bulk approve
-> `getApprovalIdsForPurchaseOrders`
-> `useBulkApprove`
-> `bulkApproveApprovals`
-> `approveApprovalRecord`
-> safe approved/failed result
-> existing list toast and retry-selection behavior.

### Touched Domains

- Supplier approval server bulk mutation.
- Purchase-order bulk approval result contract.
- Bulk approval row-failure tests.

### Business Value Protected

Bulk approval is a high-volume supplier-order workflow. Partial failures should be safe to inspect, log, and eventually show in UI without leaking database internals or making approval cleanup feel brittle.

### Scope Constraints

- Do not change approval authorization, approval status transitions, final purchase-order status updates, approval ID resolution, route feedback, selection behavior, query keys, cache invalidation, or approval read hooks.
- Preserve `approved` and `failed` result shape.
- Keep detailed caught errors in server logs only; return safe row reasons to clients.

### Changes

- Added `approval-failure.ts` with `toBulkApprovalFailure` and approval-specific row fallback copy.
- Changed `bulkApproveApprovals` to push normalized `BulkApprovalFailure` rows instead of raw caught exception messages.
- Added focused coverage for unsafe infrastructure-message suppression, safe typed approval row reasons, and server wiring.

### Standards Checked

- Domain ownership: approval row-failure semantics now live beside supplier approval server functions.
- Route -> container/page -> hook -> server flow: unchanged.
- Query/cache policy: no query keys, invalidations, stale times, optimistic updates, or cache ownership changed.
- Tenant isolation/data integrity: no auth boundary, organization predicate, approval write, purchase-order status update, inventory side effect, or finance side effect changed.
- UI states/error handling: future callers of the bulk approve result no longer receive raw row exception text.
- Reviewability: the diff is limited to one server helper, one server mutation wiring change, focused tests, and this closeout note.

### Smells Removed

- Raw `error.message` serialization from `bulkApproveApprovals` row failures.
- Missing regression coverage for unsafe bulk approval row reason suppression.

### Deferred

- `useBulkReject` still has a client-side sequential fallback that captures local caught messages, but no current purchase-order route uses that hook. Treat it as an approvals-domain cleanup slice if bulk reject becomes operator-visible.
- Browser QA was not selected because this is a server result-contract hardening slice with no rendered UI change.

### Gates

- Passed: focused approval and purchase-order mutation contracts, `./node_modules/.bin/vitest run tests/unit/purchase-orders/bulk-approval-failure.test.ts tests/unit/purchase-orders/purchase-order-list-mutation-feedback-contract.test.ts tests/unit/purchase-orders/purchase-order-mutation-errors.test.ts tests/unit/approvals/query-normalization-wave3e.test.tsx tests/unit/approvals/query-normalization-wave3e-consumers.test.tsx` - 5 files, 14 tests.
- Passed: broader purchase-order/procurement/approval suite, `./node_modules/.bin/vitest run tests/unit/purchase-orders tests/unit/procurement tests/unit/approvals tests/unit/suppliers/use-purchase-orders.test.tsx tests/unit/suppliers/query-normalization-wave7c.test.tsx` - 39 files, 112 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for `toBulkApprovalFailure`, `BulkApprovalFailure`, removed raw `error.message` row reason, fallback copy, typed not-found/permission copy, and unsafe database-error suppression coverage.
- Note: the broader suite still emits the existing `--localstorage-file` jsdom warning; tests pass.
- Skipped: browser QA because this is server result-contract behavior with no route/layout/rendered change.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not deliberately change serialized lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or repair scripts.

### Goal Adaptation

Declined. The standing maintainer goal already covers safe mutation contracts, operator-safe errors, server/domain ownership, meaningful tests, and risk-selected evidence.

### Residual Risk

Low for bulk approve. The returned row reason is now safe even if a future UI chooses to display it. Bulk reject remains a separate unused hook cleanup candidate.
