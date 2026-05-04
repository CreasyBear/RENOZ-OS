# Inventory Maintainer Sprint 28

This sprint follows Sprint 27's cost-layer quantity-bound cleanup. The target is manual cost-layer value-cache integrity: when an operator creates a manual FIFO cost layer, the persisted inventory value cache and client value surfaces must refresh with the layer change.

Status: Closed after Issue 1.

## Business Value

Cost layers are the finance source of truth for battery stock value, while `inventory.total_value` is the cached value operators see in inventory detail, lists, WMS, dashboards, and valuation-adjacent flows. If manual layer creation changes active layer value without recomputing and refreshing inventory surfaces, finance trust becomes split between correct cost layers and stale inventory value.

## Workflow Spine

manual cost-layer create
-> `useCreateCostLayer`
-> `createCostLayer`
-> `createCostLayerSchema`
-> inventory manage permission
-> organization-scoped locked inventory row
-> cost-layer insert
-> `recomputeInventoryValueFromLayers`
-> inventory value surfaces and existing valuation query-key/cache policy.

## Architecture Constraints

- Keep this sprint to manual cost-layer create value-cache coherence and cache invalidation.
- Preserve public input schema, mutation response shape, UI behavior, valuation formulas, and cost-layer list/detail reads.
- Do not broaden into manual cost-layer workflow redesign, finance reconciliation UX, receipt layer component modeling, or live database fixtures.

## Issue Ledger

### 1. Manual Cost-Layer Create Did Not Recompute Inventory Value

Problem:

- `createCostLayer` inserted into `inventory_cost_layers` after verifying tenant-owned inventory.
- It did not recompute `inventory.total_value` from active layers after insertion.
- `useCreateCostLayer` refreshed valuation/cost-layer queries, but not inventory detail/list/dashboard/WMS surfaces that can display the stale cached inventory value.

Workflow protected:

manual cost-layer create -> tenant-owned locked inventory row -> FIFO layer insert -> derived inventory value recompute -> inventory value surfaces refresh.

Implemented slice:

- Wrapped manual cost-layer creation in a transaction.
- Set the transaction tenant context before the row lock and insert.
- Locked the organization-scoped inventory row before inserting the new layer.
- Recomputed `inventory.total_value` and unit-cost cache from active layers after the insert.
- Kept the mutation response shape unchanged.
- Expanded `useCreateCostLayer` cache invalidation to refresh inventory list, detail, dashboard, WMS, valuation, and cost-layer detail surfaces.
- Added focused tests for server transaction/value-cache contract and client cache invalidation.

Out of scope:

- Changing manual cost-layer product UX.
- Adding capitalization component input for manual layers.
- Recomputing quantity-on-hand from manually created layers.
- Adding live database fixtures.

Closeout:

- Touched domains: inventory valuation server function, inventory valuation hook/cache policy, valuation tenant-scope contract tests, inventory analytics mutation tests, inventory sprint evidence.
- Workflow protected: manual cost-layer create hook/server function -> valuation schema -> organization-scoped locked inventory row -> cost-layer insert -> derived inventory value recompute -> inventory value surfaces refresh.
- Business value protected: operators should no longer see split finance truth where FIFO layers changed but inventory value surfaces remained stale.
- Architecture standards checked: route/page flow and UI are unchanged; schema ownership remains in valuation; server mutation enforces inventory manage permission, transaction tenant context, tenant-owned row lock, and shared finance recompute helper; cache policy uses centralized query keys.
- Tenant isolation and data integrity checked: inventory existence check moved inside the transaction, retains `inventory.organizationId = ctx.organizationId`, sets transaction tenant context, locks the row before insert, and recomputes derived value from tenant-scoped active layers.
- Query/cache contract checked: mutation now refreshes valuation/cost-layer data plus inventory value surfaces that can display `inventory.total_value`; no optimistic update or rollback behavior added.
- Smells removed: manual cost-layer create could leave `inventory.total_value` stale; mutation cache contract did not cover inventory value surfaces.
- Smells deferred: manual cost-layer workflow redesign; capitalization component input for manual layers; quantity-on-hand reconciliation for manually created layers; live database fixtures.
- Gates run: focused valuation/cache/permission/schema tests; focused ESLint; full inventory suite; TypeScript; `git diff --check`.
- Gates skipped: browser QA, because this was a server/cache integrity correction with no UI or interaction change.
- Goal adaptations: declined. The standing maintainer goal already requires transactional inventory and finance integrity, centralized query keys, safe cache contracts, meaningful tests, and closeout evidence.
- Residual risk: source-level contract tests protect transaction shape and cache invalidation, but live database fixtures are still needed to prove the recompute behavior against real seeded layers and RLS settings end to end.
