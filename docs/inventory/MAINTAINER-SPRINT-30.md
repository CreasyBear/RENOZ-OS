# Inventory Maintainer Sprint 30

This sprint follows Sprint 29's manual receive cost-layer reference cleanup. The target is shared inventory finance helper tenant-write safety: helper updates should carry the same organization predicate as their reads and callers.

Status: Closed after Issue 1.

## Business Value

Inventory finance helpers sit under the workflows that move battery stock, consume FIFO layers, recompute value caches, and keep warehouse truth aligned with financial truth. If those shared writes rely on row IDs alone, every caller inherits weaker tenant-safety posture even when the surrounding server function is organization-scoped.

## Workflow Spine

inventory quantity-changing mutation
-> domain server function transaction
-> shared finance helper
-> tenant-scoped FIFO layer read/lock
-> tenant-scoped layer or inventory value update
-> finance mutation envelope/cache policy.

## Architecture Constraints

- Keep this sprint to tenant predicates inside shared inventory finance helper updates.
- Preserve FIFO consumption math, derived value math, helper signatures, server response shapes, query keys, and UI behavior.
- Do not broaden into live database fixtures, helper extraction, finance envelope redesign, or caller refactors.

## Issue Ledger

### 1. Shared Finance Helper Updates Were Not Tenant-Predicated

Problem:

- `consumeLayersFIFO` selected and locked cost layers by `organizationId` and `inventoryId`.
- It then updated consumed layers by layer ID only.
- `recomputeInventoryValueFromLayers` calculated active-layer totals by `organizationId` and `inventoryId`.
- It then updated `inventory.total_value` by inventory ID only.

Workflow protected:

quantity-changing mutation -> shared finance helper -> tenant-scoped layer/value writes -> inventory finance integrity.

Implemented slice:

- Added `organizationId` to the `inventory_cost_layers` update predicate inside `consumeLayersFIFO`.
- Added `organizationId` to the `inventory` update predicate inside `recomputeInventoryValueFromLayers`.
- Kept helper signatures, FIFO consumption order, derived value math, and return contracts unchanged.
- Added focused source contract coverage for both shared helper writes.

Out of scope:

- Changing helper return contracts.
- Changing cost-layer consumption order or valuation math.
- Changing caller transactions or cache invalidation.
- Adding live database fixtures.

Closeout:

- Touched domains: shared inventory finance helper, inventory tenant-scope contract tests, inventory sprint evidence.
- Workflow protected: quantity-changing mutation -> shared finance helper -> tenant-scoped FIFO layer read/lock -> tenant-scoped layer/value writes -> inventory finance integrity.
- Business value protected: stock movements, adjustments, transfers, receiving, stock counts, shipments, and RMA paths inherit stronger tenant-write safety for FIFO layer consumption and inventory value-cache recompute.
- Architecture standards checked: route/page/hook/cache behavior is unchanged; helper contracts and caller contracts are unchanged; shared helper writes now mirror the organization predicates already used by reads and caller transactions.
- Tenant isolation and data integrity checked: cost-layer consumption updates now require both layer ID and organization ID; inventory value recompute updates now require both inventory ID and organization ID; no quantity math, serialized lineage, or finance envelope behavior changed.
- Query/cache contract checked: no query keys, invalidation, stale times, optimistic updates, or rollback behavior changed.
- Smells removed: shared finance helper had tenant-scoped reads but ID-only writes for consumed cost layers and derived inventory value.
- Smells deferred: live database fixtures for helper behavior under real RLS; broader audit of non-helper direct inventory writes outside the inventory domain; helper extraction or runtime integration tests.
- Gates run: focused finance-helper/caller tenant-scope tests; focused ESLint; full inventory suite; TypeScript; `git diff --check`.
- Gates skipped: browser QA, because this was a shared server data-integrity correction with no UI or interaction change.
- Goal adaptations: declined. The standing maintainer goal already requires tenant isolation, transactional inventory and finance integrity, meaningful tests, reviewable domain slices, and closeout evidence.
- Residual risk: source-level contracts verify the tenant predicates; live DB fixtures are still needed to prove the helper behavior under seeded concurrent/RLS conditions.
