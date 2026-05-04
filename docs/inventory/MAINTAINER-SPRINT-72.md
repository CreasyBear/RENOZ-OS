# Inventory Maintainer Sprint 72

This sprint follows Sprint 71's single-order purchase-order compare-and-write hardening. The target is bulk-delete purchase-order compare-and-write safety: per-id bulk delete should count success only when the soft-delete write still matches draft/not-deleted state.

Status: Closed after Issue 1.

## Business Value

Bulk delete is an operator efficiency workflow for cleaning up draft purchase orders. It should not report a purchase order as deleted if another operation changes the order status or deletes it between the pre-read and write.

## Workflow Spine

bulk purchase-order delete
-> per-id tenant-scoped pre-read
-> per-id draft-state check
-> tenant-scoped compare-and-write soft delete
-> returned-row verification
-> per-id failure reporting
-> purchase-order query/cache policy
-> procurement list hygiene.

## Architecture Constraints

- Keep this sprint to bulk purchase-order delete write predicates and success counting.
- Preserve response shape, per-id failure format, draft-only semantics, tenant predicates, query keys, cache behavior, and UI behavior.
- Do not broaden into single-order lifecycle transitions, purchase-order item mutations, receiving, transaction redesign, live database fixtures, or UI changes.

## Issue Ledger

### 1. Bulk Delete Counted Success Without Write Evidence

Problem:

- `bulkDeletePurchaseOrders` pre-read each purchase order with tenant and deleted-state predicates.
- It rejected non-draft records before writing.
- The later write only checked id and organization id, did not recheck draft/deleted state, did not return rows, and always incremented `deleted`.

Workflow protected:

bulk delete -> per-id draft pre-read -> compare-and-write soft delete -> returned-row verification -> per-id result reporting.

Implemented slice:

- Added `status = draft` and `deletedAt IS NULL` predicates to the bulk delete write.
- Added `.returning({ id })` to get write evidence.
- Added per-id failure when the write returns no row.
- Incremented `deleted` only after a returned row.
- Strengthened lifecycle tenant-scope coverage for bulk delete.
- Added focused bulk delete result contract coverage.

Out of scope:

- Bulk delete transaction semantics across all ids.
- Single-order lifecycle transitions.
- Purchase-order item mutation result guards.
- Live database fixtures.

Closeout:

- Touched domains: purchase-order server function, purchase-order bulk/lifecycle contract tests, inventory sprint evidence.
- Workflow protected: bulk purchase-order delete -> per-id tenant-scoped pre-read -> per-id draft-state check -> tenant-scoped compare-and-write soft delete -> returned-row verification -> per-id failure reporting -> purchase-order query/cache policy -> procurement list hygiene.
- Business value protected: bulk delete no longer reports success for rows that were concurrently changed, deleted, or otherwise not returned by the soft-delete write.
- Architecture standards checked: route/page/hook/cache behavior is unchanged; purchase orders remain the workflow owner; bulk mutation success now depends on write evidence rather than pre-read intent.
- Tenant isolation and data integrity checked: organization predicates are retained; draft status and `deletedAt IS NULL` now protect write-time state; no supplier pricing, receiving, finance posting, approval-record, or serialized lineage behavior changed.
- Query/cache contract checked: no query keys, invalidation, stale times, optimistic updates, rollback behavior, or UI state contracts changed.
- Smells removed: bulk delete trusted stale pre-read state and incremented success without returned-row evidence.
- Smells deferred: all-or-nothing bulk delete transaction semantics; purchase-order item mutation result guard audit; live seeded fixtures for concurrent bulk delete state changes.
- Gates run: focused purchase-order tests (`6` files, `19` tests); focused ESLint; supplier + purchase-order unit suites (`40` files, `111` tests); TypeScript.
- Gates skipped: browser QA, because this was a server mutation-contract safety change with no UI interaction change.
- Goal adaptations: declined. The standing maintainer goal already covers safe mutation contracts, tenant isolation, data integrity, meaningful tests, and evidence-based closeout.
- Residual risk: source-level contracts protect predicate, returning, and count behavior; live database fixtures would provide stronger proof for real concurrent bulk-delete races.
