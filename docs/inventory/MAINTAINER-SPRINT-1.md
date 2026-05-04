# Maintainer Sprint 1: Inventory and Warehouse Ownership

This sprint applies the maintainer process from `docs/reference/maintainer-sprint-process.md` to the inventory and warehouse domain.

Status: Issues 1, 2, and 3 implemented; inventory server functions now live behind focused ownership modules with `inventory.ts` retained as a compatibility barrel; remaining issues stay in the ledger.

## Business Value

Inventory is core to RENOZ Energy's operating truth. If the app lies about stock, serialized batteries, receiving, warehouse location, valuation, or returned units, every downstream workflow becomes harder to trust: fulfillment, support, warranty, RMA, finance, and customer communication.

This sprint should make RENOZ-V3 less of an operational burden by making warehouse truth easier to inspect, maintain, and change safely.

## Workflow Spine

```text
procurement / receiving
  -> serialized battery stock
  -> warehouse location
  -> inventory movement + cost layer
  -> fulfillment / warranty / RMA / finance visibility
```

## Current Pattern Map

Intended flow:

```text
route
  -> page/container
  -> domain component
  -> hook
  -> server function
  -> schema/database
  -> query key/cache policy
```

Observed inventory paths:

- Routes: `src/routes/_authenticated/inventory/*`, `src/routes/_authenticated/mobile/*`, `src/routes/_authenticated/procurement/receiving.tsx`, product detail stock actions.
- Components: `src/components/domain/inventory/*`, `src/components/domain/purchase-orders/receive/*`, order fulfillment and RMA surfaces.
- Hooks: `src/hooks/inventory/*`, plus adjacent order, support, purchase-order, and supplier hooks.
- Server: `src/server/functions/inventory/*`, `src/server/functions/suppliers/receive-goods.ts`, `src/server/functions/orders/rma.ts`, order shipment/allocation functions.
- Schemas: `src/lib/schemas/inventory/*`, `src/lib/schemas/orders/*`, `src/lib/schemas/purchase-orders/*`, `src/lib/schemas/support/rma.ts`.
- Database: `drizzle/schema/inventory/*`, order shipment/allocation tables, warranty entitlement serial links, support issue serial links.
- Tests: `tests/unit/inventory/*`, `tests/unit/purchase-orders/*`, `tests/unit/orders/*`, `tests/unit/support/*`.

## Source References

- `docs/inventory/README.md`: inventory valuation, serialized lineage, and operational invariants.
- `docs/inventory/OPERATOR-STOCK-IN-WORKFLOWS.md`: operator distinction between Receive Inventory, Receive Goods, Adjust Stock, and Order Stock.
- `docs/code-traces/02-inventory-stock-in.md`: current stock-in trace across manual receive, PO receive, and bulk receive.
- `docs/code-traces/13-rma-receive-inventory.md`: RMA return-to-stock trace.
- `docs/reliability/sql/finance-cost-layer-invariants.sql`: cost layer integrity.
- `docs/reliability/sql/serialized-lineage-invariants.sql`: serialized lineage integrity.

## Triage Findings

### What Is Solid

- Inventory has explicit product docs and workflow docs.
- Read-path handling is much better than older audit notes imply: many hooks use `resolveReadResult`, `requireReadResult`, or `normalizeReadQueryError`.
- Manual receiving already distinguishes non-PO stock-in from supplier-backed Receive Goods.
- Existing tests cover product-context receiving, location read failure, query normalization, WMS/valuation reads, and receive invalidation.

### What Is Fragile

- Core inventory server code was concentrated in `src/server/functions/inventory/inventory.ts` at nearly 3,000 lines; Issue 3 reduced it to a compatibility barrel.
- Core inventory schema code is concentrated in `src/lib/schemas/inventory/inventory.ts` at over 1,700 lines.
- Large UI files such as `unified-inventory-dashboard.tsx` and `inventory-detail-view.tsx` mix multiple operator concerns.
- Cache invalidation contracts are partly centralized, but some prefix keys are still hand-built in hooks.
- Mutation error handling is less consistent than read error handling.

### What Needs Revalidation

