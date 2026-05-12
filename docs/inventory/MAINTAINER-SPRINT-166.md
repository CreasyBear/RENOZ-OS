# Inventory Maintainer Sprint 166: Stock Count Completion Cache Contract

## Status

Closed in commit-ready state.

## Issue 1: Count Completion Refreshed Too Few Inventory Surfaces

### Problem

`useCompleteStockCount` completed a count and applied inventory adjustments, but only invalidated stock count queries plus inventory lists. A completed count can also change exact inventory details, cost layers, movement history, valuation, WMS dashboards, availability, and serialized availability.

That made count completion weaker than receive, adjustment, and transfer mutations, which already use the centralized inventory stock mutation invalidation policy.

### Workflow Spine

Stock count page
-> `useCompleteStockCount`
-> `completeStockCount`
-> finance mutation envelope
-> centralized inventory stock mutation cache policy
-> exact row details/cost layers
-> operational inventory surfaces.

### Touched Domains

- Inventory stock count hook.
- Inventory stock count query/cache tests.
- Inventory sprint evidence.

### Business Value Protected

After a count is completed, operators are less likely to see stale stock, stale cost layers, stale valuation, or stale warehouse dashboards. Cycle counts now behave like other stock mutations from the cache consumer's perspective.

### Scope Constraints

- Do not change server count completion behavior.
- Do not change stock-count toasts or error mapping.
- Do not alter the shared invalidation helper.
- Do not add browser/UI behavior in this slice.

### Changes

- `useCompleteStockCount` now delegates inventory-side refreshes to `invalidateInventoryStockMutationQueries`.
- Count completion passes the server result into the shared invalidator and requests movement invalidation.
- Kept stock-count root/detail invalidation explicit for the count lifecycle.
- Added a runtime hook test covering exact inventory detail, cost-layer detail, dashboard, WMS, valuation, availability, serial availability, and movement invalidation.

### Standards Checked

- Domain ownership: stock count still owns count lifecycle; shared inventory mutation cache policy owns inventory surface refresh.
- Route -> container/page -> hook -> server function -> schema/database -> query/cache policy: completion now follows the same hook -> server result -> cache policy pattern as receive/adjust/transfer.
- Tenant isolation/data integrity: unchanged.
- Transactional inventory/finance integrity: unchanged; this slice consumes the existing mutation envelope.
- Serialized lineage continuity: cache now refreshes serialized availability through the shared policy when stock completion changes inventory.
- Honest UI states: stale post-completion reads are less likely.
- Query/cache contract: improved and covered with focused hook tests.
- Reviewability: one hook import/call plus one targeted test.

### Smells Removed

- Stock count completion hand-picked inventory list invalidation instead of using the centralized inventory mutation cache policy.
- Cost-layer detail, WMS, valuation, availability, and movement surfaces could remain stale after count completion.

### Deferred

- Product-level cache refresh may still be broad when count completion does not return affected product IDs.
- No browser smoke; this was a hook/cache contract slice with runtime hook coverage.
- No stock count UI copy changes.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/inventory/query-normalization-wave3-stock-counts.test.tsx tests/unit/inventory/use-adjust-inventory.test.tsx tests/unit/inventory/use-transfer-inventory.test.tsx tests/unit/inventory/use-receive-inventory.test.tsx`
- Passed: `./node_modules/.bin/eslint src/hooks/inventory/use-stock-counts.ts tests/unit/inventory/query-normalization-wave3-stock-counts.test.tsx --report-unused-disable-directives`
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
- Passed: `git diff --check`

### Goal Adaptation

No adaptation needed. This sprint advances the maintainer goal by aligning stock count completion with the established centralized cache contract.

### Residual Risk

Low. The change broadens cache refresh after a successful mutation and does not change server behavior. Product-level invalidation remains intentionally conservative until stock count responses include affected product IDs.
