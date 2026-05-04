# Inventory Maintainer Sprint 77

This sprint follows Sprint 76's purchase-order create write-result verification. The target is receive-goods receipt boundary safety: before inventory movements, cost layers, and serialized lineage depend on receipt ids, the receipt header and receipt line item inserts must prove they returned rows.

Status: Closed after Issue 1.

## Business Value

Receiving goods is where supplier procurement becomes warehouse stock and inventory value. Operators should not get a partial or confusing receive flow if the receipt record or receipt line record failed to materialize before inventory and finance work begins.

## Workflow Spine

receive goods
-> tenant-scoped receivable PO validation
-> receipt header insert
-> receipt header result verification
-> receipt line-item insert
-> receipt line-item result verification
-> inventory balance/movement/cost-layer updates
-> serialized lineage continuity
-> PO status update
-> receipt query/cache policy.

## Architecture Constraints

- Keep this sprint to the receipt header and receipt line-item write boundary.
- Preserve receive payload shape, PO quantity validation, inventory balance logic, cost-layer creation, serialized lineage behavior, PO status calculation, query keys, cache behavior, and UI behavior.
- Defer inventory row, movement row, cost-layer, product-cost, and PO status write guards to follow-up slices.

## Issue Ledger

### 1. Receive Goods Used Receipt Rows Without Guarding Returned Results

Problem:

- The receipt header insert returned `[receipt]`, then later code used `receipt.id` and `receipt.receiptNumber` without verifying a row existed.
- Each receipt line insert returned `[createdReceiptItem]`, then inventory cost layers and serialized lineage used `createdReceiptItem.id` without verifying a row existed.
- Insert failures should normally throw, but the mutation contract was weaker than the downstream inventory/finance/lineage work that depends on those ids.

Workflow protected:

receive goods -> receipt header insert -> header guard -> receipt line-item insert -> line-item guard -> inventory/cost/serial work.

Implemented slice:

- Added an operator-safe validation error if the receipt header insert returns no row.
- Added an operator-safe validation error if a receipt line-item insert returns no row.
- Extended the receive-goods tenant-scope contract test to pin both guards before dependent writes.

Out of scope:

- Inventory row and movement row result guards.
- Cost-layer result verification.
- Product cost-price update result verification.
- PO status update compare-and-write result guard.
- Browser/UI receive flow.

Closeout:

- Touched domains: receive-goods server function, receive-goods tenant-scope contract test, inventory sprint evidence.
- Workflow protected: receive goods -> tenant-scoped receivable PO validation -> receipt header insert -> receipt header result verification -> receipt line-item insert -> receipt line-item result verification -> inventory balance/movement/cost-layer updates -> serialized lineage continuity -> PO status update -> receipt query/cache policy.
- Business value protected: inventory, finance, and serialized lineage work no longer proceeds with missing receipt header or line-item ids.
- Architecture standards checked: route/page/hook/cache behavior is unchanged; receive-goods remains the workflow owner; the first receipt write boundary now follows the same result-evidence standard as purchase-order mutation paths.
- Tenant isolation and data integrity checked: existing organization predicates and transaction RLS context are unchanged; receipt rows still carry `organizationId`; no supplier pricing, PO approval, product catalog, finance posting outside receipt cost layers, or UI behavior changed.
- Query/cache contract checked: no query keys, invalidation, stale times, optimistic updates, rollback behavior, or UI state contracts changed.
- Smells removed: receive-goods trusted unguarded receipt header and receipt line-item returned rows before dependent inventory/finance/serialized lineage writes.
- Smells deferred: inventory row guards; movement row guards; cost-layer write evidence; product cost-price update guard; PO status update guard; live seeded receiving fixtures.
- Gates run: focused receiving tests (`3` files, `11` tests); focused ESLint; supplier + purchase-order unit suites (`42` files, `119` tests); TypeScript.
- Gates skipped: browser QA, because this was a server transaction-boundary safety change with no UI interaction change.
- Goal adaptations: declined. The standing maintainer goal already covers safe mutation contracts, transactional inventory/finance integrity, serialized lineage continuity, tenant isolation, meaningful tests, and evidence-based closeout.
- Residual risk: source-level contracts pin receipt guards; the deferred inventory/movement/cost-layer/PO-status guards should be handled in follow-up receiving slices.
