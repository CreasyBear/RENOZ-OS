# Inventory Maintainer Sprint 73

This sprint follows Sprint 72's bulk purchase-order delete compare-and-write hardening. The target is purchase-order line-item draft transaction safety: item add/remove should recheck and lock the draft purchase order inside the transaction before mutating line items and recalculating totals.

Status: Closed after Issue 1.

## Business Value

Purchase-order line items drive procurement quantities and totals. Operators should not be able to add or remove items from a purchase order that changed status or was deleted after the initial pre-read but before the item mutation transaction.

## Workflow Spine

purchase-order line-item add/remove
-> tenant-scoped draft pre-read
-> transactional draft PO lock/recheck
-> line-item insert/delete
-> line-item write result verification
-> transactional total recalculation
-> activity logging
-> purchase-order query/cache policy
-> procurement readiness.

## Architecture Constraints

- Keep this sprint to purchase-order line-item add/remove transaction safety.
- Preserve line total calculation, line number sequencing, delete response shape, total recalculation semantics, activity logging shape, query keys, cache behavior, and UI behavior.
- Do not broaden into line-item update workflows, receiving, purchase-order lifecycle transitions, transaction redesign beyond the local item mutation, live database fixtures, or UI changes.

## Issue Ledger

### 1. Line-Item Mutations Relied On A Draft Pre-Read Outside The Transaction

Problem:

- Add/remove item pre-read the purchase order and rejected non-draft orders.
- The item insert/delete and total recalculation then happened in a transaction that did not recheck or lock the purchase order as draft/not-deleted.
- Add item also used the inserted item result without verifying it existed.

Workflow protected:

line-item add/remove -> transactional draft PO lock/recheck -> item write -> total recalculation.

Implemented slice:

- Added transaction-local draft/not-deleted purchase-order locks before line-item insert and delete.
- Added an operator-safe error if add-item insert returns no row.
- Scoped remove-item delete to item id, purchase-order id, and organization id.
- Added focused contract coverage for add/remove transaction draft locks, insert result guard, and delete predicate.

Out of scope:

- Line-item update flow design.
- Receiving and stock movement flows.
- Full purchase-order transaction redesign.
- Live database fixtures.

Closeout:

- Touched domains: purchase-order server function, purchase-order line-item contract tests, inventory sprint evidence.
- Workflow protected: purchase-order line-item add/remove -> tenant-scoped draft pre-read -> transactional draft PO lock/recheck -> line-item insert/delete -> line-item write result verification -> transactional total recalculation -> activity logging -> purchase-order query/cache policy -> procurement readiness.
- Business value protected: line-item add/remove can no longer proceed if the purchase order stops being draft or is deleted between pre-read and mutation transaction.
- Architecture standards checked: route/page/hook/cache behavior is unchanged; purchase orders remain the workflow owner; transaction-local state invariants now protect item writes and total recalculation.
- Tenant isolation and data integrity checked: organization predicates are retained; draft status and `deletedAt IS NULL` are checked under transaction lock; remove-item delete now also scopes by the source purchase-order id; no supplier pricing, receiving, finance posting, approval-record, or serialized lineage behavior changed.
- Query/cache contract checked: no query keys, invalidation, stale times, optimistic updates, rollback behavior, or UI state contracts changed.
- Smells removed: line-item mutations trusted stale pre-read state before transactional item writes; add-item insert trusted the returned row without verification.
- Smells deferred: line-item update workflow audit; live seeded fixtures for concurrent line-item state changes; broader purchase-order transaction design.
- Gates run: focused purchase-order line-item tests (`5` files, `17` tests); focused ESLint; supplier + purchase-order unit suites (`41` files, `113` tests); TypeScript.
- Gates skipped: browser QA, because this was a server transaction-boundary safety change with no UI interaction change.
- Goal adaptations: declined. The standing maintainer goal already covers safe mutation contracts, transactional procurement integrity, tenant isolation, meaningful tests, and evidence-based closeout.
- Residual risk: source-level contracts protect lock, predicate, and inserted-row guard placement; live database fixtures would provide stronger proof for real concurrent line-item mutation races.
