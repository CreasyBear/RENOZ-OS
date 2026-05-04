# Maintainer Sprint 1: Inventory and Warehouse Ownership

This sprint applies the maintainer process from `docs/reference/maintainer-sprint-process.md` to the inventory and warehouse domain.

Status: Issues 1, 2, and 3 implemented; Issue 4 in progress with manual receive hook/route, inventory browser route, stock adjustment/transfer dialogs, product-inventory adjustment hook, inventory-launched create-PO dialogs, alert list presenter, stock-count, quality-inspection, location, location route/import, alert hook/route, forecasting hook/route, valuation, finance-integrity, serialized-lineage mutation guidance, serialized list read feedback, and inventory item edit dialog submit feedback standardized; remaining issues stay in the ledger.

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

### Issue 4: Inventory Mutation Error Standard

Touched domains: inventory hooks, product inventory hook, inventory browser route, inventory receiving route, inventory locations route, inventory alerts route, inventory forecasting route, inventory item detail edit dialog, stock adjustment dialog, stock transfer dialog, alert list presenter, alert-launched create-PO dialog, recommendation-launched create-PO dialog, manual receive mutation, inventory list route errors, receive form/location route errors, stock adjustment/transfer submit errors, product inventory adjustment errors, stock-count mutations, quality inspection mutation, warehouse location mutations, location form/import route errors, alert-rule/triggered-alert mutations, alert rule read presentation, alert route read/form errors, forecasting mutations, forecasting route read errors, inventory-to-procurement create-PO submit errors, valuation/cost-layer mutations, finance-integrity reconciliation mutation, serialized item create/update/delete/note mutations, serialized item list read feedback, product detail updates launched from inventory, warehouse stock-in, warehouse movement, cycle-count, inspection, location-management, inventory exception, demand-planning, procurement trigger, valuation, and serialized-lineage operator feedback.

Workflow protected: manual non-PO stock-in failure -> optimistic cache rollback -> operator-facing recovery guidance; inventory browser list failure -> stable unavailable/degraded feedback -> cached inventory stays visible when present; receive route location failure -> stable unavailable feedback -> receive form blocked until a real warehouse location exists; receive route submit failure -> safe form feedback -> receive cache contract preserved by hook; stock adjustment failure -> stable dialog guidance -> inventory adjustment cache contract preserved by hook; product detail stock adjustment failure -> shared inventory formatter guidance -> product inventory, product detail, product stats, stock-alert, and movement cache contracts preserved by hook; stock transfer failure -> stable dialog guidance -> inventory transfer cache contract preserved by hook; low-stock alert/reorder recommendation -> create purchase order failure -> stable dialog guidance -> procurement trigger remains understandable without leaking purchase-order persistence errors; alert rule list failure -> stable unavailable feedback -> alert rule management avoids raw database or tenant-policy wording; stock-count create/update/start/item/bulk/complete/cancel failure -> safe toast guidance -> count/inventory cache contracts preserved; quality inspection record failure -> safe toast guidance -> quality-history cache contract preserved; location create/update/delete failure -> safe toast guidance -> location cache contracts and form error rendering preserved; location route save/import failure -> safe dialog/import feedback -> location hierarchy refresh contract preserved; alert create/update/delete/toggle/acknowledge failure -> safe toast guidance -> alert-rule, triggered-alert, and analytics cache contracts preserved; alert route read/form failure -> stable unavailable/dialog feedback -> active/rules/history alert panel states preserved; forecasting route recommendation/detail read failure -> stable unavailable feedback -> recommendation cards and selected forecast panel avoid raw server text; forecast save/bulk update failure -> safe toast guidance -> forecasting cache contracts preserved; cost-layer create failure -> safe toast guidance -> valuation cache contract preserved; manual COGS apply failure -> explicit shipment/RMA workflow guidance; finance reconciliation failure -> safe toast guidance -> valuation/list cache contracts preserved; serialized create/update/delete/note failure -> safe toast or serialized-state guidance -> serialized list/detail/available-serial cache contracts preserved; serialized list read failure -> stable degraded feedback -> cached serialized item rows stay visible without leaking database or tenant-policy wording; inventory item detail product update failure -> stable dialog guidance -> product detail edits launched from inventory avoid raw product/database messages.

