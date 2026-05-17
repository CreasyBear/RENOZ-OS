# Inventory Maintainer Sprint 224: Finance Reconciliation Boundary

Status: closed and commit-ready.

## Problem

After Sprint 223, `valuation.ts` still owned the full finance-integrity reconciliation transaction inline with valuation reads, cost-layer writes, COGS preview, aging, turnover, product cost-layer reads, and weighted-average product cost updates.

That reconciliation block is one of the more sensitive inventory/finance workflows: it scans tenant inventory, identifies stock without active layers, can create repair cost layers, clamps impossible layer quantities, updates inventory value drift, and returns post-repair integrity evidence.

## Workflow Spine Protected

Finance integrity reconcile action
-> `reconcileInventoryFinanceIntegrity` server function
-> `reconcileInventoryFinanceIntegrityState` helper
-> transaction with `app.organization_id`
-> tenant-scoped stock/layer scan
-> optional repair writes for missing layers, invalid layers, and value drift
-> post-integrity summary for operator evidence.

## Touched Domains

- Inventory valuation server functions.
- Inventory finance-integrity reconciliation helper.
- Inventory valuation tenant-scope/source contract tests.
- Inventory analytics and finance integrity regression coverage.
- Sprint evidence.

## Business Value Protected

RENOZ Energy needs finance repair workflows to be easy to review because they directly affect battery inventory valuation and close-readiness trust. This slice makes the repair transaction a named inventory/finance boundary while preserving the manage-permission server function and existing operator-facing behavior.

## Changes

- Added `src/server/functions/inventory/inventory-finance-reconcile.ts`.
- Moved the finance reconciliation transaction out of `valuation.ts`.
- Kept `reconcileInventoryFinanceIntegrity` as the public server function, auth boundary, and schema boundary.
- Preserved tenant-scoped inventory scans, cost-layer scans, missing-layer repair writes, layer clamping, drift repair, dry-run reporting, and post-integrity summary behavior.
- Updated valuation source contracts to prove `valuation.ts` delegates reconciliation and the helper owns the transaction and tenant predicates.

## Standards Checked

- Domain ownership: finance reconciliation now has a named inventory/finance helper instead of being buried in the broad valuation server-function file.
- Route -> container/page -> hook -> server -> schema/database -> query/cache policy: unchanged. Existing hooks and query-key/cache contracts still call `reconcileInventoryFinanceIntegrity`.
- Tenant isolation: preserved `app.organization_id`, inventory organization filters, layer organization filters, and tenant-owned repair writes.
- Transactional inventory and finance integrity: preserved one transaction for repair scanning, layer repair, layer clamping, drift repair, and post-repair summary.
- Serialized lineage continuity: unchanged. This slice does not touch serialized item status, shipment, RMA, or lineage writes.
- Honest UI states and operator-safe errors: unchanged. Existing hook-level finance reconciliation error copy remains covered by analytics tests.
- Mutation/cache contracts: unchanged. No invalidation or cache key behavior changed.
- Tests: source contracts now guard the extracted transaction boundary and existing behavior tests still cover the reconciliation hook surface.

## Smells Removed

- `valuation.ts` no longer owns the finance-integrity reconciliation transaction inline.
- Removed 132 lines of reconciliation transaction detail from the broad valuation server-function module.
- Made the repair workflow easier to review as one named helper with explicit row types.

## Smells Deferred

- `valuation.ts` still owns manual cost-layer creation and weighted-average product cost writes.
- `src/lib/query-keys.ts` remains a large shared architecture pressure point.
- Database-backed reconciliation coverage with real rows remains deferred; this sprint preserves SQL shape and adds source contracts, but does not execute the repair against a live database.

## Verification

- `npm run test:vitest -- tests/unit/inventory/valuation-tenant-scope-contract.test.ts tests/unit/inventory/query-normalization-wave3-analytics.test.tsx tests/unit/inventory/query-normalization-wave7b.test.tsx tests/unit/inventory/valuation-permission-contract.test.ts tests/unit/financial/finance-integrity-shipment-link-rma-contract.test.ts` passed: 5 files, 24 tests.
- `./node_modules/.bin/eslint src/server/functions/inventory/valuation.ts src/server/functions/inventory/inventory-finance-reconcile.ts tests/unit/inventory/valuation-tenant-scope-contract.test.ts --report-unused-disable-directives` passed.
- `git diff --check` passed.
- `npm run lint:reliability` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run test:unit` passed: 765 files, 2,536 tests.

## Skipped

- Production build was skipped because this was a server-side extraction covered by focused tests, typecheck, full lint, reliability gates, and full unit tests.
- Browser QA was skipped because no UI rendering or interaction changed.
- Live `npm run reliability:finance-gates` was skipped because it requires `DATABASE_URL` and this slice did not intend to change finance integrity predicates or live data state.

## Goal Adaptation

None. This follows the active goal's domain-sliced cleanup model and keeps architecture cleanliness as the dominant lens.

## Residual Risk

Low for behavior because the public server function, schema, permission, cache surface, transaction shape, tenant predicates, and test suite are preserved. Medium residual risk remains in live reconciliation behavior because there is still no database-backed repair fixture for missing layers, layer clamping, and value drift in one transaction.
