# Maintainer Sprint 1: Inventory and Warehouse Ownership

This sprint applies the maintainer process from `docs/reference/maintainer-sprint-process.md` to the inventory and warehouse domain.

Status: Issues 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, and 16 implemented; deferred risks remain captured in the sprint closeout backlog.

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
- `docs/code-traces/02-inventory-stock-in.md`: current stock-in trace across manual receive, product-detail receive launch, PO receive, and bulk PO receive.
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

- `bulkReceiveStock` is not a live export or caller path; stock-in trace drift was corrected and guarded.
- RMA receive no longer silently lands non-serialized returns in the first warehouse location; explicit location selection is required except for the single-active-location fallback.
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

- `docs/code-traces/13-rma-receive-inventory.md` previously said non-serialized RMA receive may choose the first warehouse location.
- Current code accepts `locationId`, blocks missing selection in the detail hook, validates the selected warehouse location, and only falls back when exactly one active location exists.
- Trace says RMA receive should preserve cost layers, inventory movements, and optional serialized lineage.

Proposed slice:

> Refresh the RMA receive inventory trace against current code and decide whether location selection needs a product change.

Out of scope:

- changing RMA receive until the trace is revalidated

### 7. Manual Receive Serialized Rule Parity

Business value: operators receiving serialized batteries should get the same validation guidance before submit that the server enforces inside the inventory transaction.

Evidence:

- `docs/code-traces/02-inventory-stock-in.md` calls out duplicated serialized receive rules between the form and server.
- The receiving form allowed a serial number on non-serialized products even though `receiveInventory` rejects that payload.

Proposed slice:

> Centralize manual receive serialization validation and wire both the receiving form and server to the shared rule.

Out of scope:

- changing serialized lineage writes
- redesigning the receiving form
- changing PO receive serialization rules

### 8. Manual Receive Schema Ownership

Business value: manual receiving rules should live with the manual receiving workflow, not in the large generic inventory schema file.

Evidence:

- Issue 7 created `src/lib/schemas/inventory/receiving.ts`, but `manualReceiptReasonValues`, `manualReceiptReasonSchema`, and `ManualReceiptReason` still lived in `src/lib/schemas/inventory/inventory.ts`.
- Manual receive form, mobile receiving, receive hook, and receive server all consume the receipt reason contract through the inventory schema barrel.

Proposed slice:

> Move manual receipt reason schema ownership into `src/lib/schemas/inventory/receiving.ts` while preserving the public `@/lib/schemas/inventory` export surface.

Out of scope:

- extracting unrelated inventory schemas
- changing receipt reason values or labels
- changing receive behavior

### 9. Inventory Movement Schema Ownership

Business value: movement, adjustment, and transfer contracts should live with movement workflow ownership instead of the generic inventory schema monolith.

Evidence:

- `src/server/functions/inventory/movements.ts`, `adjustments.ts`, and `transfers.ts` already own separate server workflows.
- `movementTypeValues`, `createMovementSchema`, `stockAdjustmentSchema`, and `stockTransferSchema` still lived in `src/lib/schemas/inventory/inventory.ts`.

Proposed slice:

> Move movement, adjustment, and transfer schemas into `src/lib/schemas/inventory/movements.ts` while preserving the public `@/lib/schemas/inventory` export surface.

Out of scope:

- changing movement values
- changing adjustment or transfer behavior
- decomposing dashboard/valuation/count schemas

### 10. Inventory Location Schema Ownership

Business value: warehouse location CRUD/list contracts should live with location workflow ownership instead of the generic inventory schema monolith.

Evidence:

- `src/server/functions/inventory/locations.ts` owns location management workflows.
- `createLocationSchema`, `updateLocationSchema`, `locationListQuerySchema`, and `locationListCursorQuerySchema` still lived in `src/lib/schemas/inventory/inventory.ts`.

Proposed slice:

> Move location CRUD/list schemas into `src/lib/schemas/inventory/locations.ts` while preserving the public `@/lib/schemas/inventory` export surface.

Out of scope:

- moving warehouse-location hierarchy schemas
- changing location defaults or filters
- changing location server behavior

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

## Sprint Closeout Audit

Objective: make Inventory/Warehouse easier to trust and maintain by protecting stock-in, serialized availability, warehouse/RMA return, cache, mutation-error, and server-function ownership contracts through small issue slices.

Prompt-to-artifact checklist:

| Requirement | Evidence |
|-------------|----------|
| Domain sprint, not broad cleanup | This artifact owns the Inventory/Warehouse sprint and closes sixteen bounded issues. |
| Business value stated | Sprint Business Value plus each issue closeout states operator/business value. |
| Workflow spine mapped | `procurement / receiving -> serialized battery stock -> warehouse location -> inventory movement + cost layer -> fulfillment / warranty / RMA / finance visibility`. |
| Route -> container/page -> hook -> server -> schema/database -> query/cache checked | Current Pattern Map plus issue closeouts for receive, serialized availability, server extraction, stock-in, RMA receive, manual receive serialization parity, manual receive schema ownership, movement schema ownership, location schema ownership, import boundary, warehouse-location schema ownership, stock-count schema ownership, valuation schema ownership, forecasting schema ownership, and alert schema ownership. |
| Clear domain ownership | Inventory server functions were extracted to workflow files; RMA receive remains support/order-owned with inventory side effects traced. |
| Centralized query keys | Issues 1 and 2 centralized manual receive and serialized availability prefixes through `queryKeys.inventory.*`. |
| Safe mutation/cache contracts | Issues 1, 2, 4, 5, 6, and 7 record mutation invalidation, rollback, validation, and read/error state contracts. |
| Tenant isolation checked | Server-function slices and traces verify `withAuth`, `ctx.organizationId`, and transaction-scoped RLS where touched. |
| Transactional inventory/finance integrity checked | Receive, transfer, RMA receive, valuation, cost-layer, and finance-integrity paths were traced or guarded; database-backed integration remains deferred where noted. |
| Serialized lineage continuity checked | Manual receive, transfer, serialized item mutations, stock-in trace, and RMA receive trace preserve serialized lineage expectations. |
| Honest UI states and operator-safe errors | Issue 4 standardized inventory-owned read/mutation error presentation and removed raw server/database messages from covered operator surfaces. |
| Meaningful tests/gates | Each issue closeout records focused tests, broader tests/guards, lint/typecheck where risk justified it. |
| Reviewable diffs | Work landed as small code/test/doc commits per slice; compatibility barrels kept blast radius contained. |

