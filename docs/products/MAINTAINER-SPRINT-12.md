# Products Maintainer Sprint 12

## Status

Closed in commit-ready state.

## Issue 1: Product Detail Action Feedback Ownership

### Problem

The product detail container still emitted generic duplicate/delete success and failure toasts even though `useDuplicateProduct` and `useDeleteProduct` already own product-safe success/error feedback and cache invalidation. That created duplicate notifications and left generic component-level fallback copy in a detail workflow.

### Workflow Spine

Product detail action workflow
-> product detail container actions
-> product duplicate/delete hooks
-> product server functions
-> product schemas and database rows
-> centralized product query keys and invalidation
-> hook-owned product core mutation formatter
-> single operator-safe success/error notification path.

### Touched Domains

- Products detail container.
- Products detail action feedback tests.
- Products maintainer closeout docs.

### Business Value Protected

Product detail actions are common catalogue maintenance paths. Operators should get one clear success or failure notification when duplicating or deleting a battery SKU, not duplicate or generic component-level messages.

### Scope Constraints

- Do not change product duplicate/delete server behavior, hook mutation behavior, query keys, cache invalidation, detail view layout, dialog behavior, or navigation callbacks.
- Preserve container responsibility for follow-up navigation and dialog state.
- Keep hook-owned success/error toasts as the single notification path.
- Browser QA is skipped because this is action feedback ownership with no intended layout or route interaction change.
- The serialized gate pack is closed and no longer part of routine maintainer closeout; this sprint did not touch serialized lineage or inventory identity work.

### Changes

- Removed duplicate generic duplicate failure toast from the product detail container.
- Removed duplicate generic delete failure toast from the product detail container.
- Removed duplicate detail-container duplicate success toast.
- Removed duplicate detail-container delete success toast.
- Left follow-up `onDuplicate`, delete dialog close, and `onBack` behavior intact.
- Added a focused source contract that duplicate/delete action feedback stays hook-owned.

### Standards Checked

- Domain ownership: duplicate/delete success and error feedback now stays in product mutation hooks, where product core formatter policy and cache invalidation already live.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved. This sprint changes only container notification duplication around existing hook/server flow.
- Query/cache policy: unchanged. Product list/detail invalidation remains in the hooks.
- Tenant isolation/data integrity: unchanged. No server query, tenant predicate, database write behavior, inventory transaction, finance behavior, or serialized lineage behavior changed.
- UI states/error handling: strengthened. Detail actions now produce one hook-owned, safe notification path.
- Reviewability: the diff is limited to one detail container, one focused source contract, and this closeout note.

### Smells Removed

- Generic duplicate failure toast in the detail container.
- Generic delete failure toast in the detail container.
- Duplicate success toasts for duplicate/delete actions.
- Mixed notification ownership between container and product hooks.

### Deferred

- Product import result-row copy remains a possible future hardening slice.
- Product detail price update feedback was not changed because it is a local explicit price action outside duplicate/delete hook ownership.
- Browser QA was not run because this is notification ownership with no intended layout change.

### Gates

- Passed: focused product detail action and core mutation error tests, `./node_modules/.bin/vitest run tests/unit/products/product-detail-action-feedback.test.ts tests/unit/products/product-core-mutation-errors.test.ts` - 2 files, 4 tests.
- Passed: broader products suite, `./node_modules/.bin/vitest run tests/unit/products` - 17 files, 36 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Note: the broader products suite still emits the existing `--localstorage-file` jsdom warning and existing `useRouter` warning in `query-normalization-wave5b`; tests pass.
- Skipped: browser QA because this is action feedback ownership with no intended route or visual layout change.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not deliberately change route casts, pending dialog guards, read-path query guard baselines, finance persistence, document generation, release packaging, production release paths, serialized lineage, or inventory identity contracts.

### Goal Adaptation

Declined. The standing maintainer goal already covers operator-safe errors, honest UI states, domain ownership, reviewable diffs, query/cache contracts, meaningful tests, and risk-selected evidence. Serialized gates remain retired as routine evidence for unrelated product detail feedback work.

### Residual Risk

Low for product detail duplicate/delete feedback ownership. Remaining product-domain risk is import result-row copy, product detail price update feedback, and deeper data-integrity/runtime coverage outside this error-feedback series.
