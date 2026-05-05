# Suppliers Maintainer Sprint 9

## Status

Closed in commit-ready state.

## Issue 1: Purchase Order Quantity Input Coercion

### Problem

The PO wizard quantity input used `parseInt(e.target.value) || 1`. That meant an operator-entered `0`, blank edit, or non-integer quantity could be silently coerced into `1` before the existing validation contract ran. The server schema requires integer quantities of at least one, and the client validation already has an honest "quantity greater than 0" message; the UI should not hide invalid input by rewriting it to a valid quantity.

### Workflow Spine

Purchase-order create route
-> `POCreationWizard`
-> line-item quantity/unit-price inputs
-> `PurchaseOrderFormData.items`
-> client validation
-> `useCreatePurchaseOrder`
-> purchase-order server create schema.

### Touched Domains

- Supplier purchase-order creation wizard.
- Supplier purchase-order creation workflow contract helper.
- Supplier purchase-order wizard contract tests.

### Business Value Protected

PO quantities become operator-honest. A bad quantity now reaches the same validation path that blocks invalid submissions instead of quietly becoming a purchasable quantity. This protects ordering accuracy for stock, samples, replacement lines, and supplier charges.

### Scope Constraints

- Do not change purchase-order create route search behavior, product lookup, custom-line naming, server create mutation, schemas, database writes, tenant predicates, query keys, cache invalidation, navigation, mutation feedback, review totals, or product unit-price defaulting.
- Keep the form model numeric.
- Preserve zero unit prices because zero-cost supplier lines are valid.

### Changes

- Added `parsePurchaseOrderQuantityInput` to the PO wizard contract helper.
- Added `parsePurchaseOrderUnitPriceInput` beside it so numeric parsing is contract-owned rather than inline component coercion.
- Replaced inline `parseInt(... ) || 1` and `parseFloat(... ) || 0` in the wizard.
- Added focused coverage for valid quantity parsing, invalid quantity preservation, zero unit prices, and source-contract wiring.

### Standards Checked

- Domain ownership: line-item numeric parsing lives in the supplier PO wizard contract beside validation and total calculation.
- Route -> container/page -> hook -> server -> schema/database -> query key/cache policy: preserved. This sprint only changes client-side input parsing before existing validation and mutation flow.
- Query/cache policy: no query keys, stale times, invalidations, optimistic updates, or cache writes changed.
- Tenant isolation/data integrity: no server function, auth boundary, organization predicate, database write, inventory transaction, finance persistence, or serialized lineage behavior changed.
- UI states/error handling: invalid quantity intent is no longer hidden by automatic coercion to `1`.
- Reviewability: the diff is limited to two helper functions, two wizard call sites, focused tests, and this closeout note.

### Smells Removed

- Inline numeric parsing inside the component.
- Quantity `0` and blank edits being converted to `1`.
- Decimal quantities being truncated by `parseInt` before the server integer schema could be mirrored by client validation.

### Deferred

- The wizard still stores numeric inputs as numbers, so a blank quantity displays as `0` rather than remaining visually blank while invalid. A richer input model would require a larger form-state slice.
- Browser QA was deferred because this is deterministic form-shaping behavior covered by contract tests and no route/server behavior changed.

### Gates

- Passed: focused wizard/create-page contract set, `./node_modules/.bin/vitest run tests/unit/suppliers/po-creation-wizard-contracts.test.ts tests/unit/purchase-orders/purchase-order-create-page-context.test.tsx` - 2 files, 13 tests.
- Passed: broader supplier/purchase-order suite, `./node_modules/.bin/vitest run tests/unit/suppliers tests/unit/purchase-orders` - 63 files, 191 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Passed: targeted source scan for numeric parser wiring and removed inline parse/coerce fallbacks.
- Note: the broader suite still emits the existing `--localstorage-file` jsdom warning; tests pass.
- Skipped: browser QA because this is deterministic form-shaping behavior with no intended route or visual layout change.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not deliberately change route casts, pending dialog guards, read-path query guard baselines, serialized lineage, inventory identity, serialized movement, warranty/RMA serial continuity, finance persistence, document generation, release packaging, or repair scripts.

### Goal Adaptation

Declined. The standing maintainer goal already covers honest UI states, mutation payload safety, workflow-owned contracts, meaningful tests, and risk-selected evidence.

### Residual Risk

Low for PO quantity input coercion. The remaining UX improvement would be a larger form-state pass that can represent blank numeric input separately from invalid numeric values.
