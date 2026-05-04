# Inventory Maintainer Sprint 31

This sprint follows Sprint 30's shared finance helper tenant-write cleanup. The target is manual receive cost-layer response scoping: the cost layer returned in the finance mutation envelope should be read with the same organization boundary as the create workflow.

Status: Closed after Issue 1.

## Business Value

Manual receiving is a high-frequency stock-in workflow for RENOZ Energy battery inventory. Its response feeds operator-facing mutation feedback and finance metadata. Even when a row was just created in the same transaction, response reads should preserve tenant scope so the workflow remains easy to audit and consistent with the rest of the inventory write model.

## Workflow Spine

manual receive stock
-> `receiveInventory`
-> `createReceiptLayersWithCostComponents`
-> `recomputeInventoryValueFromLayers`
-> tenant-scoped cost-layer response read
-> finance mutation envelope
-> inventory cache policy.

## Architecture Constraints

- Keep this sprint to the manual receive cost-layer response read predicate.
- Preserve transaction shape, serialized lineage behavior, finance envelope shape, quantity/value math, query keys, and UI.
- Do not broaden into helper extraction, live DB fixtures, cache changes, or receiving UX changes.

## Issue Ledger

### 1. Manual Receive Cost-Layer Response Read Used Layer ID Only

Problem:

- `receiveInventory` creates a cost layer through the shared helper using the active organization ID.
- It then reads the created layer back for the finance mutation envelope.
- That response read used `inventoryCostLayers.id = costLayerId` without repeating the organization predicate.

Workflow protected:

manual stock receive -> created receipt layer -> tenant-scoped response read -> finance mutation envelope.

Implemented slice:

- Added `inventoryCostLayers.organizationId = ctx.organizationId` to the manual receive cost-layer response read.
- Kept the transaction, created layer helper, value recompute, serialized lineage, finance mutation envelope, and cache behavior unchanged.
- Added focused tenant-scope contract coverage for the response read.

Out of scope:

- Changing finance mutation response shape.
- Changing manual receive validation, quantity math, or cache invalidation.
- Adding live database fixtures.

Closeout:

- Touched domains: inventory manual receiving server function, stock mutation tenant-scope contract tests, inventory sprint evidence.
- Workflow protected: manual stock receive -> created receipt layer -> tenant-scoped response read -> finance mutation envelope -> existing inventory cache policy.
- Business value protected: manual receiving now keeps tenant-scope explicit even for the just-created cost layer used in operator-facing finance metadata.
- Architecture standards checked: route/page/hook/cache flow is unchanged; server function remains the receiving workflow owner; the response read now matches the tenant boundary used by the create helper and surrounding transaction.
- Tenant isolation and data integrity checked: cost-layer response read now requires both cost-layer ID and organization ID; no quantity math, value recompute, serialized lineage, movement insert, or finance envelope behavior changed.
- Query/cache contract checked: no query keys, invalidation, stale times, optimistic updates, or rollback behavior changed.
- Smells removed: manual receive read the created cost layer back by ID only.
- Smells deferred: live database fixtures for full manual receive transaction/RLS behavior; broader direct-write audit outside the inventory domain.
- Gates run: focused receiving tenant-scope/schema/workflow tests; focused ESLint; full inventory suite; TypeScript; `git diff --check`.
- Gates skipped: browser QA, because this was a server response-read predicate correction with no UI or interaction change.
- Goal adaptations: declined. The standing maintainer goal already requires tenant isolation, transactional inventory and finance integrity, meaningful tests, reviewable domain slices, and closeout evidence.
- Residual risk: source-level contract coverage verifies the predicate; live DB fixtures are still needed to prove the full manual receive transaction under seeded RLS conditions.
