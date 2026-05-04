# Inventory Maintainer Sprint 22

This sprint follows Sprint 21's inventory read-model descriptor join hardening. The target is valuation and finance read-model tenant/data-integrity hardening: inventory valuation breakdowns, finance integrity drift descriptors, aging analysis, product cost-layer reads, and weighted-average product cost updates.

Status: Closed after Issue 1.

## Business Value

Valuation and finance integrity surfaces support pricing, margin trust, purchasing decisions, warranty recovery, and stock value reporting. These workflows should never decorate tenant-owned inventory value with another tenant's product, category, or location descriptors, and cost-price writes must only touch tenant-owned products.

## Workflow Spine

valuation/report and product cost views
-> valuation hooks
-> `getInventoryValuation`, `getInventoryFinanceIntegrity`, `getInventoryAging`, `getProductCostLayers`, `updateProductWeightedAverageCost`
-> inventory read/manage permission
-> organization-scoped inventory and cost-layer rows
-> organization-bounded product/category/location descriptors
-> organization-scoped product cost write
-> existing valuation query-key/cache policy.

## Architecture Constraints

- Keep this sprint to valuation tenant/data-integrity hardening and static contract coverage.
- Preserve valuation math, FIFO semantics, aging bucket behavior, finance integrity thresholds, response shapes, query keys, cache invalidation, and UI.
- Do not broaden into valuation algorithm redesign, live database fixtures, finance reconciliation UX, or stock movement mutation changes.

## Issue Ledger

### 1. Valuation Reads and Weighted-Average Product Writes Needed Stronger Tenant Boundaries

Problem:

- Valuation category/product/location breakdowns joined product, category, and location descriptors by ID only.
- Finance integrity drift descriptors joined product and location names by ID only in raw SQL.
- Aging analysis and product cost-layer reads joined inventory/cost-layer rows without consistently carrying both inventory and cost-layer organization predicates.
- Weighted-average product cost recalculation selected tenant inventory rows but updated `products.costPrice` by product ID only.

Workflow protected:

valuation/report/product-cost workflow -> tenant-scoped inventory and cost layers -> tenant-scoped descriptors -> tenant-owned product cost update -> existing valuation cache contracts.

Implemented slice:

- Added organization-bounded product/category/location joins to inventory valuation breakdowns.
- Added organization-bounded product/location joins to finance integrity drift descriptor SQL.
- Added organization-bounded inventory/product/location joins to aging analysis.
- Added organization predicates to product cost-layer reads.
- Added product ownership validation before weighted-average cost recalculation.
- Scoped weighted-average `products.costPrice` updates by organization.
- Added a focused valuation tenant-scope contract test covering read joins, finance integrity descriptors, cost-layer reads, and product cost writes.

Out of scope:

- Changing valuation formulas, FIFO cost-layer consumption, turnover SQL, finance reconciliation repair behavior, aging bucket math, query keys, cache invalidation, or UI.
- Adding live multi-tenant valuation fixtures.
- Browser QA.

Closeout:

- Touched domains: inventory valuation server functions, valuation tenant-scope tests, inventory sprint evidence.
- Workflow protected: valuation report/finance integrity/aging/product cost layers/weighted-average update -> tenant-scoped rows and descriptors -> existing valuation cache contracts.
- Business value protected: finance-facing stock value and product cost surfaces now avoid cross-tenant descriptor leakage and cross-tenant cost-price writes.
- Architecture standards checked: route/page/hook/query-key/cache flow is unchanged; server functions keep explicit inventory read/manage permissions; changes stay inside valuation server predicates and product ownership preflight.
- Tenant isolation and data integrity checked: product/category/location descriptors are organization-bounded; cost-layer joins include organization predicates; weighted-average product updates require tenant-owned products and organization-scoped updates.
- Query/cache contract checked: no query keys, stale times, invalidation, optimistic updates, or cache mutation helpers changed.
- Smells removed: ID-only valuation descriptor joins; unscoped product cost-price update; incomplete cost-layer organization predicates in product-cost reads.
- Smells deferred: live multi-tenant valuation fixtures; deeper turnover SQL review; finance reconciliation UX polish.
- Gates run: focused valuation tenant-scope contract test; focused valuation permission/semantics/query tests; focused ESLint; full inventory suite; TypeScript; `git diff --check`.
- Gates skipped: browser QA, because this was a server valuation/data-integrity hardening change with no UI or interaction change.
- Goal adaptations: declined. The standing maintainer goal already requires tenant isolation, transactional inventory and finance integrity, meaningful tests, reviewable domain slices, and closeout evidence.
- Residual risk: static contract coverage protects source patterns; live database fixtures and deeper turnover/reconciliation review remain future hardening layers.
