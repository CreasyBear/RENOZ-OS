# Inventory Maintainer Sprint 218: Turnover Read Boundary

Status: closed and commit-ready.

## Problem

`src/server/functions/inventory/valuation.ts` still owned the full inventory turnover read model after Sprint 217.

The handler mixed server-function authentication with current COGS, current inventory value, product turnover rows, previous-period comparison, trend-window calculations, and response shaping. That made turnover harder to protect as a reporting workflow and kept `valuation.ts` carrying another dense SQL block unrelated to cost-layer writes, valuation headline reads, aging, and product cost-layer endpoints.

## Workflow Spine Protected

```text
inventory turnover hook/query key
  -> getInventoryTurnover server function
  -> readInventoryTurnover helper
  -> inventory_movements / inventory / products SQL
  -> turnover report shaped success/degraded states
```

## Touched Domains

- Inventory valuation server functions.
- Inventory turnover read model.
- Inventory turnover source-boundary tests.
- Inventory query-normalization tests.
- Inventory sprint evidence.

## Business Value Protected

Turnover is how RENOZ sees slow-moving battery stock and working-capital drag. This slice makes the turnover calculation easier to review and modify without accidentally changing unrelated valuation, cost-layer, finance integrity, aging, or product-cost behavior.

## Changes

- Added `src/server/functions/inventory/inventory-turnover-read.ts`.
- Moved turnover SQL, previous-period trend logic, product filtering, and response shaping out of `valuation.ts`.
- Kept `getInventoryTurnover` as the authenticated server-function entrypoint, preserving route/hook/query-key behavior.
- Updated turnover source-boundary tests to assert that `valuation.ts` delegates to `readInventoryTurnover`.
- Updated product-filter and chronological-window tests to follow the moved SQL into the new helper.

## Standards Checked

- Domain ownership: inventory owns the turnover read boundary; valuation remains the server-function entrypoint for existing callers.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: unchanged; the same hook, query key, schema, and server function export are preserved.
- Tenant isolation: preserved by keeping every inventory, product, and movement read scoped to `organizationId`.
- Transactional integrity: unchanged; no writes, cost layers, valuation recomputation, finance integrity, stock movement, RMA, warranty, order, or document behavior changed.
- Serialized lineage: unchanged; turnover reads aggregate movement/cost data only and do not mutate or reinterpret serialized item lineage.
- Query/cache contract: unchanged; no query keys, invalidation behavior, stale-time policy, or hook contracts changed.
- Operator-safe states: unchanged; query-normalization tests still cover healthy shaped turnover reads and stale/unavailable UI behavior.
- Reviewable diff: one helper extraction, two source-boundary test updates, and this closeout note.

## Smells Removed

- Removed 304 lines of turnover implementation from `valuation.ts`.
- Reduced `valuation.ts` from 1,426 lines to 1,134 lines.
- Created a named turnover read boundary for current-period, previous-period, and trend-window SQL.
- Prevented `valuation.ts` from re-owning turnover CTEs in source-boundary tests.

## Smells Deferred

- `valuation.ts` remains large and still mixes cost layers, valuation headline reads, reconciliation, COGS preview, aging, product cost layers, and weighted-average writes.
- Aging aggregation is now the clearest remaining read-model extraction candidate.
- Product cost-layer reads and weighted-average writes may deserve separate cost-layer/product-cost boundaries later.
- `src/lib/query-keys.ts` remains a large centralized registry.
- Production build chunk warnings remain deferred as a separate performance/product polish slice.

## Verification

- `npm run test:vitest -- tests/unit/inventory/valuation-turnover-window-contract.test.ts tests/unit/inventory/valuation-turnover-product-filter-contract.test.ts tests/unit/inventory/valuation-permission-contract.test.ts tests/unit/inventory/query-normalization-wave3-analytics.test.tsx tests/unit/inventory/query-normalization-wave7b.test.tsx` passed, 5 files / 20 tests.
- `./node_modules/.bin/eslint src/server/functions/inventory/valuation.ts src/server/functions/inventory/inventory-turnover-read.ts tests/unit/inventory/valuation-turnover-window-contract.test.ts tests/unit/inventory/valuation-turnover-product-filter-contract.test.ts --report-unused-disable-directives` passed.
- `git diff --check` passed.
- `npm run lint:reliability` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run test:unit` passed, 765 files / 2535 tests.
- `npm run build` was skipped because this was a server read-model extraction with unchanged exports, route loading, client bundles, schemas, query keys, and cache behavior; typecheck, full lint, focused contracts, and full unit tests covered the changed surface.
- `npm run reliability:finance-gates` was skipped because this slice did not touch finance integrity predicates or close-readiness behavior.
- `npm run reliability:document-gates` was skipped because this slice did not touch document schema, generation, or release contracts.
- `npm run reliability:release-gates` was skipped because this was not a release-preparation slice.
- Manual browser QA was deferred because no route, component, hook, cache, loading, error, or visual state changed.

## Goal Adaptation

No standing goal change. This sprint continues the product-owner goal by following the residual `valuation.ts` architecture risk into a bounded turnover reporting boundary.

## Residual Risk

Low behavioral risk because public server exports, schemas, query keys, and returned turnover shape did not change. Medium architecture risk remains in the remaining `valuation.ts` responsibilities, especially aging aggregation and cost-layer/product-cost concerns.
