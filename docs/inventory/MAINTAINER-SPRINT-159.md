# Inventory Maintainer Sprint 159: Row-Scoped Transfer Source Contract

## Status

Closed in commit-ready state.

## Issue 1: Product/Location Transfers Could Select An Ambiguous Source Row

### Problem

The canonical transfer dialog submits `inventoryId`, but the shared transfer schema, generic product movement wrapper, and transfer hook still allowed product/location-only transfers. The server source lookup then locked the first matching product/location row it found.

That is unsafe in RENOZ Energy warehouse operations because one product can exist in the same location across lots, serials, cost layers, expiry dates, and dispositions. A transfer must identify the source row or source serials; otherwise it can move the wrong stock and produce clean-looking movement evidence for the wrong physical battery stock.

### Workflow Spine

Inventory detail transfer dialog
-> `stockTransferSchema`
-> `useTransferInventory`
-> `transferInventory`
-> locked source inventory row or serialized source rows
-> destination inventory
-> cost-layer movement
-> serialized lineage
-> cache invalidation.

Generic movement transfer path
-> `recordMovement`
-> source `inventoryId` required
-> `transferInventory`
-> same canonical row-scoped transfer workflow.

### Touched Domains

- Inventory movement and transfer schemas.
- Inventory transfer server function.
- Product inventory movement compatibility wrapper.
- Inventory transfer mutation hook and cache policy.
- Inventory workflow trace and transfer contract tests.
- Inventory sprint evidence.

### Business Value Protected

Warehouse operators can trust that a transfer moves the intended stock row, not an arbitrary row sharing the same product and location. This protects lot/cost/disposition integrity for battery stock, warehouse moves, support recovery, warranty handling, and dispatch readiness.

### Scope Constraints

- Do not change serialized transfer behavior when serial numbers provide the source scope.
- Do not change transfer quantity math, cost-layer movement, disposition preservation, or serialized lineage writes.
- Do not redesign the transfer dialog; it already passes the row id.
- Do not remove generic movement compatibility entirely; make it route through row-scoped canonical transfer.

### Changes

- Added optional `inventoryId` to `createMovementSchema` so generic transfer movement calls can carry source row scope.
- Added a `stockTransferSchema` refinement requiring either `inventoryId` or `serialNumbers`.
- Added a server guard that rejects non-serialized transfers without `inventoryId`.
- Updated `recordMovement` transfer routing to require `inventoryId` and forward it to `transferInventory`.
- Removed product/location aggregate optimistic transfer patches from `useTransferInventory`.
- Updated the transfer hook module header to describe transfer cache reconciliation as refetch-first.
- Updated tests to cover row-scoped generic transfer routing, unscoped transfer rejection, serial-scoped transfer allowance, and the absence of transfer-specific aggregate optimistic patching.

### Standards Checked

- Domain ownership: source row selection is owned by the transfer schema/server contract, not inferred from aggregate product/location data.
- Route -> container/page -> hook -> server function -> schema/database -> query/cache policy: dialog already passes `inventoryId`; hook now avoids aggregate cache lies; server enforces row scope.
- Tenant isolation/data integrity: existing tenant predicates and transaction locks remain unchanged; this sprint tightens source identity before mutation.
- Transactional inventory/finance integrity: unchanged stock math and cost-layer movement, with less risk of selecting the wrong source row.
- Serialized lineage continuity: serial-scoped transfers remain valid without `inventoryId`; lineage writes are unchanged.
- UI states/error handling: unscoped non-serialized transfers now return field-scoped source-row errors instead of silently choosing a row.
- Query/cache contract: transfer mutations are refetch-first; no product/location optimistic quantity math remains for transfers.
- Reviewability: bounded schema/server/hook cleanup with focused tests.

### Smells Removed

- Product/location-only transfer payloads could select an arbitrary source row.
- Generic movement transfer routing dropped source row identity.
- Transfer hook maintained aggregate optimistic math for a path the product should not trust.
- Hook header claimed transfer optimistic updates after the contract became refetch-first.

### Deferred

- Whether damaged, returned, or quarantined stock should be transferable remains a separate product policy decision.
- `adjustInventory` still has a product/location-only compatibility path and should be reviewed separately before changing.
- Browser smoke was skipped because this sprint changes schema/server/cache contracts, not visible UI rendering.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/inventory/movement-schema-ownership.test.ts tests/unit/inventory/stock-transfer-reason-contract.test.ts tests/unit/inventory/stock-in-workflow-trace.test.ts tests/unit/inventory/transfer-tenant-scope-contract.test.ts tests/unit/inventory/use-transfer-inventory.test.tsx`
- Passed: `./node_modules/.bin/eslint src/lib/schemas/inventory/movements.ts src/server/functions/inventory/transfers.ts src/server/functions/products/product-inventory.ts src/hooks/inventory/use-inventory.ts tests/unit/inventory/movement-schema-ownership.test.ts tests/unit/inventory/stock-transfer-reason-contract.test.ts tests/unit/inventory/stock-in-workflow-trace.test.ts tests/unit/inventory/transfer-tenant-scope-contract.test.ts tests/unit/inventory/use-transfer-inventory.test.tsx`
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
- Passed: `git diff --check`

### Goal Adaptation

No adaptation needed. This sprint follows the maintainer goal by tightening the inventory transfer workflow spine and removing a cache/server mismatch that made the repo harder to reason about.

### Residual Risk

Low for this slice. Existing callers that relied on product/location-only non-serialized transfers must now provide `inventoryId`, which is intentional. The remaining risk is adjacent compatibility code that may still infer source rows for non-transfer stock workflows.
