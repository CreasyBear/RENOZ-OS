# Maintainer Sprint 14: Picking Requires Canonical Serialized Records

Sprint 14 follows the RMA and shipment serialized-record guards back into picking. The target is the serialized allocation path, where picking could still auto-create a serialized item record or skip allocation side effects after validating a serial against inventory.

Status: Closed after Issue 1.

## Business Value

Picking is the warehouse commitment that a specific battery is reserved for a customer order. RENOZ should not allocate a serialized order line by creating canonical serialized records as a side effect of fulfillment, and it should not advance picking when the canonical serialized item record is missing.

## Workflow Spine

```text
pick order items
  -> order picking server function
  -> order line serialization requirement
  -> org-scoped inventory serial validation
  -> canonical serialized item resolution with auto-upsert disabled
  -> serialized allocation and allocated lineage event
  -> fulfillment mutation identity and order pick status
```

## Architecture Constraints

- Keep this slice inside the orders picking server boundary.
- Preserve existing route, container/page, hook, schema, database, mutation envelope, and cache contracts.
- Preserve inventory receiving, adjustment, transfer, and RMA receive upsert behavior because those are source-of-stock or recovery workflows, not fulfillment allocation.
- Do not introduce a backfill tool in this sprint; surface missing canonical records as operator-safe errors.

## Issue Ledger

### 1. Picking Could Auto-Create Or Skip Serialized Item Records

Problem:

- The serialized picking path validated serials against inventory, then repeated an inventory lookup before allocation side effects.
- If the second inventory lookup missed, it silently continued.
- `findSerializedItemBySerial` was followed by `upsertSerializedItemForInventory`, allowing order picking to create canonical serialized records during fulfillment allocation.
- If no serialized item id resulted, allocation and lineage writes were silently skipped.

Workflow protected:

pick serialized order line -> inventory serial validation -> canonical serialized item resolution -> allocation row -> allocated lineage event -> mutation identity.

Implemented slice:

- Replaced the second inventory lookup `continue` with an operator-safe `ValidationError`.
- Changed picking to call `findSerializedItemBySerial` with `allowAutoUpsert: false`.
- Removed `upsertSerializedItemForInventory` from the picking allocation path.
- Replaced the missing serialized item id `continue` with an operator-safe `ValidationError`.
- Added focused source contract coverage to prevent reintroducing picking auto-upsert or skip behavior.

Out of scope:

- Inventory receiving, adjustments, transfers, supplier receive, and RMA receive upsert behavior.
- A canonical serialized-item backfill command for legacy inventory rows.
- Unpick legacy fallback behavior for historical allocation rows.
- Warranty and jobs serialized lookup behavior.
- Browser QA, because this was a server-side transaction invariant with no UI behavior change.

Closeout:

- Touched domains: orders picking server, order picking serialization guard test, orders sprint evidence.
- Workflow protected: pick order items -> serialized inventory validation -> canonical serialized item resolution -> allocation row -> allocated lineage event -> order pick status.
- Business value protected: warehouse operators cannot reserve a battery for an order while silently creating or missing the canonical serialized record that should already represent the physical unit.
- Architecture standards checked: route, container/page, hook, schema, database, mutation envelope, and query/cache contracts were unchanged; picking now treats canonical serialized records as a precondition instead of a fulfillment side effect.
- Tenant isolation and data integrity checked: org-scoped inventory and serialized-item lookups remain unchanged; missing inventory or canonical serial records block before allocation and lineage writes.
- Query/cache contract checked: no cache changes; existing fulfillment mutation identity remains unchanged.
- Smells removed: picking-side `upsertSerializedItemForInventory`; silent `if (!inventoryRecord) continue`; silent `if (!serializedItemId) continue`.
- Smells deferred: legacy unpick fallback, source-of-stock upsert paths, warranty/jobs serialized lookups, UI missing-product fallback paths, and a dedicated legacy canonical-record backfill workflow.
- Gates run: focused picking/fulfillment tests (`4` files, `17` tests); focused ESLint; full orders unit suite (`34` files, `125` tests); TypeScript; full lint; reliability guards; diff checks.
- Gates skipped: browser QA, because this was a server-side transaction invariant with no UI behavior change.
- Goal adaptations: declined. The standing maintainer goal already covers serialized lineage continuity, transactional integrity, tenant isolation, operator-safe errors, meaningful tests, and evidence-based closeout.
- Residual risk: legacy inventory rows without canonical serialized records will now block picking until a repair/backfill path exists; unpick, warranty, and jobs still need serialized lookup audits.
