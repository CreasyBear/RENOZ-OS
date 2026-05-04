# Inventory Maintainer Sprint 33

This sprint follows Sprint 32's supplier-backed PO receive weighted-cost tenant-scope cleanup. The target is PO receive existing-inventory balance write scope: serialized and non-serialized receipt branches should update existing inventory rows with the active organization predicate.

Status: Closed after Issue 1.

## Business Value

PO receiving is a core supplier-backed stock-in workflow for RENOZ Energy battery inventory. When the receipt updates an existing inventory row, that write changes on-hand stock and cost data used by warehouse operators, fulfillment, valuation, and reorder decisions. Those updates should be tenant-explicit even after organization-scoped reads locate the row.

## Workflow Spine

purchase-order receive goods
-> `receiveGoods`
-> organization-scoped purchase order and item reads
-> organization-scoped existing inventory lookup
-> tenant-scoped existing inventory balance update
-> FIFO layer creation / value recompute
-> procurement and inventory cache policy.

## Architecture Constraints

- Keep this sprint to existing inventory balance update predicates inside PO receive-goods.
- Preserve serialized/non-serialized branch behavior, quantity math, landed cost math, FIFO layer creation, value recompute, product cost update, response shapes, query keys, and UI behavior.
- Do not broaden into purchase-order item/order status predicates, helper extraction, live database fixtures, or receiving UX changes.

## Issue Ledger

### 1. PO Receive Existing Inventory Updates Used Inventory ID Only

Problem:

- `receiveGoods` looks up existing inventory rows with `inventory.organizationId = ctx.organizationId`.
- Serialized PO receive then increments an existing serialized row by `inventory.id` only.
- Non-serialized PO receive then increments an existing stock row by `inventory.id` only.

Workflow protected:

PO receipt -> tenant-owned existing inventory row -> tenant-scoped stock/cost balance update -> FIFO layer creation/value recompute.

Implemented slice:

- Added `inventory.organizationId = ctx.organizationId` to the serialized existing-inventory update predicate.
- Added `inventory.organizationId = ctx.organizationId` to the non-serialized existing-inventory update predicate.
- Kept serialized/non-serialized branch behavior, quantity math, landed cost math, FIFO layer creation, value recompute, product cost update, response shapes, query keys, and UI behavior unchanged.
- Expanded supplier receiving tenant-scope contract coverage for both existing-inventory update predicates.

Out of scope:

- Changing receipt item/order status update predicates.
- Changing receipt validation, cost allocation, quantity math, or cache invalidation.
- Adding live database fixtures.

Closeout:

- Touched domains: supplier PO receive-goods server function, supplier receiving tenant-scope contract tests, inventory sprint evidence.
- Workflow protected: PO receive goods -> organization-scoped existing inventory lookup -> tenant-scoped existing inventory balance update -> FIFO layer creation/value recompute -> existing procurement/inventory cache policy.
- Business value protected: supplier-backed stock-in updates on-hand quantity and cost data only through tenant-explicit inventory writes, improving trust in warehouse and valuation signals.
- Architecture standards checked: route/page/hook/cache behavior is unchanged; receive-goods remains the supplier-backed stock-in owner; existing-inventory writes now mirror the organization predicates used by reads and the surrounding transaction.
- Tenant isolation and data integrity checked: serialized and non-serialized existing-inventory updates now require both inventory ID and organization ID; no receipt validation, movement insert, FIFO layer creation, value recompute, product cost update, serialized lineage, or finance math changed.
- Query/cache contract checked: no query keys, invalidation, stale times, optimistic updates, or rollback behavior changed.
- Smells removed: PO receive existing-inventory balance updates used inventory ID only after tenant-scoped lookup.
- Smells deferred: receipt item/order status update predicate review; live database fixtures for PO receive-goods under seeded RLS; supplier receiving integration tests.
- Gates run: focused supplier receive-goods tenant-scope/utility/query tests; focused ESLint; supplier + purchase-order + inventory unit suites; TypeScript; `git diff --check`.
- Gates skipped: browser QA, because this was a server tenant/data-integrity predicate correction with no UI or interaction change.
- Goal adaptations: declined. The standing maintainer goal already requires tenant isolation, transactional inventory and finance integrity, domain ownership, meaningful tests, reviewable domain slices, and closeout evidence.
- Residual risk: source-level contracts verify the predicates; live DB fixtures are still needed to prove PO receive-goods stock-in behavior under seeded concurrent/RLS conditions.