Sprint standards checked:

- inventory server behavior now has workflow-owned modules instead of a monolithic implementation file
- manual receive cache policy refreshes operator-visible stock, WMS, valuation, serialized, product, and movement surfaces
- available-serial cache prefixes are centralized
- inventory-owned operator errors use stable recovery guidance instead of raw server text
- stock-in workflow language now distinguishes non-PO receive, PO receive-goods, order-stock, and corrections
- product receive wrappers cannot reintroduce a separate product bulk-receive path without failing the trace guard
- RMA return-to-stock location selection is explicit and trace guarded
- manual receive serialized/non-serialized rules now have one shared schema helper used by UI and server validation
- manual receipt reason schema ownership now lives with the receiving workflow schema helper
- movement, stock adjustment, and transfer schemas now live with movement workflow ownership
- location CRUD/list schemas now live with location workflow ownership
- warehouse location hierarchy/list/create/update schemas now live with warehouse-location workflow ownership
- stock count and stock count item schemas now live with stock-count workflow ownership
- valuation, COGS, cost-layer, aging, turnover, and finance-integrity schemas now live with valuation workflow ownership
- forecasting, reorder recommendation, and forecast list schemas now live with forecasting workflow ownership
- alert rule, triggered alert, and alert list schemas now live with alert workflow ownership

Sprint smells removed:

- concentrated inventory server-function ownership
- literal serialized-availability query prefixes in cross-domain hooks
- stale stock-in trace references to non-existent `bulkReceiveStock`
- stale RMA trace claim that non-serialized returns silently use the first warehouse location
- raw inventory-owned operator error rendering across receive, browser, stock actions, locations, alerts, forecasting, valuation, serialized list, and inventory item edit surfaces
- under-described manual receive cache contract
- duplicated manual receive serialized validation between form and server
- non-serialized products could carry serial input through the receive form until server rejection
- manual receipt reason schema lived in the generic inventory schema monolith instead of the receiving schema owner
- movement, adjustment, and transfer schemas lived in the generic inventory schema monolith
- location CRUD/list schemas lived in the generic inventory schema monolith
- warehouse location schemas and hook/API response types lived in the generic inventory schema monolith
- stock count schemas and stock count item schemas lived in the generic inventory schema monolith
- valuation, COGS, cost-layer, aging, turnover, and finance-integrity schemas lived in the generic inventory schema monolith
- forecasting schemas and reorder/list response types lived in the generic inventory schema monolith
- alert schemas and alert list/triggered response types lived in the generic inventory schema monolith

Deferred backlog:

- `src/lib/schemas/inventory/inventory.ts` remains large and should continue to be decomposed by workflow schema ownership
- legacy read consumers still import through the inventory compatibility barrel in places
- database-backed integration coverage is still needed for receive/RMA quantity, movement, cost-layer, valuation, transition, and serialized-lineage invariants
- fixed `AUD` currency in RMA return cost layers remains a finance/inventory valuation slice
- `createRma` permission asymmetry belongs to support-domain auth work
- product-domain raw error handling outside inventory-owned surfaces belongs to a product sprint
- PO `receiveGoods` error copy belongs to procurement unless future operator QA finds stock-in confusion

Sprint verification evidence:

- focused receive, serialized availability, stock-in, RMA receive, and inventory mutation-error tests recorded in issue closeouts
- manual receive serialization parity contract recorded in Issue 7
- manual receive schema ownership extraction recorded in Issue 8
- movement schema ownership extraction recorded in Issue 9
- location schema ownership extraction recorded in Issue 10
- broad inventory sweeps recorded in Issues 3, 4, and 5
- support RMA receive location/dialog/mutation tests recorded in Issue 6
- direct guards recorded where run: `check-route-casts`, `check-pending-dialog-guards`, `check-read-path-query-guards`, `git diff --check`
- typecheck recorded on issue closeouts where code/test changes warranted it

Gates skipped:

- full app build and full unit suite were not run as a sprint-level gate because the sprint closed through many small verified slices and the final sprint closeout is documentation-only.
- browser/manual QA was deferred; this sprint emphasized code contracts, trace correctness, and focused regression coverage.

Goal adaptation: no standing goal change. The sprint validates the domain-sprint operating model: issue slices are the unit of implementation, and sprint closeout is the unit of product-owner progress.

Sprint residual risk: Inventory/Warehouse is materially cleaner, but not "done" as a domain. The next sprint should choose between inventory schema decomposition, database-backed inventory/RMA integration coverage, or a support/RMA auth and remedy closeout slice based on current business risk.

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

Status: implemented for inventory-owned surfaces after closeout audit. Remaining raw product/pricing/image/bundle error surfaces belong to a product-domain sprint unless they directly touch inventory workflow integrity.

Touched domains: inventory hooks, product inventory hook, inventory browser route, inventory receiving route, mobile receiving route, inventory locations route, inventory alerts route, inventory forecasting route, inventory item detail edit dialog, stock adjustment dialog, stock transfer dialog, alert list presenter, alert-launched create-PO dialog, recommendation-launched create-PO dialog, manual receive mutation, inventory list route errors, receive form/location route errors, mobile receive form/location errors, stock adjustment/transfer submit errors, product inventory adjustment errors, stock-count mutations, quality inspection mutation, warehouse location mutations, location form/import route errors, alert-rule/triggered-alert mutations, alert rule read presentation, alert route read/form errors, forecasting mutations, forecasting route read errors, inventory-to-procurement create-PO submit errors, valuation/cost-layer mutations, finance-integrity reconciliation mutation, serialized item create/update/delete/note mutations, serialized item list read feedback, product detail updates launched from inventory, warehouse stock-in, warehouse movement, cycle-count, inspection, location-management, inventory exception, demand-planning, procurement trigger, valuation, and serialized-lineage operator feedback.

