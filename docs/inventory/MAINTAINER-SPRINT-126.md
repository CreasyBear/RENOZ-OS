# Inventory Maintainer Sprint 126: Purchase Order Line Active Product Preflight

## Status

Closed in commit-ready state.

## Issue 1: Purchase Orders Could Persist Linked Archived Products

### Problem

Purchase-order receiving now fails closed when a PO line references an unavailable or archived product, but the upstream create and add-line-item mutations could still persist those linked product IDs without verifying tenant ownership or active row state.

That allowed dirty draft purchase orders to be created first, pushing the operator-facing failure downstream into receiving.

### Workflow Spine

Purchase-order creation / draft line-item add
-> purchase-order hooks and forms
-> `createPurchaseOrder` / `addPurchaseOrderItem`
-> active tenant-scoped linked product preflight
-> draft PO/item transaction
-> later PO approval, ordering, receiving, inventory movement, cost layers, and optional serial lineage.

### Touched Domains

- Supplier purchase-order server functions.
- Purchase-order creation tenant-scope contract tests.
- Purchase-order draft line-item transaction contract tests.
- Inventory stock-in sprint evidence.

### Business Value Protected

Draft POs are the source record for supplier ordering and stock-in. Preventing archived or cross-tenant product links at PO write time keeps procurement, receiving, inventory valuation, and serial lineage from inheriting bad product references.

### Scope Constraints

- Keep custom non-product PO lines valid when `productId` is omitted.
- Do not change purchase-order schemas, totals calculation, supplier validation, status workflow, approval behavior, hooks, query keys, or cache invalidation.
- Do not require product status changes beyond the existing active-row convention of same organization plus non-deleted product row.
- Do not rewrite receiving; this is an upstream procurement write guard.

### Changes

- Imported the product catalog table into supplier purchase-order server functions.
- Added a shared `assertLinkedPurchaseOrderProductsActive` helper that deduplicates optional linked product IDs and validates them against same-tenant, non-deleted products.
- Called the helper inside the `createPurchaseOrder` transaction before the PO header is inserted.
- Called the helper inside the `addPurchaseOrderItem` transaction after the draft PO lock and before line-item insert.
- Extended focused contract tests to pin the create and add-item ordering.

### Standards Checked

- Domain ownership: procurement write validation stays in the supplier purchase-order server module.
- Route -> container/page -> hook -> server -> schema/database -> query/cache policy: server write boundary hardened; client and cache behavior unchanged.
- Tenant isolation/data integrity: linked product IDs now require same tenant and active product row before PO item persistence.
- Transactional inventory/finance integrity: upstream source records are cleaner before receiving can create inventory, cost layers, valuation changes, or finance state.
- Serialized lineage continuity: no serialized write path changed; cleaner PO product links reduce downstream lineage ambiguity.
- UI states/error handling: invalid linked products return operator-safe validation copy at save time.
- Reviewability: one helper, two call sites, focused contracts, one closeout note.

### Smells Removed

- Client-supplied `productId` could be trusted into purchase-order items without server-side product ownership validation.
- Receiving had to absorb product availability failures seeded during draft PO creation.

### Deferred

- Existing dirty draft POs that already reference archived or cross-tenant product IDs remain a repair/data audit slice.
- The PO creation UI could surface archived/unavailable product status before submit; this sprint only hardens the server boundary.
- Browser QA was not selected because this is a server mutation predicate slice with no intended layout change.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/purchase-orders/purchase-order-create-tenant-scope-contract.test.ts tests/unit/purchase-orders/purchase-order-line-item-draft-transaction-contract.test.ts`.
- Passed: focused ESLint on touched server function and tests.
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`.
- Passed: `git diff --check`.
- Environment note: `bunx`/`bun run` hit this sandbox's Bun current-directory/tempdir issue, so equivalent local `node_modules/.bin` gates were used after local dependency materialization. No tracked dependency files changed.

### Goal Adaptation

No adaptation needed. Serialized gates remain retired; this sprint works upstream of serialized receiving and preserves lineage continuity.

### Residual Risk

Low for new PO writes. Existing persisted PO lines are not repaired by this sprint and should be handled as a separate data-quality slice if they appear in operator workflows.
