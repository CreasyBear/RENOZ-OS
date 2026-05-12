# Inventory Maintainer Sprint 163: Adjustment Row Identity Pass-Through

## Status

Closed in commit-ready state.

## Issue 1: Product Compatibility Wrappers Dropped Adjustment Row Identity

### Problem

`adjustInventory` can now guard ambiguous product/location adjustments and accept a concrete `inventoryId`, but two product compatibility paths still dropped that row identity before calling the canonical inventory adjustment function:

- generic `recordMovement` with `movementType: 'adjust'`
- product `adjustStock`

That meant callers that already knew the stock row could still be degraded back into product/location matching at the wrapper boundary.

### Workflow Spine

Generic movement adjustment
-> `createMovementSchema`
-> `recordMovement`
-> canonical `adjustInventory`
-> locked source row
-> cost layers
-> movement evidence.

Product stock adjustment
-> `stockAdjustmentSchema`
-> `adjustStock`
-> canonical `adjustInventory`
-> locked source row or guarded product/location compatibility.

### Touched Domains

- Product inventory compatibility server wrappers.
- Inventory workflow trace tests.
- Inventory sprint evidence.

### Business Value Protected

Known row identity is no longer lost when legacy/product compatibility paths route into canonical inventory adjustment. That keeps stock corrections tied to the intended row whenever callers have row context, protecting lot, disposition, valuation, and serialized integrity.

### Scope Constraints

- Do not remove product/location compatibility.
- Do not change canonical adjustment behavior, cost-layer logic, or cache invalidation.
- Do not change product adjustment UI in this slice.
- Do not broaden beyond adjustment wrapper pass-through.

### Changes

- `recordMovement` now forwards `inventoryId` to `adjustInventory` when present for adjustment movements.
- `adjustStock` now forwards `inventoryId` to `adjustInventory` when present.
- Added runtime workflow trace coverage proving generic adjust movement preserves row identity.
- Added runtime workflow trace coverage proving product `adjustStock` preserves row identity.

### Standards Checked

- Domain ownership: product wrappers remain compatibility shims; canonical stock correction remains owned by inventory adjustment.
- Route -> container/page -> hook -> server function -> schema/database -> query/cache policy: wrapper inputs now preserve source row scope into the canonical server function.
- Tenant isolation/data integrity: unchanged; canonical adjustment still applies tenant predicates and row locks.
- Transactional inventory/finance integrity: unchanged; row identity now reaches the existing transaction.
- Serialized lineage continuity: unchanged, but row-scoped pass-through prevents accidental degradation before serialized adjustment validation.
- UI states/error handling: unchanged.
- Query/cache contract: unchanged.
- Reviewability: two wrapper lines and focused runtime tests.

### Smells Removed

- Compatibility wrappers erased `inventoryId` even when callers supplied it.
- Runtime workflow trace covered receive and transfer delegation, but not adjustment row-scope delegation.

### Deferred

- Product-level adjustment UI remains intentionally compact after Sprint 162.
- Broader product inventory wrapper decomposition remains deferred.
- Browser smoke was skipped because this is a server-wrapper pass-through slice with runtime unit coverage.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/inventory/stock-in-workflow-trace.test.ts tests/unit/inventory/stock-mutation-tenant-scope-contract.test.ts tests/unit/inventory/use-adjust-inventory.test.tsx`
- Passed: `./node_modules/.bin/eslint src/server/functions/products/product-inventory.ts tests/unit/inventory/stock-in-workflow-trace.test.ts tests/unit/inventory/stock-mutation-tenant-scope-contract.test.ts tests/unit/inventory/use-adjust-inventory.test.tsx`
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
- Passed: `git diff --check`

### Goal Adaptation

No adaptation needed. This sprint follows the maintainer goal by tightening a small compatibility boundary so source identity is preserved through the workflow spine.

### Residual Risk

Low for this slice. Product/location compatibility remains by design for callers that do not have row identity, with the ambiguity guard from Sprint 160 protecting multi-row cases.
