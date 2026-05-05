# Maintainer Sprint 13: RMA Create Serialized Lineage Fails Closed

Sprint 13 follows the shipment serialized-record guards into RMA creation. The target is the RMA request event write, where a serial-backed RMA line could be created without a matching serialized lineage event if the serialized item lookup failed.

Status: Closed after Issue 1.

## Business Value

RMA creation is the start of a customer-facing battery recovery workflow. RENOZ should not create a serial-backed RMA that loses the serialized lineage event tying the RMA line to the physical battery.

## Workflow Spine

```text
create RMA
  -> RMA server function
  -> order line serialization requirement
  -> shipped serial validation
  -> RMA line insert
  -> org-scoped serialized item resolution
  -> rma_requested serialized lineage event
```

## Architecture Constraints

- Keep this slice inside the RMA server boundary shared by orders/support.
- Preserve existing route, container/page, hook, schema, database, mutation envelope, and cache contracts.
- Keep existing shipped-serial validation and active-claim validation unchanged.
- Do not change RMA receive, shipment status, picking, warranty, jobs, or UI RMA selection behavior in this sprint.

## Issue Ledger

### 1. RMA Create Could Treat Serialized Lineage As Best Effort

Problem:

- `createRmaHandler` validates serialized RMA serials against shipped shipment serials.
- After inserting RMA line items, it resolves each serial through `findSerializedItemBySerial`.
- If that lookup failed, the code skipped the lineage write by wrapping `addSerializedItemEvent` in `if (serializedItem)`.
- That allowed a serial-backed RMA to exist without the `rma_requested` lineage event.

Workflow protected:

RMA create -> serialized shipped serial validation -> RMA line insert -> serialized item resolution -> `rma_requested` event.

Implemented slice:

- Changed RMA creation to throw an operator-safe `ValidationError` when an RMA line serial cannot be resolved to a serialized item record.
- Moved `addSerializedItemEvent` out of the optional branch so lineage is required for every serial-backed RMA line.
- Added focused source contract coverage to prevent reintroducing optional serialized lineage event writes in RMA create.

Out of scope:

- RMA receive inventory restoration and finance paths.
- Picking's legacy serialized-item upsert fallback.
- Warranty claims/imports and job materials serialized lookup behavior.
- UI RMA line-item normalization and order detail missing-product fallbacks.

Closeout:

- Touched domains: RMA create server flow, orders/support RMA serialization guard test, orders sprint evidence.
- Workflow protected: create RMA -> order line serialization requirement -> shipped serial validation -> RMA line insert -> serialized item resolution -> `rma_requested` lineage event.
- Business value protected: serial-backed battery RMA requests cannot be created without the serialized lineage event that anchors the physical unit to the recovery workflow.
- Architecture standards checked: route, container/page, hook, schema, database, mutation envelope, and query/cache contracts were unchanged; the existing RMA create transaction now owns the unresolved-serial fail-closed invariant.
- Tenant isolation and data integrity checked: org-scoped `findSerializedItemBySerial` lookup remains unchanged; unresolved serials block before the RMA transaction can commit.
- Query/cache contract checked: no cache changes; existing RMA mutation identity remains unchanged.
- Smells removed: optional `if (serializedItem)` lineage write in RMA create.
- Smells deferred: picking serialized-item fallback, warranty claims/imports, job materials, UI missing-product fallback paths, and orders UI/doc tests showing instability under heavy concurrent suite load.
- Gates run: focused RMA/support tests (`4` files, `18` tests); focused ESLint; full support unit suite (`36` files, `156` tests); full orders unit suite rerun cleanly (`34` files, `124` tests); isolated rerun of prior failing orders UI/doc files (`3` files, `5` tests); TypeScript; full lint; reliability guards; diff checks.
- Gates skipped: browser QA, because this was a server-side transaction invariant with no UI behavior change.
- Goal adaptations: declined. The standing maintainer goal already covers serialized lineage continuity, transactional integrity, tenant isolation, operator-safe errors, meaningful tests, and evidence-based closeout.
- Residual risk: serialized lookup behavior remains uneven in picking, warranty, jobs, and some UI fallback paths; broad concurrent unit-suite execution can still expose unrelated test isolation or performance instability.
