# Inventory Maintainer Sprint 34

This sprint follows Sprint 33's PO receive inventory-balance write scoping cleanup. The target is PO receive item and order status tenant scope: receipt item reads, item quantity updates, status calculation reads, and parent order status updates should repeat the active organization boundary.

Status: Closed after Issue 1.

## Business Value

PO receiving is the supplier-backed stock-in workflow that determines what RENOZ Energy has ordered, received, rejected, and still expects. The item and order status updates drive procurement visibility and receiving closeout. These writes should be tenant-explicit because they decide whether battery stock-in is complete, partial, or still pending.

## Workflow Spine

purchase-order receive goods
-> `receiveGoods`
-> organization-scoped purchase order read
-> organization-scoped purchase-order item reads
-> tenant-scoped item quantity updates
-> tenant-scoped status calculation and parent PO status update
-> procurement and inventory cache policy.

## Architecture Constraints

- Keep this sprint to purchase-order item/order predicates inside PO receive-goods.
- Preserve receipt validation, serialized/non-serialized inventory behavior, FIFO layer creation, value recompute, product cost updates, response shapes, query keys, and UI behavior.
- Do not broaden into approval workflow predicates, purchase-order edit/delete functions, live database fixtures, or receiving UX changes.

## Issue Ledger

### 1. PO Receive Item and Status Paths Used Parent/Row IDs Without Repeating Organization Scope

Problem:

- `receiveGoods` authenticated the parent PO with `purchaseOrders.organizationId = ctx.organizationId`.
- It then read PO items by `purchaseOrderId` only.
- It updated receipt quantities by PO item ID only.
- It calculated final PO status by `purchaseOrderId` only.
- It updated parent PO status by PO ID only.

Workflow protected:

PO receipt -> tenant-owned item reads -> tenant-scoped item quantity updates -> tenant-scoped status calculation/update -> procurement closeout.

Implemented slice:

- Added `purchaseOrderItems.organizationId = ctx.organizationId` to the initial PO item read.
- Added `purchaseOrderItems.organizationId = ctx.organizationId` and `purchaseOrderItems.purchaseOrderId = data.purchaseOrderId` to the item quantity update predicate.
- Added `purchaseOrderItems.organizationId = ctx.organizationId` to the PO status calculation item read.
- Added `purchaseOrders.organizationId = ctx.organizationId` to the parent PO status update predicate.
- Kept receipt validation, serialized/non-serialized inventory behavior, FIFO layer creation, value recompute, product cost updates, response shapes, query keys, and UI behavior unchanged.
- Expanded supplier receiving tenant-scope contract coverage for item reads, item updates, and parent order status update.

Out of scope:

- Changing approval or purchase-order management functions.
- Changing receipt validation, quantity math, inventory writes, or cache invalidation.
- Adding live database fixtures.

Closeout:

- Touched domains: supplier PO receive-goods server function, supplier receiving tenant-scope contract tests, inventory sprint evidence.
- Workflow protected: PO receive goods -> tenant-owned item reads -> tenant-scoped item quantity updates -> tenant-scoped status calculation/update -> existing procurement and inventory cache policy.
- Business value protected: procurement receiving closeout now keeps ordered/received/rejected/pending quantities and parent PO status updates tenant-explicit.
- Architecture standards checked: route/page/hook/cache behavior is unchanged; receive-goods remains the supplier-backed stock-in owner; item/order status predicates now mirror the organization boundary used by the parent PO read and transaction tenant context.
- Tenant isolation and data integrity checked: PO item reads require purchase-order ID and organization ID; item quantity updates require item ID, purchase-order ID, and organization ID; parent order status update requires PO ID and organization ID; no inventory quantity math, cost-layer writes, serialized lineage, value recompute, or product cost update behavior changed.
- Query/cache contract checked: no query keys, invalidation, stale times, optimistic updates, or rollback behavior changed.
- Smells removed: PO receive item/status path used parent or row IDs without repeating organization scope after the tenant-scoped parent PO read.
- Smells deferred: approval workflow predicate review; purchase-order edit/delete predicates; live database fixtures for PO receive-goods under seeded RLS.
- Gates run: focused supplier/PO receive tenant-scope/query tests; focused ESLint; supplier + purchase-order + inventory unit suites; TypeScript; `git diff --check`.
- Gates skipped: browser QA, because this was a server tenant/data-integrity predicate correction with no UI or interaction change.
- Goal adaptations: declined. The standing maintainer goal already requires tenant isolation, transactional inventory and finance integrity, domain ownership, meaningful tests, reviewable domain slices, and closeout evidence.
- Residual risk: source-level contracts verify the predicates; live DB fixtures are still needed to prove PO receive-goods status closeout under seeded concurrent/RLS conditions.
