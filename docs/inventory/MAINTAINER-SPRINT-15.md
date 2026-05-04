# Inventory Maintainer Sprint 15

This sprint follows Sprint 14's warehouse-location mutation tenant-hardening. The target is transfer tenant-hardening: transfer reads are already organization-scoped, but final inventory updates inside the transfer transaction should also carry organization scope.

Status: Closed after Issue 1.

## Business Value

Transfers move batteries between warehouse locations and preserve cost layers, valuation, and serialized lineage. A transfer mutation should remain tenant-safe through every database operation, not only through initial locked reads. This protects warehouse truth for RENOZ receiving, fulfillment, service recovery, and stock control workflows.

## Workflow Spine

transfer dialog/form
-> transfer mutation hook
-> `transferInventory`
-> inventory transfer permission
-> transaction and organization context
-> locked source/destination inventory reads
-> organization-scoped final updates
-> movements, cost layers, valuation, serialized lineage
-> cache refresh via mutation result metadata.

## Architecture Constraints

- Keep this sprint to inventory transfer final update tenant scope and static contract coverage.
- Preserve transfer SQL, movement creation, cost-layer movement, valuation recompute, serialized lineage events, mutation response shape, query keys, cache invalidation, and UI.
- Do not change quantity math, transfer validation, or finance metadata.
- Add focused tests so future transfer edits do not regress to ID-only final inventory updates.

## Issue Ledger

### 1. Transfer Final Inventory Updates Need Organization Scope

Problem:

- Transfer source/destination rows were selected with organization predicates and row locks.
- Some final `inventory` updates used only the inventory row ID.
- IDs are globally unique in practice, but the production tenant-invariant should be explicit on final writes inside stock-moving transactions.

Workflow protected:

transfer mutation -> transaction -> locked inventory rows -> tenant-scoped final updates -> movement/cost-layer/lineage continuity.

Implemented slice:

- Added `inventory.organizationId = ctx.organizationId` predicates to serialized source final updates.
- Added organization predicates to serialized destination final updates.
- Added organization predicates to non-serialized source and destination final updates.
- Added a focused transfer tenant-scope contract test covering permission, transaction organization context, final update scope, finance continuity, and serialized-lineage continuity references.

Out of scope:

- Changing transfer validation or quantity math.
- Changing inventory movement payloads, cost-layer transfer behavior, valuation recompute, serialized item lineage events, query keys, or UI.
- Broad tenant-hardening across stock counts, allocations, adjustments, or receiving.
- Browser QA.

Closeout:

- Touched domains: inventory transfer server function, inventory transfer tenant-scope tests, inventory sprint evidence.
- Workflow protected: transfer mutation -> tenant-scoped transaction -> inventory updates -> movement/cost-layer/serialized lineage continuity.
- Business value protected: warehouse transfer operations now preserve tenant boundaries through final stock updates while leaving finance and serialized continuity intact.
- Architecture standards checked: route/container/hook/query-key flow is unchanged; transfer permission and transaction context are unchanged; final writes now carry tenant scope.
- Tenant isolation and data integrity checked: source/destination reads were already organization-scoped; final source/destination updates now are too; no movements, cost layers, valuation recompute, serialized lineage, or finance metadata behavior changed.
- Query/cache contract checked: no query keys, stale times, invalidation, optimistic updates, or cache mutation helpers changed.
- Smells removed: ID-only final inventory updates inside a stock-moving transfer transaction.
- Smells deferred: other inventory mutation modules still deserve their own domain-sliced tenant-hardening audit.
- Gates run: focused transfer tenant-scope tests, focused ESLint, full inventory tests, TypeScript, `git diff --check`.
- Gates skipped: browser QA, because this was a server tenant-scope hardening change with no UI or interaction change.
- Goal adaptations: declined. The standing maintainer goal already requires tenant isolation, transactional inventory/finance integrity, serialized lineage continuity, meaningful tests, and reviewable domain slices.
- Residual risk: static contract coverage protects source patterns; live multi-tenant transfer integration coverage remains a future hardening layer.
