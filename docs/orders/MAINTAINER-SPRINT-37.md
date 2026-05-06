# Orders Maintainer Sprint 37

## Status

Closed in commit-ready state.

## Issue 1: Shipment Delivery Write Scope Before Entitlements

### Problem

Delivery workflows updated shipment and order-line delivered state before creating warranty entitlements, but the final write boundaries were weaker than the workflow requires. `updateShipmentStatus(...delivered)` read shipment items by shipment id only, updated delivered line quantities by line-item id only, and bumped the order aggregate without proving the order was still active. `confirmDelivery` updated the shipment by id only, read shipment items by shipment id only, and updated delivered line quantities by line-item id only before recomputing fulfillment and creating delivery entitlements.

Delivery is the customer commitment boundary. It should not create warranty entitlement state unless the shipment transition, delivered quantities, and owning order can be proved inside the transaction.

### Workflow Spine

Confirm delivery / update shipment status to delivered
-> `useConfirmDelivery` / `useUpdateShipmentStatus`
-> shipment status server function
-> state-scoped shipment delivery update
-> tenant-scoped shipment item read
-> order-owned delivered quantity write
-> active order aggregate bump or fulfillment recompute
-> warranty entitlement creation
-> shipment/order/fulfillment cache invalidation.

### Touched Domains

- Orders shipment delivery status.
- Orders delivery confirmation.
- Orders aggregate version helper.
- Warranty entitlement creation adjacency.
- Shipment delivery write-scope contract tests.
- Orders maintainer closeout docs.

### Business Value Protected

Delivery marks the point where RENOZ has fulfilled the customer order and warranty entitlement can begin. Operators should not create delivered state or entitlements from stale shipment status, cross-order line items, or a soft-deleted order.

### Scope Constraints

- Do not change shipment schemas, hook APIs, delivery confirmation payloads, entitlement creation semantics, status transition rules, idempotency behavior, or cache invalidation behavior.
- Do not change returned shipment result shapes.
- Do not change returned/returned-serial shipment status behavior, tracking-only updates, or add-tracking-event behavior in this slice.
- Do not rerun retired serialized gate packs; use focused shipment status evidence for the touched workflow.

### Changes

- Added `incrementDeliveredQuantitiesForShipment` to centralize delivered quantity writes.
- Scoped delivered shipment item reads by `shipmentItems.organizationId`.
- Scoped delivered line-item writes by line item id, parent order id, and organization id.
- Added guards before delivery entitlement creation when delivered quantity writes cannot be proved.
- Made `updateShipmentStatus(...delivered)` update the shipment by id, organization id, and expected current status before delivered quantities and entitlement creation.
- Made `confirmDelivery` update only tenant-scoped deliverable shipments.
- Hardened `bumpOrderAggregateVersion` to require an active tenant-scoped order and return row evidence.
- Added `order-shipment-delivery-write-scope-contract.test.ts`.

### Standards Checked

- Domain ownership: shipment delivery behavior remains in Orders shipment status functions and shipment hooks; entitlement creation remains owned by the warranty entitlement helper.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: checked shipment hooks, shipment status server function, shipment/order-line tables, order aggregate helper, entitlement creation call, and existing shipment cache invalidation.
- Tenant isolation/data integrity: improved. Delivery item reads and line-item delivered writes now prove tenant and parent order scope; aggregate version bumps now fail closed for soft-deleted/missing orders.
- Warranty/serialized continuity: preserved. Entitlement creation still runs only after delivery state, delivered quantities, and order fulfillment state are updated; focused shipment status serialization coverage remains in place.
- Query/cache contract: preserved. Existing shipment mutation invalidation still refreshes shipment, order, and fulfillment surfaces.
- Honest UI states/operator-safe errors: improved. Stale delivery transitions now fail with validation feedback rather than creating entitlements from unproved delivery writes.
- Reviewability: the diff is bounded to delivery write predicates/guards, one shared aggregate helper guard, one focused contract test, and this closeout.

### Smells Removed

- Delivered quantity writes by line-item id only.
- Shipment item reads by shipment id only.
- Delivery status updates by shipment id only.
- Aggregate version bump on orders without active-row proof.
- Warranty entitlement creation after unproved delivered quantity writes.

### Deferred

- Returned shipment status and tracking-only shipment updates still have ID-only shipment writes and should be reviewed separately.
- `addTrackingEventHandler` remains a later small write-scope cleanup.
- Browser QA remains deferred because this was server write-scope behavior with no visible UI or hook contract change.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/orders/order-shipment-delivery-write-scope-contract.test.ts tests/unit/orders/order-shipment-status-serialization.test.ts tests/unit/orders/order-mutation-invalidation.test.tsx` - 3 files, 15 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: browser QA, `bun run build`, `bun run test:unit`, `bun run lint:reliability`, finance, document, release, and deploy gates because this slice did not change visible UI, build-time behavior, shared route/read contracts, financial reporting, document generation, release packaging, or deployment paths. Focused shipment status serialization evidence was included.

### Goal Adaptation

Declined. The standing maintainer process already covers safe mutation contracts, tenant isolation, entitlement/data integrity implications, operator-safe errors, meaningful tests, and risk-selected evidence.

### Residual Risk

Low for delivered shipment quantity and entitlement write ordering. Moderate for the remaining shipment-status file because returned status, tracking-only updates, and add-tracking-event still need bounded write-scope review.