- Whether `bulkReceiveStock` still has weaker permission posture than manual and PO receiving.
- Whether RMA receive still lands non-serialized returns in the first warehouse location.
- Whether stock-in traces still match current implementation after cross-phase closeout.
- Whether operator-facing receive, PO receive, mobile receive, and product-detail launch all preserve the same workflow distinction.

## Issue Ledger

### 1. Manual Receive Cache Contract

Business value: warehouse operators should see stock-in reflected immediately across inventory, product, serial availability, dashboards, and valuation.

Evidence:

- `useReceiveInventory` invalidates inventory lists/details/low stock, product detail/inventory/stats/alerts/movements, and inventory movements.
- The cache contract is not explicit about WMS dashboard, valuation, finance integrity, serialized list, available serials, or availability checks.
- Existing focused test: `tests/unit/inventory/use-receive-inventory.test.tsx`.

Proposed slice:

> Inventory receiving should refresh all operator-visible stock truth after non-PO stock-in.

Likely files:

- `src/hooks/inventory/use-inventory.ts`
- `src/lib/query-keys.ts`
- `tests/unit/inventory/use-receive-inventory.test.tsx`
- `tests/unit/shared/query-key-integrity.test.ts`

Out of scope:

- changing server receive behavior
- changing the receiving UI
- extracting large inventory files

### 2. Serialized Availability Prefix Drift

Business value: picking, unpicking, cancellation, and serialized item edits must not leave stale serial selectors.

Evidence:

- Literal available-serial prefix keys appear in:
  - `src/hooks/inventory/use-serialized-items.ts`
  - `src/hooks/orders/use-order-status.ts`
  - `src/hooks/orders/use-picking.ts`
- This violates the centralized query key standard.

Proposed slice:

> Centralize inventory serial availability prefix keys and use them across inventory and orders.

Out of scope:

- changing picking behavior
- changing allocation rules

### 3. Inventory Server Concentration

Business value: inventory code should be safe to change because it controls stock, valuation, and serialized battery truth.

Evidence:

- `src/server/functions/inventory/inventory.ts` previously contained list/detail, adjustment, transfer, receive, movements, dashboard, serial availability, bulk status update, and analytics-adjacent logic.

Proposed slice:

> Map `inventory.ts` into workflow sections and identify one safe extraction boundary with tests before moving code.

Out of scope:

- immediate extraction
- broad server rewrite

### 4. Inventory Mutation Error Standard

Business value: operators need recovery guidance when warehouse or valuation actions fail.

Evidence:

- Read paths often normalize errors.
- Mutations still have pockets of raw `error.message` or generic toasts.

Proposed slice:

> Audit inventory mutation errors into validation, blocked workflow, unavailable dependency, and unknown failure categories.

Out of scope:

- whole-app error handling

### 5. Stock-In Workflow Clarity

Business value: operators should not choose the wrong stock-in workflow.

Evidence:

- Docs distinguish:
  - `Receive Inventory` = non-PO inbound stock
  - `Receive Goods` = supplier delivery against a PO
  - `Adjust Stock` = correction
  - `Order Stock` = start procurement
- Trace notes multiple stock-in entrypoints and duplicated serialized rules.

Proposed slice:

> Verify manual receive, PO receive, mobile receive, and product-detail launch all preserve the same operator distinction.

Out of scope:

- redesigning the receiving UX

### 6. RMA Return-To-Stock Truth

Business value: returned batteries should not land in the wrong warehouse location or lose serialized/cost-layer continuity.

Evidence:

- `docs/code-traces/13-rma-receive-inventory.md` says non-serialized RMA receive may choose the first warehouse location.
- Trace says RMA receive should preserve cost layers, inventory movements, and optional serialized lineage.

Proposed slice:

> Refresh the RMA receive inventory trace against current code and decide whether location selection needs a product change.

Out of scope:

- changing RMA receive until the trace is revalidated

## Recommended First Implementation Slice

Start with Issue 1: Manual Receive Cache Contract.

Why:

