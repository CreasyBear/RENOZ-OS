# Products Maintainer Sprint 11

## Status

Closed in commit-ready state.

## Issue 1: Products Page Action Feedback

### Problem

The products page used `executeBulkAction` without a product-owned formatter for page-level bulk status, category, and delete actions. That allowed per-row failure messages to fall back to raw thrown `error.message`. The page export button also caught `mutateAsync` failures and rendered a raw duplicate toast even though the export hook already owns safe product export failure copy.

### Workflow Spine

Products page action workflow
-> products page selected-row actions and export button
-> bulk action helper and product mutation/export hooks
-> product server functions
-> product schemas/database/export rows
-> centralized product query keys and invalidation
-> products-owned core mutation formatter
-> operator-safe bulk failure summaries and hook-owned export failure toast.

### Touched Domains

- Products page.
- Products page action error tests.
- Products maintainer closeout docs.

### Business Value Protected

Products page actions are high-frequency catalogue operations. Operators should be able to bulk update, bulk delete, and export battery SKUs without raw backend details appearing in alert summaries or duplicate export failure toasts.

### Scope Constraints

- Do not change product server behavior, selected-row behavior, confirmations, query invalidation, export download behavior, table behavior, filters, or UI layout.
- Reuse the existing product core formatter and hook-owned export toast policy.
- Keep this as products page action feedback only.
- Browser QA is skipped because this is failure-copy behavior with no intended layout or route interaction change.
- The serialized gate pack is closed and no longer part of routine maintainer closeout; this sprint did not touch serialized lineage or inventory identity work.

### Changes

- Added product core formatter handling to page-level bulk status updates.
- Added product core formatter handling to page-level bulk category updates.
- Added product core formatter handling to page-level bulk deletes.
- Removed raw duplicate export failure toast from the page export button; `useExportProducts` remains the hook-owned safe toast path.
- Added a focused source contract for products page action feedback.

### Standards Checked

- Domain ownership: products page action failure copy now uses product core formatter policy instead of `executeBulkAction` raw fallback or component-local raw export toast.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved. This sprint changes only page-level failure presentation around existing mutation/export flow.
- Query/cache policy: unchanged. Router invalidation and export hook behavior remain as before.
- Tenant isolation/data integrity: unchanged. No server query, tenant predicate, database write behavior, export generation behavior, inventory transaction, finance behavior, or serialized lineage behavior changed.
- UI states/error handling: strengthened. Bulk failure summaries now receive safe formatter messages, and export failures no longer duplicate hook-owned toasts.
- Reviewability: the diff is limited to one products page, one focused source contract, and this closeout note.

### Smells Removed

- Page-level bulk status failure summaries falling back to raw thrown messages.
- Page-level bulk category failure summaries falling back to raw thrown messages.
- Page-level bulk delete failure summaries falling back to raw thrown messages.
- Raw duplicate export failure toast from the products page export button.

### Deferred

- Product import result-row copy remains a possible future hardening slice.
- Shared `executeBulkAction` callers in other domains were not changed in this products-domain slice.
- Browser QA was not run because this is failure-copy behavior with no intended layout change.

### Gates

- Passed: focused products page action and core mutation error tests, `./node_modules/.bin/vitest run tests/unit/products/product-page-action-errors.test.ts tests/unit/products/product-core-mutation-errors.test.ts` - 2 files, 4 tests.
- Passed: broader products suite, `./node_modules/.bin/vitest run tests/unit/products` - 16 files, 35 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Note: the broader products suite still emits the existing `--localstorage-file` jsdom warning and existing `useRouter` warning in `query-normalization-wave5b`; tests pass.
- Skipped: browser QA because this is page action failure-copy behavior with no intended route or visual layout change.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not deliberately change route casts, pending dialog guards, read-path query guard baselines, finance persistence, document generation, release packaging, production release paths, serialized lineage, or inventory identity contracts.

### Goal Adaptation

Declined. The standing maintainer goal already covers operator-safe errors, honest UI states, reviewable diffs, query/cache contracts, meaningful tests, and risk-selected evidence. Serialized gates remain retired as routine evidence for unrelated products page feedback work.

### Residual Risk

Low for products page bulk/export action feedback. Remaining product-domain risk is import result-row copy and deeper data-integrity/runtime coverage outside this error-feedback series.
