# Inventory Maintainer Sprint 136: Product Adjustment UI Stock-In Policy

## Status

Closed in commit-ready state.

## Issue 1: Product Detail Stock Adjustment UI Could Offer Server-Rejected Increases

### Problem

Sprint 134 made the adjustment server authoritative: inactive or non-inventory products cannot create or increase stock, while decreases against existing rows remain available for cleanup. The product detail inventory tab still opened a generic stock adjustment dialog that defaulted to Increase and did not know whether the product could create stock.

That created a frustrating operator path: the UI invited an action the server would reject.

### Workflow Spine

Product detail view
-> inventory tab container
-> inventory tab presenter
-> stock adjustment dialog
-> adjustment mutation
-> `adjustInventory` stock-in policy.

### Touched Domains

- Products product-detail inventory tab.
- Products stock adjustment dialog.
- Products focused contract tests.
- Inventory sprint evidence.

### Business Value Protected

Operators should see honest controls. If a product is inactive or not inventory-tracked, the UI should still allow decreases for cleanup but should not invite stock creation that cannot be accepted by the server.

### Scope Constraints

- Do not change server adjustment policy from Sprint 134.
- Do not change receiving, PO creation, inventory transfer, allocation wrappers, or cache invalidation.
- Do not remove cleanup decreases for existing stock.
- Do not redesign the product inventory tab.

### Changes

- Threaded product `status` and `isActive` from product detail into the inventory tab.
- Derived `canIncreaseStock` in the inventory tab container from `status === "active"`, `isActive`, and `trackInventory`.
- Passed `canIncreaseStock` to the stock adjustment dialog.
- The dialog now defaults to Decrease when stock increases are not allowed.
- The dialog disables Increase and blocks Set Exact values that would increase stock.
- Added focused policy contract coverage.

### Standards Checked

- Domain ownership: product detail UI owns operator affordance; inventory adjustment server remains authoritative.
- Route -> container/page -> hook -> server -> schema/database -> query/cache policy: product detail -> inventory tab -> adjustment dialog now mirrors server stock-in policy; mutation, schema, database, and cache behavior unchanged.
- Tenant isolation/data integrity: no tenant query changes; server-side tenant/data integrity remains enforced by Sprint 134.
- Transactional inventory/finance integrity: UI no longer submits positive stock corrections that would be rejected before transactional inventory/finance writes.
- Serialized lineage continuity: unchanged; serialized adjustment behavior remains server-owned.
- UI states/error handling: invalid positive adjustment path is blocked before submit with explicit operator copy.
- Query/cache contract: unchanged.
- Reviewability: prop threading, one dialog policy guard, focused contract, one closeout note.

### Smells Removed

- Product adjustment dialog defaulted to Increase even when increases were not valid.
- Product detail UI did not reflect server stock-in policy.
- Set Exact could silently become a positive adjustment for blocked products.

### Deferred

- Receive Inventory and Order Stock buttons for inactive products may need a separate product-action policy slice.
- Product detail can still show existing inventory for inactive products because cleanup remains valid.
- Browser QA was not selected because this is a small dialog-policy slice covered by focused component/source contracts.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/products/product-stock-adjustment-policy-contract.test.ts tests/unit/products/product-inventory-tab-container.test.tsx tests/unit/products/product-stock-adjustment-errors.test.ts`.
- Passed: focused ESLint on touched product components and tests.
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. Serialized gates remain retired; this sprint preserves lineage continuity by keeping serialized mutation behavior server-owned.

### Residual Risk

Low to moderate. Receive/order action affordances for inactive products remain separate UI honesty work.
