# Jobs Maintainer Sprint 31: Material Product Read Scope

## Status

Closed in commit-ready state.

## Issue 1: Job Material Reads Could Join Product Records by ID Only

### Problem

`listJobMaterials` and `getJobMaterial` scoped the material rows to the active organization, but their product joins only matched `job_materials.product_id = products.id`. The single-material read also performed its final select by material ID only after a verifier. That left product scoping implicit and made the read path harder to reason about.

### Workflow Spine

Jobs material UI
-> material query hook
-> `listJobMaterials` / `getJobMaterial`
-> `job_materials`
-> active `products`
-> material response.

### Touched Domains

- Jobs material server functions.
- Jobs material product-scope contract tests.
- Jobs maintainer closeout docs.

### Business Value Protected

The BOM view should never expose another tenant's product details or a soft-deleted product through a loose relation join. Operators need material rows to stay readable while product metadata remains scoped to active products in the current workspace.

### Scope Constraints

- Do not change material response shape.
- Do not change hooks, query keys, cache invalidation, or UI.
- Do not rewrite Jobs material mutation flow.
- Keep actual Inventory reservation work deferred to the Inventory domain.

### Changes

- Added a shared `jobMaterialProductJoinCondition`.
- Scoped product joins by material organization and excluded soft-deleted products.
- Scoped `getJobMaterial`'s final select by authenticated organization.
- Added a defensive `NotFoundError` if the post-verification material read returns no row.
- Added `isNull(products.deletedAt)` to product lookups used for update/remove/install activity logging.
- Added a focused source contract for product join and material lookup scope.

### Standards Checked

- Domain ownership: Jobs owns BOM reads; Products metadata is only joined through active tenant-scoped rows.
- Route/container/page -> hook -> server function -> schema/database -> query key/cache policy: server read boundary hardened; hook/cache behavior unchanged.
- Tenant isolation/data integrity: material rows and joined product data both stay under active organization scope.
- Transactional inventory/finance integrity: no stock, finance, or reservation mutations changed.
- UI states/error handling: deleted or inaccessible product metadata now degrades through existing nullable response fields; missing material rows fail with `NotFoundError`.
- Reviewability: one server file, one focused contract, one closeout note.

### Smells Removed

- Product joins by ID only in Jobs material reads.
- Single-material final read that relied on a prior verifier instead of carrying org scope into the query.
- Activity-log product lookups that did not exclude soft-deleted products.

### Deferred

- Actual Jobs -> Inventory reservation creation remains a separate cross-domain slice.
- Broader Jobs Project priority/default cleanup remains a candidate sprint if it proves to be fake operator state rather than intentional project defaults.
- Browser QA was not selected because this is a server read-scope hardening slice with no intended layout change.

### Gates

- Passed: focused Jobs material product-scope contract.
- Passed: focused ESLint on touched Jobs material files.
- Passed: `bun run typecheck`.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. Routine closeout evidence no longer references retired serialized gates unless a sprint directly changes serialized lineage behavior.

### Residual Risk

Low. Existing materials with deleted products still return their material rows, but product display fields may be blank/null through the existing response contract.
