# Maintainer Sprint 3: Inventory Mutation and Cache Integrity

This sprint follows Sprint 2's schema-ownership closeout. The focus shifts from contract placement to stock-changing behavior that can mislead operators after mutations.

Status: Issues 1, 2, 3, and 4 implemented.

## Business Value

Inventory mutations must keep warehouse, product, serialized, valuation, and support-facing stock views trustworthy after operators receive, adjust, transfer, allocate, or recover lithium-ion battery stock. Optimistic UI should be helpful, but never overstate the wrong lot, serial, location, or product.

## Workflow Spine

```text
stock-changing mutation
  -> optimistic cache patch / rollback
  -> transactional server write
  -> cache invalidation/refetch
  -> operator-visible stock, warehouse, product, valuation, serialized, support/RMA state
```

## Sprint Rule

Do not implement any issue until the slice has:

1. a business value statement,
2. a workflow invariant,
3. affected files,
4. explicit out-of-scope boundaries,
5. focused tests,
6. closeout criteria.

## Issue Ledger

### 1. Receive Optimistic Patch Lot/Serial Scope

Business value: receiving one lot or serialized battery should not temporarily inflate other cached lots or serial rows at the same product/location while the server refetch is pending.

Workflow invariant: `useReceiveInventory` optimistic list/detail patches must match the same product, location, lot, and serial scope that the receive server uses to find or create the affected inventory row.

Affected files:

- `src/hooks/inventory/use-inventory.ts`
- `tests/unit/inventory/use-receive-inventory.test.tsx`
- `docs/inventory/MAINTAINER-SPRINT-3.md`

Out of scope:

- changing receive server transaction behavior
- changing receive schema validation
- changing broad invalidation prefixes
- changing product receive wrapper behavior
- changing UI form behavior

Focused tests:

```bash
./node_modules/.bin/vitest run tests/unit/inventory/use-receive-inventory.test.tsx tests/unit/inventory/receive-inventory-schema-ownership.test.ts
```

Closeout criteria:

- receive optimistic list patch only updates rows matching product/location plus lot/serial scope
- receive optimistic detail patch uses the same scope
- receive without lot/serial does not patch lot-specific or serial-specific cached rows
- receive with a serial does not patch a different serial row
- rollback behavior remains unchanged
- focused receive tests pass
- lint/typecheck evidence is recorded

### 2. Transfer Optimistic Patch Row Scope

Business value: transferring a specific inventory row from the product or item UI should not temporarily move every cached row for the same product/location while the server refetch is pending.

Workflow invariant: `useTransferInventory` must avoid aggregate optimistic math whenever the mutation is scoped by `inventoryId` or explicit serial numbers, because the transfer server uses row/serial-specific source selection and may create or update destination rows.

Affected files:

- `src/hooks/inventory/use-inventory.ts`
- `tests/unit/inventory/use-transfer-inventory.test.tsx`
- `docs/inventory/MAINTAINER-SPRINT-3.md`

Out of scope:

- changing transfer server transaction behavior
- changing transfer schema validation
- changing broad invalidation prefixes
- changing transfer dialog UI
- changing serialized transfer behavior

Focused tests:

```bash
./node_modules/.bin/vitest run tests/unit/inventory/use-transfer-inventory.test.tsx tests/unit/inventory/stock-action-error-messages.test.ts
```

Closeout criteria:

- row-scoped transfers with `inventoryId` skip aggregate optimistic list/detail math
- serialized transfers continue to skip aggregate optimistic math
- aggregate transfer behavior without `inventoryId` remains unchanged
- rollback and invalidation behavior remain unchanged
- focused transfer tests pass
- lint/typecheck evidence is recorded

### 3. Adjustment Optimistic Patch Row Scope

Business value: correcting stock for one product/location should not temporarily adjust every cached lot or serial row at that location while the server refetch is pending.

Workflow invariant: `useAdjustInventory` must avoid aggregate optimistic math because the adjustment server mutates one specific inventory row when `inventoryId` is provided, or one locked matching row when only product/location is provided.

Affected files:

- `src/hooks/inventory/use-inventory.ts`
- `tests/unit/inventory/use-adjust-inventory.test.tsx`
- `docs/inventory/MAINTAINER-SPRINT-3.md`

Out of scope:

- changing adjustment server transaction behavior
- changing adjustment schema validation
- changing product-domain `useAdjustStock`
- changing broad invalidation prefixes
- changing adjustment dialog UI