Workflow protected: manual non-PO stock-in failure -> optimistic cache rollback -> operator-facing recovery guidance; inventory browser list failure -> stable unavailable/degraded feedback -> cached inventory stays visible when present; receive route location failure -> stable unavailable feedback -> receive form blocked until a real warehouse location exists; receive route submit failure -> safe form feedback -> receive cache contract preserved by hook; mobile receive location/submit failure -> stable mobile guidance -> handheld non-PO receiving avoids raw database or tenant-policy wording; stock adjustment failure -> stable dialog guidance -> inventory adjustment cache contract preserved by hook; product detail stock adjustment failure -> shared inventory formatter guidance -> product inventory, product detail, product stats, stock-alert, and movement cache contracts preserved by hook; stock transfer failure -> stable dialog guidance -> inventory transfer cache contract preserved by hook; low-stock alert/reorder recommendation -> create purchase order failure -> stable dialog guidance -> procurement trigger remains understandable without leaking purchase-order persistence errors; alert rule list failure -> stable unavailable feedback -> alert rule management avoids raw database or tenant-policy wording; stock-count create/update/start/item/bulk/complete/cancel failure -> safe toast guidance -> count/inventory cache contracts preserved; quality inspection record failure -> safe toast guidance -> quality-history cache contract preserved; location create/update/delete failure -> safe toast guidance -> location cache contracts and form error rendering preserved; location route save/import failure -> safe dialog/import feedback -> location hierarchy refresh contract preserved; alert create/update/delete/toggle/acknowledge failure -> safe toast guidance -> alert-rule, triggered-alert, and analytics cache contracts preserved; alert route read/form failure -> stable unavailable/dialog feedback -> active/rules/history alert panel states preserved; forecasting route recommendation/detail read failure -> stable unavailable feedback -> recommendation cards and selected forecast panel avoid raw server text; forecast save/bulk update failure -> safe toast guidance -> forecasting cache contracts preserved; cost-layer create failure -> safe toast guidance -> valuation cache contract preserved; manual COGS apply failure -> explicit shipment/RMA workflow guidance; finance reconciliation failure -> safe toast guidance -> valuation/list cache contracts preserved; serialized create/update/delete/note failure -> safe toast or serialized-state guidance -> serialized list/detail/available-serial cache contracts preserved; serialized list read failure -> stable degraded feedback -> cached serialized item rows stay visible without leaking database or tenant-policy wording; inventory item detail product update failure -> stable dialog guidance -> product detail edits launched from inventory avoid raw product/database messages.

Business value: warehouse operators should get actionable inventory browser, receive, receive-location, stock adjustment, product inventory adjustment, stock transfer, create-PO-from-alert/recommendation, stock-count, inspection, location, location-import, alert, alert-list, alert-panel, forecasting, forecasting-panel, valuation, finance-integrity, serialized list, serialized-lineage, and inventory item edit failure guidance instead of raw database/server wording or generic "failed" toasts when inventory integrity validation rejects an inventory operation or a read dependency degrades.

Standards checked:

- extracted inventory mutation error parsing into `src/hooks/inventory/_mutation-errors.ts`
- added route-scoped inventory browser read error helper for inventory list failures
- reused the existing inventory mutation error formatter for `useReceiveInventory`
- added route-scoped receiving error helpers for receive submit and warehouse-location unavailable feedback
- reused the receiving route error helpers in mobile receiving
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
- kept mobile receive submit and location read errors on safe fallback copy instead of arbitrary thrown messages
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
- raw mobile receive submit/location error rendering
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
- untested mobile receive route submit/location failure messaging
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
- `./node_modules/.bin/vitest run tests/unit/inventory/receiving-location-read-policy.test.tsx tests/unit/inventory/inventory-mutation-errors.test.ts tests/unit/inventory/use-receive-inventory.test.tsx`
- `./node_modules/.bin/eslint src/routes/_authenticated/inventory/receiving-page.tsx src/routes/_authenticated/inventory/receiving-error-messages.ts tests/unit/inventory/receiving-location-read-policy.test.tsx`
- `./node_modules/.bin/eslint src/routes/_authenticated/mobile/-receiving-page.tsx tests/unit/inventory/receiving-location-read-policy.test.tsx src/routes/_authenticated/inventory/receiving-error-messages.ts`
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

### Issue 5: Stock-In Workflow Clarity

Touched domains: inventory receiving route, mobile receiving route, product detail inventory tab launch, PO receive-goods surfaces, inventory stock-in trace docs, product-inventory wrapper trace guard.

Workflow protected: product detail `Receive Inventory` -> `/inventory/receiving` with `source=product_detail` -> non-PO `receiveInventory`; mobile `Receive Inventory` -> non-PO barcode receipt -> `receiveInventory`; product detail `Order Stock` -> `/purchase-orders/create` with product context -> PO create; PO detail `Receive Goods` -> `receiveGoods` against PO pending quantities.

Business value: operators should keep choosing the right stock-in path: Receive Inventory for non-PO inbound stock, Receive Goods for supplier delivery against a PO, Order Stock for replenishment, and Adjust Stock for corrections.

Standards checked:

- verified product-detail receive launch preserves `source=product_detail` and `returnToProductId`
- verified product-detail order-stock launch preserves product context and optional preferred supplier
- verified desktop receiving copy says non-PO inbound stock and returns to product detail on contextual success/cancel
- verified mobile receiving copy says non-PO receipt and uses `receiveInventory`
- verified PO detail uses `Receive Goods` wording and `receiveGoods` dialog for PO receipt
- aligned mobile receive location and submit failures with the desktop receiving error helper
- refreshed `docs/code-traces/02-inventory-stock-in.md` to point at extracted `receiving.ts` and the current manual receive cache contract
- revalidated that `bulkReceiveStock` is not a live export or caller and corrected the trace to describe current product-inventory wrappers

