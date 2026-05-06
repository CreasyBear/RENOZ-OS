# Products Maintainer Sprint 7

## Status

Closed in commit-ready state.

## Issue 1: Product Image Upload Failure State

### Problem

The product image uploader still rendered raw upload mutation messages in both toast copy and per-file error state. It also decided whether to call `onUploadComplete` from stale pre-upload file state, which meant a failed upload batch could still report completion to the surrounding gallery workflow.

### Workflow Spine

Product image upload workflow
-> product image uploader component
-> add product image mutation hook
-> product image server function and storage metadata registration
-> product image schemas and database/storage records
-> centralized product image query keys and invalidation
-> products-owned image mutation formatter
-> honest batch completion and operator-safe per-file failure state.

### Touched Domains

- Products image uploader.
- Products image upload error tests.
- Products maintainer closeout docs.

### Business Value Protected

Battery SKU imagery supports product identification, sales quoting, support triage, and catalogue hygiene. Operators should not see raw storage/database failure details, and a failed upload should not advance the gallery as if every image succeeded.

### Scope Constraints

- Do not change product image server behavior, storage integration, schemas, query keys, cache invalidation, file validation rules, preview rendering, or layout.
- Reuse the existing product image formatter boundary.
- Keep this as image upload failure state and completion semantics only.
- Browser QA is skipped because this is failure-path copy/completion logic with no intended layout change.
- The serialized gate pack is closed and no longer part of routine maintainer closeout; this sprint did not touch serialized lineage or inventory identity work.

### Changes

- Routed upload failure toast copy through `formatProductImageMutationError`.
- Routed per-file upload error state through the same safe formatter output.
- Changed batch completion to use each `uploadFile` result instead of stale pre-upload `files` state.
- Added a focused source contract for safe upload errors and honest batch completion.

### Standards Checked

- Domain ownership: upload failure copy now uses products-owned image formatter policy instead of component-local raw fallback strings.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved. This sprint changes only component failure presentation and completion control around the existing add-image mutation hook.
- Query/cache policy: unchanged. Image invalidation remains in the existing hook.
- Tenant isolation/data integrity: unchanged. No server query, tenant predicate, database write behavior, storage persistence behavior, inventory transaction, finance behavior, or serialized lineage behavior changed.
- UI states/error handling: strengthened. Failed uploads show safe per-file copy and no longer trigger batch completion.
- Reviewability: the diff is limited to one image uploader component, one focused source contract, and this closeout note.

### Smells Removed

- Raw image upload failure copy from thrown `error.message`.
- Per-file upload error state storing raw thrown messages.
- Stale batch completion check that could call `onUploadComplete` after failed uploads.

### Deferred

- Product bundle, route-level import, bulk operation, and page action feedback remain separate product-domain slices.
- The uploader still contains the existing mock/local preview storage note; replacing it with real storage behavior is a separate implementation slice.
- Browser QA was not run because this is mutation/failure control behavior with no intended layout change.

### Gates

- Passed: focused product image upload and image mutation error tests, `./node_modules/.bin/vitest run tests/unit/products/product-image-upload-errors.test.ts tests/unit/products/product-image-mutation-errors.test.ts` - 2 files, 4 tests.
- Passed: broader products suite, `./node_modules/.bin/vitest run tests/unit/products` - 12 files, 28 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Note: the broader products suite still emits the existing `--localstorage-file` jsdom warning and existing `useRouter` warning in `query-normalization-wave5b`; tests pass.
- Skipped: browser QA because this is failure-path copy/completion logic with no intended route or visual layout change.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not deliberately change route casts, pending dialog guards, read-path query guard baselines, finance persistence, document generation, release packaging, production release paths, serialized lineage, or inventory identity contracts.

### Goal Adaptation

Declined. The standing maintainer goal already covers honest UI states, operator-safe errors, reviewable diffs, meaningful tests, and risk-selected evidence. Serialized gates remain retired as routine evidence for unrelated product image upload feedback work.

### Residual Risk

Low for image upload failure feedback and completion semantics. Remaining products-domain risk is concentrated in bundles, route-level import, bulk operations, and page action feedback.
