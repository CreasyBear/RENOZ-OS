# Inventory Maintainer Sprint 179: Stock Mutation Product Fallback Scope

## Status

Closed in commit-ready state.

## Issue 1: Unknown Product Identity Fell Back to Product Root Invalidation

### Problem

The shared inventory stock mutation cache helper refreshed exact product inventory surfaces when product IDs were known, but fell back to `queryKeys.products.all` when product identity was unknown.

That fallback protected freshness, but it also refreshed unrelated product-owned surfaces such as images, pricing, attributes, bundles, and bulk tools. A stock mutation should name the product stock/read surfaces it depends on, even when it cannot name the exact product IDs.

### Workflow Spine

Inventory stock-changing workflows
-> `invalidateInventoryStockMutationQueries`
-> inventory list/detail/dashboard/valuation/availability/serialized/movement refresh
-> product list/detail/search/stock/inventory/stat/alert/movement refresh when product identity is unknown
-> exact product inventory/detail/stat/alert/movement refresh when product identity is known.

### Touched Domains

- Inventory stock mutation cache helper.
- Product query-key factory.
- Inventory, supplier receiving, purchase-order receiving, RMA recovery, and product query-key tests.
- Inventory sprint evidence.

### Business Value Protected

RENOZ stock-changing workflows still refresh product inventory truth after receives, transfers, adjustments, counts, status updates, supplier receipts, and RMA recovery, but they no longer rely on a broad product-root refresh that hides the actual stock surfaces being protected.

### Scope Constraints

- Do not change server mutation behavior, auth, validation, transaction boundaries, inventory movement writes, cost layers, or serialized lineage writes.
- Do not change known-product exact invalidation behavior.
- Do not change product images, pricing, attributes, bundles, or bulk operation cache contracts.
- Keep this slice limited to the inventory stock mutation helper fallback.

### Changes

- Added product query-key prefixes for product inventory, inventory stats, stock levels, and product movements while preserving existing key shapes.
- Replaced unknown-product stock mutation fallback from `queryKeys.products.all` to explicit product list, detail, search, stock, inventory, inventory stats, stock levels, stock alerts, and movement prefixes.
- Added direct helper coverage proving unknown-product stock mutations refresh product stock prefixes without invalidating the product root.
- Ran shared-consumer tests across inventory, supplier receiving, purchase-order receiving, RMA recovery, and product query-key contracts.

### Standards Checked

- Domain ownership: inventory stock helper owns stock mutation side-effect cache policy; product query-key factory owns product stock/read prefixes.
- Route -> container/page -> hook -> server function -> schema/database -> query/cache policy: unchanged server behavior; cache fallback is now named by product read surface instead of product root.
- Tenant isolation/data integrity: unchanged; server mutations remain tenant-scoped.
- Transactional inventory/finance integrity: unchanged; valuation/cost-layer refresh remains covered by inventory prefixes.
- Serialized lineage continuity: unchanged; serialized refresh policy remains result-driven.
- Honest UI/error handling: unchanged.
- Query/cache contract: improved and directly covered.
- Reviewability: one fallback helper change, four query-key prefix additions, one focused regression test.

### Smells Removed

- Unknown product identity caused stock mutations to refresh the entire product root.
- Product inventory, inventory stats, stock levels, and movement key families lacked prefix helpers for cache policy ownership.

### Deferred

- Order fulfillment has a separate `_fulfillment-cache` helper with a similar product-root fallback. That belongs in an orders fulfillment sprint because pick/ship/reopen has different workflow ownership.
- No product UI/browser smoke; this was a cache contract slice.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/inventory/stock-mutation-cache-contract.test.ts tests/unit/inventory/query-normalization-wave3-stock-counts.test.tsx tests/unit/inventory/use-bulk-update-inventory-status.test.tsx tests/unit/inventory/use-adjust-inventory.test.tsx tests/unit/inventory/use-receive-inventory.test.tsx tests/unit/inventory/use-transfer-inventory.test.tsx tests/unit/suppliers/use-bulk-receive-goods.test.tsx tests/unit/support/use-rma-mutations.test.tsx tests/unit/purchase-orders/query-normalization-wave3d.test.tsx tests/unit/products/product-movement-cache-contract.test.ts tests/unit/products/product-search-query-key-contract.test.ts`
- Passed: `./node_modules/.bin/eslint src/hooks/inventory/_stock-mutation-cache.ts src/lib/query-keys.ts tests/unit/inventory/stock-mutation-cache-contract.test.ts --report-unused-disable-directives`
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
- Passed: `git diff --check`

### Goal Adaptation

No adaptation needed. This sprint follows the maintainer goal by replacing hidden cross-domain root refresh with explicit cache ownership while preserving a small domain-sliced implementation.

### Residual Risk

Low for inventory stock mutation consumers. Moderate for the separate orders fulfillment cache helper because it still has a product-root fallback and should be handled under fulfillment workflow ownership.
