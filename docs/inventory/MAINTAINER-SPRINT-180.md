# Inventory Maintainer Sprint 180: Category Settings Refresh Scope

## Status

Closed in commit-ready state.

## Issue 1: Category Settings Refresh Used the Category Root

### Problem

Sprint 176 moved product category mutation hooks off `queryKeys.categories.all`, but the product category settings route still invalidated the category root when the operator clicked refresh. The page only renders `useCategoryTree()`, so route-level root invalidation refreshed category list/detail surfaces the route does not own.

### Workflow Spine

Product category settings route
-> `useCategoryTree`
-> product category server read
-> category tree query key
-> route refresh button refetches the rendered tree.

### Touched Domains

- Product category settings route.
- Product category route cache contract test.
- Inventory sprint evidence.

### Business Value Protected

Operators can manually refresh the category tree without forcing unrelated category list/detail cache churn. Category mutation freshness remains owned by the product category hooks that already refresh list, tree, affected detail, and product catalog label surfaces.

### Scope Constraints

- Do not change category mutation hooks.
- Do not change server category reads/writes.
- Do not change UI copy, layout, or category tree behavior.
- Keep this slice limited to the route refresh button.

### Changes

- Removed route-level `useQueryClient` and `queryKeys.categories.all` invalidation from settings categories.
- Made the refresh button call the mounted `useCategoryTree` query's `refetch` directly.
- Added a focused source contract proving the route does not own category-root invalidation.

### Standards Checked

- Domain ownership: product category hooks own mutation cache effects; the route owns only the rendered tree refresh.
- Route -> container/page -> hook -> server function -> schema/database -> query/cache policy: route refresh now follows route -> hook/query directly without bypassing the hook's cache contract.
- Tenant isolation/data integrity: unchanged; no server behavior changed.
- Transactional inventory/finance integrity: not touched.
- Serialized lineage continuity: not applicable.
- Honest UI/error handling: unchanged; refresh behavior remains user-initiated.
- Query/cache contract: tightened and covered with a source contract.
- Reviewability: one route cleanup, one focused test, one closeout note.

### Smells Removed

- Product category settings refresh invalidated the category root.
- Route-level cache policy duplicated and exceeded the product category hook contract.

### Deferred

- No browser smoke; this was a route cache-contract cleanup with no intended UI change.
- No product search facet audit; that remains separate from manual category-tree refresh.

### Gates

- Passed: focused category settings route cache contract.
- Passed: focused product category mutation cache contract.
- Passed: focused ESLint on touched route/test.
- Passed: full typecheck.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. This sprint follows the maintainer goal by removing a remaining broad category-root cache smell with a small route-owned slice.

### Residual Risk

Low. Manual refresh now refetches only the tree query mounted by the route; mutation-driven list/detail/product label freshness remains covered by existing product category hooks.