Smells removed:

- mobile receive submit errors could toast arbitrary thrown messages
- mobile receive location unavailable state rendered `locationsError.message`
- stock-in trace still pointed at the old inventory server barrel for `receiveInventory`
- stock-in trace under-described the current manual receive cache contract
- stock-in trace documented a non-existent `bulkReceiveStock` product batch path

Deferred:

- duplicated serialized receive rules between form and server remain a future workflow-contract slice
- PO `receiveGoods` error messaging belongs to a purchase-order/procurement slice unless stock-in tracing finds operator-facing drift

Verification:

- `./node_modules/.bin/vitest run tests/unit/inventory/receiving-location-read-policy.test.tsx tests/unit/inventory/inventory-mutation-errors.test.ts tests/unit/inventory/use-receive-inventory.test.tsx`
- `./node_modules/.bin/vitest run tests/unit/inventory/stock-in-workflow-trace.test.ts`
- `./node_modules/.bin/vitest run tests/unit/inventory tests/unit/inventory-support/query-normalization-wave6g.test.tsx`
- `./node_modules/.bin/eslint src/routes/_authenticated/mobile/-receiving-page.tsx tests/unit/inventory/receiving-location-read-policy.test.tsx src/routes/_authenticated/inventory/receiving-error-messages.ts`
- `./node_modules/.bin/eslint tests/unit/inventory/stock-in-workflow-trace.test.ts`
- `git diff --check`
- `node scripts/check-route-casts.mjs`
- `node scripts/check-pending-dialog-guards.mjs`
- `node scripts/check-read-path-query-guards.mjs`
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit`

Goal adaptation: no goal change; this closes Issue 5 by using the trace as a living contract and correcting stale workflow memory instead of adding a broader receive refactor.

Residual risk: serialized rule parity remains deferred. PO receive-goods error copy stays in procurement scope unless a future operator QA pass finds stock-in confusion there.

### Issue 6: RMA Return-To-Stock Truth

Touched domains: support RMA detail receive flow, RMA server receive workflow, RMA schema, inventory return-to-stock trace docs.

Workflow protected: approved RMA -> receive dialog location selection -> `useReceiveRma` -> `receiveRma` -> selected non-serialized inventory location or existing serialized inventory row -> movement/cost layer/serialized-lineage updates.

Business value: returned batteries and accessories should not disappear into an arbitrary warehouse bin; the app should force the receiving dock/operator location to be explicit for multi-location operations.

Standards checked:

- verified `receiveRmaSchema` carries `locationId`
- verified `use-rma-detail` blocks receive before mutation when `locationId` is missing
- verified `receiveRma` validates selected organization-scoped warehouse location and only permits omitted location when exactly one active location exists
- verified `bulkReceiveRma` forwards `locationId` into each nested receive
- refreshed `docs/code-traces/13-rma-receive-inventory.md` to match current implementation

Smells removed:

- RMA return-to-stock trace still claimed non-serialized returns used the first warehouse location
- trace linked manual receive permission to the old inventory barrel
- trace did not describe bulk receive location forwarding

Deferred:

- RMA receive integration coverage for real inventory rows, cost layers, serialized-lineage events, and transition failures
- fixed `AUD` currency in RMA return cost layers remains a finance/inventory valuation slice
- `createRma` permission asymmetry remains support-domain auth work

Verification:

- `./node_modules/.bin/vitest run tests/unit/support/rma-receive-location-contract.test.ts`
- `./node_modules/.bin/vitest run tests/unit/support/rma-receive-dialog.test.tsx tests/unit/support/use-rma-mutations.test.tsx`
- `./node_modules/.bin/eslint tests/unit/support/rma-receive-location-contract.test.ts`
- `git diff --check`
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit`

Goal adaptation: no goal change; this is another trace-first product-ownership slice where the correct action was to close stale risk, not expand implementation.

Residual risk: the trace now matches the location contract, but this is still guarded mostly by source/interaction tests rather than a database-backed receive integration.

### Issue 7: Manual Receive Serialized Rule Parity

Touched domains: manual inventory receiving form, inventory receiving server function, inventory schema helpers, stock-in trace docs.

Workflow protected: manual non-PO receive -> product selected -> serialized/non-serialized validation -> `useReceiveInventory` -> `receiveInventory` -> inventory movement/cost layer/serialized-lineage writes.

Business value: receiving operators get immediate, consistent validation for serialized batteries instead of discovering server-only rejection after submit.

Standards checked:

- added `src/lib/schemas/inventory/receiving.ts` as the shared owner for manual receive serialization validation
- receiving form and `receiveInventory` now call `getManualReceiveSerializationIssues`
- non-serialized products clear and disable the serial-number field before submit
- serialized products still force quantity to 1 and require a serial number
- server still validates after loading the tenant-scoped product and before transaction writes
- refreshed `docs/code-traces/02-inventory-stock-in.md` to remove duplicated serialized rule drift

Smells removed:

- duplicated manual receive serialized quantity/serial-required messages between UI and server
- receiving form accepted serial numbers for non-serialized products even though the server rejects them
- stock-in trace still listed serialized form/server parity as a gap

Deferred:

- database-backed receive integration for duplicate serial/state failure
- PO receive serialized rule parity remains procurement scope
- deeper inventory schema decomposition remains a future architecture slice

Verification:

