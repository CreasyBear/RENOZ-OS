# Maintainer Sprint 7: Shipment Validation Serialization Metadata Fails Closed

Sprint 7 follows Sprint 6's picking fail-closed serialization work into shipment creation. The target is the server validation gate before shipment drafts or shipments can reserve picked fulfillment stock.

Status: Closed after Issue 1.

## Business Value

RENOZ operators ship serialized battery assets from picked stock. Shipment creation must not treat a product-backed order line as non-serialized when product metadata is unavailable, because that can bypass serial shipment validation and create downstream lineage confusion.

## Workflow Spine

```text
ship order dialog / shipment draft creation
  -> create shipment server handler
  -> validateShipmentItems
  -> order line + org-scoped product metadata join
  -> fail-closed serialization requirement
  -> serialized serial validation or non-serialized reservation validation
  -> shipment item persistence
```

## Architecture Constraints

- Keep this slice inside the orders fulfillment server boundary.
- Preserve existing route, dialog, hook, schema, database, and cache contracts.
- Promote the picking serialization invariant into an orders-owned order-line helper instead of duplicating the same decision logic.
- Do not change shipment finalization, reopening, RMA, or UI selection behavior in this sprint.

## Issue Ledger

### 1. Shipment Validation Defaulted Missing Product Serialization To Non-Serialized

Problem:

- `validateShipmentItems` reads product serialization metadata with an org-scoped left join.
- Product-backed lines with a missing product row were mapped through `isSerialized: r.isSerialized ?? false`.
- That could send a product-backed serialized line through non-serialized reservation validation instead of requiring allocated serial numbers.

Workflow protected:

shipment create/draft -> product serialization requirement read -> serialized serial validation or non-serialized reservation validation -> shipment persistence.

Implemented slice:

- Added `order-line-serialization` as the shared orders server helper for product-backed line serialization decisions.
- Made the Sprint 6 picking helper delegate to the shared helper.
- Changed `validateShipmentItems` to fail closed when a product-backed line cannot prove its serialization requirement.
- Added focused tests for the shared helper and a source contract guard covering shipment validation.

Out of scope:

- Order detail and shipment dialog UI normalization of missing product metadata.
- RMA serialization fallback cleanup.
- Shipment finalization/reopen behavior for already-persisted legacy shipment items.
- Browser QA, because this was a server-side validation invariant with no UI behavior change.

Closeout:

- Touched domains: orders shipment validation server, orders picking serialization helper, orders shared serialization helper/tests, orders sprint evidence.
- Workflow protected: shipment creation/draft -> product serialization requirement read -> serial validation or reservation validation -> shipment persistence.
- Business value protected: serialized battery shipments cannot be created as non-serialized shipments when product metadata is unavailable.
- Architecture standards checked: route, container, hook, schema, database, and query/cache contracts were unchanged; shared orders helper now owns the product-backed serialization invariant across picking and shipment validation.
- Tenant isolation and data integrity checked: no org predicates were removed; product metadata remains joined inside the organization boundary; product-backed lines with missing metadata block before shipment item persistence.
- Query/cache contract checked: no cache changes; existing shipment and fulfillment invalidation contracts remain unchanged.
- Smells removed: `isSerialized: r.isSerialized ?? false` fail-open assumption in shipment validation; duplicate picking-only helper logic promoted into a shared order-line helper.
- Smells deferred: RMA create still has serialization fallback cleanup; order detail, picking normalization, and ship-item selection UI still default missing product metadata to non-serialized; shipment finalization/reopen legacy paths need a later audit.
- Gates run: focused order serialization/availability tests (`5` files, `22` tests); focused ESLint; full orders unit suite (`31` files, `113` tests); TypeScript; full lint; reliability guards.
- Gates skipped: browser QA, because this was a server-side validation invariant with no UI behavior change.
- Goal adaptations: declined. The standing maintainer goal already covers serialized lineage continuity, tenant isolation, operator-safe errors, meaningful tests, and evidence-based closeout.
- Residual risk: RMA and UI serialization fallbacks can still misclassify missing product metadata until follow-up sprints close them.