- It is small and domain-sliced.
- It protects a real warehouse workflow.
- It exercises the repo standards without a rewrite.
- Existing tests already give a narrow place to verify behavior.
- It can expose whether the query-key contract is mature enough before larger inventory work.

Lifecycle:

```text
Triage: manual non-PO receive freshness
Issue: cache contract after receiveInventory
Architect: route -> form -> hook -> server -> movement/cost layer -> query keys
Implement: only cache-key and invalidation contract changes
Remediate: centralize missing query key prefixes exposed by the slice
Verify: focused receive hook test + query key integrity test
Closeout: business value, standards, smells, gates, residual risk
```

## Gates For First Slice

Focused:

```bash
./node_modules/.bin/vitest run tests/unit/inventory/use-receive-inventory.test.tsx
./node_modules/.bin/vitest run tests/unit/shared/query-key-integrity.test.ts
```

Broader if the slice touches cross-domain hooks:

```bash
./node_modules/.bin/vitest run tests/unit/inventory tests/unit/orders/order-status-contract.test.ts tests/unit/orders/order-mutation-invalidation.test.tsx
```

Direct reliability guards:

```bash
node scripts/check-route-casts.mjs
node scripts/check-pending-dialog-guards.mjs
node scripts/check-read-path-query-guards.mjs
```

## Closeout Template

```text
Touched domains:
Workflow protected:
Business value:
Standards checked:
Smells removed:
Deferred:
Verification:
Goal adaptation:
Residual risk:
```

## Sprint Rule

Do not implement any issue until the slice has:

1. a business value statement,
2. a workflow invariant,
3. affected files,
4. explicit out-of-scope boundaries,
5. focused tests,
6. closeout criteria.

## Closeout Log

### Issue 1: Manual Receive Cache Contract

Touched domains: inventory, warehouse/WMS, product detail, serialized availability, order picking/status cache adjacency.

Workflow protected: manual non-PO stock-in -> inventory quantity -> warehouse dashboards -> valuation/finance visibility -> product stock views -> serial availability selectors.

Business value: warehouse operators should see newly received stock reflected across the surfaces they use to fulfill, pick, value, and inspect serialized battery inventory.

Standards checked:

- centralized query-key prefixes for availability, available serials, and WMS
- explicit manual receive cache contract
- product movement/detail invalidation preserved
- valuation and finance-integrity cache prefix refreshed
- serialized list cache refreshed when a serial number is received

Smells removed:

- literal `availableSerials` prefix invalidations in inventory serialized-item hooks
- literal `availableSerials` prefix invalidations in order status and picking hooks
- scattered manual receive invalidation moved behind a local workflow helper

Deferred:

- server extraction from `src/server/functions/inventory/inventory.ts`
- schema extraction from `src/lib/schemas/inventory/inventory.ts`
- mutation error standardization beyond this receive cache slice
- RMA return-to-stock location revalidation

Verification:

- `./node_modules/.bin/vitest run tests/unit/inventory/use-receive-inventory.test.tsx`
- `./node_modules/.bin/vitest run tests/unit/shared/query-key-integrity.test.ts`
- `./node_modules/.bin/vitest run tests/unit/inventory tests/unit/orders/order-status-contract.test.ts tests/unit/orders/order-mutation-invalidation.test.tsx`
- `node scripts/check-route-casts.mjs`
- `node scripts/check-pending-dialog-guards.mjs`
- `node scripts/check-read-path-query-guards.mjs`
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit`

Goal adaptation: no goal change; the slice followed the product-owner goal by prioritizing architecture cleanliness inside a domain workflow.

Residual risk: manual receive now refreshes the intended operator-visible cache prefixes, but this does not prove the server transaction itself preserves every inventory, cost-layer, and serialized-lineage invariant. Those remain covered by existing reliability SQL and later inventory/RMA slices.

### Issue 2: Serialized Availability Prefix Drift

Touched domains: inventory serialized items, order status, order picking, shared query keys.

Workflow protected: serialized item creation/update/delete and order pick/unpick/cancellation -> available serial selectors.

Business value: operators should not see stale serial choices after serial inventory changes or allocation state changes.

Standards checked:

- available serials prefix is centralized through `queryKeys.inventory.availableSerialsAll()`
- availability prefix is centralized through `queryKeys.inventory.availabilityAll()`
- WMS prefix is centralized through `queryKeys.inventory.wmsAll()`
- cross-domain order hooks no longer hand-build inventory cache prefixes

Smells removed:

- literal `availableSerials` prefix invalidations in inventory serialized-item hooks
- literal `availableSerials` prefix invalidations in order status and picking hooks

Deferred:

- picking behavior changes
- allocation rule changes

Verification:

- `./node_modules/.bin/vitest run tests/unit/shared/query-key-integrity.test.ts`
- `./node_modules/.bin/vitest run tests/unit/inventory tests/unit/orders/order-status-contract.test.ts tests/unit/orders/order-mutation-invalidation.test.tsx`
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit`

