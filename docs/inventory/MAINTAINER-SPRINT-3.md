# Maintainer Sprint 3: Inventory Mutation and Cache Integrity

This sprint follows Sprint 2's schema-ownership closeout. The focus shifts from contract placement to stock-changing behavior that can mislead operators after mutations.

Status: Issues 1, 2, 3, 4, and 5 implemented.

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

### 5. Stock Mutation Cache Module Boundary

Business value: the stock mutation cache policy should be a reusable inventory-domain contract, not hidden inside an already-large inventory hook file. Future stock-changing workflows should be able to adopt the same policy without copying hook internals.

Workflow invariant: inventory mutation hooks may orchestrate mutations and local optimistic patches, but shared invalidation policy belongs in an inventory-owned cache helper that depends on centralized query keys and the mutation result envelope.

Affected files:

- `src/hooks/inventory/use-inventory.ts`
- `src/hooks/inventory/_stock-mutation-cache.ts`
- `docs/inventory/MAINTAINER-SPRINT-3.md`

Out of scope:

- changing receive, transfer, or adjustment behavior
- changing test assertions already covering the stock mutation cache contract
- moving receive optimistic patch scope logic, which is still local to the receive hook behavior
- changing allocation/deallocation server functions without an active frontend mutation path

Focused tests:

```bash
./node_modules/.bin/vitest run tests/unit/inventory/use-receive-inventory.test.tsx tests/unit/inventory/use-adjust-inventory.test.tsx tests/unit/inventory/use-transfer-inventory.test.tsx
```

Closeout criteria:

- shared stock mutation invalidation logic is extracted from `use-inventory.ts`
- extracted helper remains inventory-domain owned and uses centralized query keys
- receive, transfer, and adjustment hooks consume the helper without behavior drift
- existing mutation cache regression tests pass
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

### Issue 5: Stock Mutation Cache Module Boundary

Touched domains: inventory mutation hook architecture, stock mutation cache policy, inventory query-key/cache contract documentation.

Workflow protected: stock-changing hook mutation -> shared inventory cache helper -> centralized query keys -> operator-visible inventory, warehouse, product, valuation, availability, serialized, and movement views.

Business value: the cache policy from Issue 4 is now a reusable inventory-domain contract instead of more logic embedded in a monolithic hook. That makes future stock-changing work easier to review and less likely to reintroduce per-hook invalidation drift.

Standards checked:

- extracted `invalidateInventoryStockMutationQueries` into `src/hooks/inventory/_stock-mutation-cache.ts`
- kept query-key usage centralized through `queryKeys`
- kept mutation-result identity handling in the cache helper instead of the hook
- kept receive lot/serial optimistic patch scope local to `use-inventory.ts`, where the receive-specific optimistic behavior belongs
- receive, transfer, and adjustment hooks now call the helper rather than owning shared invalidation internals

Smells removed:

- `use-inventory.ts` was accumulating shared cache-policy machinery unrelated to hook orchestration
- future stock-changing hooks would have had to copy or reach into hook-local invalidation logic

Deferred:

- `use-inventory.ts` remains large and still mixes several inventory queries and mutations
- receive optimistic patch scope logic is still local to the hook because it is receive-specific behavior
- stock count commit invalidation remains separate and should be reviewed as its own workflow spine before adopting this helper

Verification:

