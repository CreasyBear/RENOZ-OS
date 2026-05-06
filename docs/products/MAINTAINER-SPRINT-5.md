# Products Maintainer Sprint 5

## Status

Closed in commit-ready state.

## Issue 1: Product Attribute Mutation Error Copy

### Problem

Product attribute definition and value workflows still rendered raw thrown mutation messages in component toasts and form summaries. Product attributes carry catalogue metadata such as battery capacity, specifications, filters, and required publishing details; failures should give operators safe recovery copy without leaking database, constraint, stack, or provider wording.

### Workflow Spine

Product attribute workflow
-> product attributes tab/container and attribute definition admin component
-> attribute form dialogs and value editor
-> product attribute hooks
-> product attribute server functions
-> product attribute schemas and database rows
-> centralized product attribute query keys and invalidation
-> products-owned mutation formatter
-> operator-safe attribute toast and form summary copy.

### Touched Domains

- Products attribute components.
- Products attributes tab container.
- Products mutation formatter and hook barrel.
- Products attribute mutation error tests.
- Products maintainer closeout docs.

### Business Value Protected

Attribute metadata makes battery SKUs easier to classify, search, filter, quote, support, and publish. Operators should understand failed attribute changes without seeing implementation details or stale form failures from a previous attempt.

### Scope Constraints

- Do not change product attribute server behavior, schemas, validation rules, query keys, cache invalidation, table layout, or form field behavior.
- Keep this as product attribute mutation error copy and stale mutation-state cleanup only.
- Browser QA is skipped because this is toast/form error-copy behavior with no intended layout or interaction contract change.
- The serialized gate pack is closed and no longer part of routine maintainer closeout; this sprint did not touch serialized lineage or inventory identity work.

### Changes

- Added `formatProductAttributeMutationError` with attribute-specific action fallbacks and code-message policy.
- Exported the attribute formatter and action type from the products hook barrel.
- Routed attribute definition create/update/delete/toggle failures through the safe formatter.
- Routed product attribute value set/delete failures through the safe formatter.
- Reset stale create/update attribute definition mutation errors when opening the definition form.
- Added behavior and source-contract tests for product attribute mutation errors.

### Standards Checked

- Domain ownership: attribute mutation copy now lives in the products formatter boundary instead of ad hoc attribute component literals.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved. This sprint changes only component-level failure presentation and formatter exports before the existing hook/server flow.
- Query/cache policy: unchanged. Attribute invalidation remains in the existing product attribute hooks.
- Tenant isolation/data integrity: unchanged. No server query, tenant predicate, database write behavior, inventory transaction, finance behavior, or serialized lineage behavior changed.
- UI states/error handling: strengthened. Attribute workflows no longer expose raw thrown mutation messages and the definition form no longer reopens with stale submit failures.
- Reviewability: the diff is limited to one formatter extension, one barrel export update, three attribute surfaces, one focused test file, and this closeout note.

### Smells Removed

- Raw attribute definition create/update/delete/toggle failure copy from thrown `error.message`.
- Raw product attribute value set/delete failure copy from thrown `error.message`.
- Raw attribute form summary fallback from mutation `error?.message`.
- Missing source contract that attribute mutation UI stays behind products-owned safe copy.

### Deferred

- Product bundle, category editor, route-level import, image upload component state, bulk operation, and page action feedback remain separate product-domain slices.
- Browser QA was not run because this is mutation/form copy behavior with no intended layout change.

### Gates

- Passed: focused product attribute mutation error tests, `./node_modules/.bin/vitest run tests/unit/products/product-attribute-mutation-errors.test.ts` - 1 file, 3 tests.
- Passed: broader products suite, `./node_modules/.bin/vitest run tests/unit/products` - 10 files, 26 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Note: the broader products suite still emits the existing `--localstorage-file` jsdom warning and existing `useRouter` warning in `query-normalization-wave5b`; tests pass.
- Skipped: browser QA because this is form/toast error-copy behavior with no intended route or visual layout change.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not deliberately change route casts, pending dialog guards, read-path query guard baselines, finance persistence, document generation, release packaging, production release paths, serialized lineage, or inventory identity contracts.

### Goal Adaptation

Adapted execution, not objective. Serialized gates remain retired as routine evidence; this sprint used focused product-domain evidence because no serialized lineage or inventory identity contract was touched.

### Residual Risk

Low for product attribute mutation feedback. Remaining products-domain risk is concentrated in bundles, category editor, route-level import, image upload component state, bulk operations, and page action feedback.