Focused tests:

```bash
./node_modules/.bin/vitest run tests/unit/inventory/use-adjust-inventory.test.tsx tests/unit/inventory/stock-action-error-messages.test.ts
```

Closeout criteria:

- unscoped product/location adjustments skip aggregate optimistic list/detail math
- row-scoped adjustments with `inventoryId` continue to skip aggregate optimistic math
- rollback and invalidation behavior remain unchanged
- focused adjustment tests pass
- lint/typecheck evidence is recorded

### 4. Stock Mutation Result-Aware Invalidation Contract

Business value: after receive, transfer, or adjustment, warehouse operators should not keep looking at stale dashboard, WMS, valuation, availability, serialized picking, or product stock surfaces. Detail refreshes should be precise when the server already reports which inventory rows changed.

Workflow invariant: stock-changing hooks must use one shared cache invalidation contract that follows the mutation result envelope (`affectedInventoryIds`, item identity, source/destination identity) for row detail/cost-layer caches while refreshing the broader operational prefixes that cannot be safely narrowed by client filters.

Affected files:

- `src/hooks/inventory/use-inventory.ts`
- `tests/unit/inventory/use-receive-inventory.test.tsx`
- `tests/unit/inventory/use-adjust-inventory.test.tsx`
- `tests/unit/inventory/use-transfer-inventory.test.tsx`
- `docs/inventory/MAINTAINER-SPRINT-3.md`

Out of scope:

- changing receive, transfer, or adjustment server transaction behavior
- changing mutation result schemas
- changing query key names or global query-key architecture
- implementing allocation/deallocation UI or cache behavior where no active frontend call site exists
- narrowing dashboard, WMS, valuation, availability, or product prefixes without filter-aware server/cache contracts

Focused tests:

```bash
./node_modules/.bin/vitest run tests/unit/inventory/use-receive-inventory.test.tsx tests/unit/inventory/use-adjust-inventory.test.tsx tests/unit/inventory/use-transfer-inventory.test.tsx
```

Closeout criteria:

- receive, transfer, and adjustment hooks share one stock mutation invalidation helper
- mutation results with affected inventory identity invalidate exact `inventory.detail(id)` caches instead of the broad details prefix
- affected inventory rows also invalidate their cost-layer detail caches
- transfer and adjustment now refresh the same dashboard, WMS, valuation, availability, available-serial, and product stock surfaces as receive
- serialized receive/transfer paths continue to refresh serialized inventory caches
- focused mutation cache tests pass
- lint/typecheck evidence is recorded

## Closeout Log

### Issue 1: Receive Optimistic Patch Lot/Serial Scope

Touched domains: inventory receive hook, inventory list/detail optimistic cache patching, manual receive regression coverage.

Workflow protected: `useReceiveInventory` optimistic patch -> manual receive server mutation -> rollback/invalidation -> operator-visible list/detail stock rows.

Business value: receiving one battery lot or serial no longer temporarily overstates other cached lots or serialized rows at the same product/location while the server refetch is pending.

Standards checked:

- added a receive optimistic patch predicate that matches product, location, normalized serial number, and lot number
- receive without a lot/serial now only patches no-lot/no-serial cached rows
- receive with a serial now only patches the matching normalized serial row
- receive with a lot now only patches the matching lot row
- adjustment optimistic patch behavior was preserved after an initial patch placement mistake was caught by focused tests
- rollback and invalidation behavior remain unchanged

Smells removed:

- receive optimistic list/detail patches matched only product/location, so a receive for one lot or serial could patch sibling rows until refetch
- receive optimistic behavior had no regression coverage for lot or serial scope

Deferred:

- receive invalidation remains broad rather than result-aware until the Issue 4 cache contract cleanup
- receive server transaction behavior and schema validation are unchanged
- product receive wrapper behavior is unchanged
- database-backed receive integration coverage remains outside this hook/cache slice

Verification:

