# Inventory Maintainer Sprint 167: Stock Count Product Cache Evidence

## Status

Closed in commit-ready state.

## Issue 1: Stock Count Completion Did Not Identify Affected Products

### Problem

Sprint 166 routed stock count completion through the centralized inventory stock mutation cache policy, but `completeStockCount` only returned affected inventory and layer IDs. The shared cache policy can narrow product cache refreshes when `affectedProductIds` is present; without that list, count completion had to fall back to broader product invalidation behavior.

That made stock count completion less precise than order and RMA inventory mutations, which already expose affected products for product inventory cache refresh.

### Workflow Spine

Stock count completion
-> locked count
-> locked counted inventory rows
-> variance reconciliation
-> affected inventory/product/layer evidence
-> inventory finance mutation envelope
-> `useCompleteStockCount`
-> centralized inventory stock mutation cache policy
-> product inventory/stat/movement caches.

### Touched Domains

- Inventory finance mutation schema.
- Inventory stock count server function.
- Inventory stock count hook/cache tests.
- Inventory finance documentation.
- Inventory sprint evidence.

### Business Value Protected

After a cycle count changes stock, product-level inventory tabs, product inventory stats, product stock alerts, and product movement views can refresh the products that actually changed. That reduces stale product detail surfaces without broad product cache churn.

### Scope Constraints

- Do not change count reconciliation behavior.
- Do not change receiving, adjustment, transfer, order, or RMA server behavior.
- Do not change the centralized cache helper.
- Do not add UI behavior in this slice.

### Changes

- Added `affectedProductIds` to the inventory finance mutation result schema.
- Documented `affectedProductIds` in the inventory finance mutation contract.
- `completeStockCount` now collects product IDs for rows with applied variances.
- `completeStockCount` now returns `affectedProductIds` with affected inventory and layer IDs.
- Added source-level contract coverage for affected product IDs.
- Extended the count completion hook test to prove product-specific cache invalidation and no broad `products.all` invalidation when product identity is known.

### Standards Checked

- Domain ownership: stock count remains the owner of count reconciliation; finance mutation contract owns shared mutation evidence.
- Route -> container/page -> hook -> server function -> schema/database -> query/cache policy: server evidence now feeds the existing hook cache policy cleanly.
- Tenant isolation/data integrity: unchanged; product IDs come from tenant-scoped locked inventory rows.
- Transactional inventory/finance integrity: product evidence is collected inside the same transaction as inventory, layer, movement, and valuation changes.
- Serialized lineage continuity: unchanged.
- Honest UI/error handling: unchanged.
- Query/cache contract: improved product-level invalidation precision for count completion.
- Reviewability: schema/doc update plus small server/test changes.

### Smells Removed

- Stock count finance envelope lacked product identity even though the cache layer already supported it.
- Count completion could trigger broad product invalidation when precise product identity was available from the locked rows.

### Deferred

- Existing adjustment, receiving, and transfer hooks still pass product identity from mutation variables rather than response `affectedProductIds`; that remains acceptable because those flows are single-product.
- No browser smoke; this was a server-envelope and hook/cache contract slice.
- No product UI changes.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/inventory/stock-count-tenant-scope-contract.test.ts tests/unit/inventory/query-normalization-wave3-stock-counts.test.tsx tests/unit/inventory/stock-mutation-tenant-scope-contract.test.ts tests/unit/inventory/use-adjust-inventory.test.tsx tests/unit/inventory/use-transfer-inventory.test.tsx tests/unit/inventory/use-receive-inventory.test.tsx`
- Passed: `./node_modules/.bin/eslint src/lib/schemas/inventory/finance-mutation-contract.ts src/server/functions/inventory/stock-counts.ts src/hooks/inventory/use-stock-counts.ts tests/unit/inventory/stock-count-tenant-scope-contract.test.ts tests/unit/inventory/query-normalization-wave3-stock-counts.test.tsx --report-unused-disable-directives`
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
- Passed: `git diff --check`

### Goal Adaptation

No adaptation needed. This sprint continues the maintainer goal by tightening the server-result-to-cache-policy contract for an inventory workflow.

### Residual Risk

Low. The change adds response evidence and narrows cache invalidation when product identity is known. It does not alter reconciliation math, row locking, cost layers, or serialized lineage behavior.
