# Orders Maintainer Sprint 36

## Status

Closed in commit-ready state.

## Issue 1: Shipment Finalization Write Scope

### Problem

Shipment finalization had the same warehouse-truth smell fixed in picking: active tenant-scoped shipment validation happened before the transaction, but finalization writes inside the transaction used weaker predicates. `markShipmentAsShipped` updated the shipment by id only, read shipment items by shipment id only, and incremented shipped line-item quantities by line-item id only. `reopenShipment` read shipment items by shipment id only, decremented shipped quantities by line-item id only, and restored the shipment to pending by shipment id only.

Those workflows sit at the boundary between orders, warehouse inventory, serialized lineage, fulfillment status, and operator-visible cache refreshes. The final write boundary should prove shipment state, tenant scope, and order-line ownership before mutating shipped quantities or returning fulfillment inventory identity.

### Workflow Spine

Pending shipment completion / fulfillment import / reopen shipment
-> `useMarkShipped` / `useReopenShipment`
-> shipment finalization server function
-> shipment state transition
-> tenant-scoped shipment item read
-> order-owned shipped quantity write
-> inventory consumption/restoration and serialized allocation/release
-> order fulfillment status recompute
-> fulfillment inventory mutation identity
-> shipment, order, fulfillment, inventory, valuation, serial availability, and product cache invalidation.

### Touched Domains

- Orders shipment finalization.
- Orders shipment reopen.
- Fulfillment import mark-shipped path.
- Inventory consumption/restoration adjacency.
- Serialized shipment finalization/reopen adjacency.
- Orders shipment finalization write-scope contract tests.
- Orders maintainer closeout docs.

### Business Value Protected

Shipment finalization records what RENOZ has actually dispatched and what stock value left the warehouse. Reopen reverses that truth for correction. Operators should not be able to get successful shipped/reopened states if the shipment changed mid-operation, shipment items are not tenant-scoped, or line-item shipped quantities cannot be proved against the owning order.

### Scope Constraints

- Do not change shipment schemas, hook APIs, result shapes, fulfillment import input/output, quantity math, inventory consumption/restoration planning, serialized lineage helper behavior, or cache invalidation behavior.
- Do not change delivery confirmation/status-update workflows; those include delivery and entitlement side effects and remain a separate slice.
- Do not rerun retired serialized gate packs; use focused shipment serialization evidence for the touched workflow.

### Changes

- Made `markShipmentAsShipped` update only the tenant-scoped pending shipment and fail with stable pending-state feedback if the row changed.
- Scoped mark-shipped shipment item reads by `shipmentItems.organizationId`.
- Scoped mark-shipped line-item shipped quantity writes by line item id, parent order id, and organization id.
- Added guards before product/serialization reads when shipped quantity writes fail.
- Scoped reopen shipment item reads by `shipmentItems.organizationId`.
- Scoped reopen reverse shipped-quantity writes by line item id, parent order id, and organization id.
- Scoped reopen product/serialization reads by line item id, parent order id, and organization id.
- Made reopen final shipment update state-scoped and evidence-bearing before fulfillment status recompute.
- Added `order-shipment-finalization-write-scope-contract.test.ts`.

### Standards Checked

- Domain ownership: shipment finalization remains in the Orders shipment finalization server function and `use-shipments` hook.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: checked pending shipment completion hook path, shipment hooks, shipment finalization server function, shipment item table, order-line writes, fulfillment identity, existing shipment inventory invalidation, and centralized query keys.
- Tenant isolation/data integrity: improved. Shipment item reads and shipped-quantity writes now prove organization scope; line-item writes also prove parent order ownership.
- Inventory/serialized continuity: preserved. Inventory consumption/restoration and serialized allocation/release semantics were not changed; focused shipment serialization tests still cover fail-closed serialized item handling.
- Query/cache contract: preserved. Mark-shipped and reopen still invalidate shipment/order/fulfillment surfaces plus inventory valuation, serial availability, and affected product stock keys through existing helpers.
- Honest UI states/operator-safe errors: improved. Raced shipment finalization now gets stable validation feedback rather than silently writing against a stale shipment state.
- Reviewability: the diff is bounded to shipment finalization write predicates/guards, one focused source contract test, and this closeout.

### Smells Removed

- Mark-shipped shipment update by id only.
- Shipment item reads by shipment id only.
- Mark-shipped/reopen shipped quantity writes by line-item id only.
- Reopen shipment status update by shipment id only.
- Product/serialization reads after an unproved shipped quantity write.

### Deferred

- Delivery confirmation and generic shipment status updates still have ID-only delivered quantity and shipment status writes; they should be the next bounded shipment slice because they also create warranty entitlements.
- Inventory row updates inside shipment finalization still rely on prior organization-scoped row locks; final inventory write predicates should be reviewed in an inventory/valuation-focused slice.
- Browser QA remains deferred because this was server write-scope behavior with no visible UI or hook contract change.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/orders/order-shipment-finalization-write-scope-contract.test.ts tests/unit/orders/order-shipment-finalization-serialization.test.ts tests/unit/orders/fulfillment-import-result-feedback-contract.test.ts tests/unit/orders/order-mutation-invalidation.test.tsx` - 4 files, 19 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: browser QA, `bun run build`, `bun run test:unit`, `bun run lint:reliability`, finance, document, release, and deploy gates because this slice did not change visible UI, build-time behavior, shared route/read contracts, financial reporting, document generation, release packaging, or deployment paths. Focused serial evidence was included through the shipment finalization serialization contract test.

### Goal Adaptation

Declined. The standing maintainer process already covers safe mutation contracts, tenant isolation, data integrity, inventory/serialized continuity when touched, operator-safe errors, meaningful tests, and risk-selected evidence.

### Residual Risk

Low for mark-shipped and reopen shipment shipped-quantity write scope. Moderate for the broader shipment domain because delivery confirmation/status updates and inventory final-write predicates still need their own scoped reviews.