Goal adaptation: no goal change; this was the exposed cross-domain smell from Issue 1 and matched the centralized query-key standard.

Residual risk: cache-prefix centralization does not prove every allocation mutation refreshes every downstream consumer; future picking and allocation slices should keep this contract in scope.

### Issue 3: Inventory Server Concentration

Touched domains: inventory server functions, inventory activity logging, manual receiving, stock adjustments, warehouse transfers, product inventory wrappers, inventory allocation/reservation, movement history, inventory dashboard metrics, WMS aggregate reads, serialized availability, bulk operator status updates, inventory list/search/detail reads.

Workflow protected: all inventory mutations that write movement activity records; manual non-PO stock-in; operator stock corrections; warehouse-to-warehouse stock transfers with cost-layer and serialized lineage continuity; allocation/deallocation reservation state with serialized lineage continuity; operator movement history reads for item detail and dashboard movement panels; inventory overview dashboard metrics and top movers; WMS stock by category/location and WMS timeline aggregates; serial selectors for picking/allocation; bulk inventory status changes with movement audit and product activity logs; inventory browsing, low-stock reads, location contents, availability checks, quick search, and item detail reads.

Business value: inventory mutations and operational reads are safer to change when cross-cutting activity logging, manual receive, stock adjustment, transfer, allocation, movement-history, dashboard, WMS aggregate, serialized-availability, bulk status, and core read workflows are outside the monolithic workflow file.

Standards checked:

- extracted one safe helper boundary before moving larger workflow code
- extracted `receiveInventory` into `src/server/functions/inventory/receiving.ts`
- extracted `adjustInventory` into `src/server/functions/inventory/adjustments.ts`
- extracted `transferInventory` into `src/server/functions/inventory/transfers.ts`
- extracted `allocateInventory` and `deallocateInventory` into `src/server/functions/inventory/allocations.ts`
- extracted `listMovements` into `src/server/functions/inventory/movements.ts`
- extracted `getInventoryDashboard` into `src/server/functions/inventory/dashboard.ts`
- extracted WMS aggregate reads into `src/server/functions/inventory/wms-dashboard.ts`
- extracted `getAvailableSerials` into `src/server/functions/inventory/serial-availability.ts`
- extracted `bulkUpdateStatus` into `src/server/functions/inventory/status-updates.ts`
- extracted `listInventory`, `quickSearchInventory`, and `getInventoryItem` into `src/server/functions/inventory/reads.ts`
- reduced `src/server/functions/inventory/inventory.ts` to a compatibility barrel
- kept the inventory query-count/join parity regression guard pointed at the read owner file
- kept transaction-scoped activity logging behavior unchanged
- kept existing public server-function imports unchanged
- preserved the existing `@/server/functions/inventory/inventory` import path via re-export
- moved direct `receiveInventory` consumers to the receiving module
- moved direct `adjustInventory` consumers to the adjustment module
- moved direct `transferInventory` consumers to the transfer module

Smells removed:

