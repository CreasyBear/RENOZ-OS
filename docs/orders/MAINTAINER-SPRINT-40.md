# Orders Maintainer Sprint 40

## Status

Closed in commit-ready state.

## Issue 1: Shipment Validation Aggregates Duplicate Line Requests

### Problem

Shipment item validation checked each requested shipment row independently. A pending shipment draft could include duplicate rows for the same order line and pass picked-availability or reserved-picked checks even when the aggregate requested quantity exceeded what was actually available. Serialized rows had the same class of gap for duplicate serials split across multiple shipment rows.

Pending shipment reservation reads also joined shipment items without explicitly requiring the shipment item row to belong to the same organization.

### Workflow Spine

Create/update pending shipment
-> `validateShipmentItems`
-> order line/product serialization read
-> pending shipment reservation summary
-> active picked reservation read
-> aggregate requested line quantities and serials
-> shipment item persistence
-> shipment/order/fulfillment cache invalidation.

### Touched Domains

- Orders shipment item validation.
- Pending shipment reservation reads.
- Shipment validation source contract tests.
- Orders maintainer closeout docs.

### Business Value Protected

Pending shipment drafts are warehouse commitments. Operators should not be able to over-request picked stock by splitting one order line across multiple shipment rows, and serialized stock should not be dispatchable twice inside the same draft.

### Scope Constraints

- Do not change shipment schemas, hook APIs, cache invalidation, finalization, delivery, status transition, or dispatch document behavior.
- Do not change inventory movement writes, order picking writes, finance, warranty entitlement creation, or visible UI.
- Keep this as a validation/read-scope slice rather than a broader shipment refactor.

### Changes

- Aggregated requested shipment quantity by `orderLineItemId` before picked-availability checks.
- Used aggregate requested quantity when validating active picked inventory reservations.
- Improved the reserved-picked validation message so it reports aggregate requested quantity.
- Tracked requested serials by `orderLineItemId` and rejected duplicate serials across shipment rows for the same line.
- Added `shipmentItems.organizationId = params.organizationId` to pending shipment reservation item reads.
- Added `order-shipment-validation-contract.test.ts` to lock the validation and tenant-scope contract.

### Standards Checked

- Domain ownership: shipment validation remains in Orders server functions; pending reservation scope remains in the existing pending reservation helper.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: checked shipment mutation flow through validation and existing cache invalidation; no hook or query-key contract changed.
- Tenant isolation/data integrity: improved. Pending reservation reads now prove shipment item tenant scope, and validation now reasons over aggregate line requests.
- Transactional inventory integrity: improved at the shipment draft validation boundary by preventing over-requested picked/reserved quantities before writes proceed.
- Serialized lineage continuity: protected only within this slice's validation boundary by rejecting duplicate requested serials across shipment rows.
- Honest UI states/operator-safe errors: improved. Operators get validation failures for aggregate over-requests instead of stale per-row acceptance.
- Reviewability: bounded diff across two server functions, one focused contract test, and this closeout.

### Smells Removed

- Per-row shipment quantity validation that ignored duplicate rows for the same order line.
- Per-row reserved picked inventory validation that ignored aggregate requested quantity.
- Serialized duplicate detection limited to a single shipment row.
- Pending reservation item read without an explicit shipment item tenant predicate.

### Deferred

- Runtime DB-backed integration coverage for shipment validation remains a future hardening slice.
- Broader shipment read-scope contracts remain separate bounded reviews.
- Browser QA remains deferred because this slice does not change visible UI behavior.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/orders/order-shipment-validation-contract.test.ts tests/unit/orders/shipment-availability.test.ts tests/unit/orders/ship-order-item-selection.test.ts tests/unit/orders/order-line-serialization.test.ts tests/unit/orders/order-shipment-draft-write-scope-contract.test.ts` - 5 files, 19 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: browser QA, `bun run build`, `bun run test:unit`, `bun run lint:reliability`, finance, document, release, and deploy gates because this slice did not change visible UI, build-time behavior, shared route/read contracts, financial reporting, document generation, release packaging, or deployment paths.

### Goal Adaptation

Accepted. Retired the serialized evidence pack as routine closeout evidence. Future closeouts should use focused serial evidence only when the slice directly touches serial identity, allocation, shipment, warranty, or lineage behavior.

### Residual Risk

Low for duplicate line over-request and duplicate serial validation inside shipment drafts. Moderate for broader shipment validation behavior because current evidence is source-level contract coverage plus adjacent unit coverage, not a DB-backed integration test.
