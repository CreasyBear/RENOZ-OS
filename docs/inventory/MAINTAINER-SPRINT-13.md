# Inventory Maintainer Sprint 13

This sprint follows Sprint 12's alert permission cleanup. The target is warehouse-location read permission hygiene: location list/detail/hierarchy/utilization reads should declare their inventory permission boundary instead of relying on authentication-only defaults.

Status: Closed after Issue 1.

## Business Value

Warehouse locations underpin receiving, transfers, stock counts, fulfillment, and WMS visibility. RENOZ operators need these reads to be available to inventory readers, while location creation and structural edits remain manage operations. The permission contract should be visible at the server boundary.

## Workflow Spine

inventory location route/picker/dashboard
-> location hook
-> location server function
-> explicit inventory permission gate
-> organization-scoped location/inventory/product query
-> operator receiving/transfer/count/WMS decision.

## Architecture Constraints

- Keep this sprint to inventory location read permissions and directly related read joins.
- Use `PERMISSIONS.inventory.read` for simple location, cursor location, warehouse location, hierarchy, and utilization reads.
- Preserve `PERMISSIONS.inventory.manage` for location creation/update/delete and bulk location import.
- Do not change location schemas, query keys, cache policy, UI, mutation payloads, or location hierarchy behavior.
- Add focused static tests so future location endpoints do not regress to bare `withAuth()`.

## Issue Ledger

### 1. Warehouse Location Reads Need Explicit Inventory Read Permission

Problem:

- Several location read server functions used bare `withAuth()`.
- The queries were organization-scoped, but the permission contract was implicit.
- Location detail/utilization read joins touched inventory and product records; those joins should also make tenant scope explicit.

Workflow protected:

location picker/list/detail/utilization hook -> location server function -> permission gate -> organization-scoped location/inventory/product read.

Implemented slice:

- Updated location read functions to use `withAuth({ permission: PERMISSIONS.inventory.read })`.
- Preserved existing `PERMISSIONS.inventory.manage` gates on create/update/delete/bulk import.
- Added an organization-scoped product join for location detail inventory contents.
- Added an organization-scoped inventory join for location utilization aggregates.
- Added a focused permission contract test for read/manage counts and scoped read joins.

Out of scope:

- Changing role-to-permission mappings.
- Changing location schemas, hierarchy SQL behavior, mutation payloads, query keys, or cache invalidation.
- Broad permission cleanup across other inventory files or other domains.
- UI/browser QA.

Closeout:

- Touched domains: inventory location server functions, inventory location permission tests, inventory sprint evidence.
- Workflow protected: inventory location UI/hook -> location server function -> explicit inventory permission -> tenant-scoped location/inventory/product reads.
- Business value protected: receiving, transfer, count, and WMS location data now has explicit inventory read gating while location structure changes remain manage operations.
- Architecture standards checked: route/container/hook/query-key flow is unchanged; server functions now state read/manage permission contracts; read joins touched by this slice are tenant-scoped.
- Tenant isolation and data integrity checked: base location queries already filter by `ctx.organizationId`; location detail product join and utilization inventory join now also include organization filters; no transactions, inventory movements, serialized lineage, cost layers, valuation, or location mutation behavior changed.
- Query/cache contract checked: no query keys, stale times, invalidation, optimistic updates, or cache mutation helpers changed.
- Smells removed: bare authentication-only location reads and implicit tenant assumptions in location read joins.
- Smells deferred: other inventory modules and other domains still need their own domain-sliced permission audits.
- Gates run: focused location permission/schema/query tests, focused ESLint, full inventory tests, TypeScript, `git diff --check`.
- Gates skipped: browser QA, because this was a server permission and read-join contract change with no UI or interaction change.
- Goal adaptations: declined. The standing maintainer goal already requires tenant isolation, explicit contracts, meaningful tests, and reviewable domain slices.
- Residual risk: role-permission assignment quality is outside this slice; this only makes the location server boundary explicit.
