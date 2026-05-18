# Products Maintainer Sprint 19: Product Query-Key Catalog Boundary

## Status

Closed in commit-ready state.

## Problem

`src/lib/query-keys.ts` remained a large shared cache monolith after the inventory extraction. Product query keys were still embedded inline even though they define product catalogue reads, product inventory summaries, stock alert scopes, movement pages, image keys, pricing keys, bundle keys, and attribute keys.

Product cache keys are a high-risk adjacency for RENOZ Energy because inventory receiving, fulfillment, RMA, purchase-order receiving, warranty policy updates, product pricing, image galleries, and catalogue search all invalidate or read through `queryKeys.products`. The public key interface should stay stable, but the implementation should not require editing the global aggregate for every product cache contract change.

## Workflow Spine

Product cache reads and invalidations
-> product, inventory, order fulfillment, purchase-order receiving, warranty, and support hooks
-> public `queryKeys.products`
-> extracted `productQueryKeys`
-> product list/detail/search/inventory/stock-alert/movement/image/pricing/bundle/attribute key families
-> unchanged TanStack Query key tuples
-> unchanged broad and product-specific invalidation behavior.

## Touched Domains

- Shared query-key catalog.
- Products query-key implementation.
- Product inventory stock-alert cache contract.
- Product search query-key contract.
- Sprint evidence.

## Business Value Protected

Product catalogue data is the shared operational anchor for battery sales, inventory, procurement, fulfillment, warranty, and support. This slice keeps the product cache contract stable while concentrating product key ownership in one smaller module, so future product behavior changes have a narrower review surface.

## Scope Constraints

- Do not change public caller syntax: callers keep using `queryKeys.products`.
- Do not change tuple shapes for product list, detail, search, inventory, stock alerts, movements, images, pricing, bundles, attributes, bulk, or advanced search keys.
- Do not alter product server functions, schemas, hooks, UI state, inventory mutation behavior, fulfillment invalidation, purchase-order receiving, warranty policy invalidation, or RMA invalidation.
- Keep `ProductStockAlertFilters` import compatibility through `@/lib/query-keys`.

## Changes

- Added `src/lib/query-key-catalog/products.ts`.
- Moved the full products query-key catalog into `productQueryKeys`.
- Moved `ProductStockAlertFilters` ownership into the product catalog and re-exported it from `src/lib/query-keys.ts`.
- Kept `src/lib/query-keys.ts` as the public aggregate adapter by assigning `products: productQueryKeys`.
- Removed product-specific global self-reference from the aggregate implementation.
- Updated product and inventory-adjacent source contracts to prove the product catalog adapter and stock-alert key boundary.

## Standards Checked

- Domain ownership: product query-key implementation now lives with the product cache contract rather than inside the shared aggregate.
- Route -> container/page -> hook -> server -> schema/database -> query/cache policy: unchanged. Hooks still call `queryKeys.products`, and all checked tuple shapes remain stable.
- Tenant isolation/data integrity: not directly applicable; no server reads, writes, tenant predicates, inventory quantities, serialized lineage, valuation, COGS, or finance writes changed.
- Query/cache policy: preserved for product search, movement reads, stock-alert filtering, product inventory invalidation, and shared integrity prefixes.
- UI states/error handling: unchanged; no route or component behavior changed.
- Reviewability: one catalog module, one aggregate adapter assignment, focused source contracts, and this closeout.

## Smells Removed

- Reduced `src/lib/query-keys.ts` from 2,342 lines to 2,237 lines.
- Removed inline products catalog implementation from the shared query-key monolith.
- Removed `ProductStockAlertFilters` from the global filter-type block.
- Removed product-specific `queryKeys.products` self-reference from the aggregate implementation.

## Deferred

- `src/lib/query-keys.ts` is still large at 2,237 lines and should continue shedding cohesive domain catalogs.
- Support, communications, financial, dashboard, customers, orders, and warranty key families remain inline.
- Browser QA is not useful for this slice because no rendered UI behavior changed.

## Gates

- Passed: `./node_modules/.bin/eslint src/lib/query-keys.ts src/lib/query-key-catalog/products.ts tests/unit/products/product-search-query-key-contract.test.ts tests/unit/inventory/product-stock-alert-cache-contract.test.ts --report-unused-disable-directives`.
- Passed: `./node_modules/.bin/vitest run tests/unit/products/product-search-query-key-contract.test.ts tests/unit/inventory/product-stock-alert-cache-contract.test.ts tests/unit/products/product-movement-cache-contract.test.ts tests/unit/shared/query-key-integrity.test.ts` - 4 files, 10 tests.
- Passed: `npm run lint`.
- Passed: `npm run typecheck`.
- Passed: `git diff --check`.
- Passed: `npm run test:unit` - 765 files, 2,538 tests.
- Skipped: browser QA because no rendered UI behavior changed.
- Skipped: production build because this query-key catalog extraction was covered by focused cache contracts, full lint, typecheck, whitespace checks, and the full unit suite.

## Goal Adaptation

Declined. This is direct progress against the standing maintainer goal and current smell list: draw down `src/lib/query-keys.ts` through behavior-preserving, domain-owned catalog boundaries with evidence.

## Residual Risk

Low for behavior because the public `queryKeys.products` adapter remains unchanged and focused tests cover adapter identity, search prefixes, stock-alert filters, movement key shape, and shared query-key integrity. Medium architecture risk remains because several other large query-key catalogs are still inline and continue to use global self-reference.
