# Orders Maintainer Sprint 39

## Status

Closed in commit-ready state.

## Issue 1: Draft Shipment Write Scope

### Problem

Draft shipment mutations still had weaker final write boundaries after the shipment status/finalization work. Creating a shipment with `saveToOrderShippingAddress` updated the order shipping address by order id only. Editing a pending shipment updated by shipment id only after a pre-read. Deleting a pending shipment deleted shipment items by shipment id before proving the shipment was still pending, then deleted the shipment by id only.

Draft shipments are not just UI drafts; they reserve picked stock, feed pending dispatch documents, and become the source for shipped/delivered workflows. Their write boundaries should prove tenant scope and pending state at the mutation point.

### Workflow Spine

Create/edit/delete pending shipment
-> `useCreateShipment` / shipment edit caller / `useDeleteShipment`
-> draft shipment server function
-> active order validation and shipment item validation
-> optional order shipping address persistence
-> pending shipment update/delete
-> shipment item persistence/deletion
-> shipment/order/fulfillment cache invalidation.

### Touched Domains

- Orders draft shipment create/edit/delete.
- Order shipping address persistence during shipment creation.
- Pending shipment item deletion.
- Draft shipment write-scope contract tests.
- Orders maintainer closeout docs.

### Business Value Protected

Pending shipment drafts are warehouse commitments waiting to be dispatched. Operators should not update a soft-deleted order address, edit a shipment that changed status, or delete shipment items before proving the shipment is still a tenant-owned pending draft.

### Scope Constraints

- Do not change shipment schemas, hook APIs, shipment validation, address source behavior, dispatch document semantics, shipment item payloads, or cache invalidation behavior.
- Do not change shipped/delivered/finalization/status behavior from Sprints 36-38.
- Do not touch inventory reservation math, serialized shipment finalization, finance, warranty entitlement creation, or browser UI.

### Changes

- Made `saveToOrderShippingAddress` update the active tenant-scoped order and return row evidence before creating the shipment.
- Made pending shipment edits update by id, organization id, and `status = 'pending'`.
- Added a stable validation guard for raced pending shipment edits.
- Moved delete verification inside the transaction with a row lock on the tenant shipment.
- Ensured shipment items are deleted only after the locked shipment is proved pending.
- Scoped shipment item deletion by `shipmentItems.organizationId`.
- Scoped final shipment delete by id, organization id, and `status = 'pending'`.
- Added `order-shipment-draft-write-scope-contract.test.ts`.

### Standards Checked

- Domain ownership: draft shipment behavior remains in the Orders draft shipment server function and shipment hooks.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: checked shipment hooks, draft shipment server function, order/shipment/shipment item tables, shipment validation, and existing shipment cache invalidation.
- Tenant isolation/data integrity: improved. Order address persistence, shipment edits, shipment item deletion, and shipment deletion now prove tenant scope; edit/delete also prove pending state.
- Query/cache contract: preserved. Existing shipment mutation invalidation still refreshes shipment, order, and fulfillment surfaces.
- Honest UI states/operator-safe errors: improved. Raced shipment state changes now return validation/not-found errors instead of mutating stale draft rows.
- Reviewability: the diff is bounded to draft shipment write predicates/guards, one focused source contract test, and this closeout.

### Smells Removed

- Order shipping address update by order id only during shipment creation.
- Pending shipment edit by shipment id only.
- Shipment item delete before transaction-local pending shipment proof.
- Shipment item delete by shipment id only.
- Pending shipment delete by shipment id only.

### Deferred

- Draft shipment creation still relies on existing shipment item validation for item/order ownership; that validation can receive its own focused review.
- Shipment read contracts remain separate bounded reviews.
- Browser QA remains deferred because this was server write-scope behavior with no visible UI or hook contract change.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/orders/order-shipment-draft-write-scope-contract.test.ts tests/unit/orders/order-mutation-invalidation.test.tsx tests/unit/orders/shipment-availability.test.ts tests/unit/orders/ship-order-item-selection.test.ts` - 4 files, 21 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: browser QA, `bun run build`, `bun run test:unit`, `bun run lint:reliability`, finance, document, release, and deploy gates because this slice did not change visible UI, build-time behavior, shared route/read contracts, financial reporting, document generation, release packaging, or deployment paths.

### Goal Adaptation

Declined. The standing maintainer process already covers safe mutation contracts, tenant isolation, data integrity, operator-safe errors, meaningful tests, and risk-selected evidence.

### Residual Risk

Low for draft shipment create/edit/delete write scope. Moderate for shipment item validation and shipment read paths, which should be reviewed as separate bounded shipment-domain slices.
