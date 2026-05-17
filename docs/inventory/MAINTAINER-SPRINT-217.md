# Inventory Maintainer Sprint 217: Finance Integrity Summary Boundary

Status: closed and commit-ready.

## Problem

After Sprint 216, `src/server/functions/inventory/valuation.ts` still owned the inventory-facing finance integrity summary: top drift row SQL, aggregate-to-status mapping, and response shaping for `InventoryFinanceIntegritySummary`.

That made valuation continue to mix broad valuation routes, cost layer reads, COGS preview, reconciliation, aging, turnover, product cost layers, weighted-average writes, and finance integrity summary construction in one file.

## Workflow Spine Protected

```text
inventory valuation route/server function
  -> inventory finance integrity summary boundary
  -> shared finance integrity aggregate read
  -> top drift row read
  -> valuation report / finance integrity endpoint / reconcile post-check
```

## Touched Domains

- Inventory valuation server functions.
- Inventory finance integrity summary read model.
- Finance integrity source-boundary tests.
- Inventory tenant-scope source-boundary tests.
- Inventory sprint evidence.

## Business Value Protected

Finance and warehouse operators need valuation and closeout signals that are consistent and maintainable. This slice reduces the chance that future valuation work accidentally edits finance integrity status mapping or top drift row SQL while touching unrelated valuation, aging, turnover, or cost-layer behavior.

## Changes

- Added `src/server/functions/inventory/finance-integrity-summary.ts`.
- Moved inventory-facing finance integrity summary construction out of `valuation.ts`.
- Kept `valuation.ts` as the server-function surface for `getInventoryValuation`, `getInventoryFinanceIntegrity`, and reconciliation.
- Updated finance integrity source-boundary tests so valuation consumes the summary boundary while the summary boundary consumes the shared aggregate reader.
- Updated inventory tenant-scope tests to follow the moved top drift product/location joins into the new summary helper.

## Standards Checked

- Domain ownership: inventory owns the valuation-facing summary response; finance owns the reusable aggregate integrity read.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: unchanged; this is a server read-model boundary extraction with no route, hook, schema, query-key, or cache-policy change.
- Tenant isolation: preserved by keeping top drift rows scoped to `i.organization_id`, product joins scoped to `p.organization_id`, and location joins scoped to `l.organization_id`.
- Transactional integrity: unchanged; no writes, reconciliation updates, cost-layer mutations, shipments, RMA receiving, valuation recomputation, payments, or documents changed.
- Serialized lineage: unchanged; the RMA-aware shipment predicate remains in the shared aggregate reader from Sprint 216.
- Query/cache contract: unchanged; no query key literals, invalidation behavior, stale-time policy, or hook contracts changed.
- Operator-safe states: unchanged; returned summary shape and status semantics remain the same.
- Reviewable diff: one helper extraction, two source-boundary tests, and this closeout note.

## Smells Removed

- Removed 116 lines of finance integrity summary logic from `valuation.ts`.
- Created a named helper boundary for inventory finance integrity summary reads.
- Prevented `valuation.ts` from re-owning top drift row SQL, shipment mismatch SQL, or serialized event predicates.
- Updated source-boundary tests to make the new split explicit.

## Smells Deferred

- `valuation.ts` remains large at 1,426 lines and still mixes cost layers, valuation headline reads, reconciliation, COGS preview, aging, turnover, product cost layers, and weighted-average writes.
- Turnover SQL remains a likely future extraction because it carries current, previous-period, and trend-window logic in the same handler.
- Aging aggregation remains inline and could become its own workflow boundary later.
- `src/lib/query-keys.ts` remains a large centralized registry.
- Production build chunk warnings remain deferred as a separate performance/product polish slice.

## Verification

- Initial focused source-boundary test failed because it still expected `valuation.ts` to consume the shared aggregate reader directly. The test was corrected to assert the new boundary: `valuation.ts` consumes `getFinanceIntegritySummary`, and `finance-integrity-summary.ts` consumes `readInventoryFinanceIntegrityAggregate`.
- `npm run test:vitest -- tests/unit/inventory/valuation-tenant-scope-contract.test.ts tests/unit/inventory/wms-stock-semantics-contract.test.ts tests/unit/financial/finance-integrity-shipment-link-rma-contract.test.ts tests/unit/inventory/valuation-permission-contract.test.ts` passed, 4 files / 11 tests.
- `./node_modules/.bin/eslint src/server/functions/inventory/valuation.ts src/server/functions/inventory/finance-integrity-summary.ts tests/unit/inventory/valuation-tenant-scope-contract.test.ts tests/unit/financial/finance-integrity-shipment-link-rma-contract.test.ts --report-unused-disable-directives` passed.
- `git diff --check` passed.
- `npm run lint:reliability` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run reliability:finance-gates` initially failed in the sandbox with DNS resolution blocked, then passed with network escalation against Supabase: all hard gates `0`.
- `npm run test:unit` passed, 765 files / 2535 tests.
- `npm run build` was skipped because this slice changed a server read-model boundary only; typecheck, full lint, focused contracts, full unit suite, and live finance gates covered the risk better than rebuilding unchanged client bundles.
- `npm run reliability:document-gates` was skipped because this slice did not touch document schema, generation, or release contracts.
- `npm run reliability:release-gates` was skipped because this was not a release-preparation slice and live finance integrity was checked directly.
- Manual browser QA was deferred because no route, component, hook, cache, loading, error, or visual state changed.

## Goal Adaptation

No standing goal change. This sprint continues the product-owner goal by following Sprint 216's residual risk into the next small architecture boundary inside inventory/finance integrity.

## Residual Risk

Low behavioral risk because the public server functions, schemas, query/cache behavior, and returned summary shape did not change. Medium architecture risk remains in the rest of `valuation.ts`, especially turnover, aging, and product cost-layer responsibilities.