- `./node_modules/.bin/vitest run tests/unit/inventory/manual-receive-serialization-contract.test.ts tests/unit/inventory/use-receive-inventory.test.tsx tests/unit/inventory/receiving-location-read-policy.test.tsx tests/unit/inventory/receiving-page-context.test.tsx`
- `./node_modules/.bin/vitest run tests/unit/inventory tests/unit/inventory-support/query-normalization-wave6g.test.tsx`
- `./node_modules/.bin/eslint src/lib/schemas/inventory/receiving.ts src/lib/schemas/inventory/index.ts src/components/domain/inventory/receiving/receiving-form.tsx src/server/functions/inventory/receiving.ts tests/unit/inventory/manual-receive-serialization-contract.test.ts`
- `git diff --check`
- `node scripts/check-route-casts.mjs`
- `node scripts/check-pending-dialog-guards.mjs`
- `node scripts/check-read-path-query-guards.mjs`
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit`

Goal adaptation: no goal change; this follows the existing sprint process by closing a small workflow-contract smell exposed by Issue 5.

Residual risk: this aligns pre-submit and server validation for manual receive serialization, but it does not prove the DB transaction path for duplicate serial inventory rows. That remains a future integration or reliability slice.

### Issue 8: Manual Receive Schema Ownership

Touched domains: inventory schema exports, manual receiving form, mobile receiving route, receive hook, inventory receiving server function.

Workflow protected: manual non-PO receive -> receipt reason selection -> form/mobile payload -> `useReceiveInventory` -> `receiveInventory` schema validation.

Business value: manual receiving contracts are easier to find and evolve because the receipt reason enum now lives with the receiving workflow rules instead of the broad inventory schema monolith.

Standards checked:

- moved `manualReceiptReasonValues`, `manualReceiptReasonSchema`, and `ManualReceiptReason` to `src/lib/schemas/inventory/receiving.ts`
- preserved the public `@/lib/schemas/inventory` barrel export used by desktop receive, mobile receive, hooks, and server functions
- added a guard that prevents manual receipt reason ownership from drifting back into `src/lib/schemas/inventory/inventory.ts`
- kept receipt reason values and labels unchanged

Smells removed:

- receiving-specific enum/schema lived in the generic inventory schema monolith
- Issue 7's receiving schema helper did not yet own the full manual receive validation contract

Deferred:

- broader `src/lib/schemas/inventory/inventory.ts` decomposition by location, movement, quality, reads, and count schemas
- any behavior change to receipt reason values or labels

Verification:

- `./node_modules/.bin/vitest run tests/unit/inventory/manual-receive-serialization-contract.test.ts tests/unit/inventory/use-receive-inventory.test.tsx tests/unit/inventory/receiving-location-read-policy.test.tsx`
- `./node_modules/.bin/vitest run tests/unit/inventory tests/unit/inventory-support/query-normalization-wave6g.test.tsx`
- `./node_modules/.bin/eslint src/lib/schemas/inventory/receiving.ts src/lib/schemas/inventory/inventory.ts src/lib/schemas/inventory/index.ts tests/unit/inventory/manual-receive-serialization-contract.test.ts`
- `git diff --check`
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit`

Goal adaptation: no goal change; this is a small architecture-cleanliness slice under the existing inventory sprint.

Residual risk: the main inventory schema file is still large; this only extracts the manual receive schema owner.

### Issue 9: Inventory Movement Schema Ownership

Touched domains: inventory schema exports, inventory movement schemas, stock adjustment schemas, stock transfer schemas, product inventory wrapper schema consumers.

Workflow protected: product/inventory movement recording -> movement type validation -> stock adjustment/transfer validation -> inventory server workflow handlers.

Business value: movement, adjustment, and transfer contracts are easier to reason about because their schemas now sit behind a dedicated movement schema owner that matches the extracted server workflow files.

Standards checked:

- added `src/lib/schemas/inventory/movements.ts` for movement type values, movement schemas, stock adjustment schema, and stock transfer schema
- removed movement/adjustment/transfer schema ownership from `src/lib/schemas/inventory/inventory.ts`
- preserved the public `@/lib/schemas/inventory` barrel export used by product inventory wrappers and inventory server functions
- added a guard that prevents movement schema ownership from drifting back into `inventory.ts`
- kept movement type values and adjustment/transfer parse behavior unchanged

Smells removed:

- movement type values and movement schemas lived in the generic inventory schema monolith
- stock adjustment and transfer schemas lived apart from the extracted adjustment/transfer server workflow files

Deferred:

- broader `src/lib/schemas/inventory/inventory.ts` decomposition by location, count, valuation, forecasting, alert, and dashboard schemas
- behavior changes to movement values, adjustment rules, or transfer rules

Verification:

- `./node_modules/.bin/vitest run tests/unit/inventory/movement-schema-ownership.test.ts tests/unit/inventory/query-normalization-wave3-movements.test.tsx tests/unit/inventory/stock-action-error-messages.test.ts tests/unit/inventory/use-receive-inventory.test.tsx`
- `./node_modules/.bin/vitest run tests/unit/inventory tests/unit/inventory-support/query-normalization-wave6g.test.tsx`
- `./node_modules/.bin/vitest run tests/unit/inventory/movement-schema-ownership.test.ts`
- `./node_modules/.bin/eslint src/lib/schemas/inventory/movements.ts src/lib/schemas/inventory/inventory.ts src/lib/schemas/inventory/index.ts tests/unit/inventory/movement-schema-ownership.test.ts`
- `git diff --check -- docs/inventory/MAINTAINER-SPRINT-1.md src/lib/schemas/inventory/index.ts src/lib/schemas/inventory/inventory.ts src/lib/schemas/inventory/movements.ts tests/unit/inventory/movement-schema-ownership.test.ts`
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit` (default heap run exhausted Node memory before diagnostics)

Goal adaptation: no goal change; this is a schema-boundary cleanup under the inventory sprint architecture lens.

Residual risk: the main inventory schema file remains large; this slice only extracts movement, adjustment, and transfer contracts without changing workflow behavior.

### Issue 10: Inventory Location Schema Ownership

Touched domains: inventory schema exports, location CRUD/list schemas, location server schema consumers, product inventory location wrapper schema consumers.

Workflow protected: location list/create/update request -> schema validation -> inventory location server functions -> location query/read contract.

Business value: location management contracts are easier to reason about because CRUD/list schemas now sit behind a dedicated location schema owner that matches the extracted location server workflow file.

Standards checked:

- added `src/lib/schemas/inventory/locations.ts` for location address, create/update/output, filter, page-list, and cursor-list schemas
- removed location CRUD/list schema ownership from `src/lib/schemas/inventory/inventory.ts`
- preserved the public `@/lib/schemas/inventory` barrel export
- preserved direct legacy imports from `@/lib/schemas/inventory/inventory` with re-exports while code migrates
- added a guard that prevents location CRUD/list schema definitions from drifting back into `inventory.ts`
- kept location defaults, filters, and normalization behavior unchanged

Smells removed:

- location CRUD/list schemas lived in the generic inventory schema monolith
- location server workflow ownership was not mirrored in schema ownership

Deferred:

- warehouse-location hierarchy schema extraction
- broader `src/lib/schemas/inventory/inventory.ts` decomposition by count, valuation, forecasting, alert, dashboard, and warehouse-location schemas
- migration of legacy direct imports from `@/lib/schemas/inventory/inventory` to the inventory schema barrel or specific schema owner

Verification:

- `./node_modules/.bin/vitest run tests/unit/inventory/location-schema-ownership.test.ts tests/unit/inventory/query-normalization-wave3-locations.test.tsx tests/unit/root-input-normalization-sweep.test.ts`
- `./node_modules/.bin/vitest run tests/unit/inventory tests/unit/inventory-support/query-normalization-wave6g.test.tsx`
- `./node_modules/.bin/eslint src/lib/schemas/inventory/locations.ts src/lib/schemas/inventory/inventory.ts src/lib/schemas/inventory/index.ts tests/unit/inventory/location-schema-ownership.test.ts`
- `git diff --check -- docs/inventory/MAINTAINER-SPRINT-1.md src/lib/schemas/inventory/index.ts src/lib/schemas/inventory/inventory.ts src/lib/schemas/inventory/locations.ts tests/unit/inventory/location-schema-ownership.test.ts`
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit`

