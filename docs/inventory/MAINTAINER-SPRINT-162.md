# Inventory Maintainer Sprint 162: Multi-Location Adjustment Routing

## Status

Closed in commit-ready state.

## Issue 1: Product Adjustment Targeted The First Location When Stock Spanned Locations

### Problem

Sprint 161 routed single-location multi-row adjustments to the inventory browser, but the product inventory tab still used the first location as the adjustment target when a product had stock in multiple locations. The UI displayed `+N more` locations but still opened an adjustment flow for the first location.

For RENOZ Energy warehouse operations, a product-level correction across multiple locations needs row-level context. Picking the first location is an implicit decision the operator did not make.

### Workflow Spine

Product detail inventory tab
-> product inventory summary
-> adjustment action
-> if one location and one stock row, open product adjustment dialog
-> if one location with multiple rows, route to inventory browser with product/location filters
-> if multiple locations, route to inventory browser with product filter
-> row-level inventory adjustment workflow.

### Touched Domains

- Product inventory tab container.
- Product inventory tab presenter.
- Product inventory tab tests.
- Product stock adjustment policy contract tests.
- Inventory sprint evidence.

### Business Value Protected

Operators no longer risk adjusting the first listed warehouse location just because the product tab compacted multiple locations into one line. Multi-location corrections now start from the inventory browser, where the operator can choose the correct warehouse row.

### Scope Constraints

- Do not redesign the product inventory tab location list.
- Do not change server adjustment behavior or product inventory read queries.
- Do not change single-location single-row adjustment behavior.
- Do not start a browser/dev-server smoke for this routing-only slice.

### Changes

- Product tab now treats any multi-location inventory summary as requiring browser-based adjustment.
- Multi-location adjustment clicks route to `/inventory/browser` with only `productId`, so all relevant locations remain visible.
- Single-location multi-row adjustment routing remains product/location-filtered.
- Single-location single-row adjustment still opens the product adjustment dialog.
- Added container coverage for multi-location browser routing.
- Updated static policy contract coverage so the label and routing logic stay aligned.

### Standards Checked

- Domain ownership: product tab owns product-level routing decisions; row-level adjustment remains owned by inventory browser/detail surfaces.
- Route -> container/page -> hook -> server function -> schema/database -> query/cache policy: no mutation changes; product tab now routes to the correct row-level route before mutation.
- Tenant isolation/data integrity: unchanged; no server predicates changed.
- Transactional inventory/finance integrity: unchanged; this sprint prevents unsafe entry into an aggregate adjustment path.
- Serialized lineage continuity: unchanged.
- UI states/error handling: product tab label now says `Adjust in Browser` when the action cannot safely open the aggregate dialog.
- Query/cache contract: unchanged.
- Reviewability: small container/presenter routing diff with focused tests.

### Smells Removed

- Product adjustment implicitly targeted `summary.locations[0]` even when multiple locations were present.
- Product tab label did not account for multi-location row selection needs.

### Deferred

- A richer product-tab per-location table or inline row picker remains deferred.
- The inventory browser target could eventually land on a focused row-selection mode, but product-filter routing is the current safe surface.
- Browser smoke was skipped because this sprint is covered by container tests and static contracts.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/products/product-inventory-tab-container.test.tsx tests/unit/products/product-stock-adjustment-policy-contract.test.ts tests/unit/inventory/stock-mutation-tenant-scope-contract.test.ts`
- Passed: `./node_modules/.bin/eslint src/server/functions/products/product-inventory.ts src/components/domain/products/tabs/inventory-tab-container.tsx src/components/domain/products/tabs/inventory-tab-view.tsx tests/unit/products/product-inventory-tab-container.test.tsx tests/unit/products/product-stock-adjustment-policy-contract.test.ts`
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
- Passed: `git diff --check`

### Goal Adaptation

No adaptation needed. This sprint follows the maintainer goal by making a product-level inventory action honest about when row-level selection is required.

### Residual Risk

Medium-low. The product tab still uses a compact location summary instead of exposing all location rows inline. The current behavior is safe because ambiguous and multi-location adjustments route to the inventory browser before mutation.
