# Inventory Maintainer Sprint 223: COGS Preview Boundary

Status: closed and commit-ready.

## Problem

After Sprint 222, `valuation.ts` still owned the full COGS preview calculation inline with auth, valuation reads, cost-layer writes, finance integrity reconciliation, aging, turnover, product cost-layer reads, and weighted-average cost updates.

That made a finance-sensitive invariant harder to see: manual COGS application must stay disabled, while shipment and RMA workflows remain the canonical posting paths.

## Workflow Spine Protected

COGS preview caller
-> `calculateCOGS` server function
-> `previewInventoryCogs` helper
-> tenant-scoped `inventory` and `inventory_cost_layers` reads
-> FIFO simulated COGS result
-> operator feedback for insufficient layers or disabled manual apply.

## Touched Domains

- Inventory valuation server functions.
- Inventory COGS preview read model.
- Inventory valuation tenant-scope/source contract tests.
- Inventory analytics and WMS valuation regression coverage.
- Sprint evidence.

## Business Value Protected

RENOZ Energy can preview cost-of-goods impact for battery stock without creating a manual finance posting path. Operators still get explicit guidance that canonical COGS belongs to shipment and RMA workflows, and insufficient layer feedback remains tied to available cost-layer quantity.

## Changes

- Added `src/server/functions/inventory/inventory-cogs-preview.ts`.
- Moved the FIFO COGS preview calculation, simulate-only guard, tenant-scoped inventory lookup, active cost-layer read, insufficient-layer validation, and unit-cost response shaping into `previewInventoryCogs`.
- Kept `calculateCOGS` as the public server function and auth/input boundary.
- Removed COGS-only parsing/type helpers and the unused `asc`/`ValidationError` imports from `valuation.ts`.
- Added source contract coverage proving the COGS preview helper owns the sensitive policy and tenant predicates.

## Standards Checked

- Domain ownership: COGS preview behavior now has a named inventory read helper instead of being buried in the valuation server-function module.
- Route -> container/page -> hook -> server -> schema/database -> query/cache policy: unchanged. Existing hook and query-key contracts still call `calculateCOGS`; only the server-side helper boundary moved.
- Tenant isolation: preserved inventory lookup with `inventory.organizationId = organizationId` and active cost-layer lookup with `inventoryCostLayers.organizationId = organizationId`.
- Transactional inventory and finance integrity: unchanged. This remains a read-only preview path; no COGS write or finance posting path was introduced.
- Serialized lineage continuity: unchanged. This slice does not touch serialized stock movement or shipment/RMA posting behavior.
- Honest UI states and operator-safe errors: preserved manual-apply disabled guidance and insufficient-layer validation semantics.
- Mutation/cache contracts: unchanged. No mutation or invalidation behavior changed.
- Tests: source-level contracts now prove the extraction and preserved policy.

## Smells Removed

- `valuation.ts` no longer owns the COGS preview calculation inline.
- COGS-only `CostLayerRecord` and decimal parsing helpers no longer sit in the general valuation server-function file.
- The manual COGS disabled policy is easier to find and test as COGS preview behavior.

## Smells Deferred

- `valuation.ts` still owns finance integrity reconciliation and weighted-average cost update behavior; those write paths should be considered separately because they carry transaction and finance integrity concerns.
- `src/lib/query-keys.ts` remains a large shared architecture pressure point.
- Database-backed integration coverage for real COGS preview rows remains deferred; this sprint added source and existing unit coverage only.

## Verification

- `npm run test:vitest -- tests/unit/inventory/valuation-tenant-scope-contract.test.ts tests/unit/inventory/query-normalization-wave3-analytics.test.tsx tests/unit/inventory/query-normalization-wave7b.test.tsx tests/unit/inventory/wms-stock-semantics-contract.test.ts tests/unit/inventory/valuation-permission-contract.test.ts` passed: 5 files, 25 tests.
- `./node_modules/.bin/eslint src/server/functions/inventory/valuation.ts src/server/functions/inventory/inventory-cogs-preview.ts tests/unit/inventory/valuation-tenant-scope-contract.test.ts --report-unused-disable-directives` passed.
- `git diff --check` passed.
- `npm run lint:reliability` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run test:unit` passed: 765 files, 2,536 tests.

## Skipped

- Production build was skipped because this was a server-side extraction covered by focused tests, typecheck, full lint, reliability gates, and full unit tests.
- Browser QA was skipped because no UI rendering or interaction changed.
- Live database finance/inventory checks were skipped because no SQL semantics or write paths changed.

## Goal Adaptation

None. This follows the active goal's domain-sliced cleanup model and keeps architecture cleanliness as the dominant lens.

## Residual Risk

Low for runtime behavior because the public server function, schema, hook/cache contract, tenant predicates, FIFO order, and operator errors are preserved and covered. Medium residual architecture risk remains in valuation write/reconciliation behavior and other large legacy server modules.
