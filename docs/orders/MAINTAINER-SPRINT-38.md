# Orders Maintainer Sprint 38

## Status

Closed in commit-ready state.

## Issue 1: Remaining Shipment Status Write Scope

### Problem

After the delivery slice, `order-shipments-status.ts` still had weaker write boundaries for non-delivery status workflows. Returned shipment status updated the shipment by id only, read shipment items by shipment id only, and updated returned serialized item state by serialized item id only. Generic status transitions updated the shipment and then inserted activity outside a transaction. `addTrackingEventHandler` also updated by shipment id only.

Those paths are smaller than delivery/finalization, but they still represent operator-visible shipment truth. Returned status also mutates serialized item state, so it needs tenant-scoped proof before lineage events are recorded.

### Workflow Spine

Shipment status update / returned shipment / tracking event
-> `useUpdateShipmentStatus` or tracking event caller
-> shipment status server function
-> state-scoped tenant shipment update
-> tenant-scoped shipment item read when needed
-> tenant-scoped serialized item returned-state write
-> activity or serialized lineage event
-> shipment/order/fulfillment cache invalidation.

### Touched Domains

- Orders shipment status mutations.
- Orders shipment tracking event mutation.
- Serialized item returned-state adjacency.
- Shipment status write-scope contract tests.
- Orders maintainer closeout docs.

### Business Value Protected

Shipment status is how operators understand where customer deliveries stand. Returned status must not mark a serial-backed battery returned unless the serialized item row is proved inside the same tenant boundary. Generic shipment status changes should not leave activity history disconnected from the shipment write.

### Scope Constraints

- Do not change status transition rules, idempotency behavior, hook APIs, returned shipment result shapes, serialized lookup semantics, or cache invalidation behavior.
- Do not change delivery confirmation or delivered status behavior from Sprint 37.
- Do not change shipment finalization/reopen behavior from Sprint 36.
- Do not rerun retired serialized gate packs; use focused shipment status serialization evidence.

### Changes

- Made returned shipment status update tenant-scoped and expected-status scoped.
- Scoped returned shipment item reads by `shipmentItems.organizationId`.
- Made returned serialized item status writes tenant-scoped and evidence-bearing.
- Guarded returned serialized item writes before recording returned lineage events.
- Moved generic shipment status updates and activity insert into one transaction with tenant/status-scoped update evidence.
- Made tracking event writes tenant-scoped and evidence-bearing.
- Added `order-shipment-status-write-scope-contract.test.ts`.

### Standards Checked

- Domain ownership: shipment status behavior remains in Orders shipment status functions and shipment hooks.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: checked shipment hooks, shipment status server function, shipment and shipment item tables, serialized item table, activity logging, and existing shipment cache invalidation.
- Tenant isolation/data integrity: improved. Returned and generic status writes now prove organization scope; returned serialized item updates now prove organization scope before lineage events.
- Serialized continuity: improved for returned shipments. Missing or raced serialized item updates now fail before a returned lineage event is inserted.
- Query/cache contract: preserved. Existing shipment mutation invalidation still refreshes shipment, order, and fulfillment surfaces.
- Honest UI states/operator-safe errors: improved. Raced status changes now fail with validation feedback instead of writing against stale shipment state.
- Reviewability: the diff is bounded to remaining shipment-status writes, one focused source contract test, and this closeout.

### Smells Removed

- Returned shipment update by shipment id only.
- Returned shipment item reads by shipment id only.
- Returned serialized item update by serialized item id only.
- Returned lineage event after an unproved serialized item update.
- Generic shipment status update and activity insert outside one transaction.
- Tracking event update by shipment id only.

### Deferred

- `addTrackingEventHandler` still has no idempotency key or optimistic event revision contract; this sprint only fixed tenant write scope.
- Shipment read paths and draft shipment update/delete paths remain separate bounded reviews.
- Browser QA remains deferred because this was server write-scope behavior with no visible UI or hook contract change.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/orders/order-shipment-status-write-scope-contract.test.ts tests/unit/orders/order-shipment-status-serialization.test.ts tests/unit/orders/order-shipment-delivery-write-scope-contract.test.ts tests/unit/orders/order-mutation-invalidation.test.tsx` - 4 files, 19 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: browser QA, `bun run build`, `bun run test:unit`, `bun run lint:reliability`, finance, document, release, and deploy gates because this slice did not change visible UI, build-time behavior, shared route/read contracts, financial reporting, document generation, release packaging, or deployment paths. Focused shipment status serialization evidence was included.

### Goal Adaptation

Declined. The standing maintainer process already covers safe mutation contracts, tenant isolation, serialized continuity when touched, operator-safe errors, meaningful tests, and risk-selected evidence.

### Residual Risk

Low for returned/generic shipment status write scope. Moderate for the broader shipment domain because draft shipment writes, shipment read contracts, and tracking event concurrency still need separate review.
