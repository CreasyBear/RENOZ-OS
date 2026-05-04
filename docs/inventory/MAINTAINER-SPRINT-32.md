# Inventory Maintainer Sprint 32

This sprint follows Sprint 31's manual receive response-read scoping cleanup. The target is supplier-backed PO receive weighted-cost tenant scope: the helper that updates product cost price after PO receipt should aggregate only tenant-owned layers and update only the tenant-owned product.

Status: Closed after Issue 1.

## Business Value

PO receiving is the supplier-backed stock-in path for RENOZ Energy battery inventory. It creates FIFO layers, recomputes inventory value, and updates product cost price from active layer costs. If that product-cost helper omits tenant predicates, procurement receiving inherits weaker finance isolation and makes the cost-price signal harder to trust.

## Workflow Spine

purchase-order receive goods
-> `receiveGoods`
-> receipt item / inventory movement / FIFO cost layer creation
-> inventory value recompute
-> product weighted cost-price refresh
-> procurement and inventory cache policy.

## Architecture Constraints

- Keep this sprint to tenant predicates inside the PO receive product cost-price helper.
- Preserve receipt validation, cost allocation, FIFO layer creation, inventory value recompute, product cost math, response shapes, query keys, and UI behavior.
- Do not broaden into receive-goods UX, supplier cost allocation redesign, live database fixtures, or helper extraction.

## Issue Ledger

### 1. PO Receive Product Cost Helper Used Incomplete Tenant Predicates

Problem:

- `updateProductCostPrice` aggregated active cost layers by joining cost layers to inventory.
- The inventory side was organization-scoped, but the cost-layer side of the join did not repeat the organization predicate.
- The helper updated `products.costPrice` by product ID only.

Workflow protected:

PO receipt -> tenant-owned FIFO layers -> tenant-scoped weighted cost calculation -> tenant-owned product cost-price update.

Implemented slice:

- Added `inventoryCostLayers.organizationId = organizationId` to the weighted-cost layer join.
- Added `products.organizationId = organizationId` to the product cost-price update predicate.
- Kept receipt validation, cost allocation, FIFO layer creation, inventory value recompute, weighted-cost formula, response shapes, query keys, and UI behavior unchanged.
- Added focused supplier receiving tenant-scope contract tests for the aggregate and update predicates.

Out of scope:

- Changing product cost-price formula.
- Changing receipt cost allocation or capitalization behavior.
- Changing supplier receiving cache invalidation.
- Adding live database fixtures.

Closeout:

- Touched domains: supplier PO receive-goods server function, procurement/inventory tenant-scope contract tests, inventory sprint evidence.
- Workflow protected: PO receive goods -> tenant-owned FIFO layer creation -> tenant-scoped weighted cost calculation -> tenant-owned product cost-price update -> existing procurement/inventory cache policy.
- Business value protected: supplier-backed stock-in now keeps product cost-price refresh aligned with tenant-owned cost layers, improving trust in battery SKU cost signals after procurement receiving.
- Architecture standards checked: route/page/hook/cache behavior is unchanged; receive-goods remains the supplier-backed stock-in owner; cost-layer aggregation and product update now mirror the organization predicates used by the surrounding transaction.
- Tenant isolation and data integrity checked: cost-layer aggregate now requires the cost-layer row and joined inventory row to be organization-scoped; product cost update now requires product ID and organization ID; no quantity math, value recompute, serialized lineage, receipt mutation, or cost allocation behavior changed.
- Query/cache contract checked: no query keys, invalidation, stale times, optimistic updates, or rollback behavior changed.
- Smells removed: PO receive weighted-cost helper had tenant-scoped inventory filtering but no cost-layer organization predicate, and updated product cost price by product ID only.
- Smells deferred: live database fixtures for PO receive-goods under seeded RLS; broader supplier receiving integration tests; supplier cost allocation UX review.
- Gates run: focused supplier receive-goods tenant-scope/utility/query tests; focused ESLint; supplier + purchase-order + inventory unit suites; TypeScript; `git diff --check`.
- Gates skipped: browser QA, because this was a server tenant/data-integrity predicate correction with no UI or interaction change.
- Goal adaptations: declined. The standing maintainer goal already requires tenant isolation, transactional inventory and finance integrity, domain ownership, meaningful tests, reviewable domain slices, and closeout evidence.
- Residual risk: source-level contracts verify the predicates; live DB fixtures are still needed to prove PO receive-goods weighted-cost behavior under seeded concurrent/RLS conditions.
