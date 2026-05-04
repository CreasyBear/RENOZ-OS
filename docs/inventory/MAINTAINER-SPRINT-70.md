# Inventory Maintainer Sprint 70

This sprint follows Sprint 69's purchase-order create supplier tenant isolation. The target is draft purchase-order mutation result safety: draft update and delete should verify that the write returned a row before logging or returning success.

Status: Closed after Issue 1.

## Business Value

Draft purchase orders are operator-controlled procurement work in progress. If a draft update or delete loses the row between the pre-read and write, operators should get a clear not-found/update-failed response rather than a runtime crash or success response built from an undefined write result.

## Workflow Spine

draft purchase-order update/delete
-> tenant-scoped draft pre-read
-> tenant-scoped write
-> persisted/deleted row verification
-> activity logging
-> purchase-order query/cache policy
-> procurement readiness.

## Architecture Constraints

- Keep this sprint to draft purchase-order update/delete write result contracts.
- Preserve update fields, draft-only checks, tenant predicates, activity logging shape, query keys, cache behavior, response shape on success, and UI behavior.
- Do not broaden into lifecycle status transitions, bulk delete, approval workflow, receiving, transaction redesign, live database fixtures, or UI changes.

## Issue Ledger

### 1. Draft Update/Delete Trusted Write Results After Pre-Read

Problem:

- `updatePurchaseOrder` pre-read the draft PO and then used `result[0]` from the update without verifying it existed.
- `deletePurchaseOrder` pre-read the draft PO and then returned `result[0].id` from the soft-delete update without verifying it existed.
- A concurrent delete/status change or write failure could surface as an unsafe runtime access instead of an operator-safe not-found/update-failed error.

Workflow protected:

draft purchase-order update/delete -> tenant-scoped write -> persisted/deleted row verification -> activity logging.

Implemented slice:

- Added a `NotFoundError` guard after draft purchase-order update if the update returned no row.
- Added a `NotFoundError` guard after draft purchase-order delete if the soft delete returned no row.
- Changed delete success response to use the verified deleted row.
- Added focused contract coverage proving both guards run before activity logging and delete no longer returns from raw `result[0]`.

Out of scope:

- Changing purchase-order lifecycle status transitions.
- Changing bulk delete behavior.
- Changing supplier pricing validations.
- Adding live database fixtures.

Closeout:

- Touched domains: purchase-order server function, purchase-order draft mutation contract tests, inventory sprint evidence.
- Workflow protected: draft purchase-order update/delete -> tenant-scoped draft pre-read -> tenant-scoped write -> persisted/deleted row verification -> activity logging -> purchase-order query/cache policy -> procurement readiness.
- Business value protected: draft purchase-order update/delete now fails clearly when the write returns no row instead of logging or returning from an undefined result.
- Architecture standards checked: route/page/hook/cache behavior is unchanged; purchase orders remain the workflow owner; server mutation result contracts are explicit before side effects and success responses.
- Tenant isolation and data integrity checked: no tenant predicates changed; draft update/delete writes remain organization-scoped; no supplier pricing, receiving, finance posting, approval, or serialized lineage behavior changed.
- Query/cache contract checked: no query keys, invalidation, stale times, optimistic updates, rollback behavior, or UI state contracts changed.
- Smells removed: draft purchase-order update/delete trusted `result[0]` after a separate pre-read.
- Smells deferred: live seeded fixtures for no-row draft write results; lifecycle status transition result-guard audit; bulk delete write result audit; transaction design for broader procurement workflows.
- Gates run: focused purchase-order tests (`5` files, `18` tests); focused ESLint; supplier + purchase-order unit suites (`38` files, `109` tests); TypeScript.
- Gates skipped: browser QA, because this was a server mutation-contract safety change with no UI interaction change.
- Goal adaptations: declined. The standing maintainer goal already covers safe mutation contracts, operator-safe errors, data integrity, meaningful tests, and evidence-based closeout.
- Residual risk: source-level contract coverage protects guard placement; live database fixtures would provide stronger proof for real no-row update/delete behavior.
