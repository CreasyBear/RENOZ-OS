# Inventory Maintainer Sprint 69

This sprint follows Sprint 68's supplier pricing create tenant isolation. The target is purchase-order create supplier tenant isolation: purchase order creation should reject missing, deleted, or cross-tenant suppliers before opening the write transaction.

Status: Closed after Issue 1.

## Business Value

Purchase orders commit procurement intent. A purchase order in one tenant must not reference a supplier from another tenant, and operators should get a clear supplier-not-found error before any purchase-order write begins.

## Workflow Spine

purchase-order create
-> supplier tenant ownership validation
-> line total calculation
-> date validation
-> transactional purchase-order and item insert
-> activity logging
-> purchase-order query/cache policy
-> procurement readiness.

## Architecture Constraints

- Keep this sprint to supplier tenant validation on purchase-order creation.
- Preserve item total calculations, date validation, transaction behavior, RLS context setting, audit metadata, activity logging shape, query keys, cache behavior, response shape, and UI behavior.
- Do not broaden into purchase-order update flows, supplier pricing, receiving, approval workflow, transaction redesign, live database fixtures, or UI changes.

## Issue Ledger

### 1. Purchase-Order Creation Looked Up Supplier But Did Not Enforce It

Problem:

- `createPurchaseOrder` queried the supplier by id, organization id, and `deletedAt IS NULL`.
- If that lookup returned no row, the function still proceeded to calculate totals and enter the create transaction.
- Activity logging used `supplier?.name`, masking the missing supplier case instead of treating it as a tenant-scope failure.

Workflow protected:

purchase-order create -> supplier tenant ownership validation -> transactional purchase-order and item insert.

Implemented slice:

- Added a `NotFoundError` when the tenant-scoped supplier lookup returns no row.
- Moved the failure before line total calculation and the transaction.
- Changed activity metadata to use `supplier.name` after the guard.
- Added focused contract coverage proving the tenant-scoped lookup is enforced before the transaction and no optional supplier name remains.

Out of scope:

- Changing purchase-order update supplier behavior.
- Changing supplier pricing validations.
- Changing receiving or approval workflows.
- Adding live database fixtures.

Closeout:

- Touched domains: purchase-order server function, purchase-order tenant-scope contract tests, inventory sprint evidence.
- Workflow protected: purchase-order create -> supplier tenant ownership validation -> line total calculation -> date validation -> transactional purchase-order and item insert -> activity logging -> purchase-order query/cache policy -> procurement readiness.
- Business value protected: purchase-order creation can no longer proceed with a missing, deleted, or cross-tenant supplier reference.
- Architecture standards checked: route/page/hook/cache behavior is unchanged; purchase orders remain the workflow owner; tenant ownership is enforced at the server mutation boundary before transactional writes.
- Tenant isolation and data integrity checked: supplier lookup already required `suppliers.id`, `suppliers.organizationId`, and `suppliers.deletedAt IS NULL`; this sprint made that lookup mandatory before writes; no pricing, receiving, finance posting, approval, or serialized lineage behavior changed.
- Query/cache contract checked: no query keys, invalidation, stale times, optimistic updates, rollback behavior, or UI state contracts changed.
- Smells removed: purchase-order create treated missing tenant-scoped supplier as optional logging metadata instead of a hard write-boundary invariant.
- Smells deferred: live seeded fixtures for cross-tenant supplier rejection; purchase-order update supplier audit; approval workflow audit review; transaction design for broader procurement workflows.
- Gates run: focused purchase-order tests (`4` files, `6` tests); focused ESLint; supplier + purchase-order unit suites (`37` files, `107` tests); TypeScript.
- Gates skipped: browser QA, because this was a server tenant-isolation mutation change with no UI interaction change.
- Goal adaptations: declined. The standing maintainer goal already covers tenant isolation, safe mutation contracts, data integrity, meaningful tests, and evidence-based closeout.
- Residual risk: source-level contract coverage protects the guard placement; live database fixtures would provide stronger proof for real cross-tenant and soft-deleted supplier rejection.
