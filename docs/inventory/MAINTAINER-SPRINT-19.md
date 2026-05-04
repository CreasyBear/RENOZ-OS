# Inventory Maintainer Sprint 19

This sprint follows Sprint 18's alert lifecycle tenant-hardening. The target is serialized item lifecycle hardening: canonical serialized lineage CRUD, product/inventory ownership checks, read-model joins, and event deletion scope.

Status: Closed after Issue 1.

## Business Value

Serialized items are the lineage backbone for RENOZ Energy battery operations. They connect a physical battery serial to inventory, allocations, shipments, warranties, RMAs, and manual lifecycle notes. The system should not allow a serial to reference another tenant's product/inventory rows or drift into a product/inventory mismatch.

## Workflow Spine

inventory serialized-items page/list
-> serialized item hooks
-> `listSerializedItems`, `getSerializedItem`, `createSerializedItem`, `updateSerializedItem`, `deleteSerializedItem`, `addSerializedItemNote`
-> inventory read/manage permissions
-> organization-scoped serialized item reads
-> organization-bounded product/inventory/location/receipt joins
-> organization-validated product ownership
-> product-consistent inventory linkage
-> organization-scoped serialized item and event writes/deletes
-> existing serialized query-key invalidation.

## Architecture Constraints

- Keep this sprint to serialized item lifecycle tenant/data-integrity scope and static contract coverage.
- Preserve serialized status values, mutation response shape, event creation, allocation release behavior, query keys, cache invalidation, and UI.
- Do not broaden into order/shipment/warranty/RMA subquery read-model normalization, schema migrations, or browser UX polish.

## Issue Ledger

### 1. Serialized Item Lifecycle Needed Stronger Tenant and Product Boundaries

Problem:

- Serialized item list/detail relation joins used product, inventory, location, and receipt IDs without explicit organization predicates.
- Creating or updating a serialized item did not validate selected `productId` ownership.
- Updating `currentInventoryId` without changing `productId` could link a serial to an inventory row for a different product.
- Serialized item update/delete final writes used item/event IDs without carrying organization scope on the final write/delete.

Workflow protected:

serialized item CRUD -> organization-scoped serialized row -> product/inventory ownership validation -> lineage event continuity -> existing serialized cache invalidation.

Implemented slice:

- Added organization predicates to serialized item list/detail joins for products, inventory, warehouse locations, purchase order receipt items, and purchase order receipts.
- Added organization-scoped product validation to `createSerializedItem`.
- Added organization-scoped product validation to `updateSerializedItem` when `productId` changes.
- Added existing `productId` to update validation and made `currentInventoryId` product consistency check compare against `data.productId ?? existing.productId`.
- Added organization predicates to serialized item update writes.
- Added organization predicates to serialized item event deletes and serialized item deletes.
- Added a focused serialized item tenant-scope contract test covering read joins, product ownership, product-consistent inventory linkage, final writes/deletes, and lineage mutation references.

Out of scope:

- Changing serialized status transitions, allocation release semantics, mutation result payloads, query keys, cache invalidation, or UI.
- Normalizing the deeper order, shipment, warranty, and RMA subqueries in the serialized read model.
- Adding live database integration tests for cross-tenant serialized fixtures.
- Adding schema-level tenant constraints beyond existing RLS/foreign keys.

Closeout:

- Touched domains: inventory serialized item server functions, inventory serialized item tenant-scope tests, inventory sprint evidence.
- Workflow protected: serialized list/detail/create/update/delete/note -> tenant-scoped reads and writes -> serialized lineage event continuity.
- Business value protected: physical battery serial lineage now rejects cross-tenant product references and product/inventory mismatches while preserving existing operator workflows.
- Architecture standards checked: route/page/hook/query-key/cache flow is unchanged; server functions keep explicit inventory permissions; lineage mutations keep existing result and event contracts.
- Tenant isolation and data integrity checked: read joins are organization-bounded; product IDs are organization-validated; inventory linkage must match the chosen or existing product; final item/event writes and deletes are organization-scoped.
- Query/cache contract checked: no query keys, stale times, invalidation, optimistic updates, or cache mutation helpers changed.
- Smells removed: unbounded serialized relation joins; missing product ownership validation; product/inventory mismatch risk on update; ID-only serialized item update/delete and event delete writes.
- Smells deferred: deeper order/shipment/warranty/RMA subquery tenant normalization; live multi-tenant serialized integration fixtures.
- Gates run: focused serialized item tenant-scope contract test; focused serialized query/mutation tests; focused ESLint; full inventory suite; TypeScript; `git diff --check`.
- Gates skipped: browser QA, because this was a server tenant/data-integrity hardening change with no UI or interaction change.
- Goal adaptations: declined. The standing maintainer goal already requires tenant isolation, serialized lineage continuity, operator-safe errors, meaningful tests, reviewable domain slices, and closeout evidence.
- Residual risk: static contract coverage protects source patterns; runtime cross-tenant fixtures and deeper serialized read-model subquery normalization remain future hardening layers.
