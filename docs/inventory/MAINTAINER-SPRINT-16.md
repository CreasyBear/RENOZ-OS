# Inventory Maintainer Sprint 16

This sprint follows Sprint 15's transfer tenant-hardening. The target is stock mutation tenant-hardening across the smaller stock-moving mutation paths: adjustment, allocation/deallocation, and manual receiving.

Status: Closed after Issue 1.

## Business Value

Adjustments, allocations, deallocations, and manual receipts are operator-facing stock controls for RENOZ Energy warehouse work. These mutations change inventory availability, valuation, and serialized lineage. A multi-tenant OEM operations platform should keep tenant scope explicit through the final database writes, not only through the preceding authorization and locked reads.

## Workflow Spine

stock action form/dialog
-> inventory mutation hook
-> `adjustInventory`, `allocateInventory`, `deallocateInventory`, or `receiveInventory`
-> inventory permission
-> transaction and organization context
-> locked organization-scoped inventory read
-> organization-scoped final write
-> movement, valuation/cost-layer and/or serialized-lineage continuity
-> cache refresh via existing mutation contracts.

## Architecture Constraints

- Keep this sprint to final write tenant scope in stock-moving mutations and static contract coverage.
- Preserve adjustment, allocation, deallocation, and manual receive validation behavior.
- Preserve movement payloads, cost-layer creation/consumption, valuation recompute, serialized lineage events, mutation response shape, query keys, cache invalidation, and UI.
- Do not widen into stock-count reconciliation, because that workflow has broader count/item/reconciliation semantics and deserves its own sprint.

## Issue Ledger

### 1. Stock Mutation Final Writes Need Organization Scope

Problem:

- Adjustment, allocation, deallocation, and manual receive rows were selected with organization predicates and row locks.
- Some final `inventory` updates used only the inventory row ID.
- Adjustment serialized-item status writes also used only the serialized item ID after an organization-scoped read.
- IDs are globally unique in practice, but the production tenant invariant should be explicit on final writes inside stock-moving transactions.

Workflow protected:

stock action mutation -> tenant-scoped transaction -> locked inventory row -> tenant-scoped final write -> movement/finance/serialized lineage continuity.

Implemented slice:

- Added `inventory.organizationId = ctx.organizationId` predicates to adjustment final inventory updates.
- Added `serializedItems.organizationId = ctx.organizationId` to adjustment serialized-item status writes.
- Added `inventory.organizationId = ctx.organizationId` predicates to allocation and deallocation final inventory updates.
- Added `inventory.organizationId = ctx.organizationId` predicates to manual receive final inventory updates.
- Added a focused stock mutation tenant-scope contract test covering permissions, transaction organization context, final write scope, finance continuity, and serialized-lineage continuity references.

Out of scope:

- Changing stock quantity math, allocation status rules, serialized quantity constraints, valuation/cost-layer behavior, movement payloads, query keys, cache invalidation, or UI.
- Stock-count reconciliation tenant-hardening.
- Browser QA.

Closeout:

- Touched domains: inventory adjustment, allocation/deallocation, manual receiving server functions, inventory stock mutation tenant-scope tests, inventory sprint evidence.
- Workflow protected: stock action mutations -> tenant-scoped transaction -> organization-scoped final writes -> movement, finance, and serialized-lineage continuity.
- Business value protected: operator stock controls now preserve tenant boundaries through final writes while leaving warehouse availability, valuation, and serialized lineage behavior intact.
- Architecture standards checked: route/container/hook/query-key flow is unchanged; server functions keep explicit permissions and transaction organization context; final writes now carry tenant scope.
- Tenant isolation and data integrity checked: initial reads were already organization-scoped; final inventory writes now are too; adjustment serialized-item status writes now carry tenant scope.
- Query/cache contract checked: no query keys, stale times, invalidation, optimistic updates, or cache mutation helpers changed.
- Smells removed: ID-only final inventory writes in smaller stock-moving mutation paths; ID-only adjustment serialized-item status write.
- Smells deferred: stock-count reconciliation still contains broader final-write and reconciliation paths that need a dedicated sprint.
- Gates run: focused stock mutation tenant-scope contract test; focused mutation/hook tests; focused ESLint; full inventory suite; TypeScript; `git diff --check`.
- Gates skipped: browser QA, because this was a server tenant-scope hardening change with no UI or interaction change.
- Goal adaptations: declined. The standing maintainer goal already requires tenant isolation, transactional inventory/finance integrity, serialized lineage continuity, meaningful tests, and reviewable domain slices.
- Residual risk: static contract coverage protects source patterns; live multi-tenant mutation integration coverage remains a future hardening layer.