Goal adaptation: no goal change; this is a schema-boundary cleanup under the inventory sprint architecture lens.

Residual risk: direct legacy imports from `@/lib/schemas/inventory/inventory` are still supported by compatibility re-exports; future slices should migrate those callers to cleaner owners.

### Issue 11: Inventory Schema Import Boundary

Touched domains: inventory route schema imports, location page schema imports, root input normalization coverage, inventory schema exports.

Workflow protected: inventory browser search validation -> location management schema contracts -> root input normalization sweep -> inventory schema owner/barrel boundary.

Business value: inventory schema contracts are easier to find and safer to evolve because route and test callers no longer import the generic inventory schema monolith directly.

Standards checked:

- migrated inventory route callers from `@/lib/schemas/inventory/inventory` to the public `@/lib/schemas/inventory` barrel
- kept extracted location schemas available through their owner/barrel path, not through direct compatibility exports from `inventory.ts`
- removed the now-unused location compatibility re-exports from `src/lib/schemas/inventory/inventory.ts`
- added a boundary guard that prevents the cleaned route/test callers from drifting back to the schema monolith
- preserved inventory browser search parsing, location page types, and root normalization behavior

Smells removed:

- route/page callers reached through the direct inventory schema monolith even after location schema ownership was extracted
- temporary location compatibility re-exports remained in `inventory.ts` after internal callers no longer needed them

Deferred:

- warehouse-location hierarchy schema extraction from `inventory.ts`
- broader decomposition of count, valuation, forecasting, alert, dashboard, and warehouse-location schemas
- a broader import-boundary policy for every legacy schema monolith across non-inventory domains

Verification:

- `./node_modules/.bin/vitest run tests/unit/inventory/schema-import-boundaries.test.ts tests/unit/inventory/location-schema-ownership.test.ts tests/unit/root-input-normalization-sweep.test.ts`
- `./node_modules/.bin/vitest run tests/unit/inventory tests/unit/inventory-support/query-normalization-wave6g.test.tsx`
- `./node_modules/.bin/eslint src/lib/schemas/inventory/inventory.ts src/routes/_authenticated/inventory/browser.tsx src/routes/_authenticated/inventory/locations-page.tsx tests/unit/root-input-normalization-sweep.test.ts tests/unit/inventory/schema-import-boundaries.test.ts`
- `git diff --check -- docs/inventory/MAINTAINER-SPRINT-1.md src/lib/schemas/inventory/inventory.ts src/routes/_authenticated/inventory/browser.tsx src/routes/_authenticated/inventory/locations-page.tsx tests/unit/root-input-normalization-sweep.test.ts tests/unit/inventory/schema-import-boundaries.test.ts`
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit`

Goal adaptation: no goal change; this closes the residual schema-boundary risk from Issue 10 without broadening the inventory sprint.

Residual risk: `src/lib/schemas/inventory/inventory.ts` remains large and still owns several unrelated schema families. This slice establishes a caller boundary, not full schema decomposition.

### Issue 12: Warehouse Location Schema Ownership

Touched domains: inventory schema exports, warehouse location schemas, warehouse location hook/API response types, inventory location route and server schema consumers.

Workflow protected: warehouse location list/create/update/hierarchy contracts -> inventory location server workflow -> location management UI and receiving/count consumers.

Business value: warehouse location contracts now live with warehouse-location ownership instead of the generic inventory schema monolith, making location hierarchy and receiving-bin behavior easier to reason about before future warehouse work.

Standards checked:

- added `src/lib/schemas/inventory/warehouse-locations.ts` for warehouse location type values, list/create/update schemas, API response types, hook-facing types, and hierarchy result types
- removed warehouse location schema/type ownership from `src/lib/schemas/inventory/inventory.ts`
- exported the warehouse-location owner through the public `@/lib/schemas/inventory` barrel
- moved `HookWarehouseLocation` and `HookLocationHierarchy` convenience exports to the warehouse-location owner
- added a guard that prevents warehouse location schema ownership from drifting back into `inventory.ts`
- kept public barrel parse behavior and defaults unchanged

Smells removed:

- warehouse location CRUD/list schemas lived in the generic inventory schema monolith
- hook/API response types for warehouse locations lived apart from the server workflow owner
- Issue 10/11 still deferred warehouse-location hierarchy extraction; this resolves that deferred schema ownership smell

Deferred:

- broader decomposition of count, valuation, forecasting, alert, and dashboard schemas
- behavior changes to warehouse hierarchy, capacity, pickable/receivable defaults, or import flows
- route/component UI cleanup for warehouse location management

Verification:

- `./node_modules/.bin/vitest run tests/unit/inventory/warehouse-location-schema-ownership.test.ts tests/unit/inventory/location-schema-ownership.test.ts tests/unit/inventory/query-normalization-wave3-locations.test.tsx tests/unit/inventory/receiving-location-read-policy.test.tsx tests/unit/root-input-normalization-sweep.test.ts`
- `./node_modules/.bin/vitest run tests/unit/inventory tests/unit/inventory-support/query-normalization-wave6g.test.tsx`
- `./node_modules/.bin/eslint src/lib/schemas/inventory/warehouse-locations.ts src/lib/schemas/inventory/inventory.ts src/lib/schemas/inventory/index.ts tests/unit/inventory/warehouse-location-schema-ownership.test.ts`
- `git diff --check -- docs/inventory/MAINTAINER-SPRINT-1.md src/lib/schemas/inventory/index.ts src/lib/schemas/inventory/inventory.ts src/lib/schemas/inventory/warehouse-locations.ts tests/unit/inventory/warehouse-location-schema-ownership.test.ts`
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit`

