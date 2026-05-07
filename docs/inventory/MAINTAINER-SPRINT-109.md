# Inventory Maintainer Sprint 109: Product Movement Relation Scope

## Status

Closed in commit-ready state.

## Issue 1: Movement History Product And Location Joins Were ID-Only

### Problem

Sprint 106 aligned the product movement cache key with the movement read payload. The server read path still enriched organization-scoped movement rows by joining product and warehouse location metadata by ID only. The location movement read path used the same relation pattern.

### Workflow Spine

Product inventory movement history or warehouse location movement history
-> product inventory hook / movement query
-> `getProductMovements` or `getLocationMovements`
-> `inventory_movements`
-> active `products` and tenant-scoped warehouse `locations`
-> movement history rows.

### Touched Domains

- Product inventory server function.
- Product movement tenant-scope contract tests.
- Inventory sprint evidence.

### Business Value Protected

Movement history is audit evidence for battery stock: receiving, transfer, adjustment, picking, shipping, return, and correction events. Operators should not see movement rows enriched with product or location metadata outside the active workspace, and deleted products should not appear as active movement-history labels.

### Scope Constraints

- Do not change movement filters, response shape, pagination, sort order, hooks, query keys, cache invalidation, or UI.
- Do not change inventory writes, movement creation, valuation, finance, or serialized lineage behavior.
- Keep this as a server read-scope hardening slice for movement history relation joins.

### Changes

- Added `movementProductJoinCondition` for active tenant-scoped product metadata.
- Added `movementLocationJoinCondition` for tenant-scoped warehouse location metadata.
- Reused both helpers in `getProductMovements`.
- Reused both helpers in `getLocationMovements`.
- Added a focused source contract guarding movement-history relation joins.

### Standards Checked

- Domain ownership: product movement read metadata joins now live behind local product-inventory server helpers.
- Route -> container/page -> hook -> server -> schema/database -> query/cache policy: server read boundary hardened; hook/query-key/cache behavior unchanged.
- Tenant isolation/data integrity: movement rows, joined product metadata, and joined location metadata all remain under the authenticated organization.
- Query/cache contract: unchanged from Sprint 106; movement keys still include location filters where the payload does.
- UI states/error handling: movement rows continue to return the same shape, with inaccessible/deleted relation rows excluded by the read query.
- Reviewability: one server helper pair, two read-path join replacements, one contract, one closeout note.

### Smells Removed

- ID-only product joins in movement history reads.
- ID-only warehouse location joins in movement history reads.
- Soft-deleted products could still enrich movement history rows.

### Deferred

- `getLocationInventory` still has ID-only product joins and should be handled as a separate location inventory read-model sprint.
- Aggregated product movement history uses raw SQL and does not join product/location metadata; any future metadata enrichment there should carry tenant scope explicitly.
- Browser QA was not selected because this is a server read-scope hardening slice with no intended layout change.

### Gates

- Passed: focused product movement tenant-scope contract.
- Passed: focused ESLint on touched server function and test.
- Passed: `bun run typecheck`.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. Serialized gates remain retired and this sprint does not change serialized lineage behavior.

### Residual Risk

Low for movement-history relation scope. Existing movement rows whose product has been soft-deleted may no longer appear in these enriched movement-history reads; that aligns the UI with active product metadata semantics.
