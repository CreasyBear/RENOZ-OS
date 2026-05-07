# Products Maintainer Sprint 17: Product Image Upload Persistence

## Status

Closed in commit-ready state.

## Issue 1: Product Image Upload Registered Local Preview URLs

### Problem

`ImageUploader` claimed to upload to Supabase Storage, but the implementation simulated progress and registered `uploadFile.preview` as the product image URL. Preview/blob URLs are local browser artifacts, not durable catalogue assets. A product gallery could therefore persist an image record that cannot survive a browser session.

### Workflow Spine

Product detail images tab
-> `ImageUploader`
-> `useUploadProductImageFile`
-> `uploadProductImageFile`
-> Supabase Storage public object
-> product image metadata row
-> centralized product image query invalidation.

### Touched Domains

- Product catalogue image upload UI.
- Product image mutation hook.
- Product image server function and storage boundary.
- Product image upload contracts.

### Business Value Protected

RENOZ battery products need durable catalogue images for operators, sales, support, procurement, and product identification. Uploading a local preview URL creates false product truth; storing a real public storage URL keeps the catalogue dependable.

### Scope Constraints

- Do not change product detail routing, gallery rendering, image editor behavior, image list/read hooks, existing metadata-only `addProductImage`, product schemas, database table shape, cache key names, product CRUD, inventory, finance, or serialized lineage.
- Keep upload validation aligned with the existing image MIME and size limits.
- Keep storage deletion for removed product images as a separate slice.

### Changes

- Added `uploadProductImageFile` server function to upload image bytes to Supabase Storage and then create the product image metadata row.
- Extracted `createProductImageRecord` so metadata-only adds and file uploads use one product-image record contract.
- Added cleanup of the uploaded storage object if metadata creation fails.
- Added `useUploadProductImageFile` with product image list/stats/primary invalidation.
- Updated `ImageUploader` to read files as base64 and call the upload hook instead of registering preview URLs.
- Added focused source-contract coverage proving the mock/demo upload path is gone.

### Standards Checked

- Domain ownership: product image persistence now belongs to the products server function and products hook, not a UI-only preview URL.
- Route -> tab view -> uploader -> hook -> server function -> storage/database -> query key/cache policy: preserved and clarified.
- Query/cache policy: image list and stats invalidations are preserved; primary invalidation remains conditional on `setAsPrimary`.
- Tenant isolation/data integrity: server upload requires product update permission and records metadata under the authenticated organization; product existence and deleted-state checks remain organization-scoped.
- Storage integrity: storage upload happens before metadata insert, and failed metadata insert attempts remove the uploaded object.
- UI states/error handling: upload failures still use `formatProductImageMutationError(error, "add")` and per-file error state.
- Reviewability: one server upload path, one hook, one uploader call path, focused contracts, and this closeout.

### Smells Removed

- Mock upload progress pretending a durable upload occurred.
- Product image metadata records pointing at browser preview/blob URLs.
- Uploader comments describing production work that the code did not perform.

### Deferred

- Product image deletion still removes database records only; deleting backing storage objects should be a separate product image lifecycle slice.
- Upload progress is coarse because this server-function path sends the file payload to the server rather than using signed URL/XHR progress.
- Browser QA was not selected because this slice is covered by source contracts and server/hook type gates; a later authenticated product workflow QA pass should exercise actual storage configuration.

### Gates

- Passed: `bun run test:vitest tests/unit/products/product-image-upload-errors.test.ts tests/unit/products/product-image-mutation-errors.test.ts tests/unit/products/query-normalization-wave5b.test.tsx` - 3 files, 10 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted scan confirming the mock/demo preview upload path is gone from production code.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The standing maintainer goal already covers honest UI states, route-to-server ownership, cache contracts, durable business truth, and reviewable diffs. Serialized gates are retired and were not part of this closeout.

### Residual Risk

Medium until actual authenticated browser QA confirms the deployed Supabase `public` bucket policy accepts product image writes from the server function. Low for removing the fake preview-URL persistence path.
