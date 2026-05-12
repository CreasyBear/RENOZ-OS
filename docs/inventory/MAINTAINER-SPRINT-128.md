# Inventory Maintainer Sprint 128: PO Create Purchasable Product Picker

## Status

Closed in commit-ready state.

## Issue 1: PO Create UI Could Offer Products The Server Rejects

### Problem

Sprint 127 tightened purchase-order server writes so linked PO products must be active and purchasable. The PO create page still queried products with only `isActive: true`, so operators could select products that the server would reject later.

That made the UI contract weaker than the mutation contract and pushed avoidable failure to submit time.

### Workflow Spine

Purchase-order create route
-> product list hook/query key
-> product list schema
-> product list server function
-> purchasable product picker
-> PO create mutation
-> PO approval / ordering / receiving / inventory and finance state.

### Touched Domains

- Purchase-order create route.
- Supplier PO creation wizard product item contract.
- Products list query schema, hook type, and server read model.
- Purchase-order create page context tests.
- Product list purchasable filter contract tests.
- Inventory/procurement sprint evidence.

### Business Value Protected

Operators should not spend time building a purchase order around a product that procurement is not allowed to buy. Aligning picker data with server write policy keeps ordering faster and reduces avoidable submit-time frustration.

### Scope Constraints

- Do not change purchase-order mutation behavior from Sprint 127.
- Do not change product creation/editing semantics.
- Do not change query-key structure.
- Do not hide custom non-product PO lines.
- Do not repair existing PO lines.

### Changes

- Added `isPurchasable` to product list filter schema and hook typing.
- Added `isPurchasable` filtering to both paginated and cursor product list server functions.
- Updated PO create to request `status: 'active'`, `isActive: true`, and `isPurchasable: true` products for the picker.
- Carried `isPurchasable` through the PO creation product item shape.
- Blocked contextual product seeding when a launched product is missing, inactive, non-active status, or not purchasable.
- Added focused tests for the PO create page and product-list filter spine.

### Standards Checked

- Domain ownership: product filter capability stays in product schema/hook/server; PO create applies procurement-specific filter choices at the route boundary.
- Route -> container/page -> hook -> server -> schema/database -> query/cache policy: aligned through route, hook option, schema, server predicate, and existing product list query key.
- Tenant isolation/data integrity: products list remains tenant-scoped in the server read model.
- Transactional inventory/finance integrity: PO source records are less likely to contain products that cannot become valid supplier stock.
- Serialized lineage continuity: no serialized mutation path changed; cleaner product selection reduces downstream serial ambiguity.
- UI states/error handling: contextual non-purchasable products now show an honest unavailable context state instead of seeding a doomed PO.
- Reviewability: small filter threading plus focused route and source contracts.

### Smells Removed

- UI product picker could show products that the PO mutation would reject.
- Contextual product launch only checked `isActive`, ignoring status and `isPurchasable`.

### Deferred

- A richer product picker state explaining why a product is non-purchasable remains a UX slice.
- Other procurement entry points may need the same explicit purchasable product selection contract.
- Browser QA was not selected because this is a route/query/server contract slice with no intended layout change.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/purchase-orders/purchase-order-create-page-context.test.tsx tests/unit/products/product-list-purchasable-filter-contract.test.ts`.
- Passed: focused ESLint on touched route, schema, hook, server, component contract, and tests.
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. Serialized gates remain retired; this sprint works upstream of stock-in and preserves lineage continuity.

### Residual Risk

Low for the PO create route. Other product-aware procurement launch surfaces should be reviewed separately for the same purchasable-product contract.
