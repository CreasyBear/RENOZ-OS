# Products Maintainer Sprint 10

## Status

Closed in commit-ready state.

## Issue 1: Product Import Feedback Error Copy

### Problem

The product import route and bulk import dialog still surfaced raw parse/import exception messages in operator-facing toasts and local error state. Import is an intake workflow for catalogue maintenance; parse-preview failures and actual import failures need safe, action-specific feedback without leaking database, stack, constraint, or parser internals.

### Workflow Spine

Product import workflow
-> products import route and bulk import dialog
-> parse import preview hook and import products hook
-> product bulk import server functions
-> product import schemas and database rows
-> centralized product query keys and invalidation
-> products-owned core mutation formatter
-> operator-safe parse preview and import failure feedback.

### Touched Domains

- Products import route.
- Products bulk import dialog.
- Products core mutation formatter.
- Products import feedback tests.
- Products maintainer closeout docs.

### Business Value Protected

CSV import helps RENOZ maintain and onboard battery SKUs quickly. Operators should get clear recovery copy when a file cannot be previewed or imported without seeing raw backend or parser details, and import failure notifications should not duplicate hook-owned toasts.

### Scope Constraints

- Do not change product import server behavior, CSV parsing semantics, schemas, query keys, cache invalidation, import result mapping, template generation, or UI layout.
- Reuse the product core formatter boundary and add only the missing parse-preview action.
- Keep hook-owned import toasts as the single actual-import failure notification path.
- Browser QA is skipped because this is toast/local error-copy behavior with no intended layout or route interaction change.
- The serialized gate pack is closed and no longer part of routine maintainer closeout; this sprint did not touch serialized lineage or inventory identity work.

### Changes

- Added a `parseImportProducts` product core formatter action for import preview failures.
- Routed route-level import preview failures through `formatProductCoreMutationError`.
- Removed route-level duplicate import failure toast; `useImportProducts` remains the hook-owned safe toast path.
- Routed bulk import dialog parse failures through `formatProductCoreMutationError`.
- Routed bulk import dialog actual import local error state through `formatProductCoreMutationError` without duplicating the hook toast.
- Added behavior and source-contract tests for product import feedback errors.

### Standards Checked

- Domain ownership: import feedback copy now uses product core formatter policy instead of route/dialog raw message handling.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved. This sprint changes only route/dialog failure presentation around existing parse/import hook flow.
- Query/cache policy: unchanged. Product list invalidation remains in `useImportProducts`.
- Tenant isolation/data integrity: unchanged. No server query, tenant predicate, database write behavior, import transaction behavior, inventory transaction, finance behavior, or serialized lineage behavior changed.
- UI states/error handling: strengthened. Import preview and import failures no longer expose raw thrown messages, and actual import failures no longer duplicate hook-owned toasts.
- Reviewability: the diff is limited to one formatter action, two import surfaces, one focused test file, and this closeout note.

### Smells Removed

- Raw route-level parse failure description from thrown `error.message`.
- Raw route-level import failure description from thrown `error.message`.
- Raw bulk import dialog parse failure state from thrown `err.message`.
- Raw bulk import dialog import failure state from thrown `err.message`.
- Duplicate route/dialog actual-import failure toasts on top of hook-owned safe toasts.

### Deferred

- Products page action feedback remains a separate product-domain slice.
- Bulk import result-row messages returned from the server were not audited in this toast/local-error slice.
- Browser QA was not run because this is failure-copy behavior with no intended layout change.

### Gates

- Passed: focused product import feedback and core mutation error tests, `./node_modules/.bin/vitest run tests/unit/products/product-import-feedback-errors.test.ts tests/unit/products/product-core-mutation-errors.test.ts` - 2 files, 5 tests.
- Passed: broader products suite, `./node_modules/.bin/vitest run tests/unit/products` - 15 files, 34 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Note: the broader products suite still emits the existing `--localstorage-file` jsdom warning and existing `useRouter` warning in `query-normalization-wave5b`; tests pass.
- Skipped: browser QA because this is toast/local error-copy behavior with no intended route or visual layout change.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not deliberately change route casts, pending dialog guards, read-path query guard baselines, finance persistence, document generation, release packaging, production release paths, serialized lineage, or inventory identity contracts.

### Goal Adaptation

Declined. The standing maintainer goal already covers operator-safe errors, honest UI states, reviewable diffs, query/cache contracts, meaningful tests, and risk-selected evidence. Serialized gates remain retired as routine evidence for unrelated product import feedback work.

### Residual Risk

Low for product import parse/import toast and local error feedback. Remaining products-domain risk is concentrated in products page action feedback and import result-row copy.
