# Inventory Maintainer Sprint 24

This sprint follows Sprint 23's turnover time-window correction. The target is turnover report product-truth semantics: the turnover report receives product-level turnover data and should label it as product-level data, not category data.

Status: Closed after Issue 1.

## Business Value

Turnover reporting helps RENOZ Energy decide which battery SKUs are moving, aging, or tying up cash. If the UI says "category" while showing product rows, operators can misread SKU-level movement as category-level performance and make weaker purchasing or stock decisions.

## Workflow Spine

inventory analytics turnover tab
-> `AnalyticsPage`
-> `useInventoryTurnover`
-> `getInventoryTurnover`
-> `TurnoverReport`
-> product-level rows
-> existing valuation query-key/cache policy.

## Architecture Constraints

- Keep this sprint to turnover report UI semantics and route mapping.
- Preserve server response shape, turnover math, filters, loading/error/degraded states, query keys, cache invalidation, and visual layout.
- Do not broaden into category-level server aggregation, chart redesign, or live browser QA.

## Issue Ledger

### 1. Product-Level Turnover Rows Were Labeled as Category-Level Rows

Problem:

- `getInventoryTurnover` returns `byProduct`, but `AnalyticsPage` mapped those rows into `CategoryTurnover` props.
- `TurnoverReport` rendered product rows under "Turnover by Category", with "Category" column and category empty-state copy.

Workflow protected:

turnover report -> product-level server rows -> product-level route mapping -> honest operator-facing labels.

Implemented slice:

- Added `ProductTurnover` report row type and `byProduct` report prop.
- Kept a deprecated `CategoryTurnover` type alias for compatibility while moving the active report contract to products.
- Renamed the analytics-page turnover mapping from `turnoverByCategory` to `turnoverByProduct`.
- Updated report labels and empty-state copy to product-level language.
- Added a focused render test that asserts product-level copy and rejects the old category copy.

Out of scope:

- Adding category-level turnover aggregation.
- Changing turnover math, server response shape, trend windows, query keys, cache invalidation, loading/error states, or layout.
- Browser QA.

Closeout:

- Touched domains: inventory analytics route mapping, turnover report component, inventory component barrel type export, turnover report UI tests, inventory sprint evidence.
- Workflow protected: inventory analytics turnover tab -> turnover hook -> product-level server data -> product-level report labels.
- Business value protected: operators now see SKU/product turnover truth instead of mislabeled category-level analysis.
- Architecture standards checked: route/page/hook/query-key/cache flow is unchanged; server function and schema contracts are unchanged; UI component prop names now match the server data shape.
- Tenant isolation and data integrity checked: no server queries, writes, tenant predicates, inventory mutations, cost layers, serialized lineage, or finance reconciliation paths changed.
- Query/cache contract checked: no query keys, stale times, invalidation, optimistic updates, or cache mutation helpers changed.
- Smells removed: product-level `byProduct` data mapped into `CategoryTurnover`; visible "category" copy on product turnover rows.
- Smells deferred: true category-level turnover aggregation; browser visual QA; broader analytics naming cleanup outside turnover.
- Gates run: focused turnover report product-semantics render test; focused inventory analytics query-normalization tests; focused ESLint; full inventory suite; TypeScript; `git diff --check`.
- Gates skipped: browser QA, because this was a narrow copy/type/route mapping correction covered by component render tests.
- Goal adaptations: declined. The standing maintainer goal already requires honest UI states, workflow contracts, meaningful tests, reviewable domain slices, and closeout evidence.
- Residual risk: visual layout was not browser-verified; deprecated `CategoryTurnover` alias remains only as a compatibility shim.
