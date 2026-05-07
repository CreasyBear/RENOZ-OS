# Products Maintainer Sprint 18: Product Image Storage Cleanup

## Status

Closed in commit-ready state.

## Issue 1: Product Image Deletion Left Storage Objects Behind

### Problem

Sprint 17 made product image uploads persist real Supabase Storage URLs, but delete and bulk-delete still removed only `product_images` rows. That kept the operator-facing gallery clean while leaving backing product image objects orphaned in storage.

### Workflow Spine

Product detail images tab
-> image delete or bulk delete mutation
-> product image server function
-> product image metadata transaction and primary reassignment
-> Supabase Storage cleanup for RENOZ-owned public objects
-> product image query invalidation.

### Touched Domains

- Product catalogue image deletion.
- Product image storage lifecycle.
- Product image lifecycle contract tests.

### Business Value Protected

Product images are catalogue assets for battery products, support, sales, and procurement. Deleting an image should remove the durable asset when RENOZ owns it, not only hide the DB reference and accumulate storage debris.

### Scope Constraints

- Do not change upload behavior, gallery rendering, image editor behavior, query keys, hook invalidation, metadata schema, primary reassignment semantics, product CRUD, inventory, finance, or serialized lineage.
- Do not delete external image URLs or unknown storage URLs.
- Keep storage cleanup best-effort after the database delete succeeds so a storage API outage does not undo an operator's gallery delete action.

### Changes

- Added `removeProductImageStorageObjects` to remove only RENOZ-owned public Supabase Storage objects.
- Wired single image delete to remove the deleted image's backing object after the metadata transaction succeeds.
- Wired bulk delete to remove all deleted backing objects after the metadata transaction succeeds.
- Reused existing storage URL utilities so external URLs are ignored.
- Added a focused lifecycle contract test for single and bulk delete storage cleanup.

### Standards Checked

- Domain ownership: product image storage cleanup lives in the products server function beside product image metadata lifecycle.
- Route -> images tab -> hook -> server function -> database/storage -> query key/cache policy: preserved and clarified.
- Query/cache policy: unchanged; existing mutation invalidations remain in product image hooks.
- Tenant isolation/data integrity: metadata deletes remain organization-scoped; storage cleanup only removes URLs that match the configured Supabase storage base and public bucket path.
- Storage integrity: cleanup runs only after successful DB deletion and logs cleanup failures without exposing raw storage errors to operators.
- UI states/error handling: unchanged safe mutation feedback through existing image mutation formatter.
- Reviewability: one helper, two delete call sites, one focused source contract, and this closeout.

### Smells Removed

- Product image deletion note claiming storage deletion should be handled elsewhere.
- Orphaned RENOZ-owned product image objects after single image deletion.
- Orphaned RENOZ-owned product image objects after bulk image deletion.

### Deferred

- Runtime browser/storage QA remains deferred until an authenticated product-image flow can be exercised against configured Supabase storage.
- Historical orphan cleanup for files deleted before this sprint remains separate maintenance work.
- The existing `wassPrimary` response typo remains unchanged to avoid widening the API surface in this storage lifecycle slice.

### Gates

- Passed: `bun run test:vitest tests/unit/products/product-image-storage-lifecycle.test.ts tests/unit/products/product-image-upload-errors.test.ts tests/unit/products/product-image-mutation-errors.test.ts tests/unit/products/query-normalization-wave5b.test.tsx` - 4 files, 11 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted storage lifecycle scan for delete cleanup wiring and removed old delete note.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. This is a direct application of the standing maintainer goal: close a product lifecycle gap with domain-owned storage/database contracts and reviewable evidence. Serialized gates are retired and were not part of this closeout.

### Residual Risk

Low for future product image delete lifecycle in code. Medium operationally until browser/storage-policy QA confirms object removal succeeds in the deployed Supabase environment and a historical orphan cleanup is considered.