- `./node_modules/.bin/vitest run tests/unit/inventory/use-receive-inventory.test.tsx tests/unit/inventory/receive-inventory-schema-ownership.test.ts`
- `./node_modules/.bin/eslint src/hooks/inventory/use-inventory.ts tests/unit/inventory/use-receive-inventory.test.tsx`
- `git diff --check -- docs/inventory/MAINTAINER-SPRINT-2.md docs/inventory/MAINTAINER-SPRINT-3.md src/hooks/inventory/use-inventory.ts tests/unit/inventory/use-receive-inventory.test.tsx`
- `./node_modules/.bin/vitest run tests/unit/inventory tests/unit/inventory-support/query-normalization-wave6g.test.tsx`
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit`

Goal adaptation: no standing goal change. Sprint 3 continues the maintainer goal by moving from schema ownership into stock-changing cache integrity.

Residual risk: receive invalidation is still prefix-broad until Issue 4; adjust/transfer/allocate optimistic patches need the same lot/serial/row-scope scrutiny in later Sprint 3 slices.

### Issue 2: Transfer Optimistic Patch Row Scope

Touched domains: inventory transfer hook, inventory list/detail optimistic cache patching, stock action regression coverage.

Workflow protected: `useTransferInventory` optimistic patch -> transfer server mutation -> rollback/invalidation -> operator-visible source/destination stock rows.

Business value: transferring a specific inventory row no longer temporarily moves every cached row for the same product/location while the authoritative transfer refetch is pending.

Standards checked:

- row-scoped transfers with `inventoryId` now skip aggregate optimistic list/detail math
- serialized transfers continue to skip aggregate optimistic math
- aggregate transfer behavior without `inventoryId` remains unchanged
- rollback and invalidation behavior remain unchanged
- added transfer regression coverage for row-scoped and unscoped transfer behavior

Smells removed:

- transfer optimistic patching skipped aggregate math for serial numbers but not for `inventoryId`, despite the UI submitting item-level transfer payloads
- transfer optimistic behavior had no regression coverage for row-scoped payloads

Deferred:

- transfer invalidation remains prefix-broad until the Issue 4 cache contract cleanup
- transfer server transaction behavior and schema validation are unchanged
- transfer destination row matching remains server-owned and database-backed
- adjustment and allocation optimistic paths still need row-scope scrutiny in later Sprint 3 slices

Verification:

- `./node_modules/.bin/vitest run tests/unit/inventory/use-transfer-inventory.test.tsx tests/unit/inventory/stock-action-error-messages.test.ts`
- `./node_modules/.bin/eslint src/hooks/inventory/use-inventory.ts tests/unit/inventory/use-transfer-inventory.test.tsx`
- `git diff --check -- docs/inventory/MAINTAINER-SPRINT-3.md src/hooks/inventory/use-inventory.ts tests/unit/inventory/use-transfer-inventory.test.tsx`
- `./node_modules/.bin/vitest run tests/unit/inventory tests/unit/inventory-support/query-normalization-wave6g.test.tsx`
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit`

Goal adaptation: no standing goal change. Sprint 3 continues stock-changing cache integrity cleanup through bounded hook/cache behavior slices.

Residual risk: adjustment and allocation optimistic patches still need targeted row-scope review; receive/transfer invalidation remains broad rather than result-aware until Issue 4.

### Issue 3: Adjustment Optimistic Patch Row Scope

Touched domains: inventory adjustment hook, inventory list/detail optimistic cache patching, stock action regression coverage.

Workflow protected: `useAdjustInventory` mutation -> adjustment server row write -> rollback/invalidation -> operator-visible stock rows.

Business value: correcting stock for one product/location no longer temporarily adjusts every cached lot or serial row at that location before the authoritative server refetch lands.

Standards checked:

- disabled aggregate optimistic list/detail math for inventory adjustments
- product/location-only adjustments now wait for refetch because the server still mutates one locked matching row
- row-scoped adjustments with `inventoryId` continue to avoid aggregate optimistic math
- rollback and invalidation behavior remain unchanged
- added adjustment regression coverage for unscoped and row-scoped payloads

Smells removed:

- unscoped adjustment optimistic patches could update sibling lot/serial rows even though the server adjusts one inventory row
- adjustment optimistic behavior had no regression coverage for product/location sibling rows

Deferred:

- adjustment invalidation remains prefix-broad
- adjustment server transaction behavior and schema validation are unchanged
- product-domain `useAdjustStock` remains unchanged and already relies on invalidation rather than inventory-list optimistic math
- allocation/deallocation optimistic and cache behavior still needs targeted review

Verification:

