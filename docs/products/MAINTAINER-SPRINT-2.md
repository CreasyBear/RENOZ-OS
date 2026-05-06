# Products Maintainer Sprint 2

## Status

Closed in commit-ready state.

## Issue 1: Product Core Mutation Error Copy

### Problem

The core product hooks still rendered `error.message || "Failed to ..."` for product CRUD, category CRUD, import, export, bulk update, and bulk price adjustment failures. After Sprint 1 introduced safe product pricing feedback, keeping core product operations on raw thrown messages would leave the SKU catalogue with inconsistent operator safety.

### Workflow Spine

Product catalogue workflow
-> product routes/pages and product components
-> `use-products` hooks
-> product and product bulk server functions
-> product/category/import schemas and database records
-> centralized product/category query keys and invalidation
-> products-owned mutation formatter
-> operator-safe product toast copy.

### Touched Domains

- Products core mutation hooks.
- Products mutation formatter consolidation.
- Products hook exports.
- Products mutation error tests.
- Products maintainer closeout docs.

### Business Value Protected

Product and category changes directly shape the battery SKU catalogue, import/export workflow, and downstream ordering/pricing behavior. Operators need clear recovery copy when those mutations fail without raw database, constraint, token, or stack details.

### Scope Constraints

- Do not change product CRUD, category CRUD, import, export, bulk update, or bulk price adjustment server behavior.
- Do not change schemas, query keys, cache invalidation, success toasts, read queries, route behavior, or component forms.
- Keep this as product core mutation error copy only.
- Browser QA is skipped because this is toast/error-copy behavior with no intended layout or interaction change.
- The serialized gate pack is closed and no longer part of routine maintainer closeout; this sprint did not touch serialized lineage or inventory identity work.

### Changes

- Consolidated product mutation feedback into `product-mutation-error-messages.ts`.
- Kept `formatProductPricingMutationError` and added `formatProductCoreMutationError`.
- Routed all `use-products` mutation `onError` paths through the products-owned formatter.
- Updated the product hook barrel export.
- Added behavior and source-contract tests for core product mutation errors.

### Standards Checked

- Domain ownership: product/catalogue mutation copy now lives in the products hook layer instead of ad hoc hook literals.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved. This sprint changes only hook-level mutation feedback.
- Query/cache policy: unchanged. Product, category, and bulk invalidation remain exactly as before.
- Tenant isolation/data integrity: unchanged. Product mutations still flow through existing server functions and tenant predicates.
- Inventory/finance/serialized lineage: unchanged. This is product catalogue feedback only.
- UI states/error handling: strengthened. Product core mutation failures no longer render raw thrown error text.
- Reviewability: the diff is limited to one formatter consolidation, one core hook import/call-site pass, one barrel export, focused tests, and this closeout note.

### Smells Removed

- Twelve direct `toast.error(error.message || "Failed to ...")` product core mutation paths.
- Pricing formatter was renamed into a products mutation formatter so the domain has one parser instead of accumulating one-off helpers.
- Missing source contract that core product mutations stay behind safe copy.

### Deferred

- Product image, bundle, attribute, route-level import, component-level form submit, and page action errors remain separate product-domain slices.
- Browser QA was not run because this is mutation toast copy behavior with no intended layout change.

### Gates

- Passed: focused product core/pricing mutation error tests, `./node_modules/.bin/vitest run tests/unit/products/product-core-mutation-errors.test.ts tests/unit/products/product-pricing-mutation-errors.test.ts tests/unit/products/product-inventory-mutation-errors.test.ts` - 3 files, 9 tests.
- Passed: broader products suite, `./node_modules/.bin/vitest run tests/unit/products` - 7 files, 19 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Note: the broader products suite still emits the existing `--localstorage-file` jsdom warning and existing `useRouter` warning in `query-normalization-wave5b`; tests pass.
- Skipped: browser QA because this is mutation copy behavior with no intended route or visual layout change.
- Skipped: reliability, finance, document, release, and deploy gates because this slice did not deliberately change route casts, pending dialog guards, read-path query guard baselines, finance persistence, document generation, release packaging, or production release paths.

### Goal Adaptation

Declined. The standing maintainer goal already covers operator-safe errors, product catalogue workflow safety, query/cache contracts, meaningful tests, and risk-selected evidence.

### Residual Risk

Low for core product hook mutation toasts. Remaining products-domain risk is concentrated in product images, bundles, attributes, route-level import, component submit summaries, and page action feedback.
