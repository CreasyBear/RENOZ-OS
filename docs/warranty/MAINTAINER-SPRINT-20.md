# Warranty Maintainer Sprint 20

This sprint follows Sprint 19's claim-submission lineage guard into delivery-backed warranty entitlements. The target is entitlement provisioning for captured serials, where serialized warranty entitlement rows could be created without a canonical serialized item link.

Status: Closed after Issue 1.

## Business Value

Delivery-backed entitlements are the warranty coverage bridge from shipped batteries to later support and claims. When a delivered entitlement has a captured serial, RENOZ should link it to the canonical serialized item record so future warranty, service, and support workflows can trace the physical unit.

## Workflow Spine

```text
shipment marked delivered
  -> shipment status server transaction
  -> warranty entitlement delivery helper
  -> shipment item serial capture
  -> canonical serialized item resolution with auto-upsert disabled
  -> serialized warranty entitlement row
```

## Architecture Constraints

- Keep this sprint inside the warranty entitlement helper used by shipment delivery.
- Preserve existing route, container/page, hook, schema, database tables, mutation envelope, query keys, and cache contracts.
- Preserve unitized `needs_review` fallback rows for missing or incomplete serial capture.
- Do not change shipment delivery status transitions, claim submission, bulk import, warranty activation, RMA, jobs, or UI surfaces in this sprint.
- Treat delivered-entitlement provisioning as a coverage workflow, not a source-of-stock workflow; do not auto-create canonical serialized records from entitlement provisioning.

## Issue Ledger

### 1. Serialized Delivery Entitlements Could Store Null Serialized Item IDs

Problem:

- `createEntitlementsForDeliveredShipmentTx` resolves each captured shipment serial through `findSerializedItemBySerial`.
- The lookup allowed default serialized auto-upsert behavior.
- If the lookup returned no serialized item, the entitlement row still inserted with `serializedItemId: null`.
- That weakened later warranty lineage because a serial-backed entitlement could exist without the canonical serialized item link.

Workflow protected:

shipment delivered -> captured serial entitlement provisioning -> canonical serialized item resolution -> serialized entitlement row.

Implemented slice:

- Disabled auto-upsert for delivery entitlement serialized lookups with `allowAutoUpsert: false`.
- Added an operator-safe `ValidationError` when a captured serial cannot resolve to a canonical serialized item.
- Changed serialized entitlement inserts to require `serializedItem.id`.
- Added focused source contract coverage to prevent nullable serialized item ids for captured serial entitlements.

Out of scope:

- Unitized fallback entitlements for missing or incomplete serial capture.
- Warranty bulk import's best-effort lineage write.
- Claim submission, already closed in Sprint 19.
- Shipment delivery UI and mutation cache behavior.
- Browser QA, because this was a server-side transaction invariant with no UI behavior change.

Closeout:

- Touched domains: warranty entitlement delivery helper, warranty entitlement serialization guard test, warranty sprint evidence.
- Workflow protected: shipment marked delivered -> warranty entitlement helper -> captured serial resolution -> serialized entitlement row with canonical serialized item id.
- Business value protected: delivered battery coverage records cannot silently lose their canonical serialized item link when a serial is captured.
- Architecture standards checked: route, container/page, hook, schema, database tables, mutation envelope, query keys, cache contracts, shipment delivery status behavior, and unitized review fallback behavior were unchanged.
- Tenant isolation and data integrity checked: org-scoped shipment, order, entitlement, and serialized item reads remain unchanged; unresolved captured serials block before serialized entitlement rows are inserted.
- Query/cache contract checked: no cache changes; existing shipment delivery and warranty read invalidation behavior remains unchanged.
- Smells removed: nullable `serializedItemId` for captured serial entitlement rows; entitlement provisioning auto-upsert fallback.
- Smells deferred: warranty bulk import still treats lineage as best effort, unitized fallback rows still need operator review, and jobs serialized lookup paths remain unaudited.
- Gates run: focused entitlement/lineage tests (`4` files, `7` tests); focused ESLint; full warranty unit suite (`32` files, `120` tests); TypeScript; full lint; reliability guards; diff checks.
- Gates skipped: browser QA, because this was a server-side transaction invariant with no UI behavior change.
- Goal adaptations: declined. The standing maintainer goal already covers serialized lineage continuity, transactional integrity, tenant isolation, operator-safe errors, meaningful tests, and evidence-based closeout.
- Residual risk: legacy delivered shipments with captured serials but missing canonical serialized items now require repair before entitlement provisioning can complete; bulk import and jobs serialized lineage still need hardening.
