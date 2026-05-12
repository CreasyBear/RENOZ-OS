# Inventory Maintainer Sprint 176: Product Category Cache Scope

## Status

Closed in commit-ready state.

## Issue 1: Product Category Mutations Refreshed the Category Root

### Problem

Creating, updating, and deleting product categories invalidated `queryKeys.categories.all`. Category data powers the product catalog tree, category list, product forms, and category labels embedded in product list/search results. Root category invalidation hid those actual read-after-write contracts.

The product catalog should make category ownership explicit without refreshing unrelated category-owned surfaces through the root key.

### Workflow Spine

Product category editor
-> `useCreateCategory` / `useUpdateCategory` / `useDeleteCategory`
-> product category server function
-> tenant-scoped category write
-> category list/tree/detail refresh
-> product list/search prefix refresh for category labels.

### Touched Domains

- Product catalog category mutation hooks.
- Product query normalization tests.
- Inventory sprint evidence.

### Business Value Protected

RENOZ’s catalog organization can change without relying on broad category-root invalidation. Operators still get fresh category navigation, forms, and product catalog labels after category edits.

### Scope Constraints

- Do not change category server behavior, auth, validation, or delete constraints.
- Do not change product list/search server behavior.
- Do not change category UI copy or form validation.
- Keep this slice limited to hook cache ownership.

### Changes

- Added `invalidateProductCategoryMutationQueries` in the product hooks module.
- Category create/update/delete now refresh category list, category tree, affected category detail, product lists, and product searches.
- Removed `queryKeys.categories.all` invalidation from category create/update/delete hooks.
- Added hook coverage proving category mutations refresh targeted category/product prefixes without category/product root invalidation.

### Standards Checked

- Domain ownership: product category mutations own category tree/list/detail and product catalog label refresh.
- Route -> container/page -> hook -> server function -> schema/database -> query/cache policy: server mutation result/variables now drive affected category cache policy.
- Tenant isolation/data integrity: unchanged; server writes remain tenant-scoped.
- Transactional inventory/finance integrity: not applicable.
- Serialized lineage continuity: not applicable.
- Honest UI/error handling: unchanged; existing product-core mutation error handling remains.
- Query/cache contract: improved and covered with focused hook tests.
- Reviewability: one local cache helper and one focused test.

### Smells Removed

- Category mutations invalidated the category root for narrow category writes.
- Product catalog label refresh was implicit instead of encoded through product list/search prefixes.

### Deferred

- No browser smoke; this was a hook/cache contract slice.
- No category-detail read hook audit; the query key exists but the current UI appears list/tree driven.
- Product search facets still need a separate read-state/cache audit.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/products/query-normalization-wave5b.test.tsx tests/unit/products/product-core-mutation-errors.test.ts tests/unit/products/product-catalog-form-errors.test.ts tests/unit/products/product-search-query-key-contract.test.ts`
- Passed: `./node_modules/.bin/eslint src/hooks/products/use-products.ts tests/unit/products/query-normalization-wave5b.test.tsx --report-unused-disable-directives`
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
- Passed: `git diff --check`

### Goal Adaptation

No adaptation needed. This sprint follows the maintainer goal by replacing broad product catalog cache refresh with explicit domain-owned query prefixes.

### Residual Risk

Low. Runtime server behavior is unchanged. Remaining risk is limited to broader product search/facet cache semantics, which were refreshed by prefix but not deeply audited here.
