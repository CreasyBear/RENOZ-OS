# Inventory Maintainer Sprint 14

This sprint follows Sprint 13's warehouse-location read permission cleanup. The target is mutation tenant-hardening: location write paths should carry organization scope through the final write/delete and hierarchy checks, not only through the preflight read.

Status: Closed after Issue 1.

## Business Value

Warehouse locations are operational structure for receiving, transfers, counts, fulfillment, and WMS reporting. A location write path should be tenant-safe at every database operation, including final updates/deletes and hierarchy checks. That keeps RENOZ warehouse setup trustworthy as the platform scales across tenants.

## Workflow Spine

location admin route/form
-> location mutation hook
-> location server function
-> explicit inventory manage permission
-> organization-scoped preflight read
-> organization-scoped update/delete/hierarchy query
-> warehouse structure change.

## Architecture Constraints

- Keep this sprint to inventory location mutation tenant-hardening.
- Do not change route, hook, schema, query key, cache invalidation, mutation payloads, hierarchy response shapes, or UI.
- Keep existing `PERMISSIONS.inventory.manage` gates.
- Add organization scope to final writes/deletes and hierarchy child/descendant checks.
- Add focused static tests so future location writes do not regress to ID-only database operations.

## Issue Ledger

### 1. Location Writes Need Organization Scope Through Final DB Operations

Problem:

- Location update/delete functions verified the target row by organization, but some final writes/deletes used only the row ID.
- Warehouse hierarchy circular checks and child checks used parent IDs without explicitly carrying organization scope.
- IDs are globally unique in practice, but production tenant isolation should be expressed in every relevant DB operation.

Workflow protected:

location mutation hook -> location server function -> manage permission -> tenant-scoped update/delete/hierarchy operation.

Implemented slice:

- Scoped simple location update and delete writes by both ID and organization ID.
- Scoped warehouse location update and delete writes by both ID and organization ID.
- Scoped warehouse child-count deletion preflight by parent ID and organization ID.
- Scoped warehouse descendant recursive CTE by organization ID.
- Extended the location permission contract test to cover mutation write and hierarchy tenant-scope patterns.

Out of scope:

- Changing location route/hook behavior.
- Changing cache invalidation or mutation contracts.
- Changing hierarchy response shape or write payload schemas.
- Broad tenant-hardening across other inventory modules.
- Browser QA.

Closeout:

- Touched domains: inventory location server functions, inventory location permission tests, inventory sprint evidence.
- Workflow protected: location admin mutation -> permission gate -> tenant-scoped location update/delete/hierarchy check.
- Business value protected: warehouse location structure changes now preserve tenant boundaries through final database operations, not only preflight reads.
- Architecture standards checked: route/container/hook/query-key flow is unchanged; mutation permissions are unchanged; final DB writes/deletes and hierarchy checks are now tenant-scoped.
- Tenant isolation and data integrity checked: added organization predicates to location update/delete, warehouse update/delete, child-count preflight, and descendant CTE; no inventory quantities, movements, serialized lineage, cost layers, or valuation behavior changed.
- Query/cache contract checked: no query keys, stale times, invalidation, optimistic updates, or cache mutation helpers changed.
- Smells removed: ID-only final writes/deletes and hierarchy checks after tenant-scoped preflight reads.
- Smells deferred: other inventory modules still have update/delete paths that deserve their own domain-sliced tenant-hardening audit.
- Gates run: focused location permission/schema/query tests, focused ESLint, full inventory tests, TypeScript, `git diff --check`.
- Gates skipped: browser QA, because this was a server tenant-scope hardening change with no UI or interaction change.
- Goal adaptations: declined. The standing maintainer goal already requires tenant isolation, safe mutation contracts, meaningful tests, and reviewable domain slices.
- Residual risk: this is static contract coverage; integration coverage against a live multi-tenant dataset remains a future hardening layer.