Business value: warehouse operators should get actionable inventory browser, receive, receive-location, stock adjustment, product inventory adjustment, stock transfer, create-PO-from-alert/recommendation, stock-count, inspection, location, location-import, alert, alert-list, alert-panel, forecasting, forecasting-panel, valuation, finance-integrity, serialized list, serialized-lineage, and inventory item edit failure guidance instead of raw database/server wording or generic "failed" toasts when inventory integrity validation rejects an inventory operation or a read dependency degrades.

Standards checked:

- extracted inventory mutation error parsing into `src/hooks/inventory/_mutation-errors.ts`
- added route-scoped inventory browser read error helper for inventory list failures
- reused the existing inventory mutation error formatter for `useReceiveInventory`
- added route-scoped receiving error helpers for receive submit and warehouse-location unavailable feedback
- reused the shared formatter across stock-count mutations
- reused the shared formatter for quality inspection creation
- reused the shared formatter for composite and standalone warehouse location mutations
- added route-scoped location error helpers for form submit and CSV import feedback
- reused the shared formatter for alert rule and triggered alert mutations
- added route-scoped alert error helpers for active/rules/history reads and create/edit submit feedback
- reused the shared formatter for single and bulk forecasting mutations
- added route-scoped forecasting error helpers for reorder recommendation and forecast-detail read feedback
- reused the shared formatter for cost-layer create and finance reconciliation mutations
- folded serialized item mutation codes into the shared formatter through domain-specific code messages
- extended the shared formatter to understand serialized validation detail paths
- added component-scoped serialized list read error copy for stale-list and cold-load failures
- added dialog-scoped inventory item edit submit error copy that preserves field guidance through the shared formatter
- added shared stock-action dialog submit error copy for adjustment and transfer flows
- added shared inventory create-PO submit error copy for alert and recommendation procurement triggers
- added component-scoped alert list read error copy shared by current list and presenter paths
- folded product inventory adjustment errors into the shared inventory mutation formatter
- preserved explicit operator guidance that manual COGS apply is disabled and must flow through shipment/RMA workflows
- preserved optimistic rollback behavior for inventory list/detail caches
- kept cached inventory browser rows visible with stable degraded copy when refetch fails
- preserved receive success and cache invalidation behavior
- kept the receive form blocked on missing warehouse locations with stable unavailable copy
- kept receive form submit errors on safe fallback copy instead of arbitrary thrown messages
- preserved stock-count success and cache invalidation behavior
- preserved quality inspection success and cache invalidation behavior
- preserved location success and cache invalidation behavior
- kept locations form submit error rendering type-safe after mutation error narrowing
- kept local CSV import validation messages visible while suppressing raw server import failures
- preserved alert success and cache invalidation behavior
- kept alerts form submit error rendering type-safe after mutation error narrowing
- kept active, rules, and history alert panels on stable unavailable copy instead of arbitrary thrown messages
- preserved forecast success and cache invalidation behavior
- kept forecasting recommendation and detail panels on stable unavailable copy instead of arbitrary thrown messages
- preserved valuation, cost-layer detail, finance-integrity, and inventory-list cache invalidation behavior
- preserved serialized list/detail, inventory list, and available-serial cache invalidation behavior
- kept cached serialized item rows visible with stable degraded copy when refetch fails
- kept product detail edit submit errors inside the inventory item edit dialog on stable copy instead of arbitrary thrown messages
- kept stock adjustment and transfer dialog submit errors on stable copy while preserving structured field guidance
- kept product inventory adjustment toast errors on stable copy while preserving structured field guidance and serialized-state guidance
- kept create-PO-from-alert and create-PO-from-recommendation submit errors on stable copy while preserving structured field guidance
- kept alert list presenter read errors on stable copy instead of arbitrary thrown messages
- kept stock-count-specific completion guidance for cost-layer and serialized-unit integrity failures
- added inventory browser route regression coverage for raw cold-load and cached-list read errors
- added formatter unit coverage for validation guidance and raw-message suppression
- added a regression test for validation-code guidance on receive failure
- added receive route regression coverage for raw submit errors and raw location read errors
- added stock-count hook regression coverage for raw create errors and completion integrity failures
- added quality hook regression coverage for raw inspection errors
- added location hook regression coverage for raw composite and standalone location errors
- added location route regression coverage for raw form-submit and import server errors
- added alert hook regression coverage for raw create and acknowledge errors
- added alert route regression coverage for raw form-submit and read errors
- added forecasting hook regression coverage for raw single-save and bulk-update errors
- added forecasting route regression coverage for raw recommendation and detail read errors
- added valuation hook regression coverage for raw cost-layer create errors, manual COGS disabled guidance, and raw finance reconciliation errors
- added serialized item hook regression coverage for raw create/delete/note errors and shipped-lineage conflict guidance
- added serialized list container regression coverage for raw read error suppression while stale rows remain visible
- added inventory item edit dialog regression coverage for raw product update error suppression
- added stock action helper regression coverage for raw adjustment/transfer error suppression and structured field guidance
- added product inventory mutation helper regression coverage for raw adjustment error suppression, structured field guidance, and invalid serialized state guidance
- added inventory create-PO helper regression coverage for raw purchase-order create error suppression and structured field guidance
- added alert list presenter regression coverage for raw alert-rule read error suppression

