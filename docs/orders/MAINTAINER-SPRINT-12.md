# Maintainer Sprint 12: Returned Shipment Serialized Records Fail Closed

Sprint 12 follows Sprint 11's shipment finalization serialized-record guard into the shipment status workflow. The target is the returned-shipment transition, where serialized item status and lineage must not be skipped when a serial cannot be resolved.

Status: Closed after Issue 1.

## Business Value

Returned shipments represent customer-facing battery recovery truth. RENOZ should not mark a serialized shipment returned unless the server can update the matching serialized item record and write the returned lineage event for every returned serial.

## Workflow Spine

```text
update shipment status to returned
  -> order shipment status server function
  -> shipment items and serial numbers
  -> org-scoped serialized item resolution
  -> serialized item status update and returned lineage event
  -> shipment status activity and mutation response
```

## Architecture Constraints

- Keep this slice inside the orders shipment-status server boundary.
- Preserve existing route, hook, schema, database, mutation envelope, and cache contracts.
- Preserve the existing returned-shipment transaction boundary so unresolved serials roll back shipment status and activity writes.
- Do not change shipment finalization, picking, RMA, warranty, jobs, or UI status behavior in this sprint.

## Issue Ledger

### 1. Returned Shipments Could Skip Missing Serialized Item Records

Problem:

- `updateShipmentStatusHandler` resolves each returned shipment serial through `findSerializedItemBySerial`.
- Missing serialized item records were skipped with `continue`.
- That allowed a returned shipment status transition to proceed without updating serialized item state or writing returned lineage for the unresolved serial.

Workflow protected:

shipment status returned -> serialized item resolution -> serialized item returned state -> returned lineage event -> shipment status mutation.

Implemented slice:

- Changed returned-shipment status handling to throw an operator-safe `ValidationError` when a returned serial cannot be resolved to a serialized item record.
- Kept the failure inside the existing transaction so shipment status, activity logging, serialized state, and lineage writes remain atomic.
- Added focused source contract coverage to prevent reintroducing `if (!serializedItem) continue` in shipment status.

Out of scope:

- RMA create's best-effort serialized event write.
- Picking's legacy serialized-item upsert fallback and status side effects.
- Warranty and jobs serialized lookup behavior.
- Browser QA, because this was a server-side transaction invariant with no UI behavior change.

Closeout:

- Touched domains: orders shipment status server, shipment status source guard test, orders sprint evidence.
- Workflow protected: returned shipment status -> serialized item resolution -> serialized item status update -> returned lineage event -> shipment mutation response.
- Business value protected: battery returns cannot silently skip serialized state and lineage for unresolved serials.
- Architecture standards checked: route, container/page, hook, schema, database, mutation envelope, and query/cache contracts were unchanged; the existing transaction boundary now owns the unresolved-serial fail-closed invariant.
- Tenant isolation and data integrity checked: org-scoped `findSerializedItemBySerial` lookup remains unchanged; unresolved serials block before the returned shipment transaction can commit.
- Query/cache contract checked: no cache changes; existing shipment status mutation identity remains unchanged.
- Smells removed: silent `if (!serializedItem) continue` skip in returned shipment status handling.
- Smells deferred: RMA create event writes, picking serialized-item fallback, warranty claims/imports, job materials, and UI missing-product fallback paths still need follow-up audits.
- Gates run: focused orders serialization tests (`4` files, `14` tests); focused ESLint; full orders unit suite (`34` files, `123` tests); TypeScript; full lint; reliability guards; diff checks.
- Gates skipped: browser QA, because this was a server-side transaction invariant with no UI behavior change.
- Goal adaptations: declined. The standing maintainer goal already covers serialized lineage continuity, transactional integrity, tenant isolation, operator-safe errors, meaningful tests, and evidence-based closeout.
- Residual risk: serialized lookup behavior outside returned shipment status remains uneven across RMA, picking, warranty, jobs, and UI fallback paths.
