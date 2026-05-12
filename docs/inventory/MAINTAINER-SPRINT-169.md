# Inventory Maintainer Sprint 169: Bulk Receipt Cache Identity

## Status

Closed in commit-ready state.

## Issue 1: Bulk Goods Receipt Flattened Delegated Stock Identity

### Problem

Sprint 168 taught single-PO `receiveGoods` to return affected inventory/product identity and serialized-touch state. `bulkReceiveGoods` delegates each successful prepared PO to `receiveGoods`, but discarded that delegated identity and `useBulkReceiveGoods` still invalidated broad `inventory.all` and `products.all` prefixes.

That left bulk PO receiving behind the same cache contract as single PO receiving, even though the exact affected stock identities were available from the delegated mutation results.

### Workflow Spine

Bulk receiving dialog
-> `useBulkReceiveGoods`
-> `bulkReceiveGoods`
-> prepare valid PO receipt payloads
-> batch serial preflight
-> per-PO `receiveGoods`
-> aggregate affected inventory/product/serialized identity
-> centralized inventory stock mutation cache policy.

### Touched Domains

- Supplier bulk receive-goods server function.
- Supplier bulk receive hook.
- Supplier bulk receive hook tests.
- Supplier bulk receive source contract tests.
- Inventory sprint evidence.

### Business Value Protected

Bulk receiving now refreshes the same stock, cost layer, product inventory, movement, and serialized surfaces as single PO receiving, without falling back to broad inventory/product root invalidation. This keeps high-volume receiving workflows fresher and less cache-heavy.

### Scope Constraints

- Do not change bulk receive preparation, serial preflight, skipped/failed row semantics, or per-PO delegation.
- Do not change `receiveGoods` transaction behavior.
- Do not change dialog UI or mutation feedback copy.
- Do not change the shared inventory cache helper.

### Changes

- `bulkReceiveGoods` now aggregates `affectedInventoryIds`, `affectedProductIds`, and `touchesSerializedInventory` from successful delegated `receiveGoods` results.
- Bulk receive success now returns the aggregated identity in the serialized mutation envelope.
- `useBulkReceiveGoods` now delegates stock side-effect refreshes to `invalidateInventoryStockMutationQueries`.
- Removed broad `queryKeys.inventory.all` and `queryKeys.products.all` invalidation from the bulk receive hook.
- Added source-level coverage proving bulk receive preserves delegated identity.
- Updated hook coverage to prove exact stock/product/serialized/movement invalidation after bulk receive.

### Standards Checked

- Domain ownership: bulk receive owns batch orchestration; single `receiveGoods` owns per-PO transaction; shared inventory cache helper owns stock side-effect refresh.
- Route -> container/page -> hook -> server function -> schema/database -> query/cache policy: bulk receive now carries server result identity into the centralized cache policy.
- Tenant isolation/data integrity: unchanged; identity is returned only from successful tenant-scoped delegated receive transactions.
- Transactional inventory/finance integrity: unchanged; no receipt, inventory, cost-layer, valuation, or serialized write behavior changed.
- Serialized lineage continuity: serialized-touch evidence is preserved from delegated PO receipts.
- Honest UI/error handling: unchanged; existing partial-failure and root-error feedback remain.
- Query/cache contract: improved and covered with focused hook tests.
- Reviewability: small server aggregation and one hook cache delegation.

### Smells Removed

- Bulk receive discarded useful affected inventory/product identity returned by delegated receipt mutations.
- Bulk receive hook used broad inventory/product invalidation instead of the established stock mutation cache policy.

### Deferred

- No browser smoke; this was a server-envelope and hook/cache contract slice.
- No change to row-level partial failure UX.
- No conversion from serialized mutation envelope to finance mutation envelope; existing serialized envelope already supports the needed identity fields.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/suppliers/use-bulk-receive-goods.test.tsx tests/unit/suppliers/bulk-receive-goods-row-failure-contract.test.ts tests/unit/suppliers/bulk-receive-serial-preflight.test.ts tests/unit/suppliers/receive-goods-tenant-scope-contract.test.ts tests/unit/purchase-orders/query-normalization-wave3d.test.tsx tests/unit/purchase-orders/goods-receipt-mutation-feedback-contract.test.ts`
- Passed: `./node_modules/.bin/eslint src/server/functions/suppliers/bulk-receive-goods.ts src/hooks/suppliers/use-bulk-receive-goods.ts tests/unit/suppliers/use-bulk-receive-goods.test.tsx tests/unit/suppliers/bulk-receive-goods-row-failure-contract.test.ts --report-unused-disable-directives`
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
- Passed: `git diff --check`

### Goal Adaptation

No adaptation needed. This sprint follows the maintainer goal by tightening the cache and identity contract for another supplier-backed stock-in workflow.

### Residual Risk

Low. Bulk receive behavior, per-PO transaction boundaries, serial preflight, and partial-failure semantics are unchanged. The change only preserves successful delegated mutation identity and narrows cache refresh.
