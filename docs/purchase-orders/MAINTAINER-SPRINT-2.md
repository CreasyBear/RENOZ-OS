# Purchase Orders Maintainer Sprint 2

## Status

Closed in commit-ready state.

## Issue 1: Detail Lifecycle Mutation Feedback Safety

### Problem

`PODetailContainer` discarded mutation errors for submit, approve, reject, mark ordered, cancel, delete, and update actions. Operators always saw generic failure copy, even when the server returned safe validation, permission, auth, rate-limit, or not-found context. That made purchase-order detail recovery less actionable than the list route cleaned up in Sprint 1.

### Workflow Spine

Purchase-order detail route/container
-> lifecycle and edit handlers
-> supplier purchase-order mutation hooks
-> supplier server lifecycle/update functions
-> centralized purchase-order list, detail, status-count, and pending-approval invalidation
-> operator-safe detail mutation toast.

### Touched Domains

- Purchase-order detail lifecycle mutation feedback.
- Purchase-order update mutation feedback.
- Purchase-order mutation feedback source contracts.

### Business Value Protected

Purchase-order detail is where supplier intake moves from draft to approval, ordered, cancelled, deleted, or updated. Operators need safe and useful failure feedback when the order state changes underneath them, permissions block an action, or validation rejects a lifecycle transition.

### Scope Constraints

- Do not change purchase-order server functions, schemas, lifecycle rules, approval behavior, status transitions, or detail/edit form payloads.
- Do not change mutation success toasts, action buttons, dialogs, route-driven edit/receive behavior, or activity logging.
- Do not change mutation invalidation policy.
- Do not reopen serialized gates as routine evidence for this purchase-order feedback slice.

### Changes

- Imported `formatPurchaseOrderMutationError` into `PODetailContainer`.
- Replaced discarded `catch {}` handlers with `catch (error)` for seven detail actions.
- Routed submit, approve, reject, mark ordered, cancel, delete, and update failure toasts through the purchase-order formatter.
- Added a detail source contract that pins formatter usage and the existing purchase-order cache invalidation spine.

### Standards Checked

- Domain ownership: detail failure copy now reuses `src/hooks/purchase-orders/_mutation-errors.ts` from Sprint 1.
- Route -> container/page -> hook -> server flow: the detail container still owns action orchestration; supplier hooks still own mutation/cache behavior; server functions are unchanged.
- Query/cache policy: lifecycle/update hooks still invalidate list, status-count, detail, supplier, and pending-approval keys as before.
- Tenant isolation/data integrity: no server function, schema, tenant predicate, approval lookup, status transition, or transaction changed.
- Inventory/finance integrity: no receiving, inventory movement, valuation, landed-cost, or finance path changed.
- Serialized lineage: not touched; serialized gates are retired from routine closeout and were not relevant to this slice.
- UI states/error handling: safe validation/not-found/permission copy can now reach detail operators; unsafe infrastructure messages still fall back to purchase-order-owned copy.
- Reviewability: the diff is limited to one detail container import/catch cluster, one source contract, and this closeout note.

### Smells Removed

- Discarded submit-for-approval mutation error.
- Discarded approve mutation error.
- Discarded reject mutation error.
- Discarded mark-ordered mutation error.
- Discarded cancel mutation error.
- Discarded delete mutation error.
- Discarded update mutation error.
- Detail/list drift in purchase-order mutation feedback.

### Deferred

- Purchase-order create page feedback still has its own page-level pattern and should be reviewed separately.
- PO costs tab mutation feedback still uses generic cost copy and remains a separate landed-cost workflow slice.
- Goods receipt dialog still has its own receive-goods feedback path and should stay owned by receiving/procurement.
- Browser QA was not selected because this was source-covered toast/error wiring with no layout or interaction behavior change.

### Gates

- Passed: focused purchase-order detail mutation feedback contracts, `./node_modules/.bin/vitest run tests/unit/purchase-orders/purchase-order-detail-mutation-feedback-contract.test.ts tests/unit/purchase-orders/purchase-order-mutation-errors.test.ts tests/unit/purchase-orders/purchase-order-list-mutation-feedback-contract.test.ts tests/unit/purchase-orders/purchase-order-draft-mutation-result-contract.test.ts tests/unit/purchase-orders/purchase-order-lifecycle-write-result-contract.test.ts` - 5 files, 8 tests.
- Passed: `./node_modules/.bin/vitest run tests/unit/purchase-orders tests/unit/suppliers/bulk-delete-po.test.ts` - 26 files, 73 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for detail formatter usage, removed discarded `catch {}` handlers, preserved lifecycle/update fallback labels, and preserved purchase-order list/status/detail/pending-approval invalidations.
- Passed: `git diff --check`.
- Note: the purchase-order consumer suite still emits the existing `--localstorage-file` jsdom warning; tests pass.
- Skipped: browser QA because this was source-covered mutation feedback wiring with no layout change.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not touch those contracts. Serialized gates are no longer routine evidence and should only reopen for deliberate serialized lineage, inventory identity, or invariant changes.

### Goal Adaptation

Declined. The standing maintainer goal already covers safe mutation contracts, operator-safe errors, procurement workflow ownership, meaningful tests, and risk-selected evidence.

### Residual Risk

The detail route is source-contracted rather than exercised through live button clicks or API rejection payloads. Backend error shapes outside the formatter extraction paths intentionally fall back to purchase-order-owned copy.
