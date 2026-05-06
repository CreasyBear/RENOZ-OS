# Products Maintainer Sprint 4

## Status

Closed in commit-ready state.

## Issue 1: Product Pricing Form Error Summaries

### Problem

Product pricing hooks already route mutation toasts through products-owned safe formatter copy, but the pricing form dialogs still rendered raw mutation `error.message` values in their submit summaries. That left volume tier and customer-specific pricing dialogs able to expose database, constraint, stack, or provider wording inside the form after a failed submit.

### Workflow Spine

Product pricing edit workflow
-> product pricing tab components
-> pricing form dialogs
-> product pricing mutation hooks
-> product pricing server functions
-> product pricing schemas and database rows
-> centralized product pricing query keys and invalidation
-> products-owned mutation formatter
-> operator-safe pricing form summary copy.

### Touched Domains

- Products pricing components.
- Products hook barrel formatter contract.
- Products pricing component error tests.
- Products maintainer closeout docs.

### Business Value Protected

Pricing controls affect sales quotes, customer-specific commercial terms, bulk battery pricing, and margin discipline. Operators need clear recovery copy when a price tier or customer override fails, without exposing implementation details or carrying stale failure text into a new pricing attempt.

### Scope Constraints

- Do not change product pricing server behavior, schemas, query keys, cache invalidation, success toasts, read queries, table layout, validation rules, or price math.
- Keep this as product pricing form error copy and stale mutation-state cleanup only.
- Browser QA is skipped because this is form error-copy behavior with no intended visual layout or interaction contract change.
- The serialized gate pack is closed and no longer part of routine maintainer closeout; this sprint did not touch serialized lineage or inventory identity work.

### Changes

- Routed volume pricing create/update form summaries through `formatProductPricingMutationError`.
- Routed customer-specific pricing form summaries through `formatProductPricingMutationError`.
- Reset stale pricing mutation errors when opening volume tier and customer pricing dialogs.
- Added a source contract test for pricing component form summaries and mutation reset behavior.

### Standards Checked

- Domain ownership: pricing form error copy now stays in the products hook/formatter boundary instead of component-level raw message rendering.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved. This sprint changes only component-level failure presentation before the existing hook/server flow.
- Query/cache policy: unchanged. Pricing invalidation remains in the existing product pricing hooks.
- Tenant isolation/data integrity: unchanged. No server query, tenant predicate, database write, inventory transaction, finance behavior, or serialized lineage behavior changed.
- UI states/error handling: strengthened. Pricing dialogs no longer expose raw mutation messages and no longer reopen with stale previous submit errors.
- Reviewability: the diff is limited to two pricing components, one focused source contract, and this closeout note.

### Smells Removed

- Raw pricing dialog submit summaries from `mutation.error?.message`.
- Stale failed-submit summaries persisting into the next pricing dialog open.
- Missing source contract that component-level pricing form summaries stay behind safe products-owned copy.

### Deferred

- Product bundle, attribute, route-level import, image upload component state, and page action feedback remain separate product-domain slices.
- Browser QA was not run because this is mutation/form copy behavior with no intended layout change.

### Gates

- Passed: focused product pricing component and mutation error tests, `./node_modules/.bin/vitest run tests/unit/products/product-pricing-component-errors.test.ts tests/unit/products/product-pricing-mutation-errors.test.ts` - 2 files, 4 tests.
- Passed: broader products suite, `./node_modules/.bin/vitest run tests/unit/products` - 9 files, 23 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Note: the broader products suite still emits the existing `--localstorage-file` jsdom warning and existing `useRouter` warning in `query-normalization-wave5b`; tests pass.
- Skipped: browser QA because this is form error-copy behavior with no intended route or visual layout change.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not deliberately change route casts, pending dialog guards, read-path query guard baselines, finance persistence, document generation, release packaging, production release paths, serialized lineage, or inventory identity contracts.

### Goal Adaptation

Adapted execution, not objective. Serialized gates are retired as routine evidence; this sprint used focused product-domain evidence because no serialized lineage or inventory identity contract was touched.

### Residual Risk

Low for product pricing form summaries. Remaining products-domain risk is concentrated in bundles, attributes, route-level import, image upload component state, and page action feedback.
