# Maintainer Sprint 11: Shipment Finalization Serialized Records Fail Closed

Sprint 11 follows Sprint 10's shipment product-metadata guard into the next serialized fulfillment invariant: a shipment cannot finalize or reopen by silently skipping serialized item records that cannot be resolved.

Status: Closed after Issue 1.

## Business Value

Shipment dispatch and correction are operational truth points for battery movement. RENOZ should not mark shipped, restore, allocate, release, cost, value, or record lineage for a serialized shipment when the server cannot resolve the serial to an org-scoped serialized item record.

## Workflow Spine

```text
mark shipped / reopen shipment
  -> order shipment finalization server function
  -> shipment items and serial numbers
  -> org-scoped serialized item resolution
  -> serialized inventory movement, allocation/release, cost, valuation, lineage
  -> fulfillment status
```

## Architecture Constraints

- Keep this slice inside the orders fulfillment server boundary.
- Preserve existing route, hook, schema, database, mutation envelope, and cache contracts.
- Keep the shared order-line serialization helper from Sprint 10 as the product metadata boundary.
- Do not change legacy serialized-lineage fallback flags, picking, RMA, order status, UI normalization, or cache invalidation in this sprint.

## Issue Ledger

### 1. Shipment Finalization Could Skip Missing Serialized Item Records

Problem:

- `markShipmentAsShipped` looked up serialized item records before movement, cost, valuation, and lineage writes.
- `reopenShipmentHandler` looked up serialized item records before restoring allocation and shipment state.
- Both paths skipped unresolved serialized item records with `continue`, which allowed shipment state to advance or reopen without matching serialized inventory side effects.

Workflow protected:

mark shipped or reopen shipment -> serialized item resolution -> serialized inventory movement/allocation/cost/valuation/lineage -> fulfillment status.

Implemented slice:

- Changed mark-as-shipped finalization to throw an operator-safe `ValidationError` when a shipment serial cannot be resolved to a serialized item record.
- Changed shipment reopen to throw the same fail-closed error before allocation restoration when a serialized item record is missing.
- Added focused source contract coverage to prevent reintroducing `if (!serialRecord) continue` in shipment finalization.

Out of scope:

- Other `findSerializedItemBySerial` call sites in picking, RMA, and order status flows.
- Legacy serialized-lineage fallback flags.
- UI line-item normalization and selection behavior.
- Browser QA, because this was a server-side transaction invariant with no UI behavior change.

Closeout:

- Touched domains: orders shipment finalization server, shipment finalization source guard test, orders sprint evidence.
- Workflow protected: shipment finalization/reopen -> serialized item resolution -> serialized inventory movement/allocation/cost/valuation/lineage -> fulfillment status.
- Business value protected: battery shipment dispatch and correction cannot silently advance when serialized records are missing.
- Architecture standards checked: route, hook, schema, database, mutation envelope, and query/cache contracts were unchanged; the transaction boundary now owns the unresolved-serial fail-closed invariant.
- Tenant isolation and data integrity checked: org-scoped `findSerializedItemBySerial` lookup remains unchanged; unresolved serials block before serialized inventory side effects or fulfillment status changes.
- Query/cache contract checked: no cache changes; existing fulfillment mutation identity remains unchanged.
- Smells removed: silent `if (!serialRecord) continue` skip in shipment finalization and shipment reopen.
- Smells deferred: other serialized item lookups in picking, RMA, and order status need later audit; UI normalization still has missing-product fallbacks to inspect.
- Gates run: focused shipment finalization/order tests (`3` files, `11` tests); focused ESLint; full orders unit suite (`33` files, `122` tests); TypeScript; full lint; reliability guards; diff checks.
- Gates skipped: browser QA, because this was a server-side transaction invariant with no UI behavior change.
- Goal adaptations: declined. The standing maintainer goal already covers serialized lineage continuity, transactional inventory integrity, tenant isolation, operator-safe errors, meaningful tests, and evidence-based closeout.
- Residual risk: serialized lookup behavior in picking, RMA, order status, and UI fallback paths still need follow-up sprints.
