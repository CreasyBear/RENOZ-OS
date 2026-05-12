# Inventory Maintainer Sprint 160: Ambiguous Adjustment Source Guard

## Status

Closed in commit-ready state.

## Issue 1: Product/Location Adjustments Could Mutate An Arbitrary Stock Row

### Problem

Inventory detail adjustments submit `inventoryId`, but product-level adjustment compatibility can still submit only `productId` and `locationId`. When more than one inventory row exists for that product/location, the server previously locked the first matching row and adjusted it.

For RENOZ Energy battery operations, one product can sit in the same location across different lots, statuses, costs, expiries, or serial records. A stock correction must not guess which physical stock row the operator meant.

### Workflow Spine

Inventory detail adjustment
-> `StockAdjustmentDialog`
-> `useAdjustInventory`
-> `stockAdjustmentSchema`
-> `adjustInventory`
-> locked source row
-> cost-layer update
-> movement evidence
-> cache invalidation.

Product-level adjustment compatibility
-> product inventory adjustment
-> `adjustStock`
-> `adjustInventory`
-> allowed only when product/location matches zero or one source row
-> otherwise field-scoped operator error.

### Touched Domains

- Inventory adjustment server function.
- Inventory mutation hook cache contract comment.
- Inventory stock mutation contract tests.
- Inventory sprint evidence.

### Business Value Protected

Stock corrections now fail closed when the product/location is ambiguous. This protects lot, disposition, cost-layer, and serialized integrity for warehouse corrections, support recovery, warranty review, and financial valuation.

### Scope Constraints

- Do not remove product-level adjustment compatibility entirely.
- Do not change row-detail adjustment behavior.
- Do not change adjustment quantity math, cost-layer consumption/creation, serialized lineage writes, or cache invalidation.
- Preserve positive adjustment compatibility for product/location cases that match no existing row or exactly one existing row.

### Changes

- Changed adjustment source lookup to lock up to two candidate rows when `inventoryId` is absent.
- Added an ambiguity guard that rejects unscoped product/location adjustments when more than one matching row exists.
- Returned an operator-safe field message: open the inventory browser and adjust the specific stock row.
- Updated the adjustment hook comment to state the real cache contract: row-scoped or single-row product/location scoped, refetch-first.
- Added contract coverage that the ambiguity guard runs before inventory insert/update writes.

### Standards Checked

- Domain ownership: adjustment source selection is enforced in the inventory adjustment server function.
- Route -> container/page -> hook -> server function -> schema/database -> query/cache policy: row-detail UI already sends `inventoryId`; product-level compatibility remains bounded; hook remains refetch-first.
- Tenant isolation/data integrity: tenant predicates and row locks remain in place; source ambiguity is rejected before mutation.
- Transactional inventory/finance integrity: cost-layer and valuation logic are unchanged and now operate only after source ambiguity is resolved.
- Serialized lineage continuity: unchanged; serialized adjustments already require `inventoryId`.
- UI states/error handling: ambiguous product-level adjustments now produce a field-scoped operator message instead of silently changing the wrong row.
- Query/cache contract: unchanged behavior, clarified comment; adjustment cache reconciliation remains refetch-first.
- Reviewability: small server guard plus focused static contract coverage.

### Smells Removed

- Product/location adjustment could mutate an arbitrary row when multiple lots/statuses/serial rows matched.
- Adjustment cache comment still described the old product/location ambiguity instead of the new server contract.

### Deferred

- Product-level adjustment UX could be improved further by linking directly to the inventory browser with product and location filters.
- The product-level adjustment dialog still uses aggregate stock values for preview; this is a separate UI truthfulness slice.
- Browser smoke was skipped because this sprint changes server-side source guarding and contract coverage, not rendering.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/inventory/stock-mutation-tenant-scope-contract.test.ts tests/unit/inventory/use-adjust-inventory.test.tsx tests/unit/inventory/stock-action-error-messages.test.ts`
- Passed: `./node_modules/.bin/eslint src/server/functions/inventory/adjustments.ts src/hooks/inventory/use-inventory.ts tests/unit/inventory/stock-mutation-tenant-scope-contract.test.ts tests/unit/inventory/use-adjust-inventory.test.tsx tests/unit/inventory/stock-action-error-messages.test.ts`
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
- Passed: `git diff --check`

### Goal Adaptation

No adaptation needed. This sprint follows the maintainer goal by reducing a product/location ambiguity without overreaching into a larger product-tab redesign.

### Residual Risk

Medium-low. The server no longer guesses when multiple rows match, but the product-level adjustment UI can still preview aggregate stock while submitting a product/location adjustment. That should be handled as a separate UI truthfulness sprint.
