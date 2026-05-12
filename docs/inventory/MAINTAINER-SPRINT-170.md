# Inventory Maintainer Sprint 170: Bulk RMA Cache Identity

## Status

Closed in commit-ready state.

## Issue 1: Bulk RMA Receive Flattened Delegated Stock Identity

### Problem

Single `receiveRma` returns affected inventory/product identity and serialized-touch state for the centralized stock mutation cache policy. `bulkReceiveRma` delegates each RMA to `receiveRma`, but discarded that delegated identity, forcing `useBulkReceiveRma` to treat every bulk receive as a broad stock refresh.

That made the support returns workflow less precise than supplier receiving, even though the server already had exact affected identity from successful delegated transactions.

### Workflow Spine

Bulk RMA receive action
-> `useBulkReceiveRma`
-> `bulkReceiveRma`
-> per-RMA `receiveRma`
-> tenant-scoped inventory restore transaction
-> aggregate affected inventory/product/serialized identity
-> centralized inventory stock mutation cache policy.

### Touched Domains

- Support RMA bulk receive server function.
- Support RMA mutation hooks.
- Support RMA schema result contract.
- RMA receive contract tests.
- RMA receive code trace.
- Inventory sprint evidence.

### Business Value Protected

Bulk RMA receiving now refreshes the same stock, cost layer, product inventory, movement, and serialized surfaces as single RMA receiving without falling back to root inventory/product invalidation. Returns processing stays fresher and less cache-heavy during batch work.

### Scope Constraints

- Do not change RMA receive transaction semantics, location rules, status transitions, or partial-failure behavior.
- Do not change RMA remedy processing.
- Do not change the shared stock mutation cache helper.
- Keep the slice local to support returns and inventory cache policy.

### Changes

- Added optional stock mutation identity fields to `BulkRmaResult`.
- `bulkReceiveRma` now aggregates `affectedInventoryIds`, `affectedProductIds`, and `touchesSerializedInventory` from successful delegated `receiveRma` results.
- `useBulkReceiveRma` now passes the bulk result into `invalidateInventoryStockMutationQueries`.
- Removed the hook-level serialized broad-refresh assumption; serialized refresh now follows returned mutation evidence.
- Added hook coverage proving exact bulk RMA stock/product/serialized/movement invalidation and no root inventory/product invalidation.
- Extended source-level contract coverage for delegated identity aggregation.
- Updated the RMA receive code trace so repo documentation matches the current cache policy.

### Standards Checked

- Domain ownership: bulk receive owns orchestration; single receive owns inventory restoration; the stock cache helper owns read-after-write refresh.
- Route -> container/page -> hook -> server function -> schema/database -> query/cache policy: bulk RMA receive now carries server-side mutation evidence into the shared cache contract.
- Tenant isolation/data integrity: unchanged; identity is returned only from successful tenant-scoped delegated receive transactions.
- Transactional inventory/finance integrity: unchanged; inventory rows, movements, cost layers, valuation recompute, and activity writes are untouched.
- Serialized lineage continuity: serialized-touch state is preserved from delegated receive results.
- Honest UI/error handling: unchanged; partial failures still report per-RMA errors.
- Query/cache contract: improved and covered with focused hook tests.
- Reviewability: narrow result-contract, server aggregation, hook delegation, and trace update.

### Smells Removed

- Bulk RMA receive discarded exact stock identity returned by delegated receive mutations.
- Bulk RMA hook used an unconditional serialized refresh flag instead of returned mutation evidence.
- RMA receive trace still described broad `inventory.all` behavior after the code had moved to the shared stock cache helper.

### Deferred

- No row-level DB integration test for approved RMA -> receive -> inventory movement/layer rows.
- No refactor of nested server-function delegation or duplicate auth checks inside bulk receive.
- No browser smoke; this was a server-envelope and hook/cache contract slice.
- Fixed `AUD` cost-layer currency remains a separate finance/data-model debt item.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/support/use-rma-mutations.test.tsx tests/unit/support/rma-receive-location-contract.test.ts tests/unit/orders/order-write-contracts.test.ts`
- Passed: `./node_modules/.bin/eslint src/lib/schemas/support/rma.ts src/server/functions/orders/rma.ts src/hooks/support/use-rma.ts tests/unit/support/use-rma-mutations.test.tsx tests/unit/support/rma-receive-location-contract.test.ts --report-unused-disable-directives`
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
- Passed: `git diff --check`

### Goal Adaptation

No adaptation needed. This sprint continues the maintainer goal by tightening another stock-changing workflow around domain ownership, mutation evidence, and centralized cache policy.

### Residual Risk

Low. The change preserves delegated mutation identity and narrows cache behavior without changing inventory write behavior, location enforcement, status transitions, or partial-failure semantics. The remaining risk is lack of DB-backed integration proof for the receive transaction itself.
