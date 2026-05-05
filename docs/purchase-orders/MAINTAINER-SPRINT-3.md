# Purchase Orders Maintainer Sprint 3

## Status

Closed in commit-ready state.

## Issue 1: PO Cost Mutation Feedback Safety

### Problem

`POCostsTab` used generic failure copy for add, update, and delete cost mutations. The cost hooks and server functions already protect tenant scope and landed-cost allocation cache invalidation, but the UI discarded safe validation, permission, auth, rate-limit, and not-found context that could help operators recover from failed cost edits.

### Workflow Spine

Purchase-order detail costs tab
-> add/edit/delete cost handlers
-> supplier PO cost mutation hooks
-> PO cost server functions
-> cost list and allocated-cost cache invalidation
-> operator-safe landed-cost mutation toast.

### Touched Domains

- Purchase-order cost mutation feedback.
- Landed-cost tab mutation source contract.
- Purchase-order cost cache-contract evidence.

### Business Value Protected

Additional PO costs feed landed-cost visibility for supplier orders and inventory valuation decisions. Operators need cost mutation failures to be safe and actionable so freight, duty, insurance, and handling costs are not silently stuck behind generic dead-end copy.

### Scope Constraints

- Do not change PO cost server functions, schemas, tenant predicates, amount parsing, allocation methods, allocation math, or read-state behavior.
- Do not change success toasts, dialog open/close behavior, delete confirmation behavior, read-only status policy, or table rendering.
- Do not change cost or allocated-cost cache invalidation policy.
- Do not reopen serialized gates as routine evidence for this landed-cost feedback slice.

### Changes

- Imported `formatPurchaseOrderMutationError` into `POCostsTab`.
- Routed add/update cost failure toasts through the purchase-order formatter.
- Routed delete cost failure toasts through the purchase-order formatter.
- Added a source contract that pins formatter usage and the unchanged PO cost/allocated-cost invalidation spine.

### Standards Checked

- Domain ownership: cost mutation feedback reuses the purchase-order formatter introduced in Sprint 1.
- Route -> container/page -> hook -> server flow: the costs tab still owns UI action orchestration; supplier hooks still own mutation/cache behavior; server functions are unchanged.
- Query/cache policy: add, update, and delete mutations still invalidate `purchaseOrderCosts` and `purchaseOrderAllocatedCosts`.
- Tenant isolation/data integrity: no server function, schema, tenant predicate, amount handling, allocation method, or transaction changed.
- Inventory/finance integrity: landed-cost cache refresh behavior is preserved; valuation/allocation math is untouched.
- Serialized lineage: not touched; serialized gates are retired from routine closeout and were not relevant to this slice.
- UI states/error handling: safe validation/not-found/permission copy can now reach landed-cost operators; unsafe infrastructure messages still fall back to purchase-order-owned copy.
- Reviewability: the diff is limited to one costs-tab import/catch cluster, one source contract, and this closeout note.

### Smells Removed

- Generic add-cost failure feedback.
- Generic update-cost failure feedback.
- Generic delete-cost failure feedback.
- Discarded PO cost mutation errors.
- Mutation feedback drift between purchase-order detail/list actions and landed-cost actions.

### Deferred

- Purchase-order create page feedback still has its own page-level pattern and should be reviewed separately.
- PO cost read-state copy still renders normalized hook messages directly; a read-state-specific formatter can be a separate slice if broader purchase-order read feedback is standardized.
- Goods receipt dialog feedback remains owned by receiving/procurement and was not changed here.
- Browser QA was not selected because this was source-covered toast/error wiring with no layout or interaction behavior change.

### Gates

- Passed: focused PO cost mutation feedback contracts, `./node_modules/.bin/vitest run tests/unit/purchase-orders/po-cost-mutation-feedback-contract.test.ts tests/unit/purchase-orders/purchase-order-mutation-errors.test.ts tests/unit/purchase-orders/po-cost-mutation-tenant-scope-contract.test.ts tests/unit/purchase-orders/query-normalization-wave3d-consumers.test.tsx tests/unit/purchase-orders/query-normalization-wave3d.test.tsx` - 5 files, 20 tests.
- Passed: `./node_modules/.bin/vitest run tests/unit/purchase-orders tests/unit/suppliers/bulk-delete-po.test.ts` - 27 files, 74 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for cost formatter usage, removed generic cost mutation toasts, removed discarded cost `catch {}` handlers, and preserved PO cost/allocated-cost invalidations.
- Passed: `git diff --check`.
- Note: the purchase-order consumer suite still emits the existing `--localstorage-file` jsdom warning; tests pass.
- Skipped: browser QA because this was source-covered mutation feedback wiring with no layout change.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not touch those contracts. Serialized gates are no longer routine evidence and should only reopen for deliberate serialized lineage, inventory identity, or invariant changes.

### Goal Adaptation

Declined. The standing maintainer goal already covers safe mutation contracts, operator-safe errors, procurement workflow ownership, finance/inventory integrity awareness, meaningful tests, and risk-selected evidence.

### Residual Risk

The costs tab is source-contracted rather than exercised through live add/edit/delete UI events or API rejection payloads. Backend error shapes outside the formatter extraction paths intentionally fall back to purchase-order-owned copy.