Smells removed:

- duplicated inventory mutation error-shape parsing in `use-inventory.ts` and `use-stock-counts.ts`
- raw inventory browser route read errors
- untested inventory browser route cold-load and cached-list failure messaging
- generic `Failed to receive inventory` toast in `useReceiveInventory`
- raw receive route submit error passed into the receive form
- raw warehouse-location read error rendered by the receive route
- raw `error.message` stock-count mutation toasts
- raw `error.message` quality inspection mutation toast
- raw `error.message` location mutation toasts
- unsafe locations form access to mutation `error.message` on an untyped error object
- duplicate raw save-location toast in the locations route
- raw import server errors in the locations route
- raw `error.message` alert mutation toasts
- unsafe alerts form access to mutation `error.message` on an untyped error object
- raw alert read messages in active/rules/history route panels
- raw alert create/edit submit errors in the alerts route
- raw `error.message` forecasting mutation toasts
- raw forecasting route recommendation/detail read messages
- raw `error.message` valuation cost-layer mutation toast
- raw `error.message` manual COGS mutation toast while preserving the deliberate disabled-workflow message
- raw `error.message` finance reconciliation mutation toast
- raw `error.message` fallback in serialized item mutation toasts
- bespoke serialized mutation code parser now replaced by the shared formatter extension
- raw serialized list container read error rendering
- raw inventory item edit dialog submit error rendering
- raw stock adjustment dialog submit error rendering
- raw product inventory adjustment hook fallback to arbitrary `error.message`
- raw stock transfer dialog submit error rendering
- raw create-PO-from-alert dialog submit error rendering
- raw create-PO-from-recommendation dialog submit error rendering
- raw alert list presenter read error rendering
- duplicated alert rule unavailable copy between list and presenter paths
- untested receive mutation failure messaging
- untested receive route submit/location failure messaging
- untested stock-count mutation failure messaging
- untested quality inspection mutation failure messaging
- untested location mutation failure messaging
- untested locations route form/import failure messaging
- untested alert mutation failure messaging
- untested alerts route form/read failure messaging
- untested forecasting mutation failure messaging
- untested forecasting route read failure messaging
- untested valuation and finance-integrity mutation failure messaging
- untested serialized item mutation failure messaging
- untested stale serialized list raw read failure messaging
- untested inventory item edit dialog raw submit failure messaging
- untested stock action dialog raw submit failure messaging
- untested product inventory adjustment raw failure messaging
- untested inventory-launched create-PO raw submit failure messaging
- untested alert list presenter raw read failure messaging

Deferred:

- product-domain hooks outside product inventory still have raw product/pricing/image/bundle error messaging and should be handled in a product sprint, not hidden inside this inventory slice

Verification:

