# Inventory Maintainer Sprint 80

This sprint follows Sprint 79's shared inventory-finance helper write-result guards. The target is receive-goods closeout write safety: after receipt, inventory, movement, and cost-layer work succeeds, the final PO status update and product cost-price update must also prove their writes.

Status: Closed after Issue 1.

## Business Value

Receiving goods should leave procurement and product valuation surfaces coherent. Operators should not complete a receipt if the purchase order status or product weighted cost update silently fails.

## Workflow Spine

receive goods
-> receipt/inventory/movement/cost-layer verification
-> PO status calculation
-> receivable PO status compare-and-write
-> PO status write result verification
-> product weighted cost-price update
-> product cost write result verification
-> success envelope
-> receipt/query/cache policy.

## Architecture Constraints

- Keep this sprint to receive-goods PO status and product cost-price write-result guards.
- Preserve receive payload shape, quantity validation, weighted-cost math, cost-layer behavior, serialized lineage behavior, response shape, query keys, cache behavior, and UI behavior.
- Do not broaden into row locking, product deletion policy redesign, capitalization-row result enforcement, or live database fixtures.

## Issue Ledger

### 1. Receive Goods Closed Out Without Verifying Status And Product-Cost Writes

Problem:

- PO status updates used id and organization predicates only, without deleted/receivable-state predicates or returned-row evidence.
- Product cost-price updates used id and organization predicates only, without active-product predicate or returned-row evidence.
- The success envelope could be returned even if one of those final closeout writes did not materialize.

Workflow protected:

receive closeout -> PO status write guard -> product cost write guard -> success envelope.

Implemented slice:

- Added receivable-status and not-deleted predicates to the PO status update.
- Added `.returning({ id })` and an operator-safe validation error for missing PO status update evidence.
- Added an active-product predicate to product cost-price updates.
- Added `.returning({ id })` and an operator-safe validation error for missing product cost-price update evidence.
- Updated receive-goods contract coverage to pin the stricter predicates and guards.

Out of scope:

- Transaction row-lock redesign for concurrent receipts.
- Product deletion receiving policy redesign.
- Capitalization-row result evidence.
- Live database receiving fixtures.

Closeout:

- Touched domains: receive-goods server function, receive-goods tenant-scope contract test, inventory sprint evidence.
- Workflow protected: receive goods -> receipt/inventory/movement/cost-layer verification -> PO status calculation -> receivable PO status compare-and-write -> PO status write result verification -> product weighted cost-price update -> product cost write result verification -> success envelope -> receipt/query/cache policy.
- Business value protected: receipt success now depends on both procurement status and product valuation closeout writes being observed.
- Architecture standards checked: route/page/hook/cache behavior is unchanged; receive-goods remains the workflow owner; final closeout writes now match the result-evidence standard established across the receipt flow.
- Tenant isolation and data integrity checked: organization predicates are retained; PO status writes now require active receivable state and `deletedAt IS NULL`; product cost writes now require active tenant products; no supplier pricing, PO approval, UI, or query/cache behavior changed.
- Query/cache contract checked: no query keys, invalidation, stale times, optimistic updates, rollback behavior, or UI state contracts changed.
- Smells removed: receive-goods could silently miss final PO status or product cost-price writes before returning success.
- Smells deferred: row locking/concurrency redesign; product deletion receive policy; capitalization insert result evidence; live seeded receiving fixtures.
- Gates run: focused receive/inventory tests (`4` files, `15` tests); focused ESLint; inventory + supplier + purchase-order unit suites (`102` files, `317` tests); TypeScript.
- Gates skipped: browser QA, because this was a server transaction-boundary safety change with no UI interaction change.
- Goal adaptations: declined. The standing maintainer goal already covers safe mutation contracts, transactional inventory/finance integrity, tenant isolation, meaningful tests, and evidence-based closeout.
- Residual risk: source-level contracts pin final closeout guards; live concurrency/database fixtures would provide stronger evidence for simultaneous receive races.
