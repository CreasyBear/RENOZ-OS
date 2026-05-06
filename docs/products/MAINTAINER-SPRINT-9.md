# Products Maintainer Sprint 9

## Status

Closed in commit-ready state.

## Issue 1: Product Bulk Operation Error State

### Problem

Product bulk operations still stored raw thrown mutation messages in local dialog error state for bulk status updates, price adjustments, deletes, and exports. The hooks already emit safe product-owned toast copy, so the component also produced duplicate toasts on failure.

### Workflow Spine

Product bulk operation workflow
-> selected products bulk action bar and confirmation dialogs
-> product bulk mutation hooks
-> product bulk server functions
-> product schemas and database/export rows
-> centralized product query keys and invalidation
-> products-owned core mutation formatter
-> operator-safe local dialog error state and hook-owned toast copy.

### Touched Domains

- Products bulk operations component.
- Products bulk operation error tests.
- Products maintainer closeout docs.

### Business Value Protected

Bulk operations are high-leverage catalogue maintenance paths. Operators should be able to update many battery SKUs, adjust prices, delete selected records, or export products without seeing backend details or duplicate failure notifications.

### Scope Constraints

- Do not change product bulk server behavior, schemas, query keys, cache invalidation, selection behavior, confirmation flows, export download behavior, or UI layout.
- Reuse the existing product core formatter and hook-owned toast policy.
- Keep this as bulk operation local error state and duplicate-toast cleanup only.
- Browser QA is skipped because this is mutation/form copy behavior with no intended layout or route interaction change.
- The serialized gate pack is closed and no longer part of routine maintainer closeout; this sprint did not touch serialized lineage or inventory identity work.

### Changes

- Routed bulk status update local error state through `formatProductCoreMutationError`.
- Routed bulk price adjustment local error state through `formatProductCoreMutationError`.
- Routed bulk delete local error state through `formatProductCoreMutationError`.
- Routed bulk export local error state through `formatProductCoreMutationError`.
- Removed component-level duplicate failure toasts; hook-level product-owned toasts remain.
- Added a focused source contract for product bulk operation error handling.

### Standards Checked

- Domain ownership: bulk operation local error copy now uses product core formatter policy instead of component-local raw message handling.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved. This sprint changes only component failure presentation around existing hook/server flow.
- Query/cache policy: unchanged. Product bulk invalidation remains in existing hooks.
- Tenant isolation/data integrity: unchanged. No server query, tenant predicate, database write behavior, export generation behavior, inventory transaction, finance behavior, or serialized lineage behavior changed.
- UI states/error handling: strengthened. Bulk dialogs show safe local error copy and no longer produce duplicate failure toasts.
- Reviewability: the diff is limited to one bulk operations component, one focused source contract, and this closeout note.

### Smells Removed

- Raw bulk status update error state from thrown `err.message`.
- Raw bulk price adjustment error state from thrown `err.message`.
- Raw bulk delete error state from thrown `err.message`.
- Raw bulk export error state from thrown `err.message`.
- Duplicate component-level failure toasts on top of hook-owned toasts.

### Deferred

- Product route-level import and page action feedback remain separate product-domain slices.
- Bulk server transaction and export payload semantics were not audited in this error-state slice.
- Browser QA was not run because this is mutation/form copy behavior with no intended layout change.

### Gates

- Passed: focused product bulk operation and core mutation error tests, `./node_modules/.bin/vitest run tests/unit/products/product-bulk-operation-errors.test.ts tests/unit/products/product-core-mutation-errors.test.ts` - 2 files, 4 tests.
- Passed: broader products suite, `./node_modules/.bin/vitest run tests/unit/products` - 14 files, 32 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Note: the broader products suite still emits the existing `--localstorage-file` jsdom warning and existing `useRouter` warning in `query-normalization-wave5b`; tests pass.
- Skipped: browser QA because this is mutation/form copy behavior with no intended route or visual layout change.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not deliberately change route casts, pending dialog guards, read-path query guard baselines, finance persistence, document generation, release packaging, production release paths, serialized lineage, or inventory identity contracts.

### Goal Adaptation

Declined. The standing maintainer goal already covers operator-safe errors, honest UI states, reviewable diffs, query/cache contracts, meaningful tests, and risk-selected evidence. Serialized gates remain retired as routine evidence for unrelated product bulk feedback work.

### Residual Risk

Low for product bulk operation local failure state. Remaining products-domain risk is concentrated in route-level import and products page action feedback.
