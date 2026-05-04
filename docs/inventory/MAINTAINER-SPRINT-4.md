# Inventory Maintainer Sprint 4

This sprint follows the RMA receive cache-contract work. The target is allocatable-stock truth: returned batteries that fail inspection must not inflate ordinary available stock or be eligible for order picking.

Status: Closed after Issue 1.

## Business Value

RMA receive can return defective, damaged, or incomplete batteries and components. Those units may be physically on hand, but they are not saleable stock. RENOZ operators need product availability, order picking, and support recovery workflows to separate on-hand recovery from allocatable inventory.

## Workflow Spine

RMA receive inspection condition
-> returned inventory row status
-> product inventory availability summary
-> client availability checks
-> order non-serialized reservation plan
-> picked stock only comes from allocatable inventory.

## Architecture Constraints

- Keep this sprint to status-aware availability and reservation boundaries.
- Do not change RMA status transitions, receiving-location validation, serialized lineage writes, cost-layer writes, movement creation, or remedy execution behavior.
- Preserve on-hand truth: quarantined units still count as physically on hand.
- Change allocatable truth: only `available` inventory rows count as available-to-sell/pick.
- Add focused tests across support trace, order reservation planning, inventory availability hook, and product inventory summary contract.

## Issue Ledger

### 1. Damaged RMA Returns Must Not Become Allocatable Stock

Problem:

- RMA receive computed `targetStatus` for failed inspections, but the non-serialized branch still looked up aggregate rows without status and inserted new rows as `available`.
- Non-serialized order reservation queries and planning looked only at positive `quantityAvailable`, so a quarantined aggregate row could still be picked.
- Client inventory availability and product inventory summaries summed `quantityAvailable` without respecting inventory status, overstating saleable stock after quarantine returns.

Workflow protected:

RMA receive inspection -> inventory row status -> product/inventory availability -> non-serialized order reservation -> operator-visible stock promise.

Implemented slice:

- Non-serialized RMA receive now restores into an aggregate row matching `targetStatus`; failed inspections insert or update quarantined rows instead of available rows.
- Non-serialized order reservations query only `available` inventory rows and the reservation planner skips non-available rows defensively.
- Inventory availability hook now counts only `status === 'available'` rows as allocatable quantity.
- Product inventory summary still includes all physical on-hand units, but its available totals now sum only `available` status rows.
- Added focused regression coverage for RMA receive status policy, order reservation planning, inventory availability, and product inventory availability summary.

Out of scope:

- Changing historical inventory rows.
- Changing low-stock alert, dashboard, forecasting, or valuation aggregate policies.
- Adding a quarantine release workflow.
- Changing serialized RMA receive behavior, which already writes serialized status from the inspection condition.
- Changing transfer rules for intentionally moving quarantined stock.

Closeout:

- Touched domains: inventory availability, support/RMA receive, order reservation, product inventory summaries, cross-domain tests, inventory sprint evidence.
- Workflow protected: RMA inspection condition -> returned inventory status -> product/inventory availability -> non-serialized reservation -> order picking.
- Business value protected: damaged, defective, or incomplete returned stock can be recovered physically without being promised to customers or picked for orders.
- Architecture standards checked: RMA server remains the authority for returned-stock row status; order reservation enforces status at both query and planner levels; availability UI logic uses one helper for query, mutation, and prefetch paths; product summary separates on-hand from allocatable availability.
- Tenant isolation and data integrity checked: no tenant predicate was removed; RMA inventory lookup remains scoped by `ctx.organizationId`, product, location, and serial-null state; order reservation remains scoped by organization and product.
- Query/cache contract checked: no new query keys were added. Existing RMA receive invalidation from Sprint 11 already refreshes inventory, product, order, valuation, movement, and availability surfaces touched by this policy.
- Smells removed: failed-inspection non-serialized returns no longer merge into available aggregate inventory; status-blind reservation planning no longer treats quarantined rows as pickable; status-blind client/product availability no longer overstates allocatable stock.
- Smells deferred: low-stock alerts, WMS dashboards, forecasting, and valuation reports still need explicit decisions about whether they present physical on-hand, allocatable stock, or both; bulk receive still relies on unknown-identity cache fallback; quarantine release/remediation remains a future workflow.
- Gates run: `./node_modules/.bin/vitest run tests/unit/support/rma-receive-location-contract.test.ts tests/unit/orders/order-inventory-reservations.test.ts tests/unit/inventory/use-inventory-availability.test.tsx tests/unit/products/product-inventory-availability-contract.test.ts`; `./node_modules/.bin/eslint src/server/functions/orders/rma.ts src/server/functions/orders/order-inventory-reservations.ts src/hooks/inventory/use-inventory-availability.ts src/server/functions/products/product-inventory.ts tests/unit/support/rma-receive-location-contract.test.ts tests/unit/orders/order-inventory-reservations.test.ts tests/unit/inventory/use-inventory-availability.test.tsx tests/unit/products/product-inventory-availability-contract.test.ts`; `./node_modules/.bin/vitest run tests/unit/inventory`; `./node_modules/.bin/vitest run tests/unit/orders`; `./node_modules/.bin/vitest run tests/unit/products`; `./node_modules/.bin/vitest run tests/unit/support`; `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit`; `git diff --check`.
- Gates skipped: browser QA, because this was a server/hook availability invariant with focused unit and type coverage and no visual component change.
- Goal adaptations: declined. The standing maintainer goal already requires transactional inventory integrity, honest UI states, operator-safe workflows, and reviewable domain-sliced closeout.
- Residual risk: the next inventory sprint should classify remaining aggregate surfaces by physical-on-hand versus allocatable-available semantics, starting with low-stock alerts and WMS dashboard totals.
