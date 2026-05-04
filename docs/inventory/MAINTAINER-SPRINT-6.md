# Inventory Maintainer Sprint 6

This sprint continues Sprint 5's allocatable aggregate cleanup. The target is forecasting and reorder recommendations: buying signals must use allocatable availability, while forecast detail can still show physical on-hand separately.

Status: Closed after Issue 1.

## Business Value

RENOZ reorder recommendations drive purchasing urgency. Quarantined batteries recovered through RMA are physically present but cannot satisfy customer demand. If forecasting treats quarantined stock as current stock, it can suppress reorder recommendations and create avoidable fulfillment risk.

## Workflow Spine

inventory row status
-> allocatable availability aggregate
-> product forecast current stock
-> reorder recommendation urgency and days-to-stockout
-> purchase planning.

## Architecture Constraints

- Keep this sprint to forecasting and reorder stock semantics.
- Preserve physical on-hand in forecast detail as `currentStock.onHand`.
- Use the inventory-owned allocatable SQL helper from Sprint 5.
- Do not change forecast schemas, safety stock formulas, demand history, reorder UI copy, query keys, or mutation invalidation.
- Add focused contract tests and run forecasting/inventory gates.

## Issue Ledger

### 1. Reorder Recommendations Must Use Allocatable Current Stock

Problem:

- `getReorderRecommendations` used `quantityOnHand` as `currentStock`, so quarantined or damaged stock could suppress reorder urgency.
- Product forecast detail summed `quantityAvailable` without checking status.
- Reorder location breakdowns summed status-blind `quantityAvailable`.

Workflow protected:

inventory status -> allocatable availability -> forecast current stock -> reorder recommendation urgency -> purchase planning.

Implemented slice:

- Added `allocatableQuantitySumForOrganizationSql` to the inventory-owned SQL helper for product queries that left join inventory before filtering organization.
- Updated product forecast detail `currentStock.available` to use allocatable availability.
- Updated reorder recommendation `currentStock` to use allocatable availability.
- Updated reorder location breakdown `quantityAvailable` to use allocatable availability while keeping `quantityOnHand` as physical stock.
- Added a focused forecasting allocatable contract test and extended the aggregate helper contract test.

Out of scope:

- Changing safety stock formulas or historical demand calculations.
- Renaming UI labels from `currentStock` to `availableStock`.
- Changing recommendation copy or PO creation notes.
- Changing forecast mutation behavior or query keys.
- Historical WMS alert reconstruction and valuation/report semantics.

Closeout:

- Touched domains: inventory forecasting server functions, inventory aggregate SQL helper, forecasting contract tests, inventory sprint evidence.
- Workflow protected: inventory status -> allocatable current stock -> reorder urgency -> purchasing decision.
- Business value protected: quarantined or damaged recovered stock no longer delays reorder recommendations.
- Architecture standards checked: forecasting now reuses the inventory-owned allocatable SQL helper instead of duplicating status-blind quantity logic; physical on-hand remains explicit in forecast detail and location breakdowns.
- Tenant isolation and data integrity checked: organization-scoped helper includes `inventory.organizationId = ctx.organizationId` for left-joined product queries; no mutation, RLS, transaction, serialized lineage, or cost-layer path changed.
- Query/cache contract checked: no query keys or invalidation changed. Existing `queryKeys.inventory.forecastingAll()` and stock mutation invalidations continue to refresh affected forecasting and inventory surfaces.
- Smells removed: physical on-hand was used as reorder current stock; forecast detail and location breakdown availability summed non-allocatable rows.
- Smells deferred: UI labels still say current stock even though reorder current stock now means allocatable stock; purchase-order notes inherit that label; historical WMS comparisons and valuation/report surfaces still need explicit semantic classification.
- Gates run: `./node_modules/.bin/vitest run tests/unit/inventory/forecasting-allocatable-contract.test.ts tests/unit/inventory/allocatable-aggregate-contract.test.ts tests/unit/inventory/query-normalization-wave3-forecasting.test.tsx`; `./node_modules/.bin/eslint src/server/functions/inventory/_allocatable-stock-sql.ts src/server/functions/inventory/forecasting.ts tests/unit/inventory/forecasting-allocatable-contract.test.ts tests/unit/inventory/allocatable-aggregate-contract.test.ts`; `./node_modules/.bin/vitest run tests/unit/inventory`; `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit`; `git diff --check`.
- Gates skipped: browser QA, because this was a server read-contract change with focused and domain unit coverage and no component rendering change.
- Goal adaptations: declined. The standing maintainer goal already requires transactional inventory integrity, honest operator states, and reviewable domain-sliced closeout.
- Residual risk: a future UX copy sprint should clarify current stock versus available stock in reorder recommendation UI and PO notes.
