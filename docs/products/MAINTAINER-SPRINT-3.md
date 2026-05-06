# Products Maintainer Sprint 3

## Status

Closed in commit-ready state.

## Issue 1: Product Image Mutation Error Copy

### Problem

Product image mutation hooks still rendered `error.message || "Failed to ..."` for gallery upload, update, delete, primary image, reorder, bulk delete, and alt-text update failures. Product imagery is part of the SKU catalogue and sales/support context; image mutation failures should not expose storage, database, constraint, token, or stack details.

### Workflow Spine

Product image workflow
-> product image components and tabs
-> `use-product-images` hooks
-> product image server functions
-> product image schemas and database/storage records
-> centralized product image query keys and invalidation
-> products-owned mutation formatter
-> operator-safe product image toast copy.

### Touched Domains

- Products image mutation hooks.
- Products mutation formatter.
- Products hook exports.
- Products image mutation error tests.
- Products maintainer closeout docs.

### Business Value Protected

Battery SKU imagery supports product identification, sales quoting, support triage, and catalogue hygiene. Operators need clear recovery copy when gallery changes fail without raw database or storage-provider wording.

### Scope Constraints

- Do not change product image server behavior, storage behavior, schemas, query keys, cache invalidation, success toasts, read queries, image components, or upload UI behavior.
- Keep this as product image mutation error copy only.
- Browser QA is skipped because this is toast/error-copy behavior with no intended layout or interaction change.
- The serialized gate pack is closed and no longer part of routine maintainer closeout; this sprint did not touch serialized lineage or inventory identity work.

### Changes

- Added image-specific fallback and code-message policy to the products mutation formatter.
- Routed all `use-product-images` mutation `onError` paths through `formatProductImageMutationError`.
- Exported the image formatter and action type from the products hook barrel.
- Added behavior and source-contract tests for product image mutation errors.

### Standards Checked

- Domain ownership: product image mutation copy now lives in the products hook layer instead of ad hoc hook literals.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved. This sprint changes only hook-level mutation feedback.
- Query/cache policy: unchanged. Product image invalidation remains exactly as before.
- Tenant isolation/data integrity: unchanged. Product image mutations still flow through existing server functions and tenant predicates.
- Inventory/finance/serialized lineage: unchanged. This is catalogue imagery feedback only.
- UI states/error handling: strengthened. Product image mutation failures no longer render raw thrown error text.
- Reviewability: the diff is limited to formatter action additions, one image hook import/call-site pass, one barrel export update, focused tests, and this closeout note.

### Smells Removed

- Seven direct `toast.error(error.message || "Failed to ...")` product image mutation paths.
- Missing source contract that image mutations stay behind safe products-owned copy.

### Deferred

- Product bundle, attribute, route-level import, component-level form submit, and page action errors remain separate product-domain slices.
- Browser QA was not run because this is mutation toast copy behavior with no intended layout change.

### Gates

- Passed: focused product image/core/pricing mutation error tests, `./node_modules/.bin/vitest run tests/unit/products/product-image-mutation-errors.test.ts tests/unit/products/product-core-mutation-errors.test.ts tests/unit/products/product-pricing-mutation-errors.test.ts tests/unit/products/product-inventory-mutation-errors.test.ts` - 4 files, 12 tests.
- Passed: broader products suite, `./node_modules/.bin/vitest run tests/unit/products` - 8 files, 22 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Note: the broader products suite still emits the existing `--localstorage-file` jsdom warning and existing `useRouter` warning in `query-normalization-wave5b`; tests pass.
- Skipped: browser QA because this is mutation copy behavior with no intended route or visual layout change.
- Skipped: reliability, finance, document, release, and deploy gates because this slice did not deliberately change route casts, pending dialog guards, read-path query guard baselines, finance persistence, document generation, release packaging, or production release paths.

### Goal Adaptation

Declined. The standing maintainer goal already covers operator-safe errors, product catalogue workflow safety, query/cache contracts, meaningful tests, and risk-selected evidence.

### Residual Risk

Low for product image hook mutation toasts. Remaining products-domain risk is concentrated in bundles, attributes, route-level import, component submit summaries, and page action feedback.
