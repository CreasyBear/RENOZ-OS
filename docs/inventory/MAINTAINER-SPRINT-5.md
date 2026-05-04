# Inventory Maintainer Sprint 5

This sprint continues Sprint 4's allocatable-stock invariant. The target is aggregate alert and dashboard truth: surfaces that say "available", "low stock", or "out of stock" must use allocatable availability, while physical on-hand and valuation totals remain physical inventory measures.

Status: Closed after Issue 1.

## Business Value

RENOZ operators use alerts and dashboards to decide what can be sold, picked, purchased, or recovered. Quarantined returned batteries are physically present and financially relevant, but they must not suppress low-stock or out-of-stock signals. A product with only quarantined stock is still unavailable to promise.

## Workflow Spine

RMA/quality status
-> inventory row status
-> allocatable availability aggregate
-> low-stock/out-of-stock alerts
-> inventory dashboard and WMS alert totals
-> purchasing and fulfillment decisions.

## Architecture Constraints

- Keep this sprint to current aggregate alert/dashboard availability semantics.
- Preserve physical totals: `totalUnits`, stock-by-category, stock-by-location, and inventory value continue to use on-hand/value measures.
- Use one inventory-owned SQL helper for current allocatable aggregate semantics.
- Do not change historical WMS alert reconstruction, forecasting, valuation, low-stock rule schema, or alert UI copy.
- Add focused tests for the SQL-shape contract and run dashboard/alert normalization suites.

## Issue Ledger

### 1. Low/Out-of-Stock Aggregates Must Ignore Non-Allocatable Stock

Problem:

- Inventory dashboard low/out-of-stock counts were row-level and status-blind.
- WMS current alert totals were row-level and status-blind.
- Triggered inventory alerts used product/location sums, but still summed `quantityAvailable` for quarantined or damaged rows.
- These surfaces could treat quarantined RMA recovery stock as saleable availability.

Workflow protected:

inventory row status -> allocatable aggregate SQL -> low/out-of-stock alert signals -> operator purchasing and fulfillment decisions.

Implemented slice:

- Added an inventory-owned `_allocatable-stock-sql.ts` helper for current allocatable quantity sums and product-level low/out-of-stock counts.
- Updated the inventory dashboard low/out-of-stock counts to use product-level allocatable counts.
- Updated WMS current alert totals to use the same product-level allocatable counts.
- Updated triggered alert checks and fallback low-stock alerts to sum only `available` status rows for allocatable quantity.
- Updated alert sample item queries to only sample available rows.
- Added a focused allocatable aggregate contract test.

Out of scope:

- Historical WMS alert reconstruction, because historical movement replay does not currently carry inventory status.
- Forecasting and reorder recommendation semantics.
- Valuation and finance integrity reports.
- Low-stock alert UI copy and alert rule schema changes.
- Physical inventory totals and value aggregates.

Closeout:

- Touched domains: inventory alerts, inventory dashboard, WMS dashboard, inventory server SQL helper, inventory tests, inventory sprint evidence.
- Workflow protected: inventory status -> allocatable availability aggregate -> low-stock/out-of-stock signals -> operator planning surfaces.
- Business value protected: quarantined or damaged recovered stock no longer hides shortage signals on current alert/dashboard surfaces.
- Architecture standards checked: current allocatable aggregate semantics are centralized in an inventory-owned helper; dashboard and WMS consume the same helper; alert checks use the same allocatable quantity sum instead of duplicating status-blind SQL.
- Tenant isolation and data integrity checked: aggregate subqueries remain scoped by `organization_id`; no mutation, RLS, cost-layer, serialized lineage, or tenant predicate behavior changed.
- Query/cache contract checked: no query keys or invalidation paths changed. Sprint 11 and Sprint 4 cache paths already refresh the affected inventory/dashboard/WMS/alert prefixes after stock mutations.
- Smells removed: row-level dashboard alert counts; status-blind current WMS alert counts; status-blind triggered alert quantity sums; quarantined sample rows in current alert affected items.
- Smells deferred: historical WMS alert comparisons remain quantity-only; forecasting/reorder and valuation/on-hand dashboards need their own explicit physical-vs-allocatable classification; alert copy still says "item(s)" even when the business signal is product/location availability.
- Gates run: `./node_modules/.bin/vitest run tests/unit/inventory/allocatable-aggregate-contract.test.ts tests/unit/inventory/query-normalization-wave3-alerts.test.tsx tests/unit/inventory/query-normalization-wave3-dashboard.test.tsx tests/unit/inventory/query-normalization-wave7b.test.tsx`; `./node_modules/.bin/eslint src/server/functions/inventory/_allocatable-stock-sql.ts src/server/functions/inventory/dashboard.ts src/server/functions/inventory/wms-dashboard.ts src/server/functions/inventory/alerts.ts tests/unit/inventory/allocatable-aggregate-contract.test.ts`; `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit`; `./node_modules/.bin/vitest run tests/unit/inventory`; `git diff --check`.
- Gates skipped: browser QA, because this was a server aggregate semantics change with hook/presenter normalization coverage and no visual component change.
- Goal adaptations: declined. The standing maintainer goal already requires inventory integrity, honest UI states, centralized cache/query policy, and reviewable sprint closeout.
- Residual risk: the next inventory sprint should decide whether forecasting/reorder recommendations should use allocatable availability, physical on-hand, or both. Historical WMS comparisons need a status-aware reconstruction model before they can use the same invariant.
