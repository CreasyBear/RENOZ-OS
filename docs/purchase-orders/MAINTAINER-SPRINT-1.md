# Purchase Orders Maintainer Sprint 1

## Status

Closed in commit-ready state.

## Issue 1: List Mutation Feedback Safety

### Problem

The purchase-order list route surfaced raw mutation errors for single delete, bulk approve, bulk delete, and retry-delete failures. Bulk delete row failures also copied server-returned strings directly into the destructive alert. That left a supplier-intake workflow able to leak database or infrastructure details during routine cleanup and approval work.

### Workflow Spine

Purchase orders list route
-> selected purchase-order rows
-> delete, bulk approve, bulk delete, and retry handlers
-> supplier purchase-order and approval mutations
-> centralized supplier purchase-order list/status-count invalidation
-> operator-safe toast or row-level failure alert.

### Touched Domains

- Purchase-order list mutation feedback.
- Purchase-order mutation error formatting.
- Supplier purchase-order delete/bulk-delete cache contract tests.

### Business Value Protected

Purchase orders drive supplier intake, inbound stock planning, receiving, and warehouse readiness. Operators need deletion and approval failures to be safe and actionable without seeing database, Supabase, or internal exception text.

### Scope Constraints

- Do not change purchase-order server functions, schemas, status rules, approval resolution, or bulk-delete result shape.
- Do not change list filters, sorting, pagination, selection behavior, receiving dialogs, or success toasts.
- Do not change mutation invalidation policy.
- Do not reopen serialized gates as routine evidence for this purchase-order feedback slice.

### Changes

- Added `formatPurchaseOrderMutationError` and `formatPurchaseOrderBulkFailureReason` in `src/hooks/purchase-orders/_mutation-errors.ts`.
- Exported the formatter helpers from `src/hooks/purchase-orders/index.ts`.
- Routed single delete, bulk approve, bulk delete, and retry-delete failure toasts through the purchase-order formatter.
- Sanitized per-row bulk-delete failure reasons before storing them in `bulkDeleteFailures`.
- Added formatter tests and a source contract that pins formatter usage and the unchanged purchase-order list/status-count invalidation contract.

### Standards Checked

- Domain ownership: purchase-order mutation copy now lives in `src/hooks/purchase-orders/_mutation-errors.ts`.
- Route -> container/page -> hook -> server flow: the list route still orchestrates list actions; hooks still own mutation/cache behavior; server functions are unchanged.
- Query/cache policy: single delete and bulk delete still invalidate supplier purchase-order lists and status counts.
- Tenant isolation/data integrity: no server function, schema, tenant predicate, approval lookup, status transition, or transaction changed.
- Inventory/finance integrity: no receiving, inventory movement, valuation, landed-cost, or finance path changed.
- Serialized lineage: not touched; serialized gates are retired from routine closeout and were not relevant to this slice.
- UI states/error handling: unsafe mutation messages now fall back to purchase-order-owned copy; safe validation/not-found/permission copy remains available.
- Reviewability: the diff is limited to one formatter, one route call-site cluster, focused tests, and this closeout note.

### Smells Removed

- Raw `error.message` toast for single purchase-order delete.
- Raw `error.message` toast for bulk approve.
- Raw `error.message` toast for bulk delete.
- Raw `error.message` toast for retry bulk delete.
- Unsanitized per-row bulk-delete failure strings in the destructive alert.
- Missing purchase-order-owned mutation formatter.

### Deferred

- Purchase-order detail action toasts still use generic fallback copy and should be reviewed as a separate detail workflow slice.
- Bulk receive failure feedback remains owned by the receiving/procurement flow and was not changed here.
- Approval bulk failure summaries still show affected purchase-order numbers rather than per-reason copy; reason-level approval feedback should be a separate approval workflow decision if needed.
- Browser QA was not selected because this was source-covered toast/error wiring with no layout or interaction behavior change.

### Gates

- Passed: focused purchase-order mutation feedback contracts, `./node_modules/.bin/vitest run tests/unit/purchase-orders/purchase-order-mutation-errors.test.ts tests/unit/purchase-orders/purchase-order-list-mutation-feedback-contract.test.ts tests/unit/purchase-orders/query-normalization-wave3c-consumers.test.tsx tests/unit/purchase-orders/purchase-order-bulk-delete-result-contract.test.ts` - 4 files, 7 tests.
- Passed: `./node_modules/.bin/vitest run tests/unit/purchase-orders tests/unit/suppliers/bulk-delete-po.test.ts` - 25 files, 72 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for formatter usage, removed raw list mutation error-message paths, sanitized bulk-delete row failures, and preserved purchase-order list/status-count invalidations.
- Passed: `git diff --check`.
- Skipped: browser QA because this was source-covered mutation feedback wiring with no layout change.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not touch those contracts. Serialized gates are no longer routine evidence and should only reopen for deliberate serialized lineage, inventory identity, or invariant changes.

### Goal Adaptation

Declined. The standing maintainer goal already covers safe mutation contracts, operator-safe errors, procurement workflow ownership, meaningful tests, and risk-selected evidence.

### Residual Risk

The formatter is covered by unit tests and the route by source contract, not a live API rejection path or browser interaction. Backend error shapes outside the current extraction paths intentionally fall back to purchase-order-owned copy.