- `./node_modules/.bin/vitest run tests/unit/inventory/use-adjust-inventory.test.tsx tests/unit/inventory/stock-action-error-messages.test.ts`
- `./node_modules/.bin/eslint src/hooks/inventory/use-inventory.ts tests/unit/inventory/use-adjust-inventory.test.tsx`
- `git diff --check -- docs/inventory/MAINTAINER-SPRINT-3.md src/hooks/inventory/use-inventory.ts tests/unit/inventory/use-adjust-inventory.test.tsx`
- `./node_modules/.bin/vitest run tests/unit/inventory tests/unit/inventory-support/query-normalization-wave6g.test.tsx`
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit`

Goal adaptation: no standing goal change. Sprint 3 continues removing unsafe optimistic cache behavior from stock-changing flows.

Residual risk: allocation/deallocation cache behavior still needs targeted review; receive, transfer, and adjustment invalidation remain broad rather than result-aware until Issue 4.

### Issue 4: Stock Mutation Result-Aware Invalidation Contract

Touched domains: inventory receive, transfer, and adjustment hooks; inventory detail and valuation cost-layer cache contracts; product stock cache contracts; stock mutation regression coverage.

Workflow protected: stock-changing hook mutation -> transactional server write -> result-aware cache invalidation -> operator-visible inventory, warehouse, product, valuation, availability, serialized, and movement views.

Business value: after stock is received, transferred, or adjusted, RENOZ operators get fresh operational stock surfaces and exact changed-row details instead of stale dashboard/product/valuation views or unnecessarily broad detail invalidation when the server already reports affected rows.

Standards checked:

- added a shared `invalidateInventoryStockMutationQueries` helper for receive, transfer, and adjustment
- centralized affected inventory row collection from `affectedInventoryIds`, `item`, `sourceItem`, and `destinationItem`
- exact inventory detail and cost-layer detail caches are invalidated when row identity is available
- broad detail invalidation remains only as the fallback when mutation result identity is unavailable
- transfer and adjustment now refresh dashboard, WMS, valuation, availability, available-serial, and product inventory surfaces instead of only list/detail/low-stock
- serialized receive and serial-number transfer paths continue to refresh serialized inventory caches
- movement invalidation behavior is preserved on transfer/adjust settle and included in receive settle

Smells removed:

- receive, transfer, and adjustment had separate invalidation logic with different operational surfaces
- transfer and adjustment could leave dashboard, WMS, valuation, availability, available-serial, and product stock caches stale after successful mutations
- stock mutation invalidation ignored the server's finance mutation envelope and invalidated the entire inventory detail prefix even when affected rows were known

Deferred:

- dashboard, WMS, valuation, availability, and product stock caches remain prefix-broad because their filter spaces cannot be safely narrowed from the current mutation result
- receive, transfer, and adjustment server transactions are unchanged
- query-key architecture is unchanged outside the hook-level stock mutation helper
- allocation/deallocation frontend cache behavior was searched but not changed; the active app has server functions exported, but no current route, component, hook, or test call sites for `allocateStock`, `deallocateStock`, `allocateInventory`, or `deallocateInventory`

Verification:

- `./node_modules/.bin/vitest run tests/unit/inventory/use-receive-inventory.test.tsx tests/unit/inventory/use-adjust-inventory.test.tsx tests/unit/inventory/use-transfer-inventory.test.tsx`
- `./node_modules/.bin/eslint src/hooks/inventory/use-inventory.ts tests/unit/inventory/use-receive-inventory.test.tsx tests/unit/inventory/use-adjust-inventory.test.tsx tests/unit/inventory/use-transfer-inventory.test.tsx`
- `rg -n "allocateStock|deallocateStock|allocateInventory|deallocateInventory" src/hooks src/components src/routes tests`
- `git diff --check -- docs/inventory/MAINTAINER-SPRINT-3.md src/hooks/inventory/use-inventory.ts tests/unit/inventory/use-receive-inventory.test.tsx tests/unit/inventory/use-adjust-inventory.test.tsx tests/unit/inventory/use-transfer-inventory.test.tsx`
- `./node_modules/.bin/vitest run tests/unit/inventory tests/unit/inventory-support/query-normalization-wave6g.test.tsx`
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit`

Goal adaptation: no standing goal change. Sprint 3 now has a reusable stock mutation cache contract instead of per-hook invalidation drift.

Residual risk: broad operational prefixes still trade precision for correctness; allocation/deallocation should adopt the same helper if an active frontend mutation path is introduced.
