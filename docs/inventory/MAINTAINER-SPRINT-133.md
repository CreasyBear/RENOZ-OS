# Inventory Maintainer Sprint 133: Manual Receive Inventory-Tracked Product Guard

## Status

Closed in commit-ready state.

## Issue 1: Manual Receiving Could Still Target Inactive or Non-Inventory Products

### Problem

Manual non-PO receiving creates live inventory, movements, cost layers, finance metadata, and optional serialized lineage. The server preflight only rejected missing, cross-tenant, or soft-deleted products, and the receiving page product picker did not ask the products read model for active inventory-tracked products.

That left a stale path where inactive, discontinued, or non-inventory products could be offered or submitted for live stock-in.

### Workflow Spine

Manual receiving page
-> active inventory-tracked product picker
-> receiving form
-> `receiveInventory`
-> product availability preflight
-> location validation
-> transactional inventory, movement, cost-layer, finance, and serialized lineage writes.

### Touched Domains

- Inventory manual receiving route and server function.
- Products list filter schema, hook type, and read model.
- Inventory/products focused contract tests.
- Inventory sprint evidence.

### Business Value Protected

Manual receiving should record real stock for real inventory-tracked battery OEM products. Blocking inactive or non-inventory products prevents stale catalog state or service-style products from creating warehouse and valuation noise.

### Scope Constraints

- Do not change PO receiving, supplier receiving, adjustment, transfer, valuation, forecast, alert, or recommendation behavior.
- Do not require `isPurchasable` for manual receiving because non-PO exceptions can include found stock, samples, returns, or internal stock corrections.
- Do not repair existing inventory rows or historical movements.
- Preserve existing product not-found behavior for missing, cross-tenant, or soft-deleted products.

### Changes

- `receiveInventory` now loads product `status`, `isActive`, and `trackInventory` before stock-in.
- Manual receive now rejects products that are not `status = active`, `isActive = true`, and `trackInventory = true`.
- Product list filters now support `trackInventory`.
- The manual receiving page requests `status: "active"`, `isActive: true`, and `trackInventory: true`.
- Product-context receiving now blocks the form when the selected product is no longer active or inventory-tracked.
- Added focused contracts for server preflight and product-list filter threading.

### Standards Checked

- Domain ownership: receiving write policy stays in the inventory receiving server function; product filtering stays in products read model contracts.
- Route -> container/page -> hook -> server -> schema/database -> query/cache policy: route uses existing `useProducts`; hook/schema/server now support the inventory-tracked filter; receive mutation preflight is authoritative.
- Tenant isolation/data integrity: product lookup remains organization-scoped and soft-delete guarded before exposing state-specific validation.
- Transactional inventory/finance integrity: invalid products are blocked before inventory, movement, cost-layer, finance, or serialized writes.
- Serialized lineage continuity: serialized receive behavior remains unchanged after preflight.
- UI states/error handling: contextual receiving shows an honest blocked state instead of submitting an invalid product.
- Query/cache contract: no query key shape changes beyond existing product list filters.
- Reviewability: one server preflight, one product filter, one page guard, focused contracts, one closeout note.

### Smells Removed

- Manual receiving picker could offer non-inventory products.
- Manual receive server policy treated inactive/non-tracked products like valid stock-in targets.
- Contextual product receiving could render a form for a stale product state.

### Deferred

- Existing inventory rows for inactive or non-inventory products remain a data-quality/UX policy slice.
- Positive stock adjustments may need a separate policy decision because negative adjustments can be needed to clear legacy stock.
- Mobile barcode receiving still relies on the authoritative server guard for product-state enforcement.
- Browser QA was not selected because this is a server and route-state contract slice with no intended layout change.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/inventory/stock-mutation-tenant-scope-contract.test.ts tests/unit/products/product-list-inventory-filter-contract.test.ts`.
- Passed: `./node_modules/.bin/vitest run tests/unit/inventory/receiving-location-read-policy.test.tsx`.
- Passed: focused ESLint on touched server functions, schema, hook, route, and tests.
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. Serialized gates remain retired; this sprint preserves lineage continuity by blocking invalid stock-in before serialized writes.

### Residual Risk

Low to moderate. New desktop/manual receive submits are guarded, but existing stale stock and mobile scan affordances remain separate slices.