- local activity logging helper and activity-table dependency inside `src/server/functions/inventory/inventory.ts`
- manual receive server function and schema from `src/server/functions/inventory/inventory.ts`
- stock adjustment server function from `src/server/functions/inventory/inventory.ts`
- warehouse transfer server function from `src/server/functions/inventory/inventory.ts`
- allocation/deallocation server functions and allocation retry helper from `src/server/functions/inventory/inventory.ts`
- movement-history server function from `src/server/functions/inventory/inventory.ts`
- standard dashboard metrics server function from `src/server/functions/inventory/inventory.ts`
- WMS aggregate read functions from `src/server/functions/inventory/inventory.ts`
- serialized availability selector server function from `src/server/functions/inventory/inventory.ts`
- bulk status update server function and schema from `src/server/functions/inventory/inventory.ts`
- inventory list/search/detail read functions from `src/server/functions/inventory/inventory.ts`
- empty monolith section comments and local type/helper scaffolding from `src/server/functions/inventory/inventory.ts`
- direct receive workflow imports from the monolithic inventory server module
- direct adjustment workflow imports from the monolithic inventory server module
- direct transfer workflow imports from the monolithic inventory server module
- direct movement-history imports from the monolithic inventory server module
- direct dashboard metric imports from the monolithic inventory server module
- direct WMS hook imports from the monolithic inventory barrel
- direct serialized-availability imports from the monolithic inventory server module

Deferred:

- extracting inventory schema sections
- moving legacy read consumers from the compatibility barrel to `src/server/functions/inventory/reads.ts`

Verification:

- `./node_modules/.bin/vitest run tests/unit/inventory/use-receive-inventory.test.tsx tests/unit/inventory/receiving-page-context.test.tsx tests/unit/inventory/receiving-location-read-policy.test.tsx`
- `./node_modules/.bin/vitest run tests/unit/inventory/use-receive-inventory.test.tsx tests/unit/inventory/query-normalization-wave3-movements.test.tsx tests/unit/inventory/query-normalization-wave7b.test.tsx tests/unit/inventory/receiving-page-context.test.tsx tests/unit/inventory/receiving-location-read-policy.test.tsx`
- `./node_modules/.bin/vitest run tests/unit/inventory/query-normalization-wave3-movements.test.tsx tests/unit/inventory/query-normalization-wave7b.test.tsx tests/unit/inventory/use-receive-inventory.test.tsx tests/unit/inventory-support/query-normalization-wave6g.test.tsx`
- `./node_modules/.bin/vitest run tests/unit/inventory tests/unit/inventory-support/query-normalization-wave6g.test.tsx`
- `./node_modules/.bin/vitest run tests/unit/query-count-join-parity.test.ts tests/unit/inventory tests/unit/inventory-support/query-normalization-wave6g.test.tsx`
- `./node_modules/.bin/eslint src/server/functions/inventory/allocations.ts src/server/functions/inventory/inventory.ts`
- `./node_modules/.bin/eslint src/server/functions/inventory/movements.ts src/server/functions/inventory/inventory.ts src/hooks/inventory/use-inventory.ts`
- `./node_modules/.bin/eslint src/server/functions/inventory/dashboard.ts src/server/functions/inventory/inventory.ts src/hooks/inventory/use-inventory.ts`
- `./node_modules/.bin/eslint src/server/functions/inventory/wms-dashboard.ts src/server/functions/inventory/inventory.ts src/hooks/inventory/use-wms-dashboard.ts`
- `./node_modules/.bin/eslint src/server/functions/inventory/serial-availability.ts src/server/functions/inventory/inventory.ts src/hooks/inventory/use-inventory.ts`
- `./node_modules/.bin/eslint src/server/functions/inventory/status-updates.ts src/server/functions/inventory/inventory.ts`
- `./node_modules/.bin/eslint src/server/functions/inventory/reads.ts src/server/functions/inventory/inventory.ts tests/unit/query-count-join-parity.test.ts`
- `git diff --check`
- `node scripts/check-route-casts.mjs`
- `node scripts/check-pending-dialog-guards.mjs`
- `node scripts/check-read-path-query-guards.mjs`
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit`

Goal adaptation: no goal change; this closes the original inventory server concentration through strict modularity without changing behavior.

Residual risk: the main inventory server file is now a 29-line compatibility barrel, but legacy read consumers still import through that barrel and the inventory schema file remains concentrated. Issue 3 closes server-function concentration, not schema decomposition or mutation error standardization.
