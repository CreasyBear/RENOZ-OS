# Inventory Maintainer Sprint 74

This sprint follows Sprint 73's purchase-order line-item transaction lock hardening. The target is purchase-order totals recalculation write safety: after item add/remove recalculates totals, the parent purchase order update must still prove the order is draft, tenant-owned, not deleted, and actually updated.

Status: Closed after Issue 1.

## Business Value

Purchase-order totals drive procurement approval, receiving expectations, supplier cost visibility, and downstream inventory/finance confidence. A line-item edit should not silently rewrite totals on a purchase order that changed status, was deleted, or otherwise failed to update.

## Workflow Spine

purchase-order line-item add/remove
-> tenant-scoped draft pre-read
-> transactional draft PO lock/recheck
-> line-item insert/delete
-> totals aggregation
-> draft/not-deleted totals compare-and-write
-> totals write result verification
-> activity logging
-> purchase-order query/cache policy
-> procurement readiness.

## Architecture Constraints

- Keep this sprint to purchase-order totals recalculation write safety inside the existing line-item add/remove transaction.
- Preserve line total calculation, aggregate math, add/remove response shape, activity logging, query keys, cache behavior, and UI behavior.
- Do not broaden into line-item update workflows, receiving, stock movement, purchase-order lifecycle transitions, finance posting, live database fixtures, or UI changes.

## Issue Ledger

### 1. Totals Recalculation Updated The Parent Purchase Order Without A Result Guard

Problem:

- Sprint 73 locked and rechecked the draft purchase order before item add/remove writes.
- The shared totals helper then updated the parent `purchaseOrders` row by id and organization only.
- The update did not constrain status/deleted state and did not verify that a row was returned.

Workflow protected:

line-item add/remove -> item write -> totals aggregation -> draft/not-deleted totals update -> returned-row verification.

Implemented slice:

- Added `status = 'draft'` and `deletedAt IS NULL` to the purchase-order totals update predicate.
- Added `.returning({ id: purchaseOrders.id })` to make the totals write observable.
- Added an operator-safe `ValidationError` when totals cannot be recalculated.
- Updated the source-level contract test to pin the predicate and returned-row guard.

Out of scope:

- Line-item update workflow design.
- Receiving and stock movement flows.
- Full purchase-order transaction redesign.
- Live database concurrency fixtures.

Closeout:

- Touched domains: purchase-order server function, purchase-order line-item totals contract test, inventory sprint evidence.
- Workflow protected: purchase-order line-item add/remove -> tenant-scoped draft pre-read -> transactional draft PO lock/recheck -> line-item insert/delete -> totals aggregation -> draft/not-deleted totals compare-and-write -> totals write result verification -> activity logging -> purchase-order query/cache policy -> procurement readiness.
- Business value protected: line-item edits can no longer silently recalculate totals on a purchase order that is no longer draft, has been deleted, or did not update.
- Architecture standards checked: route/page/hook/cache behavior is unchanged; purchase orders remain the workflow owner; the server mutation helper now enforces the same draft/not-deleted invariant as the item mutation transaction.
- Tenant isolation and data integrity checked: organization predicates are retained; draft status and `deletedAt IS NULL` are enforced on the totals write; failed writes surface as a safe validation error; no supplier pricing, receiving, finance posting, approval-record, or serialized lineage behavior changed.
- Query/cache contract checked: no query keys, invalidation, stale times, optimistic updates, rollback behavior, or UI state contracts changed.
- Smells removed: totals recalculation trusted an unverified parent update and allowed totals writes without restating draft/not-deleted state.
- Smells deferred: line-item update workflow audit; live seeded fixtures for concurrent line-item state changes; broader purchase-order transaction design.
- Gates run: focused purchase-order tests (`4` files, `16` tests); focused ESLint; supplier + purchase-order unit suites (`41` files, `113` tests); TypeScript.
- Gates skipped: browser QA, because this was a server transaction-boundary safety change with no UI interaction change.
- Goal adaptations: declined. The standing maintainer goal already covers safe mutation contracts, transactional procurement integrity, tenant isolation, meaningful tests, and evidence-based closeout.
- Residual risk: source-level contracts protect predicate and returned-row guard placement; live database fixtures would provide stronger proof for real concurrent totals recalculation races.
