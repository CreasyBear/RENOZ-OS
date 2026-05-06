# Products Maintainer Sprint 1

## Status

Closed in commit-ready state.

## Issue 1: Product Pricing Mutation Error Copy

### Problem

Product pricing mutation hooks rendered `error.message || "Failed to ..."` directly for price tier, customer-specific pricing, bulk price update, and price-adjustment failures. Product pricing is a commercial control surface for battery SKUs and service-adjacent products; mutation failures should not expose database, constraint, or infrastructure details.

### Workflow Spine

Product pricing workflow
-> pricing components and tabs
-> `use-product-pricing` hooks
-> product pricing server functions
-> product pricing schemas and database records
-> centralized product pricing query keys and invalidation
-> products-owned mutation formatter
-> operator-safe pricing toast copy.

### Touched Domains

- Products pricing mutation hooks.
- Products hook exports.
- Products pricing mutation error formatter.
- Products mutation error tests.
- Products maintainer closeout docs.

### Business Value Protected

Pricing controls protect product margin, customer-specific commercial agreements, and SKU catalogue correctness. Operators need clear, safe recovery copy when pricing changes fail, without raw database or infrastructure phrasing.

### Scope Constraints

- Do not change price tier, customer price, bulk price update, or price adjustment server behavior.
- Do not change pricing schemas, query keys, cache invalidation, success toasts, read queries, components, or product list/detail flows.
- Keep this as product pricing mutation error copy only.
- Browser QA is skipped because this is toast/error-copy behavior with no intended layout or interaction change.
- The serialized gate pack is closed and no longer part of routine maintainer closeout; this sprint did not touch serialized lineage or inventory identity work.

### Changes

- Added `formatProductPricingMutationError` with action-specific fallback copy.
- Preserved safe validation and permission guidance while suppressing unsafe database, constraint, token, and stack-shaped messages.
- Routed all `use-product-pricing` mutation `onError` to the products-owned formatter.
- Exported the formatter from the products hook barrel.
- Added behavior and source-contract tests for product pricing mutation errors.

### Standards Checked

- Domain ownership: product pricing mutation copy now lives in the products hook layer instead of ad hoc hook literals.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved. This sprint changes only hook-level mutation feedback.
- Query/cache policy: unchanged. Product pricing invalidation remains exactly as before.
- Tenant isolation/data integrity: unchanged. Product pricing mutations still flow through existing server functions and tenant predicates.
- Inventory/finance/serialized lineage: unchanged. This is commercial pricing feedback only.
- UI states/error handling: strengthened. Product pricing mutation failures no longer render raw thrown error text.
- Reviewability: the diff is limited to one formatter, one pricing hook import/call-site pass, one barrel export, focused tests, and this closeout note.

### Smells Removed

- Eight direct `toast.error(error.message || "Failed to ...")` product pricing mutation paths.
- No products-owned pricing mutation formatter for a commercial control surface.
- Missing source contract that pricing mutations stay behind safe copy.

### Deferred

- Product CRUD, image, bundle, category, attribute, import/export, and page-level mutation errors remain separate product-domain slices.
- Form-level submit errors in pricing components remain separate UI-boundary work.
- Browser QA was not run because this is mutation toast copy behavior with no intended layout change.

### Gates

- Passed: focused product pricing mutation error tests, `./node_modules/.bin/vitest run tests/unit/products/product-pricing-mutation-errors.test.ts tests/unit/products/product-inventory-mutation-errors.test.ts` - 2 files, 6 tests.
- Passed: broader products suite, `./node_modules/.bin/vitest run tests/unit/products` - 6 files, 16 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Note: the broader products suite still emits the existing `--localstorage-file` jsdom warning and existing `useRouter` warning in `query-normalization-wave5b`; tests pass.
- Skipped: browser QA because this is mutation copy behavior with no intended route or visual layout change.
- Skipped: reliability, finance, document, release, and deploy gates because this slice did not deliberately change route casts, pending dialog guards, read-path query guard baselines, finance persistence, document generation, release packaging, or production release paths.

### Goal Adaptation

Declined. The standing maintainer goal already covers operator-safe errors, commercial workflow safety, query/cache contracts, meaningful tests, and risk-selected evidence.

### Residual Risk

Low for product pricing hook mutation toasts. Remaining products-domain risk is concentrated in product CRUD/page actions, pricing form submit summaries, images, bundles, categories, attributes, and import/export feedback.
