# Inventory Maintainer Sprint 137: Product Inventory Action Policy

## Status

Closed in commit-ready state.

## Issue 1: Product Detail Could Offer Receive and Order Actions for Invalid Product State

### Problem

Recent sprints made server paths authoritative:

- manual receiving rejects products that are not active inventory-tracked stock
- purchase-order creation rejects products that are not active purchasable products
- stock adjustment UI now blocks positive adjustments when the server would reject them

The product detail inventory tab still offered Receive Inventory and Order Stock actions without knowing product purchasability or action eligibility.

### Workflow Spine

Product detail view
-> inventory tab container
-> inventory tab presenter
-> Receive Inventory / Order Stock action affordance
-> receiving or purchase-order route
-> authoritative server policy.

### Touched Domains

- Products product-detail inventory tab.
- Product inventory tab focused tests.
- Inventory sprint evidence.

### Business Value Protected

Operators should not be sent into workflows that immediately reject product state. Product detail should make stock actions match catalog truth: receive only active inventory-tracked products, and order only active purchasable products.

### Scope Constraints

- Do not change receiving, purchase-order, adjustment, or procurement server policy.
- Do not change query keys, cache invalidation, inventory reads, cost layers, or movement history.
- Keep Adjust Stock available because decreases remain a cleanup path for existing stock.
- Do not redesign the inventory tab.

### Changes

- Threaded product `isPurchasable` into the inventory tab.
- Derived `canReceiveStock` from active inventory-tracked product state.
- Derived `canOrderStock` from active purchasable product state.
- Disabled stocked-state Receive Inventory and Order Stock buttons when product state is invalid.
- Removed empty-state Receive/Order actions when the product state cannot support those actions.
- Added focused tests for inactive and non-purchasable product action policy.

### Standards Checked

- Domain ownership: product detail owns product action affordances; receiving and PO servers remain authoritative.
- Route -> container/page -> hook -> server -> schema/database -> query/cache policy: product detail -> inventory tab now mirrors downstream server policy; no server or cache behavior changed.
- Tenant isolation/data integrity: no tenant query changes.
- Transactional inventory/finance integrity: UI avoids invalid receive/order flows before transactional stock and procurement writes.
- Serialized lineage continuity: unchanged.
- UI states/error handling: operators see unavailable action copy instead of live buttons into rejected workflows.
- Query/cache contract: unchanged.
- Reviewability: prop threading, two derived policy booleans, presenter button guards, focused tests, one closeout note.

### Smells Removed

- Product detail offered Receive Inventory even when manual receiving would reject product state.
- Product detail offered Order Stock even when PO creation would reject product state.
- Product action policy was split between downstream server guards and stale UI affordances.

### Deferred

- Tooltip-level explanations for each disabled button can be a separate polish slice.
- Purchase-order create route still performs its own contextual guard and remains authoritative.
- Browser QA was not selected because this is a bounded component-policy slice with focused tests and no layout redesign.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/products/product-stock-adjustment-policy-contract.test.ts tests/unit/products/product-inventory-tab-container.test.tsx tests/unit/products/product-stock-adjustment-errors.test.ts`.
- Passed: focused ESLint on touched product inventory tab components and tests.
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. Serialized gates remain retired; this sprint does not touch serialized mutation behavior.

### Residual Risk

Low to moderate. Disabled-button explanations could be more specific in a future UX polish pass.
