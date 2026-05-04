# Inventory Maintainer Sprint 82

This sprint follows Sprint 81's receive-goods PO item quantity lock. The target is purchase-order receipt history read safety: receipt line items and their PO item join should restate tenant scope instead of relying only on previously fetched receipt ids.

Status: Closed after Issue 1.

## Business Value

Receipt history is the operator-facing proof of what arrived, what was rejected, and which PO lines were affected. It should never depend on implicit tenant scope when displaying receipt line details.

## Workflow Spine

purchase-order receipt history
-> tenant-scoped receipt list
-> tenant-scoped receipt ids
-> tenant-scoped receipt item query
-> tenant-scoped PO item join
-> shaped receipt history response
-> receipt query/cache policy.

## Architecture Constraints

- Keep this sprint to receipt history read tenant-scope hardening.
- Preserve response shape, receipt grouping, ordering, hook/query behavior, cache keys, UI states, and receive mutation behavior.
- Do not broaden into receipt pagination, receipt detail redesign, UI layout, or mutation workflow changes.

## Issue Ledger

### 1. Receipt History Item Query Relied On Implicit Tenant Scope

Problem:

- `listPurchaseOrderReceipts` fetched receipt headers with purchase-order id and organization scope.
- The batched receipt-item query then filtered only by receipt ids.
- The PO item join used only `purchaseOrderItemId = purchaseOrderItems.id`.
- UUIDs should be globally unique, but the repo standard is explicit tenant scope on read joins and dependent line reads.

Workflow protected:

receipt list -> receipt item query -> PO item join -> receipt history response.

Implemented slice:

- Added `purchaseOrderReceiptItems.organizationId = ctx.organizationId` to the batched receipt-item query.
- Added `purchaseOrderItems.organizationId = ctx.organizationId` to the PO item join.
- Added focused contract coverage to prevent reverting to implicit receipt-id-only scope.

Out of scope:

- Receipt pagination.
- Receipt detail route/schema redesign.
- Browser/UI receipt tab QA.
- Receive mutation behavior.

Closeout:

- Touched domains: receive-goods receipt read server function, receive-goods tenant-scope contract test, inventory sprint evidence.
- Workflow protected: purchase-order receipt history -> tenant-scoped receipt list -> tenant-scoped receipt ids -> tenant-scoped receipt item query -> tenant-scoped PO item join -> shaped receipt history response -> receipt query/cache policy.
- Business value protected: receipt history line details now use explicit tenant scope throughout the batched read.
- Architecture standards checked: route/page/hook/cache behavior is unchanged; `listPurchaseOrderReceipts` remains the read owner; response shape and UI states are preserved.
- Tenant isolation and data integrity checked: receipt headers, receipt items, and joined PO items all restate organization scope; no mutation, inventory valuation, supplier pricing, PO approval, or serialized lineage behavior changed.
- Query/cache contract checked: no query keys, invalidation, stale times, optimistic updates, rollback behavior, or UI state contracts changed.
- Smells removed: receipt history item reads and PO item joins relied on implicit tenant isolation from previously scoped receipt ids.
- Smells deferred: receipt pagination; richer receipt detail schema; browser QA of the receipt tab.
- Gates run: focused receipt/read tests (`4` files, `21` tests); focused ESLint; inventory + supplier + purchase-order unit suites (`102` files, `318` tests); TypeScript.
- Gates skipped: browser QA, because this was a server read-path tenant-scope change with no UI interaction change.
- Goal adaptations: declined. The standing maintainer goal already covers tenant isolation, honest read states, query/cache contracts, meaningful tests, and evidence-based closeout.
- Residual risk: source-level contracts pin explicit tenant predicates; live database fixtures with cross-tenant seeded receipt data would provide stronger proof.
