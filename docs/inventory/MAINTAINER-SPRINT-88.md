# Inventory Maintainer Sprint 88

This sprint follows Sprint 87's shared serialization error boundary extraction. The target is product serialization read fanout hygiene: repeated PO lines for the same product should not create duplicate product-detail reads or duplicate serialization errors.

Status: Closed after Issue 1.

## Business Value

Battery purchase orders can contain repeated lines for the same SKU. Receiving should determine serial requirements once per product, not once per line, so the workflow stays fast and error states stay readable.

## Workflow Spine

PO line product ids
-> product serialization hook
-> unique product-detail query keys
-> serialization map
-> receiving serial requirement gate
-> bulk/single receive dialog.

## Architecture Constraints

- Keep this sprint to the shared product serialization hook.
- Preserve the hook return contract, query keys, stale time, read normalization, and retry behavior from Sprint 85.
- Preserve bulk and single receiving behavior from Sprints 85-87.

## Issue Ledger

### 1. Product Serialization Hook Queried Duplicate Product IDs

Problem:

- `useProductSerialization` built one query per `productIds` entry.
- Single and bulk PO receiving can include repeated product ids from repeated line items.
- Duplicate fanout can waste product-detail reads and duplicate error rows for the same product requirement failure.

Workflow protected:

PO items -> product id list -> product serialization reads -> serial requirement map -> receive dialog.

Implemented slice:

- Deduplicated non-empty product ids inside `useProductSerialization` before building `useQueries`.
- Kept the output `serializationMap` and `errors` keyed by product id.
- Added focused coverage proving repeated product ids produce a single product detail read.

Out of scope:

- Broader product detail query caching strategy.
- Browser QA of receiving dialogs.
- Server receive mutation behavior.

Closeout:

- Touched domains: purchase-order product serialization hook, purchase-order hook tests, inventory sprint evidence.
- Workflow protected: PO line ids -> unique product serialization reads -> serial requirement map -> receiving serial gate.
- Business value protected: repeated battery SKU lines no longer create unnecessary product serialization reads or duplicate requirement errors.
- Architecture standards checked: hook owns read fanout normalization; callers keep their existing container/wrapper responsibilities; server/schema/database boundaries unchanged.
- Tenant isolation and data integrity checked: no database predicates, writes, transactions, finance behavior, or serialized inventory writes changed.
- Query/cache contract checked: query key remains `queryKeys.products.detail(productId)`; stale time, error normalization, retry, and consumer cache behavior are unchanged.
- Smells removed: duplicate product detail read fanout and duplicate product serialization error entries for repeated line ids.
- Smells deferred: browser QA of receiving overlays; no new shared abstraction until additional hook fanout patterns prove duplication.
- Gates run: focused hook/wrapper/dialog tests (`3` files, `15` tests); focused ESLint; procurement + purchase-order + supplier + inventory unit suites (`106` files, `330` tests); TypeScript.
- Gates skipped: browser QA, because this was a hook fanout normalization with existing receiving component coverage.
- Goal adaptations: declined. The standing maintainer goal already covers query/cache policy, serialized lineage continuity, meaningful tests, and evidence-based closeout.
- Residual risk: product-detail query caching still depends on TanStack Query behavior; integration profiling would be useful only if receiving large POs becomes slow in practice.
