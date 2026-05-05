# Maintainer Sprint 9: RMA Receive Serialization Metadata Fails Closed

Sprint 9 follows Sprint 8's RMA create serialization guard into the RMA receive workflow. The target is the server restoration loop that turns an approved RMA into returned inventory, cost layers, inventory movements, and serialized lineage events.

Status: Closed after Issue 1.

## Business Value

Receiving returned batteries is a warehouse, support, warranty, and finance handoff. RENOZ should not mark an RMA as received or restore partial inventory when the server cannot prove product context and serialization requirements for every RMA line item.

## Workflow Spine

```text
RMA receive
  -> receiveRma server function
  -> approved RMA transition guard
  -> RMA line + source order line + org-scoped product metadata validation
  -> receiving location validation
  -> serialized restore or non-serialized restore
  -> inventory movement, cost layer, valuation, activity, serialized lineage event
```

## Architecture Constraints

- Keep this slice inside the orders/RMA receive server boundary.
- Preserve existing route, hook, schema, database, read-model, mutation envelope, and cache contracts.
- Reuse the shared RMA/order-line serialization helper rather than duplicating product-backed checks.
- Do not change RMA create, process, UI selection, or RMA read-model behavior in this sprint.

## Issue Ledger

### 1. RMA Receive Could Drop Lines When Product Metadata Was Unavailable

Problem:

- `receiveRma` fetched RMA line items through inner joins to source order lines and products.
- If a product row was missing or deleted, that RMA line could be omitted from the restoration loop instead of failing with an explicit product/serialization error.
- The loop also had an `if (!productId) continue` guard, which made product context absence look skippable in a workflow that writes inventory and finance artifacts.

Workflow protected:

RMA receive -> product serialization requirement read -> inventory restoration -> cost layer/valuation -> serialized lineage event.

Implemented slice:

- Added RMA receive support to `order-rma-serialization`.
- Extended the shared order-line serialization action vocabulary for RMA receiving.
- Changed `receiveRma` to left join source order/product context and fail closed when product metadata is unavailable.
- Replaced the product-id skip with an explicit validation error.
- Added focused tests and source contract coverage proving receive uses the RMA serialization helper and no longer contains `if (!productId) continue`.

Out of scope:

- RMA process/remedy execution behavior.
- RMA UI line selection and order-detail UI normalization.
- Shipment finalization/reopen legacy path audit.
- Browser QA, because this was a server-side validation invariant with no UI behavior change.

Closeout:

- Touched domains: orders RMA receive server, shared orders line serialization helper, orders RMA serialization helper/tests, orders sprint evidence.
- Workflow protected: RMA receive -> RMA line/source order/product metadata validation -> serialized or non-serialized inventory restoration -> finance/valuation/lineage artifacts.
- Business value protected: returned battery stock cannot be partially or silently restored when product serialization metadata is unavailable.
- Architecture standards checked: route, hook, schema, database, read-model, mutation envelope, and query/cache contracts were unchanged; RMA receive now shares the same product-backed serialization invariant as RMA create, picking, and shipment validation.
- Tenant isolation and data integrity checked: no org predicates were removed; source order lines and products remain scoped to `ctx.organizationId`; product/context failures block before inventory movement, cost-layer, valuation, activity, or serialized lineage writes.
- Query/cache contract checked: no cache changes; the existing serialized mutation envelope and downstream invalidation identity remain unchanged.
- Smells removed: product inner-join omission in RMA receive; `if (!productId) continue` skip in an inventory/finance restoration loop.
- Smells deferred: order detail, picking normalization, and ship-item selection UI still default missing product metadata to non-serialized; RMA process/remedy and shipment finalization/reopen legacy paths need later audit.
- Gates run: focused order/RMA serialization tests (`3` files, `15` tests); focused ESLint; full orders unit suite (`32` files, `120` tests); TypeScript; full lint; reliability guards.
- Gates skipped: browser QA, because this was a server-side validation invariant with no UI behavior change.
- Goal adaptations: declined. The standing maintainer goal already covers serialized lineage continuity, transactional inventory and finance integrity, tenant isolation, operator-safe errors, meaningful tests, and evidence-based closeout.
- Residual risk: remaining UI normalization and legacy fulfillment/remedy execution paths can still present or interpret missing product metadata too loosely until follow-up sprints close them.
