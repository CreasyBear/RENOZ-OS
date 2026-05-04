# Maintainer Sprint 4: Order Fulfillment and Inventory Truth

Sprint 4 moves from inventory-owned stock mutations into the orders/fulfillment seam where shipments consume, restore, reserve, and expose battery stock.

Status: Issues 1, 2, and 3 implemented.

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

### 2. Picking Allocation Cache Contract

Business value: picking or unpicking batteries changes inventory reservations, serialized allocations, fulfillment stage readiness, and product stock availability. Operators should not see stale fulfillment queues, stock availability, or serial picker state after a pick/unpick transaction.

Workflow invariant: picking and unpicking hooks must refresh the order, fulfillment, inventory reservation, serialized, and product stock surfaces affected by `pickOrderItems`/`unpickOrderItems` server transactions.

Affected files:

- `src/hooks/orders/use-picking.ts`
- `src/hooks/orders/_fulfillment-cache.ts`
- `src/hooks/orders/use-shipments.ts`
- `tests/unit/orders/order-mutation-invalidation.test.tsx`
- `docs/orders/MAINTAINER-SPRINT-4.md`

Out of scope:

- changing picking or unpicking server transaction behavior
- changing picking dialog UI
- changing mobile picking UI
- changing draft shipment creation/deletion behavior, which was audited and already depends on order/shipment invalidation
- invalidating valuation caches for pick/unpick reservation movements, because allocation changes availability and reservation state rather than stock value

Focused tests:

```bash
./node_modules/.bin/vitest run tests/unit/orders/order-mutation-invalidation.test.tsx
```

Closeout criteria:

- order/fulfillment cache helpers are promoted from shipment-specific naming into a fulfillment cache module
- pick and unpick hooks refresh order detail, order collections, fulfillment surfaces, inventory reservation surfaces, serialized surfaces, and product stock surfaces
- shipment finalization cache behavior remains covered after helper promotion
- focused order mutation invalidation tests pass
- lint/typecheck evidence is recorded

### 3. Picking Result-Aware Cache Identity

Business value: picking and unpicking should not force broad inventory detail and product cache refreshes when the picking transaction already knows which inventory rows and products were reserved or released. Narrower identity makes fulfillment cache behavior easier to trust and review.

Workflow invariant: `pickOrderItems` and `unpickOrderItems` must return affected inventory/product identity to the hook, and `usePickOrderItems`/`useUnpickOrderItems` must use that identity for exact inventory detail and product stock invalidation while keeping broad operational prefixes where filter-safe narrowing is not available.

Affected files:

- `src/server/functions/orders/order-picking.ts`
- `src/hooks/orders/use-picking.ts`
- `src/hooks/orders/_fulfillment-cache.ts`
- `tests/unit/orders/order-mutation-invalidation.test.tsx`
- `docs/orders/MAINTAINER-SPRINT-4.md`

Out of scope:

- changing picking or unpicking transaction behavior
- changing picking input schemas or UI
- changing shipment finalization result envelopes
- narrowing fulfillment, inventory list, movement, availability, or available-serial prefixes
- adding database-backed integration tests for the picking transaction

Focused tests:

```bash
./node_modules/.bin/vitest run tests/unit/orders/order-mutation-invalidation.test.tsx
```

Closeout criteria:

- pick/unpick server results include `affectedInventoryIds`, `affectedProductIds`, and serialized-touch identity
- pick/unpick hooks pass the server result to the fulfillment cache helper
- exact inventory detail caches are invalidated when affected inventory IDs are present
- exact product stock caches are invalidated when affected product IDs are present
- broad detail/product fallback remains when identity is unavailable
- focused order mutation invalidation tests pass
- lint/typecheck evidence is recorded

## Closeout Log

### Issue 1: Shipment Finalization Inventory Cache Contract

Touched domains: orders fulfillment shipment hooks, inventory stock cache policy, valuation cache policy, serialized stock cache policy, product stock cache policy, fulfillment dashboard cache policy.

Workflow protected: fulfillment dashboard/order detail -> shipment mutation hook -> shipment finalization/reopen server function -> shipment, inventory, serialized, movement, and cost-layer side effects -> order, fulfillment, inventory, valuation, availability, serialized, movement, and product stock cache refresh.

Business value: operators marking batteries shipped or reopening shipments for correction should not keep seeing stale stock, valuation, serialized pickers, fulfillment summaries, or product inventory after a shipment transaction changes inventory truth.

Standards checked:

- added an orders-owned shipment cache helper, later promoted to `src/hooks/orders/_fulfillment-cache.ts` in Issue 2
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

### Issue 2: Picking Allocation Cache Contract

Touched domains: orders picking hooks, fulfillment cache policy, inventory reservation cache policy, serialized allocation cache policy, product stock cache policy.

Workflow protected: fulfillment/order picking UI -> `usePickOrderItems`/`useUnpickOrderItems` -> picking server transaction -> inventory reservation and serialized allocation writes -> order, fulfillment, inventory, serialized, and product cache refresh.

Business value: after an operator picks or unpicks battery stock, fulfillment queues, order detail, product inventory, available serials, and warehouse availability no longer depend on stale cached state.

Standards checked:

