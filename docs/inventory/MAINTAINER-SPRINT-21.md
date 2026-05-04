# Inventory Maintainer Sprint 21

This sprint follows Sprint 20's forecasting tenant-scope hardening. The target is inventory read-model descriptor join hardening across the smaller read paths: inventory list/search, movement history, standard dashboard, and WMS dashboard.

Status: Closed after Issue 1.

## Business Value

Inventory read models power operator scanning: item lists, movement history, dashboard summaries, and WMS category/location/timeline panels. These screens should only decorate tenant-owned inventory and movement rows with tenant-owned products, categories, locations, orders, and purchase orders.

## Workflow Spine

inventory list/search/dashboard/movement/WMS views
-> inventory hooks
-> `listInventory`, `quickSearchInventory`, `listMovements`, `getInventoryDashboard`, `getStockByCategory`, `getStockByLocation`, `getRecentMovementsTimeline`, `getWMSDashboard`
-> inventory read permission
-> organization-scoped base inventory/movement rows
-> organization-bounded descriptor joins
-> existing query-key/cache policy.

## Architecture Constraints

- Keep this sprint to read-only join predicates and static contract coverage.
- Preserve response shapes, sorting, pagination, dashboard math, movement timeline mapping, WMS comparison units, query keys, cache invalidation, and UI.
- Do not broaden into valuation read joins or dashboard metric redesign.

## Issue Ledger

### 1. Read Models Needed Organization-Bounded Descriptor Joins

Problem:

- Inventory list/search reads were organization-scoped at the base inventory row, but product/location joins used IDs only.
- Movement history reads were organization-scoped at the movement row, but product/location/order/purchase-order descriptor joins used IDs only.
- Standard dashboard top-moving products joined product descriptors by ID only.
- WMS stock/category/location/timeline reads joined product/category/location descriptors by ID only in several paths.

Workflow protected:

read model -> tenant-scoped base row -> tenant-scoped descriptor joins -> unchanged client query/cache behavior.

Implemented slice:

- Added organization-bounded product and location joins to inventory list and quick search read models.
- Added organization-bounded product, location, order, and purchase-order joins to movement history reads.
- Added organization-bounded product join to standard dashboard top-moving reads.
- Added organization-bounded product, category, and location joins to WMS category/location/timeline/dashboard reads.
- Added a focused read-model tenant-scope contract test covering all touched read paths.

Out of scope:

- Valuation report/read join hardening.
- Changing read response shapes, sorting, pagination, WMS comparison semantics, dashboard calculations, query keys, cache invalidation, or UI.
- Browser QA.

Closeout:

- Touched domains: inventory reads, inventory movements, standard inventory dashboard, WMS dashboard, read-model tenant-scope tests, inventory sprint evidence.
- Workflow protected: inventory list/search/movements/dashboard/WMS dashboard -> tenant-scoped base rows -> tenant-scoped descriptor joins -> existing read cache contracts.
- Business value protected: operator screens now avoid cross-tenant descriptor leakage while preserving existing warehouse and dashboard behavior.
- Architecture standards checked: route/page/hook/query-key/cache flow is unchanged; server functions keep explicit inventory read permission; changes are limited to server read predicates.
- Tenant isolation and data integrity checked: product/location/category/order/purchase-order descriptors now carry organization predicates wherever this sprint touched joins.
- Query/cache contract checked: no query keys, stale times, invalidation, optimistic updates, or cache mutation helpers changed.
- Smells removed: ID-only descriptor joins in small inventory read models.
- Smells deferred: valuation read-model joins; live cross-tenant read fixtures.
- Gates run: focused read-model tenant-scope contract test; focused movement/dashboard/read/WMS tests; focused ESLint; full inventory suite; TypeScript; `git diff --check`.
- Gates skipped: browser QA, because this was a server read-model hardening change with no UI or interaction change.
- Goal adaptations: declined. The standing maintainer goal already requires tenant isolation, honest UI states, meaningful tests, reviewable domain slices, and closeout evidence.
- Residual risk: static contract coverage protects source patterns; valuation joins and runtime cross-tenant fixtures remain future hardening layers.
