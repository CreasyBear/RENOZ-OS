# Suppliers Maintainer Sprint 10

## Status

Closed in commit-ready state.

## Issue 1: Purchase Order Whole-Number Quantity Validation

### Problem

Sprint 9 stopped the PO wizard from silently coercing invalid quantity input into `1`, but decimal quantities were still collapsed into `0`. That protected submission, but it hid the real contract. The purchase-order server schema requires `quantity` to be an integer of at least one, so the client should preserve decimal quantity input long enough to show an accurate whole-number validation error.

### Workflow Spine

Purchase-order create route
-> `POCreationWizard`
-> line-item quantity input
-> `PurchaseOrderFormData.items`
-> client validation
-> purchase-order server create schema.

### Touched Domains

- Supplier purchase-order creation wizard contract helper.
- Supplier purchase-order wizard contract tests.

### Business Value Protected

PO quantity validation now tells operators what is actually wrong. Battery stock quantities, supplier charges, samples, and replacement lines cannot drift into fractional purchase quantities or misleading "greater than 0" errors when the real rule is whole-number quantity.

### Scope Constraints

- Do not change purchase-order create route behavior, product lookup, custom-line naming, server create mutation, schemas, database writes, tenant predicates, query keys, cache invalidation, navigation, mutation feedback, review totals, product unit-price defaulting, or the numeric input component.
- Keep zero and blank quantity edits invalid through the existing greater-than-zero message.
- Preserve zero unit prices because zero-cost supplier lines are valid.

### Changes

- Updated `parsePurchaseOrderQuantityInput` to preserve finite decimal numbers instead of converting them to `0`.
- Added a whole-number quantity validation branch in `getLineItemValidationError`.
- Added focused coverage for decimal quantity parsing and the exact whole-number validation message.

### Standards Checked

- Domain ownership: quantity parsing and validation remain in the supplier PO wizard contract helper.
- Route -> container/page -> hook -> server -> schema/database -> query key/cache policy: preserved. This sprint only changes client-side form validation before the existing create mutation.
- Query/cache policy: no query keys, stale times, invalidations, optimistic updates, or cache writes changed.
- Tenant isolation/data integrity: no server function, auth boundary, organization predicate, database write, inventory transaction, finance persistence, or serialized lineage behavior changed.
- UI states/error handling: decimal quantity input now reaches an honest operator-facing validation message that mirrors the server integer schema.
- Reviewability: the diff is limited to one parser line, one validation branch, focused tests, and this closeout note.

### Smells Removed

- Decimal quantities being reported as a zero/blank quantity problem.
- Client validation not explicitly mirroring the server integer quantity schema.

### Deferred

- The wizard still stores numeric inputs as numbers, so blank quantity input displays as `0`. A richer blank-vs-invalid form-state model remains a separate slice.
- Browser QA was deferred because this is deterministic contract behavior covered by focused tests and no route/server behavior changed.

### Gates

- Passed: focused wizard/create schema contract set, `./node_modules/.bin/vitest run tests/unit/suppliers/po-creation-wizard-contracts.test.ts tests/unit/purchase-orders/purchase-order-create-page-context.test.tsx tests/unit/purchase-orders/create-purchase-order-schema.test.ts` - 3 files, 14 tests.
- Passed: broader supplier/purchase-order suite, `./node_modules/.bin/vitest run tests/unit/suppliers tests/unit/purchase-orders` - 63 files, 191 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Passed: targeted source scan for finite quantity parsing, whole-number validation, and preserved server integer schema.
- Note: the broader suite still emits the existing `--localstorage-file` jsdom warning; tests pass.
- Skipped: browser QA because this is deterministic form-validation behavior with no intended route or visual layout change.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not deliberately change route casts, pending dialog guards, read-path query guard baselines, serialized lineage, inventory identity, serialized movement, warranty/RMA serial continuity, finance persistence, document generation, release packaging, or repair scripts.

### Goal Adaptation

Declined. The standing maintainer goal already covers honest UI states, schema-aligned contracts, mutation payload safety, meaningful tests, and risk-selected evidence.

### Residual Risk

Low for PO whole-number quantity validation. Remaining PO wizard UX debt is the larger numeric form-state model, not this validation contract.
