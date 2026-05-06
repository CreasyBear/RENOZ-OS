# Products Maintainer Sprint 8

## Status

Closed in commit-ready state.

## Issue 1: Product Bundle Mutation Error Copy

### Problem

Product bundle workflows still used generic bundle hook failure toasts and raw thrown messages in the bundle creator form. Bundle creation is a two-step workflow: create a bundle product, then persist component rows. Operators need safe, action-specific recovery copy for both steps without leaking database, constraint, stack, or provider wording.

### Workflow Spine

Product bundle workflow
-> bundle creator and bundle component UI
-> product core create mutation and bundle component mutation hooks
-> product and product-bundle server functions
-> product and bundle schemas/database rows
-> centralized product bundle query keys and invalidation
-> products-owned core/bundle mutation formatters
-> operator-safe bundle toast and form summary copy.

### Touched Domains

- Products bundle creator.
- Products bundle mutation hooks.
- Products mutation formatter and hook barrel.
- Products bundle mutation error tests.
- Products maintainer closeout docs.

### Business Value Protected

Bundles support battery kits, accessories, starter packs, and grouped sales workflows. Bundle component failures should not leave operators guessing which stage failed or expose raw backend details while configuring products for sale and fulfillment.

### Scope Constraints

- Do not change product bundle server behavior, schemas, query keys, cache invalidation, component selection, pricing math, dialog steps, or UI layout.
- Preserve the existing create-product-then-set-components workflow.
- Reuse the existing product core formatter for bundle product creation and add a bundle-specific formatter for component rows.
- Browser QA is skipped because this is mutation/form copy behavior with no intended layout or route interaction change.
- The serialized gate pack is closed and no longer part of routine maintainer closeout; this sprint did not touch serialized lineage or inventory identity work.

### Changes

- Added `formatProductBundleMutationError` with bundle-specific action fallbacks and code-message policy.
- Exported the bundle formatter and action type from the products hook barrel.
- Routed bundle component add/update/remove/set hook failures through the safe bundle formatter.
- Routed bundle creator component-stage failures through the bundle formatter and product-creation failures through the core formatter.
- Routed bundle creator form summary fallback through safe formatter output instead of raw mutation messages.
- Reset stale bundle creator mutations when closing the dialog.
- Added behavior and source-contract tests for product bundle mutation errors.

### Standards Checked

- Domain ownership: bundle component mutation copy now lives in the products formatter boundary instead of generic hook literals or component-local raw messages.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved. This sprint changes only mutation failure presentation and stale mutation reset around the existing product/bundle server flow.
- Query/cache policy: unchanged. Bundle component, price, and validation invalidation remain in the existing bundle hooks.
- Tenant isolation/data integrity: unchanged. No server query, tenant predicate, database write behavior, inventory transaction, finance behavior, or serialized lineage behavior changed.
- UI states/error handling: strengthened. Bundle creator form summaries now identify safe product-creation versus component-update failures and no longer reopen with stale mutation errors.
- Reviewability: the diff is limited to one formatter extension, one barrel export update, bundle hooks, bundle creator, one focused test file, and this closeout note.

### Smells Removed

- Generic bundle hook failure literals disconnected from central product error policy.
- Raw bundle creator failure copy from thrown `error.message`.
- Raw bundle creator form summary fallback from mutation `error?.message`.
- Stale bundle creator mutation errors persisting after close.
- Missing source contract that bundle mutation UI stays behind products-owned safe copy.

### Deferred

- Product route-level import, bulk operations, and page action feedback remain separate product-domain slices.
- Bundle read-model tenant/data integrity and component selection UX were not audited in this error-copy slice.
- Browser QA was not run because this is mutation/form copy behavior with no intended layout change.

### Gates

- Passed: focused product bundle and core mutation error tests, `./node_modules/.bin/vitest run tests/unit/products/product-bundle-mutation-errors.test.ts tests/unit/products/product-core-mutation-errors.test.ts` - 2 files, 6 tests.
- Passed: broader products suite, `./node_modules/.bin/vitest run tests/unit/products` - 13 files, 31 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Note: the broader products suite still emits the existing `--localstorage-file` jsdom warning and existing `useRouter` warning in `query-normalization-wave5b`; tests pass.
- Skipped: browser QA because this is mutation/form copy behavior with no intended route or visual layout change.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not deliberately change route casts, pending dialog guards, read-path query guard baselines, finance persistence, document generation, release packaging, production release paths, serialized lineage, or inventory identity contracts.

### Goal Adaptation

Declined. The standing maintainer goal already covers domain ownership, operator-safe errors, query/cache contracts, meaningful tests, reviewable diffs, and risk-selected evidence. Serialized gates remain retired as routine evidence for unrelated product bundle feedback work.

### Residual Risk

Low for bundle mutation feedback. Remaining products-domain risk is concentrated in route-level import, bulk operations, and page action feedback.
