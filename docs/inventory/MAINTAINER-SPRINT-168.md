# Inventory Maintainer Sprint 168: PO Receipt Cache Identity

## Status

Closed in commit-ready state.

## Issue 1: PO Goods Receipt Used Broad Inventory/Product Invalidation

### Problem

`receiveGoods` is the supplier-backed stock-in path. It creates or updates inventory rows, writes receive movements, creates cost layers, recomputes inventory valuation, updates serialized lineage when needed, and updates product cost price.

The server response did not expose affected inventory/product identity, so `useReceiveGoods` invalidated broad `inventory.all` and `products.all` prefixes after every receipt. That worked, but it made the cache contract less precise than inventory-native receive/adjust/transfer and stock count completion.

### Workflow Spine

PO goods receipt dialog
-> `useReceiveGoods`
-> `receiveGoods`
-> receipt header/items
-> PO item quantity update
-> inventory row update/create
-> movement/cost-layer/valuation/serialized lineage
-> success envelope with affected identity
-> centralized inventory stock mutation cache policy.

### Touched Domains

- Supplier PO receive-goods server function.
- Supplier goods receipt hook.
- Purchase-order query/cache tests.
- Supplier receive-goods contract tests.
- Purchase-order mutation feedback contract.
- Inventory sprint evidence.

### Business Value Protected

Supplier-backed stock-in now refreshes exact inventory rows, cost layers, product inventory views, valuation, WMS, availability, movement history, and serialized surfaces without broad inventory/product churn. Operators should see fresher product and warehouse state after PO receiving while the repo keeps one cache policy for stock mutations.

### Scope Constraints

- Do not change PO receipt quantity math, landed cost allocation, cost layers, valuation, serialized lineage, PO status, or product cost-price behavior.
- Do not change goods receipt UI or mutation feedback copy.
- Do not change the shared inventory cache helper.
- Do not change bulk receive behavior beyond consuming the existing delegated `receiveGoods` result shape.

### Changes

- `receiveGoods` now collects `affectedInventoryIds`, `affectedProductIds`, and `touchesSerializedInventory`.
- `receiveGoods` returns those identity fields in the serialized mutation success envelope.
- `useReceiveGoods` now calls `invalidateInventoryStockMutationQueries` with the server result and movement invalidation enabled.
- Removed broad `queryKeys.inventory.all` and `queryKeys.products.all` invalidation from the goods receipt hook.
- Added source-level contract coverage for PO receipt affected identity.
- Added hook-level coverage proving exact inventory/product/serialized/movement invalidation after goods receipt.

### Standards Checked

- Domain ownership: supplier receive-goods owns PO receipt transaction; inventory stock mutation cache helper owns inventory/product surface refresh.
- Route -> container/page -> hook -> server function -> schema/database -> query/cache policy: goods receipt now flows from server result identity into the centralized cache policy.
- Tenant isolation/data integrity: affected identity is collected from tenant-scoped inventory rows inside the existing transaction.
- Transactional inventory/finance integrity: no write behavior changed; identity evidence is emitted from the transaction that wrote receipt, inventory, movement, layer, valuation, and serialized records.
- Serialized lineage continuity: serialized PO receipts now mark `touchesSerializedInventory` for serialized cache refresh.
- Honest UI/error handling: unchanged; existing purchase-order formatter remains in place.
- Query/cache contract: improved and covered with focused hook tests.
- Reviewability: small server identity additions plus one hook cache delegation.

### Smells Removed

- Goods receipt hook hand-invalidated broad inventory/product roots instead of using the established stock mutation cache policy.
- PO receive success did not expose row/product identity even though it had that information during the transaction.

### Deferred

- Bulk receive still has its own row-level partial-failure cache workflow and was not refactored in this slice.
- No browser smoke; this was a server-envelope and hook/cache contract slice.
- No receive-goods finance mutation envelope conversion; the existing serialized mutation envelope already supports inventory/product identity.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/suppliers/receive-goods-tenant-scope-contract.test.ts tests/unit/purchase-orders/query-normalization-wave3d.test.tsx tests/unit/purchase-orders/goods-receipt-mutation-feedback-contract.test.ts tests/unit/inventory/use-receive-inventory.test.tsx tests/unit/inventory/use-adjust-inventory.test.tsx tests/unit/inventory/use-transfer-inventory.test.tsx`
- Passed: `./node_modules/.bin/eslint src/server/functions/suppliers/receive-goods.ts src/hooks/suppliers/use-goods-receipt.ts tests/unit/suppliers/receive-goods-tenant-scope-contract.test.ts tests/unit/purchase-orders/query-normalization-wave3d.test.tsx tests/unit/purchase-orders/goods-receipt-mutation-feedback-contract.test.ts --report-unused-disable-directives`
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
- Passed: `git diff --check`

### Goal Adaptation

No adaptation needed. This sprint follows the maintainer goal by tightening a stock-in workflow contract across server result identity and cache policy.

### Residual Risk

Low. This changes cache invalidation precision and success-envelope evidence only. PO receipt transactional writes, valuation policy, product cost updates, and serialized lineage behavior are unchanged.
