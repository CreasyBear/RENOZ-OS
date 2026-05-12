# Inventory Maintainer Sprint 172: Category Warranty Cache Scope

## Status

Closed in commit-ready state.

## Issue 1: Category Default Warranty Assignment Refreshed Category Root

### Problem

Assigning a default warranty policy to one product category invalidated `queryKeys.categories.all`. Sprint 171 narrowed the product-level warranty assignment path, but the category-level sibling still refreshed every category surface through the root key.

The mutation changes one category's default warranty policy and warranty resolution results for category-backed products. It does not change unrelated product state or every category-owned query.

### Workflow Spine

Warranty category default assignment UI
-> `useAssignDefaultWarrantyPolicyToCategory`
-> `assignDefaultWarrantyPolicyToCategory`
-> tenant-scoped category update
-> affected category detail/list/tree refresh
-> warranty resolution cache refresh.

### Touched Domains

- Warranty policy mutation hook.
- Warranty policy hook tests.
- Inventory sprint evidence.

### Business Value Protected

Category warranty defaults can be changed without forcing a root category refresh. Operators still get fresh category detail/list/tree data and recalculated warranty resolution wherever inherited category defaults are displayed.

### Scope Constraints

- Do not change warranty assignment server behavior, auth, logging, or validation.
- Do not change category CRUD cache policy.
- Do not change product-level warranty assignment already closed in Sprint 171.
- Keep the slice limited to mutation side effects.

### Changes

- `useAssignDefaultWarrantyPolicyToCategory` now invalidates the affected category detail, category list, category tree, and warranty policy resolution prefix.
- Removed broad `queryKeys.categories.all` invalidation from category default warranty assignment.
- Added hook coverage proving the narrowed invalidation contract and guarding against category/product root invalidation.

### Standards Checked

- Domain ownership: warranty assignment owns warranty resolution refresh; category query keys own category detail/list/tree refresh.
- Route -> container/page -> hook -> server function -> schema/database -> query/cache policy: mutation variables now drive affected category cache policy.
- Tenant isolation/data integrity: unchanged; server-side update remains tenant-scoped.
- Transactional inventory/finance integrity: unchanged; no stock, inventory, finance, or serialized writes touched.
- Honest UI/error handling: unchanged; existing success/error toasts remain.
- Query/cache contract: improved and covered with focused tests.
- Reviewability: one hook change and one focused test.

### Smells Removed

- Category default warranty assignment used category root invalidation for a single-category metadata update.
- Product-level and category-level warranty assignment cache behavior were asymmetric after Sprint 171.

### Deferred

- Broader category CRUD mutations still use category-root invalidation and should be audited separately.
- No browser smoke; this was a hook/cache contract slice.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/warranty/query-normalization-wave3-policies.test.tsx tests/unit/products/product-search-query-key-contract.test.ts`
- Passed: `./node_modules/.bin/eslint src/hooks/warranty/policies/use-warranty-policies.ts tests/unit/warranty/query-normalization-wave3-policies.test.tsx --report-unused-disable-directives`
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
- Passed: `git diff --check`

### Goal Adaptation

No adaptation needed. This sprint follows the maintainer goal by closing the paired category-side cache smell created by the same warranty assignment workflow.

### Residual Risk

Low. Server behavior is unchanged. The remaining risk is that category CRUD paths still need a separate cache-scope audit.
