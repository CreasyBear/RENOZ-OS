# Maintainer Sprint 4: Order Fulfillment and Inventory Truth

Sprint 4 moves from inventory-owned stock mutations into the orders/fulfillment seam where shipments consume, restore, reserve, and expose battery stock.

Status: Issue 1 implemented.

## Business Value

RENOZ Energy needs order fulfillment to be operationally honest: shipped batteries must leave available stock, reopened shipments must restore the right stock state, pending drafts must not overpromise availability, and fulfillment dashboards must reflect the current shipment lifecycle. If this seam is wrong, operators can oversell, mis-pick serialized batteries, ship against stale availability, or trust stale valuation and warehouse views.

## Workflow Spine

```text
order / fulfillment route
  -> fulfillment dashboard or order detail
  -> shipment hook
  -> shipment server function
  -> shipment + inventory + serialized + movement tables
  -> order, fulfillment, inventory, product, valuation, availability, serialized cache policy
  -> operator-visible fulfillment and stock truth
```

## Pattern Map

- Routes: `src/routes/_authenticated/orders/fulfillment.tsx`, `src/routes/_authenticated/orders/$orderId.tsx`
- Components: `src/components/domain/orders/fulfillment/*`, `src/components/domain/orders/containers/order-detail-container.tsx`
- Hooks: `src/hooks/orders/use-shipments.ts`, `src/hooks/orders/use-picking.ts`, `src/hooks/orders/use-order-status.ts`
- Server: `src/server/functions/orders/order-shipments.ts`, `src/server/functions/orders/order-shipments-finalization.ts`
- Inventory seam: `src/server/functions/orders/order-shipment-inventory-plans.ts`, `src/server/functions/orders/order-inventory-reservations.ts`, `src/server/functions/inventory/serial-availability.ts`
- Query keys: `src/lib/query-keys.ts`

## Triage Findings

- `markShippedHandler` updates inventory rows, writes inventory movements, consumes cost layers, updates serialized lineage, and clears serial allocations.
- `reopenShipmentHandler` can restore inventory rows, write return/allocation movements, and reallocate serialized items for correction.
- `useMarkShipped` and `useReopenShipment` currently invalidate order/shipment collections, but the hook cache contract does not explicitly refresh inventory, valuation, availability, serialized, product-stock, or fulfillment summary surfaces affected by those server writes.
- Draft shipment creation/deletion can affect pending-reservation availability and serial pickers, but that is a separate slice from physical stock finalization.
- Orders is a high-risk integration hub; sprint work should stay bounded and avoid rewriting the large fulfillment UI surfaces unless a workflow invariant requires it.

## Issue Ledger

### 1. Shipment Finalization Inventory Cache Contract

Business value: marking a shipment shipped or reopening it for correction should refresh every operator surface that can show stock, valuation, serialized availability, fulfillment queue, or product inventory state affected by the shipment transaction.

Workflow invariant: shipment finalization/reopen hooks must treat inventory and serialized side effects as first-class cache contract outputs of the mutation, even when the server result does not yet expose affected inventory IDs or product IDs.

Affected files:

- `src/hooks/orders/use-shipments.ts`
- `src/hooks/orders/_shipment-cache.ts`
- `tests/unit/orders/order-mutation-invalidation.test.tsx`
- `docs/orders/MAINTAINER-SPRINT-4.md`

Out of scope:

- changing shipment server transaction behavior
- changing shipment result schemas
- changing shipment dialog UI
- changing draft shipment creation/deletion availability behavior
- changing order picking allocation hooks
- narrowing inventory/product invalidation without affected inventory/product IDs from the server

Focused tests:

```bash
./node_modules/.bin/vitest run tests/unit/orders/order-mutation-invalidation.test.tsx
```

Closeout criteria:

- shipment mutation invalidation moves into an orders-owned helper
- mark-shipped success refreshes shipment, order collection/detail, fulfillment, inventory, valuation, availability, serialized, movement, and product stock surfaces
- reopen-shipment success refreshes the same physical stock and fulfillment surfaces
- existing shipment status invalidation still refreshes finite and infinite order collections
- focused order mutation invalidation tests pass
- lint/typecheck evidence is recorded

## Closeout Log

### Issue 1: Shipment Finalization Inventory Cache Contract

Touched domains: orders fulfillment shipment hooks, inventory stock cache policy, valuation cache policy, serialized stock cache policy, product stock cache policy, fulfillment dashboard cache policy.

Workflow protected: fulfillment dashboard/order detail -> shipment mutation hook -> shipment finalization/reopen server function -> shipment, inventory, serialized, movement, and cost-layer side effects -> order, fulfillment, inventory, valuation, availability, serialized, movement, and product stock cache refresh.

Business value: operators marking batteries shipped or reopening shipments for correction should not keep seeing stale stock, valuation, serialized pickers, fulfillment summaries, or product inventory after a shipment transaction changes inventory truth.

Standards checked:

- added an orders-owned shipment cache helper in `src/hooks/orders/_shipment-cache.ts`
- kept cache keys centralized through `queryKeys`
- moved repeated shipment/order/fulfillment invalidation out of `use-shipments.ts`
- mark-shipped success now refreshes inventory, valuation, availability, available serials, serialized stock, movement, WMS/dashboard, and broad product surfaces
- reopen-shipment success now refreshes the same physical-stock side-effect surfaces
- shipment status, confirm delivery, create, delete, mark-shipped, and reopen hooks now share the helper for order/shipment/fulfillment invalidation

Smells removed:

- shipment hooks had repeated ad hoc order/shipment invalidation
- mark-shipped and reopen did not explicitly refresh the inventory/valuation/serialized/product surfaces mutated by shipment finalization server transactions
- mark-shipped did not refresh fulfillment summary/kanban surfaces through a shared hook cache contract

Deferred:

- server result schemas still do not expose affected inventory IDs or product IDs, so shipment finalization must use broad inventory/product invalidation
- draft shipment creation/deletion availability behavior was not widened into this physical-stock finalization slice
- order picking cache behavior remains separate and should be reviewed under its own allocation workflow slice
- large fulfillment UI files remain unchanged

Verification:

- `./node_modules/.bin/vitest run tests/unit/orders/order-mutation-invalidation.test.tsx`
- `./node_modules/.bin/eslint src/hooks/orders/use-shipments.ts src/hooks/orders/_shipment-cache.ts tests/unit/orders/order-mutation-invalidation.test.tsx`
- `./node_modules/.bin/vitest run tests/unit/orders`
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit`
- `git diff --check -- docs/inventory/MAINTAINER-SPRINT-3.md docs/orders/MAINTAINER-SPRINT-4.md src/hooks/orders/use-shipments.ts src/hooks/orders/_shipment-cache.ts tests/unit/orders/order-mutation-invalidation.test.tsx`

Goal adaptation: no standing goal change. Sprint 4 applies the same maintainer pattern to the next highest-risk workflow seam: orders fulfillment as an inventory/serialized/finance integration hub.

Residual risk: shipment cache invalidation remains broad until the server returns affected inventory/product identities. The next Sprint 4 slice should review draft shipment reservation availability or order picking allocation caches, not large UI refactors.
