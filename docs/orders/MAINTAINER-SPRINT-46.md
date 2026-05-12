# Orders Maintainer Sprint 46: Fulfillment Product Fallback Scope

## Status

Closed in commit-ready state.

## Issue 1: Unknown Fulfillment Product Identity Fell Back to Product Root Invalidation

### Problem

The orders fulfillment cache helper refreshed exact product stock surfaces when pick, unpick, ship, or reopen mutations returned affected product IDs. When product identity was unknown, it fell back to `queryKeys.products.all`.

That fallback preserved freshness, but it also refreshed unrelated product-owned surfaces such as pricing, images, attributes, bundles, and bulk operations. Fulfillment inventory side effects should name the product stock/read surfaces they depend on.

### Workflow Spine

Order picking/shipping/reopen workflow
-> `usePickOrderItems` / `useUnpickOrderItems` / shipment hooks
-> fulfillment server mutation
-> tenant-scoped inventory reservation or shipment side effect
-> order/detail/fulfillment cache refresh
-> inventory stock/valuation/serialized cache refresh
-> exact product stock cache refresh when product IDs are known
-> product stock/read prefix refresh when product IDs are unknown.

### Touched Domains

- Orders fulfillment cache helper.
- Orders fulfillment cache contract tests.
- Order mutation invalidation tests.
- Product query-key contracts.
- Inventory stock mutation cache contract parity.
- Orders sprint evidence.

### Business Value Protected

Fulfillment can still recover freshness after shipment or picking side effects even if a mutation lacks exact product identity, without forcing an opaque product-root refresh. That keeps picking/shipping cache behavior easier to audit and less likely to mask unrelated product-domain dependencies.

### Scope Constraints

- Do not change picking, unpicking, shipment, reopen, server transaction, idempotency, order status, inventory reservation, cost-layer, or serialized lineage behavior.
- Do not change exact known-product fulfillment cache refresh behavior.
- Do not change product query-key shapes.
- Keep this slice limited to the orders fulfillment helper fallback.

### Changes

- Replaced fulfillment unknown-product fallback from `queryKeys.products.all` to explicit product list, detail, search, stock, inventory, inventory stats, stock levels, stock alerts, and movement prefixes.
- Added a direct fulfillment cache contract test for unknown product identity.
- Re-ran order mutation invalidation and order write contract coverage to protect known-product pick/ship/reopen paths.

### Standards Checked

- Domain ownership: orders fulfillment owns pick/ship/reopen cache side effects in `src/hooks/orders/_fulfillment-cache.ts`.
- Route -> container/page -> hook -> server function -> schema/database -> query/cache policy: unchanged server workflow; cache fallback is now named by read surface.
- Tenant isolation/data integrity: unchanged; server writes remain tenant-scoped.
- Transactional inventory/finance integrity: unchanged; shipment cache refresh still includes valuation/cost-layer surfaces.
- Serialized lineage continuity: unchanged; serialized refresh remains result-driven.
- Honest UI/error handling: unchanged.
- Query/cache contract: improved and covered with direct helper and hook-level tests.
- Reviewability: one helper fallback change plus one focused test.

### Smells Removed

- Orders fulfillment cache helper used product-root invalidation for unknown product identity.
- Sprint 179's inventory-stock/product fallback cleanup had left the orders-owned equivalent unresolved.

### Deferred

- No browser smoke; this was a hook/cache contract slice with no intended UI behavior or layout change.
- No redesign of fulfillment mutation result identity. Unknown identity remains supported as a fallback path because older or defensive mutation results may still omit product IDs.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/orders/fulfillment-cache-contract.test.ts tests/unit/orders/order-mutation-invalidation.test.tsx tests/unit/orders/order-write-contracts.test.ts tests/unit/products/product-movement-cache-contract.test.ts tests/unit/products/product-search-query-key-contract.test.ts tests/unit/inventory/stock-mutation-cache-contract.test.ts`
- Passed: `./node_modules/.bin/eslint src/hooks/orders/_fulfillment-cache.ts tests/unit/orders/fulfillment-cache-contract.test.ts --report-unused-disable-directives`
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
- Passed: `git diff --check`

### Goal Adaptation

No adaptation needed. This sprint follows the maintainer goal by eliminating a hidden cross-domain root refresh while keeping the slice under orders fulfillment ownership.

### Residual Risk

Low. The exact known-product fulfillment paths remain covered by existing hook tests, and the unknown-product fallback now targets explicit product stock/read prefixes. Remaining fulfillment risk sits in broader UI/operator workflow complexity, not this cache contract.
