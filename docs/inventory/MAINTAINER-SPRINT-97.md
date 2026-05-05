# Inventory Maintainer Sprint 97

This sprint follows Sprint 96's stock-in trace refresh. The target is the authoritative PO receipt server path: single and bulk receiving must fail closed when product serialization metadata is unavailable for linked purchase-order lines.

Status: Closed after Issue 1.

## Business Value

RENOZ uses serialized battery lineage for receiving, support, warranty, RMA, and recovery workflows. The server cannot safely receive battery stock unless it knows whether each linked product requires serial numbers.

## Workflow Spine

PO receipt or bulk PO receive
-> PO items
-> org-scoped product serialization read
-> fail-closed serialization requirement map
-> serial validation
-> `receiveGoods` inventory mutation.

## Architecture Constraints

- Keep the final invariant on the server, even though the UI already blocks on serialization read errors.
- Preserve tenant-scoped product reads.
- Do not change route, hook, cache, schema, or database contracts for this slice.
- Keep single and bulk PO receipt behavior aligned through one supplier-domain helper.

## Issue Ledger

### 1. PO Receipt Server Defaulted Missing Product Serialization Metadata To Non-Serialized

Problem:

- `receiveGoods` and `bulkReceiveGoods` built product serialization maps from an org-scoped product read.
- Missing linked product rows were treated as `false` through `productSerializationMap.get(...) ?? false`.
- That fail-open fallback could bypass serial validation when the authoritative server path could not prove a product's serialization requirement.

Workflow protected:

single or bulk PO receipt -> product serialization requirement read -> serialized quantity validation -> inventory write.

Implemented slice:

- Added `receive-goods-serialization` helper utilities for deduping linked product IDs and building a fail-closed serialization requirement map.
- Changed `receiveGoods` to throw `invalid_serial_state` when linked product serialization metadata is missing.
- Changed `bulkReceiveGoods` to use the same fail-closed requirement map before per-row receive delegation.
- Removed the single and bulk `?? false` serialization fallbacks.
- Added unit coverage for the helper and a source contract guard covering both server entry points.

Out of scope:

- Direct database integration tests for missing product rows.
- Changing product read APIs or database schema.
- UI behavior and cache invalidation, because those contracts were not changed.
- Auditing non-receiving serialized flows for similar fail-open assumptions.

Closeout:

- Touched domains: supplier PO receive server, supplier bulk receive server, supplier serialization helper/tests, inventory sprint evidence.
- Workflow protected: single and bulk PO receipt -> product serialization requirement read -> serial validation -> inventory and finance writes.
- Business value protected: prevents receiving serialized battery stock without serial lineage when product metadata is unavailable.
- Architecture standards checked: server boundary owns the final fail-closed invariant; UI, hook, schema, database, query key, and cache contracts were unchanged; supplier-domain helper keeps single and bulk paths aligned.
- Tenant isolation and data integrity checked: no org predicates were removed; existing org-scoped product reads are preserved; missing linked product metadata blocks before mutation.
- Query/cache contract checked: no query key or cache invalidation changes.
- Smells removed: `productSerializationMap.get(...) ?? false` fail-open assumptions in single and bulk PO receipt.
- Smells deferred: direct integration database coverage for missing linked product rows; other serialized domains may still contain similar fallback assumptions and need later audit.
- Gates run: focused supplier/procurement tests (`5` files, `21` tests); focused ESLint; full lint; reliability guards; inventory + procurement + supplier + purchase-order unit suites (`110` files, `347` tests); TypeScript.
- Gates skipped: browser QA, because this was a server-side invariant change with no UI behavior change.
- Goal adaptations: declined. The standing maintainer goal already covers serialized lineage continuity, tenant isolation, operator-safe errors, meaningful tests, and evidence-based closeout.
- Residual risk: non-receiving serialized flows may still default missing product metadata to false; a later sprint should audit order picking, RMA, warranty, and support serialized paths.
