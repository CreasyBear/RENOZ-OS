# Inventory Maintainer Sprint 232: Query-Key Catalog Boundary

Status: closed and commit-ready.

## Problem

`src/lib/query-keys.ts` remained the largest shared architecture pressure point at 2,444 lines. Inventory query-key definitions were still embedded inside the global aggregate even though they depended on inventory read schemas and served a bounded cache contract for inventory hooks, realtime invalidation, stock mutations, support RMA flows, purchase-order receiving, and order fulfillment.

The public `queryKeys` aggregate is useful as a stable caller interface, but it should not own every domain's schema-shaped key implementation inline. Keeping inventory keys inside the aggregate made a cache contract change require editing the global monolith and encouraged global self-reference through `queryKeys.inventory`.

## Workflow Spine Protected

Inventory reads and cache invalidation
-> inventory hooks, realtime hooks, RMA hooks, receiving hooks, and order fulfillment hooks
-> public `queryKeys.inventory`
-> extracted `inventoryQueryKeys`
-> schema-shaped inventory list and quick-search inputs
-> unchanged TanStack Query key tuples
-> unchanged broad prefix invalidation behavior.

## Touched Domains

- Shared query-key catalog.
- Inventory query-key implementation.
- Inventory query-key read/source contract tests.
- Sprint evidence.

## Business Value Protected

RENOZ Energy inventory operations depend on stable cache keys for stock counts, receiving, transfers, serialized items, availability, valuation, alerts, forecasting, and fulfillment. This slice preserves those exact keys while making inventory cache contract ownership inspectable in one smaller module.

## Changes

- Added `src/lib/query-key-catalog/inventory.ts`.
- Moved inventory schema-shaped filter ownership and all `queryKeys.inventory` methods into `inventoryQueryKeys`.
- Kept `src/lib/query-keys.ts` as the public aggregate adapter by assigning `inventory: inventoryQueryKeys`.
- Re-exported `InventoryFilters` from `src/lib/query-keys.ts` to preserve existing import compatibility.
- Removed inventory schema imports and global `queryKeys.inventory` self-reference from the aggregate implementation.
- Updated `tests/unit/inventory/query-key-read-contract.test.ts` to assert the public adapter points at the extracted catalog and the catalog does not import the aggregate back in.

## Standards Checked

- Domain ownership: inventory query-key implementation now lives with the inventory cache contract rather than inside the shared aggregate.
- Route -> container/page -> hook -> server -> schema/database -> query/cache policy: unchanged. Hooks still call `queryKeys.inventory`, and the query tuple shapes are unchanged.
- Tenant isolation: not directly applicable; no server reads, writes, or tenant predicates changed.
- Transactional inventory and finance integrity: not applicable; no inventory mutation, valuation, COGS, or finance-write behavior changed.
- Serialized lineage continuity: not applicable; serialized item cache prefixes are preserved.
- Honest UI states and operator-safe errors: not applicable; no UI state or server error behavior changed.
- Mutation/cache contracts: preserved by focused query-key tests and shared integrity tests.
- Tests: source contracts now guard the extracted catalog boundary instead of pinning inventory key definitions to the global aggregate.

## Smells Removed

- Reduced `src/lib/query-keys.ts` from 2,444 lines to 2,342 lines.
- Removed direct inventory read-schema imports from the shared query-key aggregate.
- Removed inventory-specific global self-reference from the aggregate implementation.
- Created a named inventory cache catalog that can absorb future stock-counts, forecasting, serialized-items, alerts, and valuation cache contract changes without touching the whole aggregate.

## Smells Deferred

- `src/lib/query-keys.ts` is still large at 2,342 lines and should continue to shed other domain catalogs.
- Product stock alert keys remain in the products section because their public caller interface is `queryKeys.products.stockAlerts`, even though their behavior is inventory-adjacent.
- Other large frontend workflow components and server modules remain outside this slice.

## Verification

- `./node_modules/.bin/eslint src/lib/query-keys.ts src/lib/query-key-catalog/inventory.ts tests/unit/inventory/query-key-read-contract.test.ts tests/unit/shared/query-key-integrity.test.ts --report-unused-disable-directives` passed.
- `./node_modules/.bin/vitest run tests/unit/inventory/query-key-read-contract.test.ts tests/unit/shared/query-key-integrity.test.ts tests/unit/inventory/product-stock-alert-cache-contract.test.ts` passed: 3 files, 9 tests.
- `npm run lint` passed.
- `npm run typecheck` passed.
- `git diff --check` passed.
- `npm run test:unit` passed: 765 files, 2,537 tests.

## Skipped

- Browser QA was skipped because no UI rendering or interaction changed.
- Production build was skipped because this was a query-key catalog extraction covered by focused source contracts, full lint, typecheck, whitespace checks, and the full unit suite.

## Goal Adaptation

This sprint draws down the largest shared architecture monolith without broadening scope into cache behavior changes. The next query-key drawdown should extract another cohesive catalog with stable public adapter semantics rather than split the aggregate mechanically.

## Residual Risk

Low for behavior because public callers still consume `queryKeys.inventory` and focused tests assert the exact tuple shapes for inventory list/search, public adapter identity, shared inventory prefixes, and product stock alert adjacency. Medium architecture risk remains because the global aggregate is still large and many domains still self-reference through `queryKeys`.