- `./node_modules/.bin/vitest run tests/unit/inventory/use-receive-inventory.test.tsx tests/unit/inventory/use-adjust-inventory.test.tsx tests/unit/inventory/use-transfer-inventory.test.tsx`
- `./node_modules/.bin/eslint src/hooks/inventory/use-inventory.ts src/hooks/inventory/_stock-mutation-cache.ts tests/unit/inventory/use-receive-inventory.test.tsx tests/unit/inventory/use-adjust-inventory.test.tsx tests/unit/inventory/use-transfer-inventory.test.tsx`
- `./node_modules/.bin/vitest run tests/unit/inventory tests/unit/inventory-support/query-normalization-wave6g.test.tsx`
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit`
- `git diff --check -- docs/inventory/MAINTAINER-SPRINT-3.md src/hooks/inventory/use-inventory.ts src/hooks/inventory/_stock-mutation-cache.ts`

Goal adaptation: no standing goal change. This is direct execution of the existing architecture-cleanliness posture: convert a proven behavior fix into a reusable domain boundary before starting the next workflow spine.

Residual risk: the extracted helper is still hook-layer infrastructure. If stock mutation cache policy is needed by non-hook code later, it may belong under a broader inventory cache contract module outside `src/hooks`.

## Sprint Closeout

Completion audit:

- Objective: make inventory stock-changing mutation behavior safer and easier to reason about for operators receiving, adjusting, and transferring lithium-ion battery stock.
- Deliverables checked: issue ledger, issue closeout logs, code references, regression tests, focused gates, broad inventory gates, typecheck, and residual-risk notes.
- Evidence inspected: `src/hooks/inventory/use-inventory.ts`, `src/hooks/inventory/_stock-mutation-cache.ts`, `tests/unit/inventory/use-receive-inventory.test.tsx`, `tests/unit/inventory/use-transfer-inventory.test.tsx`, `tests/unit/inventory/use-adjust-inventory.test.tsx`, and this sprint artifact.

Touched domains: inventory receiving, inventory adjustments, inventory transfers, inventory list/detail cache policy, valuation cost-layer cache policy, serialized stock cache policy, product stock cache policy.

Workflow protected: stock-changing mutation -> optimistic patch/rollback where safe -> transactional server write -> result-aware cache invalidation/refetch -> operator-visible inventory, warehouse, product, valuation, serialized, and movement views.

Business value protected: operators should not see inflated sibling lots/serials during optimistic updates, stale stock dashboards after transfer/adjust, or hidden cache drift after receive/transfer/adjust. This improves trust in battery stock availability, warehouse truth, serialized picking, and inventory valuation.

Architecture standards checked:

- route/page behavior was not changed; this sprint stayed in the hook/cache contract layer
- hooks now keep receive-specific optimistic patching local and shared stock invalidation in an inventory-owned helper
- server transactions and tenant-scoped server functions were inspected but not changed
- centralized query keys remain the only cache-key source
- mutation result envelopes now drive exact inventory detail/cost-layer invalidation when identity is available
- broad operational prefixes remain broad only where client-side result identity cannot safely narrow the filter space

Tenant isolation and data-integrity implications: no server query or database write behavior was changed. Existing tenant-scoped transactional receive, transfer, and adjustment functions remain the authority. The client cache now follows those authoritative mutation results more closely.

Query/cache contract checked: receive, transfer, and adjustment now share `invalidateInventoryStockMutationQueries`. Exact row identity invalidates `inventory.detail(id)` and `inventory.costLayersDetail(id)`. Operational summaries refresh through inventory, valuation, availability, serialized, WMS, movement, and product stock prefixes.

Smells removed:

- unsafe optimistic receive patches across sibling lot/serial rows
- unsafe aggregate transfer optimistic patches for row-scoped transfers
- unsafe aggregate adjustment optimistic patches for server row-scoped writes
- per-hook stock mutation invalidation drift
- shared cache-policy internals embedded in `use-inventory.ts`

Smells deferred:

- `use-inventory.ts` remains large and still mixes multiple inventory queries/mutations
- stock-count commit cache behavior remains separate and should be reviewed through its own workflow spine
- allocation/deallocation server functions exist, but no active frontend mutation path was found in routes, components, hooks, or tests
- broad dashboard/WMS/valuation/availability/product prefixes trade precision for correctness until mutation results expose narrower filter-safe identities

Verification:

- Issue 1 focused receive tests, lint, broad inventory suite, and typecheck recorded above
- Issue 2 focused transfer tests, lint, broad inventory suite, and typecheck recorded above
- Issue 3 focused adjustment tests, lint, broad inventory suite, and typecheck recorded above
- Issue 4 focused mutation cache tests, lint, allocation/deallocation frontend search, diff check, broad inventory suite, and typecheck recorded above
- Issue 5 focused mutation tests, lint, broad inventory suite, typecheck, and diff check recorded above

Gates skipped: browser QA was skipped because this sprint changed hook/cache policy and unit coverage directly exercises the affected mutation contracts. Server integration tests were not added because server transaction behavior was intentionally out of scope.

Goal adaptation: no standing goal change. The sprint reinforced the active maintainer goal by converting cache behavior fixes into a reusable inventory-domain boundary.

Residual risk: shipment finalization, stock counts, support/RMA inventory recovery, and order fulfillment remain cross-domain stock mutation surfaces that should be reviewed under their own sprint artifacts before adopting or adapting the new inventory cache helper.
