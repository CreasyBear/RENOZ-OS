# Maintainer Sprint 6: Picking Serialization Metadata Fails Closed

Sprint 6 follows the inventory receiving fail-closed serialization work into the orders/fulfillment seam. The target is order picking and unpicking: product-backed order lines must not be treated as non-serialized when product metadata is unavailable.

Status: Closed after Issue 1.

## Business Value

RENOZ fulfillment depends on serialized battery lineage. Operators should not be able to pick or unpick a product-backed battery line while the server cannot prove whether serial allocation rules apply.

## Workflow Spine

```text
order detail / fulfillment picking dialog
  -> usePickOrderItems / useUnpickOrderItems
  -> order-picking server function
  -> order line + org-scoped product metadata join
  -> fail-closed serialization requirement
  -> serial allocation or non-serialized inventory reservation
  -> fulfillment/inventory cache identity
```

## Architecture Constraints

- Keep the final invariant in the order-picking server transaction.
- Preserve the existing org-scoped product join and order-line scope.
- Do not change picking dialog UI, hook invalidation, schemas, or database contracts for this slice.
- Keep pick and unpick behavior aligned through one orders-owned helper.

## Issue Ledger

### 1. Picking Treated Missing Product Metadata As Non-Serialized

Problem:

- `pickOrderItems` and `unpickOrderItems` read product serialization metadata through an org-scoped left join.
- Product-backed lines with a missing product row were coerced through `product?.isSerialized ?? false`.
- That fallback could route a product-backed serialized line through non-serialized reservation/release logic, bypassing serial allocation checks.

Workflow protected:

pick or unpick order line -> product serialization requirement read -> serial allocation/release or non-serialized reservation/release -> fulfillment/inventory mutation identity.

Implemented slice:

- Added `order-picking-serialization` helper for product-backed line serialization decisions.
- Made product-backed lines fail closed with an operator-safe `ValidationError` when product metadata is unavailable.
- Rewired both `pickOrderItems` and `unpickOrderItems` to use the helper.
- Added focused helper tests and a source contract guard proving the server no longer contains the `product?.isSerialized ?? false` fallback.

Out of scope:

- UI normalization of missing product metadata in `normalizeOrderLineItemsToPickLines`.
- Shipment validation and shipment item-selection serialization fallbacks.
- RMA serialization fallbacks in `src/server/functions/orders/rma.ts`.
- Browser QA, because this was a server-side invariant change with no UI behavior change.

Closeout:

- Touched domains: orders fulfillment picking server, orders picking serialization helper/tests, orders sprint evidence.
- Workflow protected: picking/unpicking -> org-scoped product metadata -> serialized allocation/release or non-serialized reservation/release -> fulfillment/inventory cache identity.
- Business value protected: serialized battery fulfillment cannot silently bypass serial lineage rules when product metadata is unavailable.
- Architecture standards checked: route, container, hook, schema, database, and query/cache contracts were unchanged; server boundary owns the final fail-closed invariant; pick and unpick use the same orders-owned helper.
- Tenant isolation and data integrity checked: no org predicates were removed; product metadata remains joined inside `ctx.organizationId`; product-backed lines with missing metadata block before inventory reservation or serial allocation mutation.
- Query/cache contract checked: no cache contract changes; existing pick/unpick mutation identity and invalidation behavior remains unchanged.
- Smells removed: `product?.isSerialized ?? false` fail-open assumptions in `pickOrderItems` and `unpickOrderItems`.
- Smells deferred: UI order-line normalization still defaults missing product metadata to non-serialized; shipment selection/validation and RMA flows still need similar serialization fallback audits.
- Gates run: focused order picking/reservation/cache tests (`3` files, `17` tests); focused ESLint; full orders unit suite (`30` files, `109` tests); TypeScript; full lint; reliability guards.
- Gates skipped: browser QA, because this was a server-side invariant change with no UI behavior change.
- Goal adaptations: declined. The standing maintainer goal already covers serialized lineage continuity, tenant isolation, operator-safe errors, meaningful tests, and evidence-based closeout.
- Residual risk: remaining order shipment UI/server and RMA serialization fallbacks can still misclassify missing product metadata until follow-up sprints close them.
