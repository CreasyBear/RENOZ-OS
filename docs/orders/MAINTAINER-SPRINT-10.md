# Maintainer Sprint 10: Shipment Finalization Serialization Metadata Fails Closed

Sprint 10 follows Sprint 9's RMA receive guard into shipment finalization and reopen. The target is the fulfillment inventory transaction that marks a pending shipment as shipped or reopens an outbound shipment for correction.

Status: Closed after Issue 1.

## Business Value

Shipping batteries is the handoff from warehouse truth to customer delivery truth. RENOZ should not decrement, restore, allocate, or release stock for a shipment line unless the server can prove the source order line's product context and serialization requirement.

## Workflow Spine

```text
mark shipped / reopen shipment
  -> order shipment finalization server function
  -> shipment items
  -> source order line + org-scoped product metadata validation
  -> serialized shipment movement or non-serialized reservation consumption
  -> inventory movement, cost layer consumption, valuation, serialized lineage, fulfillment status
```

## Architecture Constraints

- Keep this slice inside the orders fulfillment server boundary.
- Preserve existing route, hook, schema, database, mutation envelope, and cache contracts.
- Reuse the shared order-line serialization helper introduced for picking, shipping validation, and RMA flows.
- Do not change shipment creation validation, shipment UI selection, RMA behavior, or cache invalidation in this sprint.

## Issue Ledger

### 1. Shipment Finalization Could Treat Missing Product Metadata As Non-Serialized

Problem:

- `markShipmentAsShipped` and `reopenShipmentHandler` read source order-line product metadata through left joins.
- Missing product metadata could be interpreted through direct `lineItemWithProduct.isSerialized` truthiness instead of an explicit fail-closed contract.
- Reopen also combined missing product context with `shouldReverseShippedQuantities` in a skip condition, making product context absence look like an acceptable restoration outcome.

Workflow protected:

mark shipped or reopen shipment -> product serialization requirement read -> serialized or non-serialized inventory transaction -> fulfillment status/cache identity.

Implemented slice:

- Extended the shared order-line serialization helper to support shipment reopen messaging.
- Changed mark-as-shipped finalization to call `getOrderLineSerializationRequirement` before serialized/non-serialized inventory work.
- Changed shipment reopen to call the same helper before restoration/allocation work.
- Preserved service/non-product line skipping while making product-backed metadata absence fail closed.
- Added focused source contract coverage for the shipment finalization paths.

Out of scope:

- Shipment creation validation, already covered by Sprint 7.
- RMA create/receive behavior, already covered by Sprints 8 and 9.
- UI line-item normalization and selection behavior.
- Browser QA, because this was a server-side transaction invariant with no UI behavior change.

Closeout:

- Touched domains: orders shipment finalization server, shared order-line serialization helper, shipment finalization source guard test, orders sprint evidence.
- Workflow protected: shipment finalization/reopen -> source order line/product metadata validation -> serialized or non-serialized inventory movement -> valuation/lineage/fulfillment status.
- Business value protected: battery shipment and correction flows cannot silently process product-backed lines when product serialization metadata is unavailable.
- Architecture standards checked: route, hook, schema, database, mutation envelope, and query/cache contracts were unchanged; shipment finalization now shares the same product-backed serialization invariant as picking, shipment validation, and RMA flows.
- Tenant isolation and data integrity checked: no org predicates were removed; product metadata remains scoped to `ctx.organizationId`; product-backed metadata failures block before inventory movement, cost-layer consumption/restoration, allocation, valuation, or lineage writes.
- Query/cache contract checked: no cache changes; existing fulfillment mutation identity remains unchanged.
- Smells removed: direct `lineItemWithProduct.isSerialized` branching in shipment finalization/reopen; optional-product skip for product-backed fulfillment correction.
- Smells deferred: order detail, picking normalization, and ship-item selection UI still default missing product metadata to non-serialized; missing serialized item records during legacy shipment finalization/reopen still need a later audit.
- Gates run: focused shipment finalization/order tests (`4` files, `14` tests); focused ESLint; full orders unit suite (`33` files, `121` tests); TypeScript; full lint; reliability guards.
- Gates skipped: browser QA, because this was a server-side transaction invariant with no UI behavior change.
- Goal adaptations: declined. The standing maintainer goal already covers serialized lineage continuity, transactional inventory and finance integrity, tenant isolation, operator-safe errors, meaningful tests, and evidence-based closeout.
- Residual risk: UI normalization and legacy missing-serialized-record handling can still make serialized fulfillment state less honest until follow-up sprints close them.
