# Suppliers Maintainer Sprint 6

## Status

Closed in commit-ready state.

## Issue 1: Purchase Order Product Unit-Price Contract

### Problem

The purchase-order create route and wizard disagreed on how to derive a product's default PO unit price. The contextual route used nullish fallback for seeded items, while the wizard product picker used `product.costPrice || product.basePrice || 0`. The route also normalized numeric `0` prices to `null`. That could turn a legitimate zero-cost product, such as a warranty replacement or sample, into a base-price purchase-order line.

### Workflow Spine

Purchase-order create route
-> contextual product normalization
-> seeded PO line item
-> `POCreationWizard`
-> product picker unit-price display and selection
-> `useCreatePurchaseOrder`
-> purchase-order server create.

### Touched Domains

- Purchase-order create route.
- Supplier purchase-order creation wizard.
- Supplier purchase-order creation workflow contract helper.
- Supplier and purchase-order focused tests.

### Business Value Protected

Purchase-order unit prices drive procurement cost, receiving cost basis, landed cost, supplier performance, and downstream inventory/finance judgment. Zero-cost products are valid operationally for warranty replacements, samples, and internal adjustments; the UI must not silently replace them with base sale price before mutation.

### Scope Constraints

- Do not change submitted purchase-order payload shape, server create mutation, schemas, database writes, tenant predicates, query keys, cache invalidation, navigation, mutation feedback, line-item validation, review total calculation, or preferred supplier lookup.
- Keep persisted PO totals server-owned.
- Centralize UI default unit-price derivation without changing product catalog reads.

### Changes

- Added `getPurchaseOrderProductUnitPrice` to the PO wizard contract helper.
- Routed in-wizard product selection and product-search price display through the helper.
- Routed contextual product seeding through the helper.
- Changed route product normalization from truthy checks to nullish checks so numeric `0` survives as a product price value.
- Added focused coverage for zero-cost product unit-price derivation and contextual route seeding.

### Standards Checked

- Domain ownership: default PO unit-price derivation lives in the supplier purchase-order wizard contract beside the wizard and contextual create flow that consume it.
- Route -> container/page -> hook -> server -> schema/database -> query key/cache policy: preserved. This sprint only changed client-side defaulting before the existing create mutation.
- Query/cache policy: no query keys, stale times, invalidations, optimistic updates, or cache writes changed.
- Tenant isolation/data integrity: no server function, auth boundary, organization predicate, database write, inventory transaction, finance persistence, or serialized lineage behavior changed.
- Finance integrity: zero-cost product prices are preserved in UI defaults; server-side PO persistence and totals remain authoritative.
- UI states/error handling: no error surfaces changed.
- Reviewability: the diff is limited to one pricing helper, route/wizard call-site wiring, focused tests, and this closeout note.

### Smells Removed

- In-wizard `product.costPrice || product.basePrice || 0` fallback.
- Route product normalization that converted numeric `0` to `null`.
- Divergent contextual seeding vs picker-selection unit-price logic.
- Missing regression coverage for zero-cost product PO defaults.

### Deferred

- Product tax type, supplier-specific negotiated price, and price-list selection remain separate pricing concerns. This slice only preserves the product cost/base fallback already used by the existing PO creation UI.
- Browser QA was not selected because this is deterministic price defaulting with focused contract/page tests and no intended visual change.

### Gates

- Passed: focused wizard/create-page/query normalization set, `./node_modules/.bin/vitest run tests/unit/suppliers/po-creation-wizard-contracts.test.ts tests/unit/purchase-orders/purchase-order-create-page-context.test.tsx tests/unit/suppliers/query-normalization-wave7c.test.tsx tests/unit/suppliers/query-normalization-wave3b.test.tsx` - 4 files, 19 tests.
- Passed: broader supplier/procurement/purchase-order/approval suite, `./node_modules/.bin/vitest run tests/unit/suppliers tests/unit/procurement tests/unit/purchase-orders tests/unit/approvals` - 73 files, 219 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Passed: targeted source scan for removed `costPrice || basePrice` fallback and centralized unit-price helper wiring.
- Note: the broader suite still emits the existing `--localstorage-file` jsdom warning; tests pass.
- Skipped: browser QA because this is deterministic pricing-default behavior with no intended route or visual change.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not deliberately change route casts, pending dialog guards, read-path query guard baselines, serialized lineage, inventory identity, serialized movement, warranty/RMA serial continuity, finance persistence, document generation, release packaging, or repair scripts.

### Goal Adaptation

Declined. The standing maintainer goal already covers domain-owned contracts, finance integrity judgment, meaningful tests, and risk-selected evidence. The conditional serialized-gate policy still applies and was not reopened for this client-side pricing-default slice.

### Residual Risk

Low for PO create product unit-price defaulting. Broader procurement pricing still needs future workflow-level review around supplier price lists, tax type, and negotiated cost selection.