- promoted the hook cache helper to `src/hooks/orders/_fulfillment-cache.ts` so fulfillment cache policy is not shipment-only
- kept query keys centralized through `queryKeys`
- added `invalidatePickingMutationQueries` for pick/unpick cache policy
- pick/unpick now refresh order detail, order collections, fulfillment list/summary/kanban, inventory list/detail/low-stock/dashboard/WMS/movement/availability/available-serials, serialized stock, and product stock prefixes
- shipment finalization continues to refresh valuation because shipping/reopen changes stock value; picking allocation intentionally does not invalidate valuation

Smells removed:

- `use-picking.ts` had a local order collection helper and hand-written invalidation separate from shipment fulfillment cache policy
- pick/unpick did not refresh fulfillment summary or kanban surfaces even though order status/stage can change
- pick/unpick only refreshed available serials, not broader inventory reservation, movement, availability, or product stock surfaces affected by allocation/deallocation
- the cache helper introduced for shipments was named too narrowly for fulfillment-domain reuse

Deferred:

- draft shipment create/delete behavior was audited but not changed; the order/shipment invalidation from Issue 1 already refreshes the reservation source used by shipment availability calculations
- server result schemas still do not expose affected inventory/product IDs, so pick/unpick invalidation remains broad
- mobile picking browser QA was skipped because the slice is hook/cache contract behavior covered directly by unit tests
- large fulfillment UI files remain unchanged

Verification:

- `./node_modules/.bin/vitest run tests/unit/orders/order-mutation-invalidation.test.tsx`
- `./node_modules/.bin/eslint src/hooks/orders/use-shipments.ts src/hooks/orders/use-picking.ts src/hooks/orders/_fulfillment-cache.ts tests/unit/orders/order-mutation-invalidation.test.tsx`
- `./node_modules/.bin/vitest run tests/unit/orders`
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit`
- `git diff --check -- docs/orders/MAINTAINER-SPRINT-4.md src/hooks/orders/use-shipments.ts src/hooks/orders/use-picking.ts src/hooks/orders/_fulfillment-cache.ts src/hooks/orders/_shipment-cache.ts tests/unit/orders/order-mutation-invalidation.test.tsx`

Goal adaptation: no standing goal change. This continues Sprint 4 by tightening the orders/fulfillment inventory-truth seam through a bounded hook/cache contract slice.

Residual risk: pick/unpick cache invalidation remains broad until the server exposes affected inventory rows or product IDs. A later slice should decide whether order picking mutations should return a result envelope similar to inventory stock mutations.

### Issue 3: Picking Result-Aware Cache Identity

Touched domains: orders picking server functions, fulfillment cache policy, inventory reservation cache policy, product stock cache policy, order mutation regression coverage.

Workflow protected: picking/unpicking transaction -> affected inventory/product identity -> `usePickOrderItems`/`useUnpickOrderItems` -> exact inventory detail/product stock cache invalidation plus broad operational reservation prefixes.

Business value: fulfillment cache refreshes are now less wasteful and more explainable after pick/unpick. Operators still get fresh fulfillment and stock views, while maintainers can see which parts are exact versus intentionally broad.

Standards checked:

- `pickOrderItems` now returns affected inventory IDs, affected product IDs, and whether serialized inventory was touched
- `unpickOrderItems` returns the same cache identity contract
- non-serialized reserve/release plans feed affected inventory identity from transaction-owned reservation steps
- serialized pick/unpick paths collect product identity and available inventory identity where the transaction already resolves it
- `invalidatePickingMutationQueries` now accepts the result envelope and invalidates exact `inventory.detail(id)` keys when possible
- product stock invalidation now uses exact product stock/product movement keys when affected product IDs are present
- broad inventory list, movement, dashboard/WMS, availability, available-serial, and fulfillment prefixes remain broad because those filter spaces are not safely narrowed by the result envelope

Smells removed:

- pick/unpick cache policy had no way to distinguish exact affected rows/products from unknown mutation scope
- product cache invalidation always fell back to `queryKeys.products.all`
- inventory detail invalidation always fell back to the broad details prefix for picking reservation changes

Deferred:

- shipment finalization/reopen still use broad inventory/product invalidation because their server result does not yet expose affected inventory/product IDs
- picking result identity is not formalized as a shared schema; it is a server result contract verified through hook behavior and typecheck
- database-backed tests for the full picking transaction remain outside this hook/cache slice
- serialized unpick can only provide exact inventory identity when the canonical serialized allocation exposes `currentInventoryId`

Verification:

- `./node_modules/.bin/vitest run tests/unit/orders/order-mutation-invalidation.test.tsx`
- `./node_modules/.bin/eslint src/server/functions/orders/order-picking.ts src/hooks/orders/use-picking.ts src/hooks/orders/_fulfillment-cache.ts tests/unit/orders/order-mutation-invalidation.test.tsx`
- `./node_modules/.bin/vitest run tests/unit/orders/order-inventory-reservations.test.ts tests/unit/orders/order-shipment-inventory-plans.test.ts tests/unit/orders/order-mutation-invalidation.test.tsx`
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit`
- `./node_modules/.bin/vitest run tests/unit/orders`

Goal adaptation: no standing goal change. This directly reduces the residual risk recorded in Issue 2 by moving from broad picking invalidation toward a result-aware fulfillment cache contract.

Residual risk: shipment finalization result identity remains broad. A later Sprint 4 slice should either add affected inventory/product identity to shipment finalization/reopen or close Sprint 4 with that explicit deferral.
