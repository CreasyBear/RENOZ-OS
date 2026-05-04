# Inventory Maintainer Sprint 71

This sprint follows Sprint 70's draft purchase-order mutation result guards. The target is single-order purchase-order compare-and-write safety: status-sensitive purchase-order writes should enforce the same state predicates in the write that they used in the pre-read.

Status: Closed after Issue 1.

## Business Value

Purchase-order lifecycle actions move procurement work forward. If a purchase order changes status or is deleted between the pre-read and the update, the server should fail safely instead of overwriting a concurrent state change or logging from an unsafe transition.

## Workflow Spine

single-order purchase-order draft and lifecycle mutation
-> tenant-scoped state pre-read
-> tenant-scoped compare-and-write
-> write result verification
-> activity logging
-> purchase-order query/cache policy
-> procurement readiness.

## Architecture Constraints

- Keep this sprint to single-order purchase-order write predicates and lifecycle write-result guards.
- Preserve input schemas, status transition meanings, activity logging shape, query keys, cache behavior, response shape on success, and UI behavior.
- Do not broaden into bulk delete, purchase-order item mutations, receiving, approval record generation, transaction redesign, live database fixtures, or UI changes.

## Issue Ledger

### 1. Status-Sensitive Writes Did Not Recheck State At Write Time

Problem:

- Draft update/delete and lifecycle transitions pre-read purchase orders with tenant, status, and deleted-state predicates.
- The later writes only checked purchase-order id and organization id.
- A concurrent status change or soft delete between read and write could still be overwritten.
- Lifecycle transition updates also used `result[0]` before proving the write returned a row.

Workflow protected:

single-order purchase-order mutation -> tenant-scoped state pre-read -> tenant-scoped compare-and-write -> result verification -> activity logging.

Implemented slice:

- Added `status` and `deletedAt IS NULL` predicates to draft update and draft delete writes.
- Added matching status and `deletedAt IS NULL` predicates to submit, approve, reject, mark-as-ordered, cancel, and close writes.
- Added lifecycle write-result guards before activity logging.
- Strengthened lifecycle tenant-scope contract coverage to require expected state predicates.
- Added focused lifecycle write-result contract coverage.

Out of scope:

- Bulk delete result/count behavior.
- Purchase-order item mutation result guards.
- Receiving and stock movement flows.
- Approval record creation/evaluation.
- Live database fixtures.

Closeout:

- Touched domains: purchase-order server function, purchase-order lifecycle contract tests, inventory sprint evidence.
- Workflow protected: single-order purchase-order draft and lifecycle mutation -> tenant-scoped state pre-read -> tenant-scoped compare-and-write -> write result verification -> activity logging -> purchase-order query/cache policy -> procurement readiness.
- Business value protected: purchase-order state transitions now fail safely if another operation changes or deletes the order between pre-read and write.
- Architecture standards checked: route/page/hook/cache behavior is unchanged; purchase orders remain the workflow owner; server mutation writes now encode their state invariants instead of relying only on earlier reads.
- Tenant isolation and data integrity checked: organization predicates are retained; status and `deletedAt IS NULL` predicates now protect write-time state; no supplier pricing, receiving, finance posting, approval-record, or serialized lineage behavior changed.
- Query/cache contract checked: no query keys, invalidation, stale times, optimistic updates, rollback behavior, or UI state contracts changed.
- Smells removed: single-order purchase-order mutations trusted stale pre-read state and lifecycle transitions trusted `result[0]` before logging.
- Smells deferred: bulk delete compare-and-write count verification; purchase-order item mutation result guard audit; live seeded fixtures for concurrent state changes; transaction design for broader procurement workflows.
- Gates run: focused purchase-order tests (`6` files, `19` tests); focused ESLint; supplier + purchase-order unit suites (`39` files, `110` tests); TypeScript.
- Gates skipped: browser QA, because this was a server mutation-contract safety change with no UI interaction change.
- Goal adaptations: declined. The standing maintainer goal already covers safe mutation contracts, tenant isolation, data integrity, meaningful tests, and evidence-based closeout.
- Residual risk: source-level contracts protect predicate and guard placement; live database fixtures would provide stronger proof for real concurrent status/deleted-state races.
