# Suppliers Maintainer Sprint 5

## Status

Closed in commit-ready state.

## Issue 1: Purchase Order Wizard Line-Item Row Identity

### Problem

The purchase-order creation wizard rendered editable line-item cards with `key={index}`. Each `LineItemCard` owns local product-search state, including search text and whether the product picker is visible. Removing an earlier row could cause React to reuse that local state for the next purchase-order item, making the operator edit the wrong-looking row state during PO creation.

### Workflow Spine

Purchase-order create route
-> `POCreationWizard`
-> line-item entry
-> product search state inside each editable line-item card
-> review
-> `useCreatePurchaseOrder`
-> purchase-order server create.

### Touched Domains

- Supplier purchase-order creation wizard.
- Supplier purchase-order creation workflow contract helper.
- Supplier purchase-order wizard contract tests.

### Business Value Protected

Purchase-order line items feed procurement, receiving, landed cost, inventory availability, and supplier performance. Row-local UI state should stay attached to the intended line while operators add, remove, and edit order items. This reduces order-entry confusion before the purchase order becomes operational inventory work.

### Scope Constraints

- Do not change submitted purchase-order payload shape, server create mutation, schemas, database writes, tenant predicates, query keys, cache invalidation, navigation, mutation feedback, line-item validation, or review total calculation.
- Keep row identity client-only and out of `PurchaseOrderFormData`.
- Preserve existing add, update, remove, and contextual seeded-item behavior.

### Changes

- Added `createPurchaseOrderLineItemKey` and `buildInitialPurchaseOrderLineItemKeys` to the PO wizard contract helper.
- Added client-only line-item key state in `POCreationWizard`, seeded from initial items and maintained when rows are added or removed.
- Keyed editable `LineItemCard` rows from the client-key array instead of array index.
- Removed the remaining bare `key={index}` in the wizard review table.
- Extended focused contract coverage for client row keys and source wiring.

### Standards Checked

- Domain ownership: row identity lives in the supplier purchase-order wizard contract, beside the UI that consumes it.
- Route -> container/page -> hook -> server -> schema/database -> query key/cache policy: preserved. This sprint only changed client-side row rendering identity.
- Query/cache policy: no query keys, stale times, invalidations, optimistic updates, or cache writes changed.
- Tenant isolation/data integrity: no server function, auth boundary, organization predicate, database write, inventory transaction, finance persistence, or serialized lineage behavior changed.
- UI states/error handling: line-item card local state now follows stable client row identity through row removals.
- Reviewability: the diff is limited to row-key helpers, wizard key state wiring, focused test updates, and this closeout note.

### Smells Removed

- Editable PO line-item card `key={index}`.
- Bare review-table `key={index}` in the wizard.
- Missing regression coverage for PO wizard row identity.

### Deferred

- `po-creation-wizard.tsx` remains a large UI file. Future extraction should target concrete operator flows, such as product lookup ergonomics or order details editing, not broad component splitting.
- Browser QA was not selected because this is a React row-identity correctness slice with focused contract and source coverage, not an intended visual/layout change.

### Gates

- Passed: focused wizard/create-page/query normalization set, `./node_modules/.bin/vitest run tests/unit/suppliers/po-creation-wizard-contracts.test.ts tests/unit/purchase-orders/purchase-order-create-page-context.test.tsx tests/unit/suppliers/query-normalization-wave7c.test.tsx tests/unit/suppliers/query-normalization-wave3b.test.tsx` - 4 files, 17 tests.
- Passed: broader supplier/procurement/purchase-order/approval suite, `./node_modules/.bin/vitest run tests/unit/suppliers tests/unit/procurement tests/unit/purchase-orders tests/unit/approvals` - 73 files, 217 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Passed: targeted source scan for removed bare `key={index}` and line-item key helper wiring.
- Note: the broader suite still emits the existing `--localstorage-file` jsdom warning; tests pass.
- Skipped: browser QA because this is row identity behavior with no intended route or visual change.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not deliberately change route casts, pending dialog guards, read-path query guard baselines, serialized lineage, inventory identity, serialized movement, warranty/RMA serial continuity, finance persistence, document generation, release packaging, or repair scripts.

### Goal Adaptation

Declined. The standing maintainer goal already covers small domain-sliced cleanup, reviewable boundaries, honest UI behavior, meaningful tests, and risk-selected evidence. The conditional serialized-gate policy still applies and was not reopened for this client-only UI row identity slice.

### Residual Risk

Low for editable PO line-item row identity. The wizard still has structural weight, but the next extraction should be driven by a specific operator failure or hard-to-test workflow.
