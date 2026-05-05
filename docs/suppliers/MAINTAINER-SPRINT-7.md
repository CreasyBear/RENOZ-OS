# Suppliers Maintainer Sprint 7

## Status

Closed in commit-ready state.

## Issue 1: Purchase Order Custom Line Product Identity

### Problem

The PO wizard's "Add custom item without product" action only changed `productName` to `Custom Item`. If the row previously represented a product-backed line, the submitted item could still carry `productId`, `productSku`, and product description while looking custom to the operator. That creates a mismatch between UI intent and the mutation payload.

### Workflow Spine

Purchase-order create route
-> `POCreationWizard`
-> line-item product picker
-> custom item conversion
-> submitted `PurchaseOrderFormData.items`
-> `useCreatePurchaseOrder`
-> purchase-order server create.

### Touched Domains

- Supplier purchase-order creation wizard.
- Supplier purchase-order creation workflow contract helper.
- Supplier purchase-order wizard contract tests.

### Business Value Protected

Custom PO lines are useful for freight, samples, adjustments, warranty replacements, and supplier charges that should not be linked to a product catalog item. The UI should not submit stale product identity when an operator explicitly chooses "without product."

### Scope Constraints

- Do not change purchase-order create route search behavior, product lookup, server create mutation, schemas, database writes, tenant predicates, query keys, cache invalidation, navigation, mutation feedback, line-item validation, review total calculation, or product unit-price defaulting.
- Keep custom-line conversion client-side and explicit.
- Preserve operator-entered quantity, unit price, and notes when converting to a custom item.

### Changes

- Added `CUSTOM_PURCHASE_ORDER_ITEM_NAME` and `createCustomPurchaseOrderItem` to the PO wizard contract helper.
- Routed the "Add custom item without product" action through the helper.
- The helper strips product identity and product description while preserving quantity, unit price, and notes.
- Added focused coverage for product-backed-to-custom conversion and source-contract wiring.

### Standards Checked

- Domain ownership: custom-line conversion lives in the supplier purchase-order wizard contract beside the UI that consumes it.
- Route -> container/page -> hook -> server -> schema/database -> query key/cache policy: preserved. This sprint only changed client-side line-item form shaping before the existing create mutation.
- Query/cache policy: no query keys, stale times, invalidations, optimistic updates, or cache writes changed.
- Tenant isolation/data integrity: no server function, auth boundary, organization predicate, database write, inventory transaction, finance persistence, or serialized lineage behavior changed.
- UI states/error handling: the custom-line action now matches the operator-facing label by removing product identity.
- Reviewability: the diff is limited to one helper, one wizard call site, focused tests, and this closeout note.

### Smells Removed

- Inline custom-item update that only changed `productName`.
- Stale product id/SKU/description risk when converting a product-backed PO line into a custom line.
- Missing regression coverage for custom PO line form shaping.

### Deferred

- The wizard still deserves future workflow-level review for product lookup ergonomics and custom item naming, but this slice only fixes identity correctness.
- Browser QA was not selected because this is deterministic form-shaping behavior with focused contract coverage and no intended visual change.

### Gates

- Passed: focused wizard/create-page/query normalization set, `./node_modules/.bin/vitest run tests/unit/suppliers/po-creation-wizard-contracts.test.ts tests/unit/purchase-orders/purchase-order-create-page-context.test.tsx tests/unit/suppliers/query-normalization-wave7c.test.tsx tests/unit/suppliers/query-normalization-wave3b.test.tsx` - 4 files, 20 tests.
- Passed: broader supplier/procurement/purchase-order/approval suite, `./node_modules/.bin/vitest run tests/unit/suppliers tests/unit/procurement tests/unit/purchase-orders tests/unit/approvals` - 73 files, 220 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Passed: targeted source scan for removed inline custom-item update and helper wiring.
- Note: the broader suite still emits the existing `--localstorage-file` jsdom warning; tests pass.
- Skipped: browser QA because this is deterministic form-shaping behavior with no intended route or visual change.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not deliberately change route casts, pending dialog guards, read-path query guard baselines, serialized lineage, inventory identity, serialized movement, warranty/RMA serial continuity, finance persistence, document generation, release packaging, or repair scripts.

### Goal Adaptation

Adopted runtime posture. Serialized gates are retired as routine sprint evidence; the standing process already records that they only reopen for deliberate serialized lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or repair-script work. No additional goal text change was needed for this client-side form-shaping slice.

### Residual Risk

Low for custom PO line product identity. The next useful PO wizard slice should come from a concrete operator workflow, such as custom item naming or product search behavior, rather than broad component splitting.
