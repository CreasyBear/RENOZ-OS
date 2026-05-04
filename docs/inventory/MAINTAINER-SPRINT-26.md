# Inventory Maintainer Sprint 26

This sprint follows Sprint 25's turnover summary annualization cleanup. The target is product-scoped turnover read consistency: when callers request turnover for one product, every returned turnover section should stay scoped to that product.

Status: Closed after Issue 1.

## Business Value

Product-scoped turnover is a SKU-level purchasing and working-capital signal. If a product filter narrows the summary and trends but the product table still returns unrelated SKUs, operators can misread the context and compare a specific battery SKU against unrelated product rows.

## Workflow Spine

product or analytics turnover read
-> `useInventoryTurnover({ productId })`
-> `getInventoryTurnover`
-> inventory read permission
-> organization-scoped movement and inventory SQL
-> product-scoped summary, product rows, previous-period comparison, and trend windows
-> existing valuation query-key/cache policy.

## Architecture Constraints

- Keep this sprint to turnover `productId` filter propagation in the current-period product rows.
- Preserve turnover math, response shape, annualization, trend windows, product row mapping, query keys, cache invalidation, and UI.
- Do not broaden into live database fixtures, category aggregation, trend chart UX, or valuation formula redesign.

## Issue Ledger

### 1. Current-Period Product Rows Did Not Honor the Product Filter

Problem:

- `inventoryTurnoverQuerySchema` accepts `productId`.
- The turnover summary, current COGS, previous-period comparison, and trend windows already used the product filter.
- The current-period `byProduct` SQL did not apply the same product filter, so product-scoped reads could return top rows for unrelated products.

Workflow protected:

product-scoped turnover read -> tenant-scoped movement/inventory SQL -> product-scoped product rows -> existing turnover report mapping.

Implemented slice:

- Added `productId` filtering to the current-period product COGS subquery.
- Added `productId` filtering to the current product inventory subquery.
- Added `productId` filtering to the final product row selection.
- Added a focused source contract test covering product-scoped current-period product rows.

Out of scope:

- Changing turnover calculations, annualized values, trend windows, response shape, query keys, cache invalidation, or UI.
- Adding live movement timeline fixtures.
- Category-level turnover aggregation.

Closeout:

- Touched domains: inventory valuation turnover server function, turnover product-filter contract tests, inventory sprint evidence.
- Workflow protected: product-scoped turnover hook/server read -> tenant-scoped SQL -> product-scoped summary/table/trend data -> existing valuation cache contract.
- Business value protected: SKU-level turnover reads no longer mix unrelated product rows into a product-scoped report.
- Architecture standards checked: route/page/hook/query-key/cache flow is unchanged; server function keeps explicit inventory read permission; changes are limited to raw SQL filter propagation.
- Tenant isolation and data integrity checked: existing organization predicates remain on movement, inventory, and product SQL; added product filters are nested under existing tenant-scoped SQL; no writes, cost layers, serialized lineage, or finance reconciliation paths changed.
- Query/cache contract checked: no query keys, stale times, invalidation, optimistic updates, or cache mutation helpers changed.
- Smells removed: partial `productId` filter propagation inside `getInventoryTurnover`.
- Smells deferred: live movement timeline fixtures; broader turnover formula review; true category-level turnover aggregation.
- Gates run: focused turnover product-filter contract test; focused turnover window/summary/render/query tests; focused ESLint; full inventory suite; TypeScript; `git diff --check`.
- Gates skipped: browser QA, because this was a server read-filter correction with no UI or interaction change.
- Goal adaptations: declined. The standing maintainer goal already requires tenant isolation, finance integrity, meaningful tests, reviewable domain slices, and closeout evidence.
- Residual risk: static contract coverage protects SQL filter propagation; live database fixtures are still needed to prove seeded product-scoped turnover rows end to end.
