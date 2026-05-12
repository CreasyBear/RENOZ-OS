# Inventory Maintainer Sprint 171: Warranty Assignment Cache Scope

## Status

Closed in commit-ready state.

## Issue 1: Product Warranty Assignment Refreshed Product Root

### Problem

Assigning a warranty policy to one product invalidated `queryKeys.products.all`. That made a narrow product metadata change refresh product stock, inventory, search, and unrelated product surfaces through the root cache key.

The assignment changes one product's warranty-policy relationship and the warranty resolution result. It does not change stock state, inventory rows, or every product query.

### Workflow Spine

Warranty policy assignment UI
-> `useAssignWarrantyPolicyToProduct`
-> `assignWarrantyPolicyToProduct`
-> tenant-scoped product update
-> affected product/list/search cache refresh
-> warranty resolution cache refresh.

### Touched Domains

- Warranty policy mutation hook.
- Central query key factory.
- Warranty policy hook tests.
- Product search query-key contract tests.
- Inventory sprint evidence.

### Business Value Protected

Operators can update product warranty policy assignment without forcing unrelated product stock/inventory surfaces to refetch. The UI still refreshes the product record, product collections/search results, and warranty resolution queries that can display the changed assignment.

### Scope Constraints

- Do not change warranty assignment server behavior, auth, logging, or validation.
- Do not change product stock/inventory cache policy.
- Do not change default category policy assignment semantics.
- Keep the slice limited to cache-key ownership and mutation side effects.

### Changes

- Added `queryKeys.products.searches()` as a stable product-search prefix without changing individual product search keys.
- Added `queryKeys.warrantyPolicies.resolutions()` as a stable warranty-resolution prefix.
- Corrected the warranty resolution key parameter shape to include `categoryId` instead of an unused `customerId`.
- `useAssignWarrantyPolicyToProduct` now invalidates the affected product detail, product lists, product searches, and warranty policy resolutions.
- Removed broad `queryKeys.products.all` invalidation from product warranty assignment.
- Added hook coverage proving the narrowed invalidation contract.
- Extended the product search query-key contract to prove the new search prefix remains under the product root.

### Standards Checked

- Domain ownership: warranty assignment owns warranty resolution refresh; product query keys own product detail/list/search refresh.
- Route -> container/page -> hook -> server function -> schema/database -> query/cache policy: mutation variables now drive affected product cache policy.
- Tenant isolation/data integrity: unchanged; server-side update remains tenant-scoped.
- Transactional inventory/finance integrity: unchanged; no stock, inventory, finance, or serialized writes touched.
- Honest UI/error handling: unchanged; existing success/error toasts remain.
- Query/cache contract: improved and covered with focused tests.
- Reviewability: small hook and query-key change with direct tests.

### Smells Removed

- Product warranty assignment used product root invalidation for a single-product metadata update.
- Warranty resolution queries had no invalidatable prefix.
- Warranty resolution query-key type mentioned `customerId`, while the resolver schema uses `categoryId`.

### Deferred

- Category default policy assignment still uses category-root invalidation; that needs its own category cache audit.
- Product search/list payloads were not audited for every warranty display location.
- No browser smoke; this was a query-key and hook side-effect slice.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/warranty/query-normalization-wave3-policies.test.tsx tests/unit/products/product-search-query-key-contract.test.ts tests/unit/orders/order-write-contracts.test.ts`
- Passed: `./node_modules/.bin/eslint src/lib/query-keys.ts src/hooks/warranty/policies/use-warranty-policies.ts tests/unit/warranty/query-normalization-wave3-policies.test.tsx tests/unit/products/product-search-query-key-contract.test.ts --report-unused-disable-directives`
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
- Passed: `git diff --check`

### Goal Adaptation

No adaptation needed. This sprint follows the maintainer goal by narrowing cache blast radius around a real operations workflow without weakening product correctness.

### Residual Risk

Low. Server behavior is unchanged. The remaining risk is that an uncommon product search/list surface may display warranty policy data and need the now-explicit product search/list prefixes, which are included in the refresh.
