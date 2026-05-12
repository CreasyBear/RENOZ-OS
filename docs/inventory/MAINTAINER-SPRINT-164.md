# Inventory Maintainer Sprint 164: Adjustment Row Creation Boundary

## Status

Closed in commit-ready state.

## Issue 1: Adjustments Could Create Inventory Rows

### Problem

`adjustInventory` documents that operator adjustments correct stock while manual inbound stock belongs to receiving, but the server function still created a new inventory row when no row matched the requested product/location. Positive adjustments on a missing row could therefore create first stock and first cost layers through the correction workflow, with zero unit cost.

That blurred the operational boundary between receiving and adjustment, and made valuation evidence easier to misread.

### Workflow Spine

Existing stock correction
-> `stockAdjustmentSchema`
-> `adjustInventory`
-> locked inventory row
-> quantity correction
-> FIFO layer consumption or adjustment layer
-> movement evidence
-> finance mutation contract.

New stock creation
-> manual receiving or PO receiving
-> inventory row creation
-> receipt cost components
-> recomputed valuation
-> movement evidence.

### Touched Domains

- Inventory adjustment server function.
- Inventory mutation source-level contract tests.
- Inventory sprint evidence.

### Business Value Protected

Stock creation remains tied to receiving workflows where cost and receipt evidence are explicit. Adjustments now correct known stock only, protecting warehouse operators from accidentally turning a correction action into inbound stock and protecting finance from zero-cost first layers.

### Scope Constraints

- Do not change receiving or PO receiving behavior.
- Do not change adjustment schemas or product-level UI routing.
- Do not change existing cost-layer behavior for positive adjustments on existing rows.
- Do not broaden into stock count adjustment semantics.

### Changes

- `adjustInventory` now rejects missing target rows with structured guidance: receive inventory before adjusting this stock row.
- Removed the adjustment path that inserted new `inventory` rows with zero cost.
- Kept adjustment updates tenant-scoped and row-locked.
- Added a contract test proving adjustments require an existing row before quantity and valuation calculations.

### Standards Checked

- Domain ownership: receiving owns stock creation; adjustment owns correction of existing rows.
- Route -> container/page -> hook -> server function -> schema/database -> query/cache policy: unchanged public shape; the server boundary is stricter.
- Tenant isolation/data integrity: tenant predicates and row locks remain in place.
- Transactional inventory/finance integrity: missing-row adjustments fail before inventory writes or cost-layer creation.
- Serialized lineage continuity: unchanged; serialized adjustments still require a row-scoped inventory item.
- Honest UI/error handling: server now returns operator-safe structured guidance for the missing-row case.
- Query/cache contract: unchanged because failed mutations do not invalidate success paths.
- Reviewability: small server diff plus focused contract coverage.

### Smells Removed

- Adjustment workflow could create first stock despite its own receiving boundary comment.
- Missing-row adjustments could manufacture zero-cost cost layers.
- Product availability guard conflated stock creation with adjustment correction.

### Deferred

- Product-level UI could surface the missing-row guidance more directly if a future caller bypasses the existing receive-first path.
- Stock count adjustment semantics were left untouched.
- Full browser smoke was skipped because this is a server workflow boundary with focused contract and hook coverage.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/inventory/stock-mutation-tenant-scope-contract.test.ts tests/unit/inventory/stock-in-workflow-trace.test.ts tests/unit/inventory/use-adjust-inventory.test.tsx tests/unit/inventory/stock-action-error-messages.test.ts`
- Passed: `./node_modules/.bin/eslint src/server/functions/inventory/adjustments.ts tests/unit/inventory/stock-mutation-tenant-scope-contract.test.ts --report-unused-disable-directives`
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
- Passed: `git diff --check`

### Goal Adaptation

No adaptation needed. This sprint follows the existing maintainer goal by tightening a small domain boundary around inventory/finance integrity.

### Residual Risk

Low for this slice. Existing positive adjustments on existing rows can still create adjustment cost layers using the row cost; that remains the intended correction path and should be revisited only with a broader valuation policy change.
