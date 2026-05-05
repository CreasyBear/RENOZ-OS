# Purchase Orders Maintainer Sprint 4

## Status

Closed in commit-ready state.

## Issue 1: Create Mutation Feedback Safety

### Problem

The purchase-order create route logged create failures and then placed raw `error.message` text into the operator-facing toast description. That made the entry point for supplier intake less safe than the list, detail, and landed-cost mutation surfaces standardized in the previous purchase-order sprints.

### Workflow Spine

Purchase-order create route
-> `POCreationWizard` submit
-> `useCreatePurchaseOrder`
-> supplier purchase-order create server function
-> purchase-order list and status-count cache invalidation
-> operator-safe create failure toast.

### Touched Domains

- Purchase-order creation mutation feedback.
- Purchase-order create route source contract.
- Purchase-order create cache-contract evidence.

### Business Value Protected

Creating purchase orders is the start of supplier intake and inbound stock planning. Failed creates should preserve safe validation or permission context where available without exposing internal exception text to operators.

### Scope Constraints

- Do not change purchase-order create server functions, schemas, tenant predicates, item mapping, contextual launch behavior, or navigation after success.
- Do not change supplier/product/preferred-price-list read behavior.
- Do not change create mutation invalidation policy.
- Do not reopen serialized gates as routine evidence for this create-feedback slice.

### Changes

- Imported `formatPurchaseOrderMutationError` into the purchase-order create route.
- Routed create failure toast description through the purchase-order formatter.
- Removed the raw `error instanceof Error ? error.message` toast-description path.
- Added a source contract that pins formatter usage and the unchanged create invalidation spine.

### Standards Checked

- Domain ownership: create failure copy reuses the purchase-order formatter introduced in Sprint 1.
- Route -> container/page -> hook -> server flow: the create route still maps wizard form data and calls `useCreatePurchaseOrder`; the hook still owns mutation/cache behavior; server functions are unchanged.
- Query/cache policy: create still invalidates supplier purchase-order lists and status counts.
- Tenant isolation/data integrity: no server function, schema, tenant predicate, item mapping, amount handling, or transaction changed.
- Inventory/finance integrity: no receiving, landed-cost, inventory movement, valuation, or finance path changed.
- Serialized lineage: not touched; serialized gates are retired from routine closeout and were not relevant to this slice.
- UI states/error handling: safe validation/not-found/permission copy can now reach create operators; unsafe infrastructure messages fall back to purchase-order-owned copy.
- Reviewability: the diff is limited to one route import/toast-description change, one source contract, and this closeout note.

### Smells Removed

- Raw `error.message` toast description in purchase-order creation.
- Generic `"An unexpected error occurred"` create fallback outside the purchase-order formatter.
- Create/list/detail/landed-cost mutation feedback drift.

### Deferred

- Goods receipt dialog feedback remains owned by receiving/procurement and was not changed here.
- Purchase-order read-state standardization remains separate from mutation feedback.
- Browser QA was not selected because this was source-covered toast/error wiring with no layout or interaction behavior change.

### Gates

- Passed: focused purchase-order create mutation feedback contracts, `./node_modules/.bin/vitest run tests/unit/purchase-orders/purchase-order-create-mutation-feedback-contract.test.ts tests/unit/purchase-orders/purchase-order-mutation-errors.test.ts tests/unit/purchase-orders/purchase-order-create-page-context.test.tsx tests/unit/purchase-orders/purchase-order-create-tenant-scope-contract.test.ts tests/unit/purchase-orders/create-purchase-order-schema.test.ts` - 5 files, 9 tests.
- Passed: `./node_modules/.bin/vitest run tests/unit/purchase-orders tests/unit/suppliers/bulk-delete-po.test.ts` - 28 files, 75 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for create formatter usage, removed raw create `error.message` description, removed generic unexpected-error fallback, and preserved create list/status-count invalidations.
- Passed: `git diff --check`.
- Note: the purchase-order consumer suite still emits the existing `--localstorage-file` jsdom warning; tests pass.
- Skipped: browser QA because this was source-covered mutation feedback wiring with no layout change.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not touch those contracts. Serialized gates are no longer routine evidence and should only reopen for deliberate serialized lineage, inventory identity, or invariant changes.

### Goal Adaptation

Declined. The standing maintainer goal already covers safe mutation contracts, operator-safe errors, procurement workflow ownership, meaningful tests, and risk-selected evidence.

### Residual Risk

The create route is source-contracted rather than exercised through a live wizard submission or API rejection payload. Backend error shapes outside the formatter extraction paths intentionally fall back to purchase-order-owned copy.
