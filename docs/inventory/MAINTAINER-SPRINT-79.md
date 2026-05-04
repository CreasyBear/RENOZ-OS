# Inventory Maintainer Sprint 79

This sprint follows Sprint 78's receive-goods inventory and movement write guards. The target is shared inventory-finance helper write-result safety: cost-layer consumption, movement, receipt-layer creation, and inventory value recomputation should all prove their writes before downstream stock valuation work depends on them.

Status: Closed after Issue 1.

## Business Value

Inventory finance helpers sit under receiving, manual stock-in, adjustments, transfers, and valuation reconciliation. RENOZ operators need stock value, FIFO layers, and serialized inventory cost integrity to fail clearly if a core write does not materialize.

## Workflow Spine

inventory-finance helper writes
-> tenant-scoped cost-layer consumption or creation
-> returned-row verification
-> inventory value recomputation
-> inventory recompute write verification
-> caller-level receive/adjust/transfer/valuation workflow
-> query/cache policy.

## Architecture Constraints

- Keep this sprint to shared inventory-finance helper write-result guards.
- Preserve FIFO math, cost-layer quantities, receipt layer component compatibility behavior, valuation recompute totals, serialized integrity assertions, caller payloads, query keys, cache behavior, and UI behavior.
- Do not broaden into receive-goods PO status guard, product cost-price guard, capitalization-row result enforcement, or live database fixtures.

## Issue Ledger

### 1. Shared Inventory-Finance Helpers Trusted Core Writes Without Returned-Row Evidence

Problem:

- FIFO layer consumption updated `inventoryCostLayers` without checking whether the row was actually updated.
- Layer movement created destination cost layers and immediately used `newLayer.id` without guarding the returned row.
- Inventory value recomputation updated `inventory` without checking whether the row was actually updated.
- Receipt layer creation returned `layer.id` and used it for capitalization rows without guarding the returned row.

Workflow protected:

cost-layer consume/move/create -> returned-row guard -> inventory value recompute -> returned-row guard -> caller workflow.

Implemented slice:

- Added returned-row verification to FIFO cost-layer consumption updates.
- Added returned-row verification to moved cost-layer inserts.
- Added returned-row verification to inventory value recompute updates.
- Added returned-row verification to receipt cost-layer inserts before capitalization rows use `layer.id`.
- Extended the inventory-finance helper contract test to pin tenant scope and write-result guards.

Out of scope:

- Capitalization-row result enforcement, because the helper intentionally preserves migration-rollout compatibility for missing capitalization tables/columns.
- Receive-goods PO status update result guard.
- Receive-goods product cost-price update result guard.
- Live database fixtures for cost-layer write anomalies.

Closeout:

- Touched domains: shared inventory-finance helper, inventory finance helper contract test, inventory sprint evidence.
- Workflow protected: inventory-finance helper writes -> tenant-scoped cost-layer consumption or creation -> returned-row verification -> inventory value recomputation -> inventory recompute write verification -> caller-level receive/adjust/transfer/valuation workflow -> query/cache policy.
- Business value protected: stock valuation and FIFO integrity now fail with coded, operator-safe finance errors when shared helper writes do not return evidence.
- Architecture standards checked: route/page/hook/cache behavior is unchanged; shared helper ownership is explicit; receiving, manual receive, adjustment, transfer, and valuation callers inherit the same helper contract.
- Tenant isolation and data integrity checked: existing organization predicates are retained; updated writes now return tenant-scoped ids; no supplier pricing, PO approval, product catalog, UI, or query/cache behavior changed.
- Query/cache contract checked: no query keys, invalidation, stale times, optimistic updates, rollback behavior, or UI state contracts changed.
- Smells removed: shared inventory-finance helpers trusted unverified layer updates, layer inserts, receipt layer creation, and inventory value updates.
- Smells deferred: capitalization insert result evidence behind migration compatibility; receive-goods PO status guard; receive-goods product cost-price guard; live seeded inventory-finance fixtures.
- Gates run: focused inventory/receive tests (`6` files, `25` tests); focused ESLint; inventory + supplier + purchase-order unit suites (`102` files, `317` tests); TypeScript.
- Gates skipped: browser QA, because this was a shared server helper safety change with no UI interaction change.
- Goal adaptations: declined. The standing maintainer goal already covers safe mutation contracts, transactional inventory/finance integrity, serialized lineage continuity, tenant isolation, meaningful tests, and evidence-based closeout.
- Residual risk: source-level contracts pin helper guards; live database fixtures and capitalization-row result enforcement would provide stronger evidence but require a dedicated migration-aware slice.
