# Products Maintainer Sprint 13

## Status

Closed in commit-ready state.

## Issue 1: Product Stock Adjustment Error State

### Problem

The product stock adjustment dialog still stored raw mutation `err.message` text in its local error state. The `useAdjustStock` hook already maps product inventory mutation failures through `mapProductInventoryMutationError`, so the dialog should use the same operator-safe policy for inline errors.

### Workflow Spine

Product stock adjustment workflow
-> product stock adjustment dialog
-> product inventory adjustment hook
-> product inventory server function
-> inventory schemas and stock database rows
-> centralized product inventory query keys and invalidation
-> product inventory mutation error mapper
-> operator-safe dialog error state and hook-owned toast copy.

### Touched Domains

- Products inventory stock adjustment dialog.
- Products hook barrel export.
- Products stock adjustment error tests.
- Products maintainer closeout docs.

### Business Value Protected

Stock adjustments affect catalogue-visible battery stock and operator trust in inventory counts. Inline dialog failures should use the same safe inventory error policy as the hook toast instead of exposing raw backend or validation internals.

### Scope Constraints

- Do not change product inventory server behavior, adjustment payloads, query keys, cache invalidation, location loading, dialog behavior, quantity math, inventory transaction behavior, finance behavior, or serialized lineage behavior.
- Reuse the existing product inventory mutation mapper.
- Keep this as local error-state feedback only.
- Browser QA is skipped because this is inline error-copy behavior with no intended layout or route interaction change.
- The serialized gate pack is closed and no longer part of routine maintainer closeout; this sprint did not touch serialized lineage or inventory identity work.

### Changes

- Exported `mapProductInventoryMutationError` from the products hook barrel.
- Routed stock adjustment dialog local error state through `mapProductInventoryMutationError`.
- Added a focused source contract that the stock adjustment dialog stays behind the product inventory mapper.

### Standards Checked

- Domain ownership: stock adjustment local error copy now uses product inventory mapper policy instead of component-local raw message handling.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved. This sprint changes only dialog failure presentation around existing adjustment hook/server flow.
- Query/cache policy: unchanged. Product detail, inventory, stats, alerts, and movement invalidation remain in the existing hook.
- Tenant isolation/data integrity: unchanged. No server query, tenant predicate, database write behavior, inventory transaction, finance behavior, or serialized lineage behavior changed.
- UI states/error handling: strengthened. Inline adjustment errors now match hook-owned safe failure copy.
- Reviewability: the diff is limited to one dialog, one hook barrel export, one focused source contract, and this closeout note.

### Smells Removed

- Raw stock adjustment dialog error state from `err.message`.
- Missing barrel export for the product inventory mutation mapper needed by product-domain components.
- Missing source contract that local stock adjustment failures stay behind the product inventory mapper.

### Deferred

- Product import result-row copy remains a possible future hardening slice.
- Product inventory adjustment server transaction/runtime behavior was not audited in this local error-state slice.
- Browser QA was not run because this is inline error-copy behavior with no intended layout change.

### Gates

- Passed: focused product stock adjustment and inventory mutation error tests, `./node_modules/.bin/vitest run tests/unit/products/product-stock-adjustment-errors.test.ts tests/unit/products/product-inventory-mutation-errors.test.ts` - 2 files, 4 tests.
- Passed: broader products suite, `./node_modules/.bin/vitest run tests/unit/products` - 18 files, 37 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Note: the broader products suite still emits the existing `--localstorage-file` jsdom warning and existing `useRouter` warning in `query-normalization-wave5b`; tests pass.
- Skipped: browser QA because this is inline error-copy behavior with no intended route or visual layout change.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not deliberately change route casts, pending dialog guards, read-path query guard baselines, finance persistence, document generation, release packaging, production release paths, serialized lineage, or inventory identity contracts.

### Goal Adaptation

Declined. The standing maintainer goal already covers operator-safe errors, honest UI states, domain ownership, reviewable diffs, query/cache contracts, meaningful tests, and risk-selected evidence. Serialized gates remain retired as routine evidence for unrelated product stock adjustment feedback work.

### Residual Risk

Low for product stock adjustment local error state. Remaining product-domain risk is import result-row copy and deeper product inventory runtime/data-integrity coverage outside this error-feedback slice.
