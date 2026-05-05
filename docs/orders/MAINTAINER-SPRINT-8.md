# Maintainer Sprint 8: RMA Create Serialization Metadata Fails Closed

Sprint 8 follows Sprint 7's shipment validation fail-closed serialization work into the RMA creation path. The target is the server validation gate before return authorization line items are persisted.

Status: Closed after Issue 1.

## Business Value

RENOZ support and warranty work depends on clean serialized battery lineage. Creating an RMA should not accept a product-backed return line unless the server can prove whether the line requires a serial number, and service/non-product lines should not enter product return workflows.

## Workflow Spine

```text
RMA creation
  -> createRma server function
  -> source order + order line validation
  -> product-backed line and org-scoped product metadata validation
  -> serialized quantity/serial checks
  -> shipped serial and active RMA checks
  -> RMA line persistence and serialized lineage event
```

## Architecture Constraints

- Keep this slice inside the orders/RMA server boundary.
- Preserve existing route, hook, schema, database, and cache contracts.
- Reuse the shared orders order-line serialization helper introduced for picking/shipment validation.
- Do not change RMA receive/process behavior, UI selection, or RMA read models in this sprint.

## Issue Ledger

### 1. RMA Create Used Fail-Open Serialization Lookups

Problem:

- `createRma` verified order line products with an inner join, then mapped `r.isSerialized ?? false`.
- Later validation read `lineItemProductMap.get(item.orderLineItemId) ?? false`.
- The inner join meant missing product metadata usually surfaced as a generic invalid line item, but the serialization contract itself still expressed a fail-open fallback.

Workflow protected:

RMA create -> source order line validation -> product serialization requirement read -> serialized quantity/serial validation -> RMA line persistence.

Implemented slice:

- Added `order-rma-serialization` helper for RMA product-backed line requirements and required map lookups.
- Extended the shared order-line serialization helper to support RMA creation messages.
- Changed `createRma` to left join product metadata after proving order-line ownership, then fail closed when product metadata is unavailable.
- Removed the `r.isSerialized ?? false` and `lineItemProductMap.get(...) ?? false` fallbacks.
- Added focused helper tests and source contract coverage for the RMA create path.

Out of scope:

- RMA receive/process behavior.
- RMA UI line selection and order-detail UI normalization.
- Broader shipment finalization/reopen legacy path audit.
- Browser QA, because this was a server-side validation invariant with no UI behavior change.

Closeout:

- Touched domains: orders RMA create server, shared orders line serialization helper, orders RMA serialization helper/tests, orders sprint evidence.
- Workflow protected: RMA creation -> source order line validation -> product serialization requirement read -> serialized return validation -> RMA persistence and lineage event.
- Business value protected: serialized battery returns cannot be created without proven serial requirements, and non-product order lines stay out of the product return flow.
- Architecture standards checked: route, hook, schema, database, read-model, and query/cache contracts were unchanged; RMA create now shares the same product-backed serialization invariant used by picking and shipment validation.
- Tenant isolation and data integrity checked: no org predicates were removed; product metadata remains scoped to `ctx.organizationId`; product-backed lines with missing product metadata block before RMA line persistence.
- Query/cache contract checked: no cache changes; RMA mutation envelope and downstream invalidation contracts remain unchanged.
- Smells removed: `r.isSerialized ?? false` and `lineItemProductMap.get(...) ?? false` fail-open assumptions in RMA create; generic product-join absence now has an explicit serialization/product-backed validation path.
- Smells deferred: order detail, picking normalization, and ship-item selection UI still default missing product metadata to non-serialized; RMA receive/process and shipment finalization/reopen legacy paths need later audit.
- Gates run: focused order/RMA serialization tests (`3` files, `13` tests); focused ESLint; full orders unit suite (`32` files, `118` tests); TypeScript; full lint; reliability guards.
- Gates skipped: browser QA, because this was a server-side validation invariant with no UI behavior change.
- Goal adaptations: declined. The standing maintainer goal already covers serialized lineage continuity, tenant isolation, operator-safe errors, meaningful tests, and evidence-based closeout.
- Residual risk: remaining UI normalization and legacy fulfillment/RMA receive paths can still present missing product metadata as non-serialized until follow-up sprints close them.
