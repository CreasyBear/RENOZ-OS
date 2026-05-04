# Inventory Maintainer Sprint 81

This sprint follows Sprint 80's receive-goods closeout write guards. The target is receive-goods purchase-order item quantity safety: quantity validation and PO item quantity updates should run against locked item rows and prove the update happened before inventory work continues.

Status: Closed after Issue 1.

## Business Value

Receiving goods changes what RENOZ believes is still pending from a supplier. Operators should not over-receive or silently miss PO item quantity updates when two receive operations touch the same purchase order.

## Workflow Spine

receive goods
-> tenant-scoped receivable PO validation
-> tenant-scoped PO item read
-> PO item row lock
-> max-receivable validation
-> receipt line-item insert
-> PO item quantity update
-> PO item update result verification
-> inventory/movement/cost-layer writes
-> PO status closeout
-> receipt/query/cache policy.

## Architecture Constraints

- Keep this sprint to PO item quantity validation and update evidence inside receive-goods.
- Preserve receive payload shape, serial validation, landed-cost math, inventory balance behavior, movement/cost-layer behavior, PO status closeout, query keys, cache behavior, and UI behavior.
- Do not broaden into broader row-lock redesign, live concurrency fixtures, receipt UI, or supplier pricing behavior.

## Issue Ledger

### 1. Receive Goods Validated And Updated PO Item Quantities Without Lock/Result Evidence

Problem:

- The transaction read PO items and calculated `maxReceivable`, but the item rows were not explicitly locked before validation.
- The PO item quantity update was organization-scoped, but it did not return evidence that a row was updated.
- Inventory and cost-layer work could continue after an unobserved PO item quantity write.

Workflow protected:

PO item read -> row lock -> quantity validation -> PO item quantity update -> returned-row guard -> inventory/cost work.

Implemented slice:

- Added `FOR UPDATE` to the tenant-scoped PO item read used for receive quantity validation.
- Added `.returning({ id })` to PO item quantity updates.
- Added an operator-safe validation error if a PO item quantity update returns no row.
- Updated receive-goods contract coverage to pin the lock, returned-row guard, and existing tenant scope.

Out of scope:

- Live concurrent receive fixtures.
- Broader lock ordering review across all receive queries.
- UI receive conflict/retry design.
- Supplier pricing or product catalog behavior.

Closeout:

- Touched domains: receive-goods server function, receive-goods tenant-scope contract test, inventory sprint evidence.
- Workflow protected: receive goods -> tenant-scoped receivable PO validation -> tenant-scoped PO item read -> PO item row lock -> max-receivable validation -> receipt line-item insert -> PO item quantity update -> PO item update result verification -> inventory/movement/cost-layer writes -> PO status closeout -> receipt/query/cache policy.
- Business value protected: receive operations now validate pending PO quantities against locked item rows and fail clearly if the item quantity write is not observed.
- Architecture standards checked: route/page/hook/cache behavior is unchanged; receive-goods remains the workflow owner; PO item quantity mutation now follows the same transaction write-evidence standard as receipt, inventory, movement, finance, status, and product-cost writes.
- Tenant isolation and data integrity checked: organization predicates are retained; PO item rows are locked under the receive transaction; quantity updates remain scoped by item id, purchase-order id, and organization id; no supplier pricing, PO approval, UI, or query/cache behavior changed.
- Query/cache contract checked: no query keys, invalidation, stale times, optimistic updates, rollback behavior, or UI state contracts changed.
- Smells removed: receive-goods trusted unlocked PO item quantity reads and unobserved PO item quantity updates.
- Smells deferred: live concurrent receive fixtures; broader lock ordering review; receive conflict/retry UX.
- Gates run: focused receive/inventory tests (`4` files, `15` tests); focused ESLint; inventory + supplier + purchase-order unit suites (`102` files, `317` tests); TypeScript.
- Gates skipped: browser QA, because this was a server transaction-boundary safety change with no UI interaction change.
- Goal adaptations: declined. The standing maintainer goal already covers safe mutation contracts, transactional inventory/finance integrity, tenant isolation, meaningful tests, and evidence-based closeout.
- Residual risk: source-level contracts pin lock and update evidence; live database concurrency fixtures would provide stronger proof for simultaneous receive races.
