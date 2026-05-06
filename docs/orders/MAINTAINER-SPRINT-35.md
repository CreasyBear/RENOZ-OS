# Orders Maintainer Sprint 35

## Status

Closed in commit-ready state.

## Issue 1: Picking And Unpicking Write Scope

### Problem

`pickOrderItems` and `unpickOrderItems` performed active tenant-scoped order validation before opening the transaction, but several writes inside the transaction used ID-only predicates. The final line-item quantity writes used only `orderLineItems.id`, refreshed pick status from line items using only `orderId`, and order status updates used only `orders.id`.

Picking and unpicking are warehouse-truth workflows. They also coordinate inventory reservation/release, serialized allocation/deallocation, fulfillment identity, and order status. The transaction needs to prove the active order and tenant-owned line item at the write boundary, not only at the pre-read.

### Workflow Spine

Order fulfillment/picking UI
-> `usePickOrderItems` / `useUnpickOrderItems`
-> picking server function
-> active order transaction lock
-> tenant/order-scoped line-item reads
-> inventory reservation/release and serialized allocation/deallocation
-> proved line-item quantity/status write
-> tenant-scoped refreshed pick status
-> proved active order status write
-> fulfillment inventory mutation identity
-> order, fulfillment, inventory, serial availability, and product cache invalidation.

### Touched Domains

- Orders picking and unpicking server mutations.
- Orders fulfillment inventory mutation identity.
- Inventory reservation/release adjacency.
- Serialized allocation/deallocation adjacency.
- Orders picking write-scope contract tests.
- Orders maintainer closeout docs.

### Business Value Protected

Picking and unpicking determine what the warehouse has committed to customer orders. RENOZ operators need those actions to preserve tenant boundaries, active order truth, serial allocation continuity, and inventory side-effect identity before the UI refreshes fulfillment and stock surfaces.

### Scope Constraints

- Do not change pick/unpick input schemas, allowed statuses, quantity math, serial validation semantics, inventory reservation/release behavior, serialized lineage helpers, mutation result shape, hook APIs, or cache invalidation behavior.
- Do not touch shipment finalization, shipment status updates, RMA behavior, finance ledger writes, or document generation.
- Do not rerun retired serialized gate packs; use focused evidence for the picking workflow touched here.

### Changes

- Added `lockActiveOrderForPicking` to re-check and lock the active tenant-scoped order inside pick/unpick transactions.
- Switched transaction status decisions to the locked order status.
- Added `orderId` and `organizationId` predicates to final pick and unpick line-item writes.
- Added `NotFoundError` guards before appending line-item write results.
- Scoped refreshed pick-status reads by `orderId` and `organizationId`.
- Added `organizationId`, `deletedAt IS NULL`, `.returning({ id })`, and not-found guards to order status writes.
- Added `order-picking-write-scope-contract.test.ts`.

### Standards Checked

- Domain ownership: picking and unpicking remain owned by the Orders picking server function and `use-picking` hook.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: checked picking hook, picking server function, order/line-item tables, serialized allocation helpers, inventory reservation helpers, fulfillment identity payload, and centralized query-key invalidation.
- Tenant isolation/data integrity: improved. The transaction now locks the active tenant order and proves tenant/order scope at line-item and status writes.
- Inventory/serialized continuity: preserved. Reservation/release and serialized allocation/deallocation semantics were not changed; focused serialization tests still cover fail-closed serialized item and allocation behavior.
- Query/cache contract: preserved. `invalidatePickingMutationQueries` still refreshes order detail, fulfillment, inventory movement/availability, serial availability, and affected product inventory keys.
- Honest UI states/operator-safe errors: improved. Raced/missing write targets now fail with typed not-found errors instead of allowing undefined line-item results or unproved order status updates.
- Reviewability: one helper, scoped predicates/guards in existing pick/unpick write sites, one focused contract test, and this closeout.

### Smells Removed

- Transaction write boundary depended on pre-transaction active order validation.
- ID-only line-item quantity writes in pick/unpick.
- Refreshed pick-status reads without organization scope.
- ID-only order status updates.
- Fulfillment identity could include an undefined line-item update result after a raced write.

### Deferred

- Shipment finalization and shipment status functions still have ID-only line-item shipped/delivered quantity writes and need their own bounded slices.
- Browser QA remains deferred because this was server write-scope behavior with no visible layout change.
- Full end-to-end serialized gate packs remain retired; future serial workflow changes should continue to define focused evidence per slice.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/orders/order-picking-write-scope-contract.test.ts tests/unit/orders/order-picking-serialization.test.ts tests/unit/orders/order-mutation-invalidation.test.tsx` - 3 files, 20 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: browser QA, `bun run build`, `bun run test:unit`, `bun run lint:reliability`, finance, document, release, and deploy gates because this slice did not change visible UI, build-time behavior, shared route/read contracts, financial persistence, document generation, release packaging, or deployment paths. Focused serial evidence was included through the picking serialization contract test.

### Goal Adaptation

Declined. The standing maintainer process already handles this posture: serialized lineage remains a battery-asset invariant when touched, but old serialized gate packs are not routine closeout evidence. This sprint used focused picking/serialization contracts instead.

### Residual Risk

Low for picking/unpicking write-scope proof. Moderate for the broader warehouse-facing Orders domain because shipment finalization and shipment status quantity writes still need the same scoped write-evidence review.
