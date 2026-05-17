# Inventory Maintainer Sprint 216: Shared Finance Integrity Read Model

Status: closed and commit-ready.

## Problem

Sprint 215 fixed the finance integrity shipment-link predicate so historical shipment links superseded by later RMA receipt events do not block close readiness.

That left the app-side finance integrity aggregate SQL duplicated between financial close readiness and inventory valuation. The release gate script is intentionally standalone, but app read models should not each own their own copy of inventory valuation, cost-layer, serialized allocation, and shipment/RMA mismatch rules.

## Workflow Spine Protected

```text
inventory / cost-layer / serialized shipment state
  -> shared app finance-integrity aggregate read
  -> financial close readiness
  -> inventory valuation finance-integrity summary
  -> operator-visible close and valuation signals
```

## Touched Domains

- Finance close readiness.
- Inventory valuation finance-integrity summary.
- Serialized shipment/RMA lineage predicate ownership.
- Finance integrity regression tests.
- Inventory sprint evidence.

## Business Value Protected

Finance and warehouse operators need one trustworthy interpretation of whether stock, cost layers, serialized allocations, and shipment/RMA lineage are safe enough for closeout. This slice reduces the chance that close readiness and inventory valuation drift apart after the next maintenance change.

## Changes

- Added `src/server/functions/financial/_shared/inventory-finance-integrity-read.ts`.
- Moved the app-side aggregate finance integrity SQL into `readInventoryFinanceIntegrityAggregate`.
- Updated `src/server/functions/financial/_shared/financial-close-readiness.ts` to consume the shared aggregate reader.
- Updated `src/server/functions/inventory/valuation.ts` to consume the shared aggregate reader while keeping top drift row selection local to valuation.
- Expanded `tests/unit/financial/finance-integrity-shipment-link-rma-contract.test.ts` so app consumers must stay on the shared aggregate query and cannot re-own duplicated shipment mismatch SQL.
- Left `scripts/run-finance-integrity-gates.mjs` standalone because it runs as an operational script outside app runtime/build boundaries.

## Standards Checked

- Domain ownership: finance owns the shared close-readiness integrity aggregate; inventory valuation consumes it for valuation-specific reporting.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: unchanged; this is a server read-model extraction with no route, hook, schema, or cache-key changes.
- Tenant isolation: preserved by keeping every aggregate CTE scoped to `organization_id`.
- Transactional integrity: unchanged; no writes, mutations, cost-layer changes, payments, shipments, RMA receiving, or valuation recomputation changed.
- Serialized lineage: preserved by keeping the RMA-aware `serialized_item_events.event_type = 'rma_received'` exemption in the shared app predicate.
- Query/cache contract: unchanged; no query keys, invalidation behavior, stale-time policy, or hook contracts changed.
- Operator-safe states: preserved; the same close readiness and valuation summaries are returned with less duplicated predicate ownership.
- Reviewable diff: limited to one shared read helper, two call sites, one source-boundary regression test, and this closeout note.

## Smells Removed

- Removed duplicated app-side finance integrity aggregate SQL from financial close readiness and inventory valuation.
- Removed duplicated shipment mismatch and serialized event predicate ownership from app consumers.
- Added a source-boundary test that prevents reintroducing the same app-side duplication.
- Reduced `financial-close-readiness.ts` to mapping the shared integrity aggregate into close-readiness response shape.

## Smells Deferred

- The operational finance gate script still duplicates the SQL intentionally so it can run without importing app server modules.
- The field name `shipmentLinkNotShippedOrReturned` remains imprecise after the RMA-aware Sprint 215 correction; renaming would widen schema/UI/API blast radius.
- `src/server/functions/inventory/valuation.ts` remains large even after this extraction; future slices should continue separating valuation read models, drift-row reporting, and turnover analytics by workflow.
- `src/lib/query-keys.ts` remains a centralized but very large registry.
- Production build still warns about chunks larger than 500 kB; bundle splitting remains a separate performance/product polish slice.

## Verification

- `npm run test:vitest -- tests/unit/financial/finance-integrity-shipment-link-rma-contract.test.ts tests/unit/financial/domain-remediation.test.ts tests/unit/inventory/wms-stock-semantics-contract.test.ts` passed, 3 files / 8 tests.
- `./node_modules/.bin/eslint src/server/functions/financial/_shared/inventory-finance-integrity-read.ts src/server/functions/financial/_shared/financial-close-readiness.ts src/server/functions/inventory/valuation.ts tests/unit/financial/finance-integrity-shipment-link-rma-contract.test.ts --report-unused-disable-directives` passed.
- `git diff --check` passed.
- `npm run lint:reliability` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run test:unit` passed, 765 files / 2535 tests.
- `npm run build` passed with the known large-chunk warning and native `bcrypt` trace reminder.
- `npm run reliability:finance-gates` passed against Supabase after network escalation: all hard gates `0`.
- `npm run reliability:document-gates` was skipped because this slice did not touch document schema, document generation, or document release contracts.
- `npm run reliability:release-gates` was skipped because this was not a release-preparation slice and the touched contract was covered by the focused finance integrity gate.
- Manual browser QA was deferred because no route, component, hook, cache, loading, error, or visual state changed.

## Goal Adaptation

No standing goal change. This sprint continues the product-owner goal by turning a Sprint 215 debt item into a bounded architecture cleanup before it can become future finance/inventory drift.

## Residual Risk

Low behavioral risk because this is a read-model extraction with unchanged return shapes and no writes. Medium architecture risk remains in the intentional script duplication and the broader inventory valuation module size.
