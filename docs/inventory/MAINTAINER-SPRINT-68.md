# Inventory Maintainer Sprint 68

This sprint follows Sprint 67's supplier price agreement creation result guard. The target is supplier pricing create tenant isolation: direct supplier pricing creates must verify the supplier belongs to the current organization before writing rows that reference it.

Status: Closed after Issue 1.

## Business Value

Supplier price lists and agreements drive procurement cost decisions. A pricing row in one tenant must not be able to point at a supplier from another tenant, even if a caller submits a valid supplier UUID. The server write boundary should enforce the same tenant ownership operators expect from the UI.

## Workflow Spine

supplier price-list create and supplier price agreement create
-> supplier tenant ownership validation
-> product resolution or agreement payload build
-> tenant-scoped insert/update
-> persisted row verification
-> supplier pricing query/cache policy
-> procurement pricing readiness.

## Architecture Constraints

- Keep this sprint to supplier ownership validation for direct supplier pricing create paths.
- Preserve price calculations, product resolution, existing-price detection, agreement defaults, result guards, audit metadata, query keys, cache behavior, response shapes, and UI behavior.
- Fix direct price-list create and price agreement create together because they share the same supplier pricing tenant-isolation invariant.
- Do not broaden into purchase-order supplier validation, price import resolution, agreement approval workflow, transaction redesign, live database fixtures, or UI changes.

## Issue Ledger

### 1. Pricing Create Paths Trusted Caller Supplier IDs

Problem:

- `createPriceList` stamped `organizationId: ctx.organizationId` but used `data.supplierId` without first proving that supplier belongs to the same organization.
- `createPriceAgreement` had the same supplier reference risk.
- The supplier table is tenant-scoped and soft-deletable, so create paths should reject missing, cross-tenant, or deleted suppliers before writing pricing rows.

Workflow protected:

supplier pricing create -> supplier tenant ownership validation -> tenant-scoped pricing write.

Implemented slice:

- Added a shared supplier ownership assertion in supplier pricing server functions.
- The assertion checks supplier id, current organization id, and `deletedAt IS NULL`.
- Wired the assertion before direct price-list create resolution/write.
- Wired the assertion before price agreement create insert.
- Added focused contract coverage for both create paths.

Out of scope:

- Changing purchase-order supplier validation.
- Changing supplier price import resolution, which already resolves supplier codes by organization.
- Changing agreement approval workflow.
- Adding live database fixtures.

Closeout:

- Touched domains: supplier pricing server function, supplier pricing tenant-scope contract tests, inventory sprint evidence.
- Workflow protected: supplier price-list create and supplier price agreement create -> supplier tenant ownership validation -> product resolution or agreement payload build -> tenant-scoped insert/update -> persisted row verification -> supplier pricing query/cache policy -> procurement pricing readiness.
- Business value protected: direct supplier pricing creates can no longer create current-tenant pricing rows that reference missing, deleted, or cross-tenant suppliers.
- Architecture standards checked: route/page/hook/cache behavior is unchanged; supplier pricing remains the domain owner; tenant ownership is enforced at the server mutation boundary before writes.
- Tenant isolation and data integrity checked: supplier lookup now requires `suppliers.id`, `suppliers.organizationId`, and `suppliers.deletedAt IS NULL`; existing price-list and agreement organization predicates are unchanged; no receiving, inventory, finance posting, approval, or serialized lineage behavior changed.
- Query/cache contract checked: no query keys, invalidation, stale times, optimistic updates, rollback behavior, or UI state contracts changed.
- Smells removed: direct supplier pricing create paths trusted caller-supplied supplier ids without tenant ownership validation.
- Smells deferred: live seeded fixtures for cross-tenant supplier rejection; purchase-order supplier validation audit; agreement approval workflow audit review; transaction design for broader supplier pricing workflows.
- Gates run: focused supplier pricing tests (`5` files, `7` tests); focused ESLint; supplier + purchase-order unit suites (`36` files, `106` tests); TypeScript.
- Gates skipped: browser QA, because this was a server tenant-isolation mutation change with no UI interaction change.
- Goal adaptations: declined. The standing maintainer goal already covers tenant isolation, safe mutation contracts, data integrity, meaningful tests, and evidence-based closeout.
- Residual risk: source-level contract coverage protects the tenant-scope check placement; live database fixtures would provide stronger proof for real cross-tenant and soft-deleted supplier rejection.
