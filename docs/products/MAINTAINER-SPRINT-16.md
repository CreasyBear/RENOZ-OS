# Products Maintainer Sprint 16

## Status

Closed in commit-ready state.

## Issue 1: Product Search Facet Query Key Ownership

### Problem

`useSearchFacets` built its query key inline as `['products', 'facets']` by appending a literal to `queryKeys.products.all`. Product search suggestions already used centralized query keys, but search facets did not.

Facet data powers the product/SKU discovery filters used to find active battery products, categories, statuses, product types, price ranges, and attributes. That cache contract should be named in the Products domain, not hidden inside the hook.

### Workflow Spine

Product search interface
-> search interface container
-> `useSearchFacets`
-> product search server function
-> product/category/attribute read model
-> centralized product query keys
-> filter UI state.

### Touched Domains

- Products query key infrastructure.
- Product search facet hook.
- Product search query-key contract tests.
- Products maintainer closeout docs.

### Business Value Protected

RENOZ operators need product discovery to stay dependable as the catalogue grows across battery modules, SKUs, bundles, inventory-linked items, and product attributes. Centralizing the facet key keeps the search filter cache visible and reviewable when future catalogue/search work changes invalidation or read behavior.

### Scope Constraints

- Do not change product search server functions, product schemas, category reads, attribute reads, search UI behavior, search suggestions, search analytics, product mutations, inventory behavior, finance behavior, or route behavior.
- Keep this as a cache ownership cleanup slice.

### Changes

- Added `queryKeys.products.facets()`.
- Updated `useSearchFacets` to use the centralized key.
- Added `product-search-query-key-contract.test.ts` to prove product search suggestions and facets sit under the product root while remaining distinct keys.

### Standards Checked

- Domain ownership: product search facet cache ownership now lives in `queryKeys.products`.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: checked the product search interface to facet hook to centralized key spine.
- Tenant isolation/data integrity: unchanged; no server functions, database predicates, schemas, product writes, inventory, or finance behavior touched.
- Query/cache contract: improved by removing hook-local literal facet key construction.
- Transactional inventory and finance integrity: unchanged; no inventory or finance path touched.
- Serialized lineage continuity: unchanged; no serial identity or inventory serialization path touched.
- Honest UI states/operator-safe errors: unchanged; existing read-error normalization stays in the hook.
- Reviewability: bounded diff across centralized query keys, one hook call site, one focused query-key test, and this closeout.

### Smells Removed

- Hook-local `['products', 'facets']` query key construction.
- Product search suggestions and facets using different ownership patterns.
- Hidden product search facet cache contract.

### Deferred

- Broader product search UX, search analytics, and facet invalidation policy remain separate slices.
- Browser QA remains deferred because this slice changes cache ownership without visible layout changes.
- Full `bun run test:unit` and `bun run build` remain deferred to larger release/predeploy sweeps.

### Gates

- Passed: `bun run test:vitest tests/unit/products/product-search-query-key-contract.test.ts`.
- Passed: `rg -n "\\[\\.\\.\\.queryKeys\\.products\\.all, 'facets'|queryKeys\\.products\\.facets\\(|products\\.all, 'facets'" src tests/unit/products -g '*.ts' -g '*.tsx'`.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: browser QA, `bun run build`, `bun run test:unit`, `bun run lint:reliability`, finance, document, release, and deploy gates because this slice did not change visible UI, build-time behavior, guarded route/read contracts, financial calculations, document generation, release packaging, or deployment paths.

### Goal Adaptation

Declined. The standing maintainer goal already covers centralized query keys, domain ownership, small reviewable diffs, and evidence-based closeout.

### Residual Risk

Low for product search facet cache ownership. Broader product search invalidation behavior remains intentionally unchanged.
