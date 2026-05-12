# Inventory Maintainer Sprint 127: Purchase Order Purchasable Product Guard

## Status

Closed in commit-ready state.

## Issue 1: PO Product Guard Did Not Enforce Purchasable Product State

### Problem

Sprint 126 added a server-side linked-product preflight for purchase-order creation and draft line-item additions, but the guard only required a same-tenant, non-deleted product row.

RENOZ products also carry operational flags: `status`, `isActive`, and `isPurchasable`. A supplier PO line is a procurement source record, so a linked product should be active and purchasable before the PO can move into ordering and receiving.

### Workflow Spine

Purchase-order creation / draft line-item add
-> purchase-order hook/form payload
-> supplier purchase-order server mutation
-> purchasable active product preflight
-> PO header / PO item persistence
-> approval / ordering
-> receiving / inventory movement / cost layers / serialized lineage.

### Touched Domains

- Supplier purchase-order server functions.
- Purchase-order creation tenant-scope contract tests.
- Purchase-order draft line-item transaction contract tests.
- Inventory/procurement sprint evidence.

### Business Value Protected

Supplier POs should not seed inventory workflows with inactive, discontinued, or non-purchasable SKUs. Blocking those links at draft write time keeps procurement clean before it becomes stock, valuation, and support history.

### Scope Constraints

- Keep custom non-product PO lines valid when `productId` is omitted.
- Do not change PO schemas, UI behavior, totals calculation, supplier validation, approval workflow, receiving transaction logic, hooks, query keys, or cache invalidation.
- Do not repair existing persisted PO lines in this slice.

### Changes

- Tightened the linked-product PO guard to require:
  - same organization
  - `status = 'active'`
  - `isActive = true`
  - `isPurchasable = true`
  - `deletedAt IS NULL`
- Renamed the helper to `assertLinkedPurchaseOrderProductsPurchasable`.
- Updated operator-safe validation copy to name inactive/non-purchasable product state.
- Updated focused create and draft-line-item contract tests.

### Standards Checked

- Domain ownership: procurement write validation stays inside the supplier purchase-order server module.
- Route -> container/page -> hook -> server -> schema/database -> query/cache policy: server boundary hardened; UI and cache behavior unchanged.
- Tenant isolation/data integrity: linked product IDs remain tenant-scoped and now require purchasable active state.
- Transactional inventory/finance integrity: cleaner PO source records reduce downstream receiving, valuation, and cost-layer ambiguity.
- Serialized lineage continuity: no serialized mutation path changed; upstream product links are now less ambiguous before serial receipt.
- UI states/error handling: invalid linked products return explicit, operator-safe validation copy at save time.
- Reviewability: one predicate refinement, one helper rename, focused tests, one closeout note.

### Smells Removed

- Non-deleted but inactive, discontinued, or non-purchasable products could still be linked into new supplier PO lines.
- The purchase-order guard used a softer “available” meaning than the product catalog supports.

### Deferred

- Existing dirty PO lines remain a separate data-quality repair slice.
- PO creation UI could proactively hide or explain non-purchasable products before submit; this sprint only hardens the server invariant.
- Broader product-link guards in non-procurement domains remain separate domain slices.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/purchase-orders/purchase-order-create-tenant-scope-contract.test.ts tests/unit/purchase-orders/purchase-order-line-item-draft-transaction-contract.test.ts`.
- Passed: focused ESLint on touched server function and tests.
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. Serialized gates remain retired; this sprint is upstream of serialized receiving and preserves lineage continuity.

### Residual Risk

Low for new PO writes. Existing persisted PO lines with inactive or non-purchasable product links are not repaired here.
