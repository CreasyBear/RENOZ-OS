# Inventory Maintainer Sprint 7

This sprint follows Sprint 6's reorder read-contract change. The target is operator-facing language: the reorder UI must not call allocatable stock "current stock" after the server contract now uses available stock for reorder urgency.

Status: Closed after Issue 1.

## Business Value

Purchasing decisions need honest wording. RENOZ can have quarantined stock physically on hand while still needing to reorder saleable batteries. The reorder screen and generated PO notes should make it clear that the displayed quantity is available stock for purchasing decisions.

## Workflow Spine

reorder recommendation server result
-> forecasting hook
-> `ReorderRecommendations`
-> create-PO dialog default note
-> purchasing operator action.

## Architecture Constraints

- Keep this sprint to presentation copy and notes.
- Do not rename the `currentStock` field in the public recommendation type.
- Do not change server functions, query keys, cache policy, PO mutation payloads, or recommendation math.
- Add focused tests for the visible table label and generated PO note/summary copy.

## Issue Ledger

### 1. Reorder UI Must Say Available Stock

Problem:

- Sprint 6 made reorder `currentStock` mean allocatable stock, but the table and PO dialog still said "Current Stock".
- That wording could imply physical on-hand stock and hide the distinction between quarantined recovery stock and saleable inventory.

Workflow protected:

reorder recommendation -> operator reads available quantity -> PO creation note -> purchasing context.

Implemented slice:

- Renamed the reorder table column from "Current" to "Available".
- Updated the create-PO dialog summary label from "Current Stock" to "Available Stock".
- Updated the generated PO note from "Current stock" to "Available stock".
- Added focused UI/static tests for the copy contract.

Out of scope:

- Renaming `currentStock` in the recommendation type or API payload.
- Changing reorder urgency, days-to-stockout, or recommended quantity math.
- Changing PO creation behavior.
- Browser QA.

Closeout:

- Touched domains: inventory forecasting presentation, create-PO-from-recommendation dialog, inventory UI tests, inventory sprint evidence.
- Workflow protected: reorder recommendation -> purchase planning UI -> generated PO context note.
- Business value protected: purchasing operators now see that the stock quantity driving reorder urgency is available stock, not physical on-hand stock.
- Architecture standards checked: no route, hook, server function, schema, database, query key, cache policy, mutation contract, or PO payload changed; this is a presentation-only honesty slice.
- Tenant isolation and data integrity checked: no server or database behavior changed.
- Query/cache contract checked: no query keys, invalidation, optimistic updates, or cache policy changed.
- Smells removed: misleading "current stock" copy after the server changed the meaning to allocatable availability.
- Smells deferred: the public `currentStock` field name remains for compatibility; future API cleanup could rename it to `availableStock` with a migration.
- Gates run: `./node_modules/.bin/vitest run tests/unit/inventory/reorder-recommendation-copy.test.tsx tests/unit/inventory/query-normalization-wave3-forecasting.test.tsx`; `./node_modules/.bin/eslint src/components/domain/inventory/forecasting/reorder-recommendations.tsx src/components/domain/inventory/forecasting/create-po-from-recommendation-dialog.tsx tests/unit/inventory/reorder-recommendation-copy.test.tsx`; `./node_modules/.bin/vitest run tests/unit/inventory`; `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit`; `git diff --check`.
- Gates skipped: browser QA, because this was a text-only presentation contract with focused render coverage and no layout/control change.
- Goal adaptations: declined. The standing maintainer goal already requires honest UI states and reviewable diffs.
- Residual risk: the `currentStock` field name is now a known compatibility smell in the forecasting API boundary.
