# Maintainer Sprint 15: Unpick Requires Canonical Serialized Allocations

Sprint 15 follows Sprint 14's picking allocation guard into unpicking. The target is the serialized deallocation path, where unpick could reconstruct allocations from legacy line-item serial strings and still change picked quantity when canonical deallocation evidence was missing.

Status: Closed after Issue 1.

## Business Value

Unpicking is the warehouse correction that releases a specific battery from a customer order. RENOZ should not reduce picked quantity or remove line serials unless the server can release the canonical serialized allocation and write the deallocated lineage event.

## Workflow Spine

```text
unpick order items
  -> order picking server function
  -> order line serialization requirement
  -> canonical active allocation read
  -> requested/FIFO serial selection
  -> release serialized allocation and deallocated lineage event
  -> line picked quantity and order pick status update
```

## Architecture Constraints

- Keep this slice inside the orders picking server boundary.
- Preserve existing route, container/page, hook, schema, database, mutation envelope, and cache contracts.
- Keep unpick tied to canonical `orderLineSerialAllocations`; do not repair legacy line-item serial strings inside fulfillment correction.
- Do not introduce a migration/backfill command in this sprint.

## Issue Ledger

### 1. Unpick Could Reconstruct Or Skip Serialized Allocation Evidence

Problem:

- When canonical allocation rows were unavailable, unpick reconstructed allocation candidates from `orderLineItems.allocatedSerialNumbers`.
- Those reconstructed candidates had blank serialized item ids and no current inventory id.
- The deallocation loop then attempted a direct serialized-item lookup and only released/wrote lineage when a serialized item id existed.
- That allowed picked quantity and line serial state to change without requiring canonical allocation rows and deallocation lineage.

Workflow protected:

unpick serialized order line -> canonical allocation read -> serial release selection -> allocation release -> deallocated lineage event -> picked quantity update.

Implemented slice:

- Removed the fallback that rebuilt unpick allocation candidates from legacy `allocatedSerialNumbers`.
- Added an operator-safe `ValidationError` when a serialized unpick has no canonical allocation records.
- Removed the direct serialized-item lookup fallback in unpick.
- Changed deallocation to require a canonical serialized allocation id and always write the release plus deallocated event.
- Added focused source contract coverage to prevent reintroducing reconstructed allocations or conditional deallocation skips.

Out of scope:

- A legacy allocation backfill or repair command.
- Pick allocation behavior, already closed in Sprint 14.
- Shipment, RMA, warranty, jobs, and source-of-stock serialized lookup behavior.
- Browser QA, because this was a server-side transaction invariant with no UI behavior change.

Closeout:

- Touched domains: orders unpick server flow, order picking serialization guard test, orders sprint evidence.
- Workflow protected: unpick order items -> canonical active allocation read -> serial release selection -> serialized allocation release -> deallocated lineage event -> picked quantity/status update.
- Business value protected: warehouse correction cannot free a battery from an order in line-item state while silently skipping canonical serialized deallocation evidence.
- Architecture standards checked: route, container/page, hook, schema, database, mutation envelope, and query/cache contracts were unchanged; unpick now treats canonical allocation rows as the source of truth.
- Tenant isolation and data integrity checked: org-scoped allocation join remains unchanged; missing canonical allocation data blocks before line picked quantity or allocated serial fields are changed.
- Query/cache contract checked: no cache changes; existing fulfillment mutation identity remains unchanged.
- Smells removed: reconstruction from legacy `allocatedSerialNumbers`; direct serialized-item lookup fallback during unpick; conditional `if (serializedItemId)` deallocation skip.
- Smells deferred: legacy repair/backfill workflow, source-of-stock upsert paths, warranty/jobs serialized lookups, and UI missing-product fallback paths.
- Gates run: focused picking/fulfillment tests (`4` files, `17` tests); focused ESLint; full orders unit suite (`34` files, `126` tests); TypeScript; full lint; reliability guards; diff checks.
- Gates skipped: browser QA, because this was a server-side transaction invariant with no UI behavior change.
- Goal adaptations: declined. The standing maintainer goal already covers serialized lineage continuity, transactional integrity, tenant isolation, operator-safe errors, meaningful tests, and evidence-based closeout.
- Residual risk: historical orders with line-item serial strings but no canonical allocation rows now require a repair/backfill workflow before unpick; warranty/jobs serialized lookup paths remain uneven.
