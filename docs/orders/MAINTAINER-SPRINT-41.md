# Orders Maintainer Sprint 41

## Status

Closed in commit-ready state.

## Issue 1: Shipment Read Child Rows Prove Tenant Scope

### Problem

Shipment read handlers scoped the parent shipment or order to the active organization, but the child shipment item reads relied on `shipmentId` alone. The order shipment read also used shipment-derived line item ids to fetch picked/shipped quantities without re-proving tenant and order scope at the line lookup.

That made the read path weaker than the write, validation, and pending reservation paths hardened in the previous shipment sprints.

### Workflow Spine

Order fulfillment tab / shipment list
-> `useOrderShipments` or shipment detail caller
-> shipment read server function
-> tenant-scoped shipment/order read
-> shipment item child read
-> order line quantity lookup
-> pending shipment reservation summary
-> dispatch/delivery readiness flags
-> shipment query key cache surface.

### Touched Domains

- Orders shipment reads.
- Shipment item read-scope contracts.
- Order line quantity lookup for shipment readiness.
- Orders maintainer closeout docs.

### Business Value Protected

Fulfillment operators rely on shipment reads to decide whether a dispatch note or delivery note can be generated. Those reads should not depend on parent scope alone; every child query that feeds warehouse readiness should carry tenant and order evidence.

### Scope Constraints

- Do not change shipment schemas, hook APIs, query keys, cache invalidation, UI rendering, mutation behavior, shipment validation, finalization, delivery, status transition, documents, finance, or warranty behavior.
- Keep this as a read contract hardening slice, not a fulfillment UI refactor.

### Changes

- Scoped shipment detail item reads by shipment id and organization id.
- Scoped order shipment item batch reads by shipment ids and organization id.
- Scoped shipment line quantity lookups by line item ids, organization id, and order id.
- Added `order-shipment-read-scope-contract.test.ts` to lock the read-scope contract.

### Standards Checked

- Domain ownership: shipment read behavior remains in the Orders shipment read server function.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: checked fulfillment shipment list flow through `useOrderShipments`, centralized order shipment query keys, shipment read server function, shipment item/order line tables, and existing cache surface.
- Tenant isolation/data integrity: improved. Child shipment item and line quantity reads now carry tenant evidence instead of relying only on parent reads.
- Transactional inventory integrity: protected at the read/readiness boundary by ensuring dispatch readiness is computed from tenant/order-owned rows.
- Serialized lineage continuity: unchanged; no serial identity, allocation, or lineage writes changed.
- Honest UI states/operator-safe errors: unchanged at the component layer; readiness flags now receive stricter scoped data.
- Reviewability: bounded diff across one server read function, one source contract test, and this closeout.

### Smells Removed

- Shipment detail item read by shipment id only.
- Order shipment item batch read by shipment ids only.
- Shipment readiness line quantity lookup by line item ids only.

### Deferred

- Runtime DB-backed integration coverage for shipment reads remains a future hardening slice.
- Broader shipment document and support/warranty linkage reads remain separate domain reviews.
- Browser QA remains deferred because this slice does not change visible UI behavior.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/orders/order-shipment-read-scope-contract.test.ts tests/unit/orders/order-shipments-facade.test.ts tests/unit/orders/shipment-list.test.tsx tests/unit/orders/shipment-availability.test.ts tests/unit/orders/order-shipment-validation-contract.test.ts` - 5 files, 17 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: browser QA, `bun run build`, `bun run test:unit`, `bun run lint:reliability`, finance, document, release, and deploy gates because this slice did not change visible UI, build-time behavior, shared route contracts, financial reporting, document generation, release packaging, or deployment paths.

### Goal Adaptation

Declined. Sprint 40 already adapted the closeout evidence policy; this sprint follows the standing domain-sliced read-scope maintenance process.

### Residual Risk

Low for shipment read child-row tenant scope. Moderate for broader shipment read behavior because current evidence is source-level contract coverage plus adjacent shipment UI/read tests, not DB-backed integration coverage.
