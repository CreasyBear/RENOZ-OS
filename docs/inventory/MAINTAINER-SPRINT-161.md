# Inventory Maintainer Sprint 161: Product Adjustment Row Selection

## Status

Closed in commit-ready state.

## Issue 1: Product Adjustment UI Treated Aggregate Stock As A Specific Row

### Problem

Sprint 160 made the server reject ambiguous product/location adjustments, but the product inventory tab still opened the same adjustment dialog for aggregate location stock. When a product/location had multiple inventory rows, the button and preview implied the product tab could safely adjust the displayed aggregate quantity.

For RENOZ Energy battery stock, aggregate location quantity can hide different lots, statuses, costs, expiries, or serialized rows. Operators need the UI to steer them to row-level inventory when a correction requires a specific source row.

### Workflow Spine

Product detail inventory tab
-> `useProductInventory`
-> `getProductInventory`
-> location summary with inventory row count
-> product inventory presenter
-> single-row location opens product adjustment dialog
-> multi-row location routes to inventory browser with product/location filters
-> row-level adjustment workflow.

### Touched Domains

- Product inventory read model.
- Product inventory tab container and presenter.
- Product inventory tab tests.
- Product stock adjustment policy contract tests.
- Inventory sprint evidence.

### Business Value Protected

Product-level stock corrections no longer present aggregate warehouse stock as though it were one adjustable row. Multi-row battery stock now routes operators to the row-level inventory browser, reducing accidental corrections against the wrong lot, disposition, cost layer, or serialized row.

### Scope Constraints

- Do not remove product-level adjustment for simple single-row locations.
- Do not redesign the inventory browser or adjustment dialog.
- Do not change the adjustment server mutation, cost-layer behavior, or cache invalidation.
- Do not add a row picker inside the product tab in this slice.

### Changes

- Added `inventoryRowCount` to each product inventory location summary.
- Updated the product inventory tab to label the primary action as `Adjust in Browser` when the primary location has multiple inventory rows.
- Updated product tab adjustment handling to route ambiguous product/location adjustments to `/inventory/browser` with `productId` and `locationId` filters.
- Preserved the existing product-tab adjustment dialog for single-row product/location stock.
- Added container tests for ambiguous routing and single-row dialog behavior.
- Added static contract coverage for the summary row count and UI routing contract.

### Standards Checked

- Domain ownership: product inventory summary now exposes enough row-shape metadata for the product tab to avoid unsafe adjustment UX.
- Route -> container/page -> hook -> server function -> schema/database -> query/cache policy: server read model exposes row count; container makes the routing decision; row-level adjustment remains owned by inventory.
- Tenant isolation/data integrity: existing product inventory tenant predicates remain unchanged.
- Transactional inventory/finance integrity: no mutation behavior changed; this sprint prevents unsafe entry into an aggregate adjustment path.
- Serialized lineage continuity: unchanged; serialized row-level workflows remain in inventory.
- UI states/error handling: ambiguous adjustments are routed before the dialog opens, avoiding a server-side failure after an aggregate preview.
- Query/cache contract: unchanged.
- Reviewability: small read-model/UI routing diff with focused tests.

### Smells Removed

- Product tab adjustment action implied aggregate stock could always be corrected in place.
- Product inventory summary did not expose whether a location represented one concrete row or several.
- Operators could reach a server rejection path that the UI could have predicted.

### Deferred

- A richer product-tab row picker remains deferred; the inventory browser is the existing row-level surface.
- The product tab still only exposes the compact primary location action when several locations exist.
- Browser smoke was skipped because this sprint is covered by component/container tests and static contracts; no local dev server was started.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/products/product-inventory-tab-container.test.tsx tests/unit/products/product-stock-adjustment-policy-contract.test.ts tests/unit/inventory/stock-mutation-tenant-scope-contract.test.ts`
- Passed: `./node_modules/.bin/eslint src/server/functions/products/product-inventory.ts src/components/domain/products/tabs/inventory-tab-container.tsx src/components/domain/products/tabs/inventory-tab-view.tsx tests/unit/products/product-inventory-tab-container.test.tsx tests/unit/products/product-stock-adjustment-policy-contract.test.ts`
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
- Passed: `git diff --check`

### Goal Adaptation

No adaptation needed. This sprint follows the maintainer goal by moving one operator workflow from misleading aggregate UI toward row-level inventory truth.

### Residual Risk

Medium-low. Multi-row primary-location adjustment now routes to the inventory browser, but the product inventory tab still has a compact location summary and does not offer row-level controls inline. That is acceptable until the product tab gets a broader inventory table redesign.
