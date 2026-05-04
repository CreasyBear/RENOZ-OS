# Inventory Maintainer Sprint 78

This sprint follows Sprint 77's receive-goods receipt boundary guards. The target is receive-goods inventory and movement write-result safety: before cost layers, serialized lineage, and operator success depend on inventory and movement ids, those writes must prove they returned rows.

Status: Closed after Issue 1.

## Business Value

Receiving goods updates sellable stock and inventory value. Operators should not complete a receive flow if the inventory balance update, inventory row creation, or movement audit row did not actually materialize.

## Workflow Spine

receive goods
-> receipt line-item verification
-> serialized or non-serialized inventory update/insert
-> inventory write result verification
-> inventory movement insert
-> movement result verification
-> cost-layer creation
-> serialized lineage continuity
-> PO status update
-> receipt query/cache policy.

## Architecture Constraints

- Keep this sprint to inventory balance, inventory creation, and movement write-result guards inside receive-goods.
- Preserve receive payload shape, quantity validation, weighted-cost math, cost-layer creation, serialized lineage behavior, PO status calculation, query keys, cache behavior, and UI behavior.
- Do not broaden into cost-layer result contracts, product cost-price update guards, PO status write guards, or browser/UI receive flow.

## Issue Ledger

### 1. Receive Goods Trusted Inventory And Movement Writes Before Dependent Cost/Lineage Work

Problem:

- Serialized and non-serialized inventory update paths used update statements without returned-row evidence.
- Serialized and non-serialized inventory insert paths used `newInv.id` without guarding the returned row.
- Serialized and non-serialized movement inserts used `movement.id` without guarding the returned row.
- Cost layers, serialized lineage, and response movement ids then depended on those unguarded writes.

Workflow protected:

receipt line item -> inventory update/insert -> inventory write guard -> movement insert -> movement guard -> cost layers/serialized lineage.

Implemented slice:

- Added returned-row guards to serialized and non-serialized existing-inventory balance updates.
- Added returned-row guards to serialized and non-serialized new inventory row inserts.
- Added returned-row guards to serialized and non-serialized inventory movement inserts.
- Extended the receive-goods tenant-scope contract test to pin both paths.

Out of scope:

- Cost-layer result verification.
- Product cost-price update result verification.
- PO status update compare-and-write result guard.
- Live database receiving fixtures.
- Browser/UI receive flow.

Closeout:

- Touched domains: receive-goods server function, receive-goods tenant-scope contract test, inventory sprint evidence.
- Workflow protected: receive goods -> receipt line-item verification -> serialized or non-serialized inventory update/insert -> inventory write result verification -> inventory movement insert -> movement result verification -> cost-layer creation -> serialized lineage continuity -> PO status update -> receipt query/cache policy.
- Business value protected: inventory/cost/serial work now depends on proven inventory and movement writes rather than assumed returned rows.
- Architecture standards checked: route/page/hook/cache behavior is unchanged; receive-goods remains the workflow owner; serialized and non-serialized branches now enforce the same write-evidence standard.
- Tenant isolation and data integrity checked: existing organization predicates and transaction RLS context are unchanged; inventory updates remain organization-scoped; new rows still carry `organizationId`; no supplier pricing, PO approval, product catalog, UI, or query/cache behavior changed.
- Query/cache contract checked: no query keys, invalidation, stale times, optimistic updates, rollback behavior, or UI state contracts changed.
- Smells removed: receive-goods trusted unguarded inventory updates, inventory inserts, and movement inserts before cost-layer and serialized-lineage work.
- Smells deferred: cost-layer write evidence; product cost-price update guard; PO status update guard; live seeded receiving fixtures.
- Gates run: focused receiving tests (`3` files, `12` tests); focused ESLint; supplier + purchase-order unit suites (`42` files, `120` tests); TypeScript.
- Gates skipped: browser QA, because this was a server transaction-boundary safety change with no UI interaction change.
- Goal adaptations: declined. The standing maintainer goal already covers safe mutation contracts, transactional inventory/finance integrity, serialized lineage continuity, tenant isolation, meaningful tests, and evidence-based closeout.
- Residual risk: source-level contracts pin inventory and movement guards; cost-layer, product cost-price, and PO status write-result guards remain follow-up receiving slices.