Goal adaptation: no goal change; this is a schema-boundary cleanup under the inventory sprint architecture lens.

Residual risk: `src/lib/schemas/inventory/inventory.ts` remains large and still owns count, valuation, forecasting, alert, and dashboard schema families.

### Issue 13: Stock Count Schema Ownership

Touched domains: inventory schema exports, stock count schemas, stock count item schemas, stock count route/server consumers.

Workflow protected: stock count list/create/update/item update contracts -> stock count server workflow -> count route and mutation/error handling.

Business value: cycle count and inventory reconciliation contracts now live with stock-count ownership instead of the generic inventory schema monolith, making count workflow changes safer before deeper inventory integrity work.

Standards checked:

- added `src/lib/schemas/inventory/stock-counts.ts` for stock count status/type values, count schemas, count item schemas, relation-facing count item type, and params
- removed stock count schema ownership from `src/lib/schemas/inventory/inventory.ts`
- exported the stock-count owner through the public `@/lib/schemas/inventory` barrel
- added a guard that prevents stock count schema ownership from drifting back into `inventory.ts`
- preserved public barrel parse behavior, defaults, pagination normalization, and item update parsing

Smells removed:

- stock count schemas lived in the generic inventory schema monolith despite stock counts having dedicated server and hook workflows
- stock count item schemas and relation-facing item types lived apart from count workflow ownership

Deferred:

- DB-backed stock count workflow integrity coverage
- broader decomposition of forecasting, alert, and dashboard schemas
- UI cleanup for count creation/review flows

Verification:

- `./node_modules/.bin/vitest run tests/unit/inventory/stock-count-schema-ownership.test.ts tests/unit/inventory/query-normalization-wave3-stock-counts.test.tsx tests/unit/root-input-normalization-sweep.test.ts`
- `./node_modules/.bin/vitest run tests/unit/inventory tests/unit/inventory-support/query-normalization-wave6g.test.tsx`
- `./node_modules/.bin/eslint src/lib/schemas/inventory/stock-counts.ts src/lib/schemas/inventory/inventory.ts src/lib/schemas/inventory/index.ts tests/unit/inventory/stock-count-schema-ownership.test.ts`
- `git diff --check -- docs/inventory/MAINTAINER-SPRINT-1.md src/lib/schemas/inventory/index.ts src/lib/schemas/inventory/inventory.ts src/lib/schemas/inventory/stock-counts.ts tests/unit/inventory/stock-count-schema-ownership.test.ts`
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit`

Goal adaptation: no goal change; this is a schema-boundary cleanup under the inventory sprint architecture lens.

Residual risk: stock count schema ownership is cleaner, but count workflow correctness still depends on server/database behavior covered by future integration tests.

### Issue 14: Valuation Schema Ownership

Touched domains: inventory schema exports, valuation/cost-layer schemas, COGS schemas, finance-integrity schemas, inventory valuation server/hook/analytics consumers.

Workflow protected: cost-layer reads/writes -> valuation and COGS query contracts -> finance-integrity check/reconcile contracts -> inventory analytics UI and valuation hooks.

Business value: inventory value and finance-integrity contracts now live with valuation ownership instead of the generic inventory schema monolith, making stock value, COGS, and reconciliation work easier to change without weakening finance integrity.

Standards checked:

- added `src/lib/schemas/inventory/valuation.ts` for cost-layer schemas, valuation/aging/turnover queries, COGS input/result types, finance-integrity query/reconcile contracts, and valuation response types
- removed valuation, COGS, cost-layer, aging, turnover, and finance-integrity schema ownership from `src/lib/schemas/inventory/inventory.ts`
- exported the valuation owner through the public `@/lib/schemas/inventory` barrel
- added a guard that prevents valuation schema ownership from drifting back into `inventory.ts`
- preserved public barrel parse behavior, default valuation method, turnover default, finance-integrity defaults, reconcile defaults, and COGS/cost-layer coercion

Smells removed:

- valuation and finance-integrity schemas lived in the generic inventory schema monolith despite having dedicated valuation server and hook workflows
- COGS and cost-layer contracts lived apart from the finance-integrity workflow they protect
- aging/turnover response types were mixed into unrelated movement/dashboard sections

Deferred:

- DB-backed valuation/reconcile integration coverage beyond existing hook/query normalization tests
- broader decomposition of forecasting, alert, and dashboard schemas
- UI cleanup for analytics/valuation report surfaces

Verification:

- `./node_modules/.bin/vitest run tests/unit/inventory/valuation-schema-ownership.test.ts tests/unit/inventory/query-normalization-wave3-analytics.test.tsx tests/unit/inventory/query-normalization-wave7b.test.tsx tests/unit/root-input-normalization-sweep.test.ts`
- `./node_modules/.bin/vitest run tests/unit/inventory tests/unit/inventory-support/query-normalization-wave6g.test.tsx`
- `./node_modules/.bin/eslint src/lib/schemas/inventory/valuation.ts src/lib/schemas/inventory/inventory.ts src/lib/schemas/inventory/index.ts tests/unit/inventory/valuation-schema-ownership.test.ts`
- `git diff --check -- docs/inventory/MAINTAINER-SPRINT-1.md src/lib/schemas/inventory/index.ts src/lib/schemas/inventory/inventory.ts src/lib/schemas/inventory/valuation.ts tests/unit/inventory/valuation-schema-ownership.test.ts`
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit`

