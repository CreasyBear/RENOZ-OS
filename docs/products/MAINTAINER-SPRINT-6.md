# Products Maintainer Sprint 6

## Status

Closed in commit-ready state.

## Issue 1: Product Catalogue Form Error Summaries

### Problem

Product category editing, core product editing, and image metadata editing still put raw thrown mutation messages into form submit summaries. These forms sit directly on catalogue hygiene workflows; failures should use the product-owned safe formatter copy already established in the hook layer.

### Workflow Spine

Product catalogue form workflow
-> product category editor, product edit dialog, and image metadata editor
-> product core/image mutation hooks or parent submit handlers
-> product core/image server functions
-> product schemas and database/storage records
-> centralized product query keys and invalidation
-> products-owned mutation formatter
-> operator-safe form summary copy.

### Touched Domains

- Products category editor.
- Products core product edit dialog.
- Products image metadata editor.
- Products catalogue form error tests.
- Products maintainer closeout docs.

### Business Value Protected

Catalogue forms are where RENOZ operators keep battery SKU names, categories, sellable details, and gallery metadata usable for ordering, support, and sales context. A failed save should explain recovery without leaking infrastructure details.

### Scope Constraints

- Do not change product/category/image server behavior, schemas, query keys, cache invalidation, form fields, validation rules, product image storage, or UI layout.
- Reuse the existing product core and image formatter boundaries instead of adding another component-local policy.
- Browser QA is skipped because this is form error-copy behavior with no intended layout or interaction contract change.
- The serialized gate pack is closed and no longer part of routine maintainer closeout; this sprint did not touch serialized lineage or inventory identity work.

### Changes

- Routed category create/update form failures through `formatProductCoreMutationError`.
- Routed core product edit form failures through `formatProductCoreMutationError`.
- Routed image metadata edit form failures through `formatProductImageMutationError`.
- Added a source contract test for catalogue form error summaries.

### Standards Checked

- Domain ownership: catalogue form failure copy now uses products-owned core/image formatter policy instead of raw component fallback strings.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved. This sprint changes only component form failure presentation before the existing submit/hook/server flow.
- Query/cache policy: unchanged. Product, category, and image invalidation remains in existing hooks and parent submit handlers.
- Tenant isolation/data integrity: unchanged. No server query, tenant predicate, database write behavior, image storage behavior, inventory transaction, finance behavior, or serialized lineage behavior changed.
- UI states/error handling: strengthened. Catalogue form summaries no longer render raw thrown mutation messages.
- Reviewability: the diff is limited to three form components, one focused source contract, and this closeout note.

### Smells Removed

- Raw category save form summary/toast copy from thrown `error.message`.
- Raw core product edit form summary copy from thrown `error.message`.
- Raw image metadata edit form summary copy from thrown `err.message`.
- Missing source contract that catalogue form summaries stay behind products-owned safe copy.

### Deferred

- Product bundle, route-level import, image upload component state, bulk operation, and page action feedback remain separate product-domain slices.
- Browser QA was not run because this is mutation/form copy behavior with no intended layout change.

### Gates

- Passed: focused catalogue form/core/image error tests, `./node_modules/.bin/vitest run tests/unit/products/product-catalog-form-errors.test.ts tests/unit/products/product-core-mutation-errors.test.ts tests/unit/products/product-image-mutation-errors.test.ts` - 3 files, 7 tests.
- Passed: broader products suite, `./node_modules/.bin/vitest run tests/unit/products` - 11 files, 27 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Note: the broader products suite still emits the existing `--localstorage-file` jsdom warning and existing `useRouter` warning in `query-normalization-wave5b`; tests pass.
- Skipped: browser QA because this is form error-copy behavior with no intended route or visual layout change.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not deliberately change route casts, pending dialog guards, read-path query guard baselines, finance persistence, document generation, release packaging, production release paths, serialized lineage, or inventory identity contracts.

### Goal Adaptation

Declined. The standing maintainer goal already covers operator-safe errors, reviewable diffs, query/cache contracts, meaningful tests, and risk-selected evidence. Serialized gates remain retired as routine evidence for unrelated product catalogue feedback work.

### Residual Risk

Low for product catalogue form summaries. Remaining products-domain risk is concentrated in bundles, route-level import, image upload component state, bulk operations, and page action feedback.
