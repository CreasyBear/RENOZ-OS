# Inventory Maintainer Sprint 8

This sprint follows Sprint 7's reorder copy closeout. The target is dashboard/report stock semantics: WMS and valuation surfaces must make physical on-hand stock, allocatable availability, and movement-reconstructed historical quantities explicit.

Status: Closed after Issue 1.

## Business Value

RENOZ operators need to know whether a stock number means batteries physically present, batteries saleable for allocation, or a historical signal reconstructed from movement rows. Blurring those meanings creates purchasing mistakes, false confidence in quarantined returns, and weak financial trust.

## Workflow Spine

inventory row quantity/status
-> WMS dashboard server aggregate
-> schema semantics contract
-> dashboard metric and breakdown labels
-> valuation report finance surface
-> operator decision.

## Architecture Constraints

- Keep this sprint to stock-semantics contract and operator-facing language.
- Do not change WMS totals, category/location breakdown math, current alert math, valuation math, query keys, or cache policy.
- Do not pretend previous-period WMS alert comparisons are allocatable; movement history does not preserve inventory-row status.
- Add focused contract/render tests for the API semantics and visible labels.

## Issue Ledger

### 1. WMS and Valuation Must Say What Kind of Stock They Show

Problem:

- Current WMS alerts now use allocatable availability, but WMS totals and stock breakdowns still use physical `quantityOnHand`.
- Previous-period WMS alert comparisons are reconstructed from movements and cannot be treated as status-aware allocatable availability.
- Dashboard and valuation report copy still said generic "stock" or "units", which made the surfaces look more consistent than the underlying domain truth.

Workflow protected:

inventory quantity/status -> WMS aggregates -> schema contract -> dashboard labels -> valuation report -> operator decisions.

Implemented slice:

- Added `WMS_DASHBOARD_STOCK_SEMANTICS` and `wmsDashboardStockSemanticsSchema`.
- Returned stock semantics from `getWMSDashboard`.
- Documented the previous-period WMS alert limitation in the server function where the comparison is built.
- Renamed dashboard metric and breakdown labels to distinguish on-hand stock from allocatable alerts.
- Updated valuation report copy/table labels to say physical on-hand where it is finance inventory, not saleable availability.
- Added focused schema/server/UI/static tests for the semantics contract.

Out of scope:

- Building a status-aware historical inventory snapshot model.
- Changing WMS comparison math or valuation calculations.
- Renaming existing WMS response fields.
- Browser QA.

Closeout:

- Touched domains: inventory WMS dashboard schema/server/UI, inventory valuation report UI, inventory contract tests, inventory sprint evidence.
- Workflow protected: inventory quantity/status -> WMS aggregate semantics -> dashboard and valuation operator interpretation.
- Business value protected: operators can distinguish physical batteries on hand from allocatable saleable availability and avoid reading movement-reconstructed history as current stock truth.
- Architecture standards checked: route/container/hook/query-key flow is unchanged; the server response now carries explicit schema-owned semantics; valuation remains a finance/on-hand surface; current alert counts keep using the centralized allocatable SQL helper.
- Tenant isolation and data integrity checked: no server filters, mutations, transactions, serialized lineage, cost layers, or valuation math changed.
- Query/cache contract checked: no query keys, stale times, invalidation, optimistic updates, or cache mutation helpers changed.
- Smells removed: generic stock/unit labels hid different stock semantics across WMS and valuation.
- Smells deferred: previous-period WMS comparisons remain movement-reconstructed quantity signals until a real historical status snapshot model exists; existing response field names remain for compatibility.
- Gates run: focused WMS/valuation/dashboard tests, focused ESLint, full inventory tests, TypeScript, `git diff --check`.
- Gates skipped: browser QA, because this was a schema/copy contract with render coverage and no interaction/layout change.
- Goal adaptations: declined. The standing maintainer goal already requires honest UI states, transactional inventory/finance integrity, meaningful tests, and reviewable domain slices.
- Residual risk: historical alert deltas can still appear beside current allocatable alerts; the API now exposes the limitation, but the product needs a future historical snapshot model before that comparison can be fully apples-to-apples.