- `./node_modules/.bin/vitest run tests/unit/inventory/query-normalization-wave3-alerts.test.tsx`
- `./node_modules/.bin/eslint src/components/domain/inventory/alerts/alert-list-error-messages.ts src/components/domain/inventory/alerts/alerts-list-presenter.tsx src/components/domain/inventory/alerts/alerts-list.tsx tests/unit/inventory/query-normalization-wave3-alerts.test.tsx`
- `./node_modules/.bin/vitest run tests/unit/products/product-inventory-mutation-errors.test.ts tests/unit/products/product-inventory-tab-container.test.tsx`
- `./node_modules/.bin/eslint src/hooks/products/use-product-inventory.ts src/hooks/products/product-inventory-error-messages.ts tests/unit/products/product-inventory-mutation-errors.test.ts tests/unit/products/product-inventory-tab-container.test.tsx`
- `./node_modules/.bin/vitest run tests/unit/inventory/create-purchase-order-error-messages.test.ts tests/unit/inventory/inventory-mutation-errors.test.ts`
- `./node_modules/.bin/eslint src/components/domain/inventory/create-purchase-order-error-messages.ts src/components/domain/inventory/forecasting/create-po-from-recommendation-dialog.tsx src/components/domain/inventory/alerts/create-po-from-alert-dialog.tsx tests/unit/inventory/create-purchase-order-error-messages.test.ts`
- `./node_modules/.bin/vitest run tests/unit/inventory/stock-action-error-messages.test.ts tests/unit/inventory/inventory-mutation-errors.test.ts`
- `./node_modules/.bin/eslint src/components/domain/inventory/stock-adjustment-dialog.tsx src/components/domain/inventory/stock-transfer-dialog.tsx src/components/domain/inventory/stock-action-error-messages.ts tests/unit/inventory/stock-action-error-messages.test.ts`
- `./node_modules/.bin/vitest run tests/unit/inventory/inventory-item-edit-dialog.test.tsx tests/unit/inventory/inventory-mutation-errors.test.ts`
- `./node_modules/.bin/eslint src/components/domain/inventory/inventory-item-edit-dialog.tsx src/components/domain/inventory/inventory-item-edit-error-messages.ts tests/unit/inventory/inventory-item-edit-dialog.test.tsx`
- `./node_modules/.bin/vitest run tests/unit/inventory-support/query-normalization-wave6g.test.tsx tests/unit/inventory/query-normalization-wave3-serialized-items.test.tsx`
- `./node_modules/.bin/eslint src/components/domain/inventory/serialized-items/serialized-items-list-container.tsx src/components/domain/inventory/serialized-items/serialized-item-error-messages.ts tests/unit/inventory-support/query-normalization-wave6g.test.tsx`
- `./node_modules/.bin/vitest run tests/unit/inventory/inventory-mutation-errors.test.ts tests/unit/inventory/query-normalization-wave3-forecasting.test.tsx`
- `./node_modules/.bin/eslint src/routes/_authenticated/inventory/forecasting-page.tsx src/routes/_authenticated/inventory/forecasting-error-messages.ts tests/unit/inventory/query-normalization-wave3-forecasting.test.tsx`
- `./node_modules/.bin/vitest run tests/unit/inventory/query-normalization-wave3-browser.test.tsx`
- `./node_modules/.bin/eslint src/routes/_authenticated/inventory/inventory-browser-page.tsx src/routes/_authenticated/inventory/inventory-browser-error-messages.ts tests/unit/inventory/query-normalization-wave3-browser.test.tsx`
- `./node_modules/.bin/vitest run tests/unit/inventory/inventory-mutation-errors.test.ts tests/unit/inventory/use-receive-inventory.test.tsx tests/unit/inventory/receiving-location-read-policy.test.tsx tests/unit/inventory/receiving-page-context.test.tsx`
- `./node_modules/.bin/eslint src/routes/_authenticated/inventory/receiving-page.tsx src/routes/_authenticated/inventory/receiving-error-messages.ts tests/unit/inventory/receiving-location-read-policy.test.tsx`
- `./node_modules/.bin/vitest run tests/unit/inventory/inventory-mutation-errors.test.ts tests/unit/inventory/query-normalization-wave3-alerts.test.tsx`
- `./node_modules/.bin/eslint src/routes/_authenticated/inventory/alerts-page.tsx src/routes/_authenticated/inventory/alert-error-messages.ts tests/unit/inventory/query-normalization-wave3-alerts.test.tsx`
- `./node_modules/.bin/vitest run tests/unit/inventory/inventory-mutation-errors.test.ts tests/unit/inventory/query-normalization-wave3-locations.test.tsx`
- `./node_modules/.bin/eslint src/routes/_authenticated/inventory/locations-page.tsx src/routes/_authenticated/inventory/location-error-messages.ts tests/unit/inventory/query-normalization-wave3-locations.test.tsx`
- `./node_modules/.bin/vitest run tests/unit/inventory/inventory-mutation-errors.test.ts tests/unit/inventory/query-normalization-wave3-serialized-items.test.tsx tests/unit/inventory-support/query-normalization-wave6g.test.tsx`
- `./node_modules/.bin/eslint src/hooks/inventory/_mutation-errors.ts src/hooks/inventory/use-serialized-items.ts tests/unit/inventory/inventory-mutation-errors.test.ts tests/unit/inventory/query-normalization-wave3-serialized-items.test.tsx`
- `./node_modules/.bin/vitest run tests/unit/inventory/inventory-mutation-errors.test.ts tests/unit/inventory/query-normalization-wave3-analytics.test.tsx`
- `./node_modules/.bin/eslint src/hooks/inventory/use-valuation.ts tests/unit/inventory/query-normalization-wave3-analytics.test.tsx`
- `./node_modules/.bin/vitest run tests/unit/inventory/inventory-mutation-errors.test.ts tests/unit/inventory/query-normalization-wave3-forecasting.test.tsx`
- `./node_modules/.bin/vitest run tests/unit/inventory/inventory-mutation-errors.test.ts tests/unit/inventory/query-normalization-wave3-alerts.test.tsx`
- `./node_modules/.bin/vitest run tests/unit/inventory/inventory-mutation-errors.test.ts tests/unit/inventory/query-normalization-wave3-locations.test.tsx`
- `./node_modules/.bin/vitest run tests/unit/inventory/inventory-mutation-errors.test.ts tests/unit/inventory/query-normalization-wave3-quality.test.tsx`
- `./node_modules/.bin/vitest run tests/unit/inventory/inventory-mutation-errors.test.ts tests/unit/inventory/use-receive-inventory.test.tsx tests/unit/inventory/query-normalization-wave3-stock-counts.test.tsx`
- `./node_modules/.bin/vitest run tests/unit/inventory/use-receive-inventory.test.tsx`
- `./node_modules/.bin/vitest run tests/unit/inventory tests/unit/inventory-support/query-normalization-wave6g.test.tsx`
- `./node_modules/.bin/vitest run tests/unit/products tests/unit/inventory tests/unit/inventory-support/query-normalization-wave6g.test.tsx`
- `./node_modules/.bin/eslint src/hooks/inventory/use-forecasting.ts tests/unit/inventory/query-normalization-wave3-forecasting.test.tsx`
- `./node_modules/.bin/eslint src/hooks/inventory/use-alerts.ts src/routes/_authenticated/inventory/alerts-page.tsx tests/unit/inventory/query-normalization-wave3-alerts.test.tsx`
- `./node_modules/.bin/eslint src/hooks/inventory/use-locations.ts src/routes/_authenticated/inventory/locations-page.tsx tests/unit/inventory/query-normalization-wave3-locations.test.tsx`
- `./node_modules/.bin/eslint src/hooks/inventory/use-quality.ts tests/unit/inventory/query-normalization-wave3-quality.test.tsx`
- `./node_modules/.bin/eslint src/hooks/inventory/use-inventory.ts tests/unit/inventory/use-receive-inventory.test.tsx`
- `./node_modules/.bin/eslint src/hooks/inventory/_mutation-errors.ts src/hooks/inventory/use-inventory.ts src/hooks/inventory/use-stock-counts.ts tests/unit/inventory/inventory-mutation-errors.test.ts tests/unit/inventory/use-receive-inventory.test.tsx tests/unit/inventory/query-normalization-wave3-stock-counts.test.tsx`
- `git diff --check`
- `node scripts/check-route-casts.mjs`
- `node scripts/check-pending-dialog-guards.mjs`
- `node scripts/check-read-path-query-guards.mjs`
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit`

Goal adaptation: no goal change; this keeps Issue 4 moving through small error-standard slices and treats product-detail inventory adjustment as part of the inventory stock correction workflow spine.

Residual risk: this slice standardizes inventory browser route, manual receive hook/route, stock adjustment/transfer dialogs, product inventory adjustment hook, inventory-launched create-PO dialogs, alert list presentation, stock-count, quality-inspection, location hook/route, alert hook/route, forecasting hook/route, valuation, finance-integrity, serialized list reads, inventory item edit dialog submit feedback, and serialized-lineage mutations only. The broader product domain still has raw product/pricing/image/bundle error messaging, but that belongs in a product-domain sprint unless it directly touches inventory workflow integrity.
