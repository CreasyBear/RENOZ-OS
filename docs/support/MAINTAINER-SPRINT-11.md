# Support Maintainer Sprint 11

This sprint continues from Sprint 10's RMA receive-location honesty work. The target is the post-receive cache contract: after returned stock is received, support, inventory, valuation, movement, serialized, and product stock surfaces must be refreshed from the mutation identity produced by the transaction.

Status: Closed after Issue 1.

## Business Value

RMA receive is returned-stock recovery for RENOZ Energy. Operators need the RMA, order, warehouse inventory, product stock, movement history, valuation, and serialized lineage surfaces to agree after a return is received. A broad inventory invalidation can refresh some views, but it does not make the product stock contract explicit and it hides whether the server knows which stock rows were restored.

## Workflow Spine

RMA detail route
-> `RmaDetailContainer`
-> `useRmaDetail`
-> `useReceiveRma`
-> `receiveRma` server transaction
-> restored inventory rows, return movements, cost layers, serialized events
-> mutation identity
-> inventory-domain cache invalidation helper
-> support RMA, order detail, inventory, valuation, serialized, movement, and product stock surfaces.

## Architecture Constraints

- Keep this sprint to RMA receive mutation identity and cache policy.
- Do not change RMA status transitions, selected receiving-location validation, inspection note parsing, inventory quantity math, cost-layer writes, serialized lineage writes, or remedy execution behavior.
- Reuse the inventory-owned stock mutation cache helper rather than duplicating support-specific invalidation.
- Preserve broad fallback behavior when mutation identity is unknown, but use exact inventory/product identities when the server returns them.
- Add focused tests for the support hook and server trace contract, and keep existing inventory helper regression tests green.

## Issue Ledger

### 1. RMA Receive Result-Aware Inventory Cache Contract

Problem:

- `receiveRma` restored inventory, created movement/cost-layer/serialized side effects, and returned only RMA identity through `affectedIds`.
- `useReceiveRma` invalidated `queryKeys.inventory.all`, which refreshed inventory prefixes broadly but did not explicitly refresh affected product stock surfaces.
- The cache policy could not distinguish exact returned inventory rows from unknown identity, which made the support/inventory boundary harder to reason about.

Workflow protected:

RMA receive mutation -> transactional returned-stock writes -> mutation identity -> inventory cache helper -> operator-visible RMA/order/inventory/product/valuation/movement surfaces.

Implemented slice:

- Extended the shared serialized mutation result shape with optional `affectedInventoryIds`, `affectedProductIds`, and `touchesSerializedInventory`.
- Updated `receiveRma` to collect affected inventory row IDs, affected product IDs, and serialized touch state inside the transaction.
- Updated the inventory stock mutation cache helper to support multi-product mutation results, exact inventory detail invalidation, product fallback invalidation, and explicit serialized touch state.
- Updated `useReceiveRma` to call the inventory helper with the server result instead of invalidating `queryKeys.inventory.all`.
- Updated `useBulkReceiveRma` to use the same helper with unknown identity fallback.
- Added regression coverage for the support hook and server trace contract.

Out of scope:

- Changing RMA receive inventory quantity math.
- Changing the non-serialized damaged/defective return row policy.
- Changing bulk receive to aggregate per-RMA mutation identities.
- Changing RMA read profiles or line item hydration.
- Changing database constraints, row-level tenant predicates, or cost-layer transaction behavior.

Closeout:

- Touched domains: support/RMA receive hook, RMA receive server function, inventory cache helper, serialized mutation contract schema, support tests, support sprint evidence.
- Workflow protected: RMA detail route -> `useRmaDetail` -> `useReceiveRma` -> `receiveRma` transaction -> returned inventory rows/movements/cost layers/serialized events -> result-aware cache invalidation.
- Business value protected: after a return is received, product stock and product movement views now refresh from the same returned-stock identity as inventory detail, valuation, movement, WMS, availability, and support RMA/order context.
- Architecture standards checked: route and container boundaries unchanged; hook delegates cache policy to the inventory-owned helper; server transaction returns mutation identity from the rows it actually touched; centralized query keys are still the only cache keys used.
- Tenant isolation and data integrity checked: existing `ctx.organizationId` transaction scoping and selected-location validation remain unchanged; no tenant predicate or inventory write predicate was weakened.
- Query/cache contract checked: single receive now invalidates exact inventory details/cost-layer details when identity is known, refreshes product stock queries from affected product IDs, refreshes inventory movements/valuation/availability/WMS/available serial surfaces, and avoids the old blind `queryKeys.inventory.all` invalidation.
- Smells removed: RMA receive no longer hides returned-stock cache policy behind a single broad inventory prefix; inventory stock mutation helper is no longer single-product only; serialized touch state is explicit in the mutation result.
- Smells deferred: bulk receive still cannot aggregate exact per-RMA inventory/product identities; non-serialized damaged/defective returns still need a separate row-status policy review because merging damaged returns into aggregate non-serialized stock may be unsafe; browser QA remains deferred until a visual/workflow QA pass.
- Gates run: `./node_modules/.bin/vitest run tests/unit/support/use-rma-mutations.test.tsx tests/unit/support/rma-receive-location-contract.test.ts`; `./node_modules/.bin/vitest run tests/unit/inventory/use-receive-inventory.test.tsx tests/unit/inventory/use-adjust-inventory.test.tsx tests/unit/inventory/use-transfer-inventory.test.tsx`; `./node_modules/.bin/vitest run tests/unit/support`; `./node_modules/.bin/eslint src/hooks/inventory/_stock-mutation-cache.ts src/hooks/support/use-rma.ts src/lib/schemas/inventory/serialized-mutation-contract.ts src/server/functions/orders/rma.ts tests/unit/support/use-rma-mutations.test.tsx tests/unit/support/rma-receive-location-contract.test.ts`; `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit`; `git diff --check`.
- Gates skipped: browser QA, because this was a hook/server cache-contract slice with unit and type coverage and no UI rendering change.
- Goal adaptations: declined. The standing product-owner goal still fits: this sprint removed a cross-domain support/inventory cache smell and left the returned-stock workflow easier to reason about.
- Residual risk: next support/inventory sprint should decide the damaged non-serialized return policy before further RMA receive behavior work; bulk receive should eventually return or aggregate cache identity instead of relying on unknown-identity fallback.