Goal adaptation: no goal change; this is a finance-integrity schema-boundary cleanup under the inventory sprint architecture lens.

Residual risk: valuation schema ownership is cleaner, but database-backed finance reconciliation invariants still need dedicated integration coverage.

### Issue 15: Forecasting Schema Ownership

Touched domains: inventory schema exports, forecasting schemas, reorder recommendation types, forecast list result types, forecasting server/hook/route consumers.

Workflow protected: forecast list/create/bulk-update contracts -> forecasting server workflow -> forecasting hooks -> demand forecasting route and reorder recommendation UI.

Business value: demand forecasting and reorder recommendation contracts now live with forecasting ownership instead of the generic inventory schema monolith, making procurement-trigger and stock-planning work easier to change safely.

Standards checked:

- added `src/lib/schemas/inventory/forecasting.ts` for forecast interval values, forecast create/update/list schemas, forecast params, reorder recommendation types, and forecast list result types
- removed forecasting schema/type ownership from `src/lib/schemas/inventory/inventory.ts`
- exported the forecasting owner through the public `@/lib/schemas/inventory` barrel
- added a guard that prevents forecasting schema ownership from drifting back into `inventory.ts`
- preserved public barrel parse behavior, forecast date/demand coercion, list pagination defaults, and forecast params parsing

Smells removed:

- forecasting schemas lived in the generic inventory schema monolith despite having dedicated forecasting server, hook, and route workflows
- reorder recommendation and forecast list response types lived apart from the forecasting workflow owner

Deferred:

- DB-backed forecasting/reorder recommendation integration coverage beyond existing hook/query normalization tests
- broader decomposition of dashboard schemas
- UI cleanup for demand forecasting and reorder recommendation flows

Verification:

- `./node_modules/.bin/vitest run tests/unit/inventory/forecasting-schema-ownership.test.ts tests/unit/inventory/query-normalization-wave3-forecasting.test.tsx`
- `./node_modules/.bin/vitest run tests/unit/inventory tests/unit/inventory-support/query-normalization-wave6g.test.tsx`
- `./node_modules/.bin/eslint src/lib/schemas/inventory/forecasting.ts src/lib/schemas/inventory/inventory.ts src/lib/schemas/inventory/index.ts tests/unit/inventory/forecasting-schema-ownership.test.ts`
- `git diff --check -- docs/inventory/MAINTAINER-SPRINT-1.md src/lib/schemas/inventory/index.ts src/lib/schemas/inventory/inventory.ts src/lib/schemas/inventory/forecasting.ts tests/unit/inventory/forecasting-schema-ownership.test.ts`
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit`

Goal adaptation: no goal change; this is a forecasting schema-boundary cleanup under the inventory sprint architecture lens.

Residual risk: forecasting schema ownership is cleaner, but dashboard schema families remain in the generic inventory schema file.

### Issue 16: Alert Schema Ownership

Touched domains: inventory schema exports, alert rule schemas, triggered alert response types, alert list result types, inventory alert server/hook/route consumers.

Workflow protected: alert list/create/update contracts -> alert server workflow -> alert hooks -> inventory alert rule and triggered alert UI states.

Business value: alert-rule and triggered-alert contracts now live with alert ownership instead of the generic inventory schema monolith, making low-stock, expiry, slow-moving, and forecast-deviation alert work safer to change without weakening operator alert visibility.

Standards checked:

- added `src/lib/schemas/inventory/alerts.ts` for alert type values, threshold schema, create/update/list schemas, alert params, triggered alert types, alert list result types, and the client-safe inventory alert entity
- removed alert schema/type ownership from `src/lib/schemas/inventory/inventory.ts`
- exported the alert owner through the public `@/lib/schemas/inventory` barrel
- added a guard that prevents alert schema ownership from drifting back into `inventory.ts`
- preserved public barrel parse behavior, alert defaults, list pagination defaults, and alert params parsing

Smells removed:

- alert rule schemas lived in the generic inventory schema monolith despite having dedicated alert server, hook, and route workflows
- triggered alert and list response types lived apart from the alert workflow owner
- the client-safe `InventoryAlert` type remained in `inventory.ts` after its `AlertThreshold` dependency moved to alert ownership

Deferred:

- DB-backed alert rule/trigger integration coverage beyond existing hook/query normalization tests
- broader decomposition of dashboard schemas
- UI cleanup for alert rule and triggered alert panels

Verification:

- `./node_modules/.bin/vitest run tests/unit/inventory/alert-schema-ownership.test.ts tests/unit/inventory/query-normalization-wave3-alerts.test.tsx`
- `./node_modules/.bin/vitest run tests/unit/inventory tests/unit/inventory-support/query-normalization-wave6g.test.tsx`
- `./node_modules/.bin/eslint src/lib/schemas/inventory/alerts.ts src/lib/schemas/inventory/inventory.ts src/lib/schemas/inventory/index.ts tests/unit/inventory/alert-schema-ownership.test.ts`
- `git diff --check -- docs/inventory/MAINTAINER-SPRINT-1.md src/lib/schemas/inventory/index.ts src/lib/schemas/inventory/inventory.ts src/lib/schemas/inventory/alerts.ts tests/unit/inventory/alert-schema-ownership.test.ts`
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit`

Goal adaptation: no goal change; this is an alert schema-boundary cleanup under the inventory sprint architecture lens.

Residual risk: alert schema ownership is cleaner, but dashboard schema families remain in the generic inventory schema file.
