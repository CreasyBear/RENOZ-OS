# Inventory Maintainer Sprint 29

This sprint follows Sprint 28's manual cost-layer value-cache cleanup. The target is manual receiving cost-layer source identity: the receiving workflow, public valuation schema, finance helper, and database enum should all agree that `manual_receive` is a valid FIFO cost-layer reference type.

Status: Closed after Issue 1.

## Business Value

Manual receiving is an operator-facing stock-in workflow for RENOZ Energy battery inventory. If the workflow writes `manual_receive` but the cost-layer enum rejects it, operators can hit a runtime failure while receiving stock, or maintainers can be forced into lossy source labels like generic adjustment. Cost-layer source identity matters for auditability, finance trust, and later troubleshooting.

## Workflow Spine

manual receive stock
-> `receiveInventory`
-> `createReceiptLayersWithCostComponents`
-> cost-layer reference type contract
-> `inventory_cost_layers.reference_type`
-> cost-layer reads and UI source badges
-> inventory value/valuation cache policy.

## Architecture Constraints

- Keep this sprint to cost-layer reference type alignment for manual receive.
- Preserve manual receive behavior, movement references, cost-layer value math, cache invalidation, and UI.
- Do not broaden into receipt UX redesign, cost component modeling, quantity-on-hand reconciliation, or live database fixtures.

## Issue Ledger

### 1. Manual Receive Wrote a Cost-Layer Reference Type the Database Enum Did Not Own

Problem:

- `receiveInventory` creates receipt layers with `referenceType: 'manual_receive'`.
- Product UI already recognizes `manual_receive` as a cost-layer badge.
- The valuation schema and Drizzle `cost_layer_reference_type` enum only listed `purchase_order`, `adjustment`, `transfer`, and `rma`.
- The shared finance helper accepted `referenceType: string` and cast into the enum type, hiding the mismatch from TypeScript.

Workflow protected:

manual stock receive -> receipt layer helper -> enum-owned cost-layer reference -> cost-layer read/UI source continuity.

Implemented slice:

- Added `manual_receive` to the Drizzle cost-layer reference enum.
- Added migration `0039_cost_layer_manual_receive_reference.sql` and registered it in the migration journal.
- Added `manual_receive` to the public valuation cost-layer reference schema.
- Tightened the shared inventory finance helper from arbitrary `referenceType: string` to the owned cost-layer reference union.
- Removed the helper's enum casts so unsupported reference types surface at TypeScript time.
- Added focused tests proving manual receive is accepted at the schema boundary and aligned across schema, database enum, migration, receiving write path, and helper type.

Out of scope:

- Changing receiving form UX.
- Changing inventory movement reference labels.
- Changing cost-layer valuation math.
- Adding live database fixtures.

Closeout:

- Touched domains: inventory receiving cost-layer source identity, valuation schema, Drizzle enum/migration journal, shared inventory finance helper, cost-layer reference contract tests, inventory sprint evidence.
- Workflow protected: manual stock receive -> receipt layer helper -> enum-owned cost-layer reference -> `inventory_cost_layers.reference_type` -> cost-layer read/UI source continuity.
- Business value protected: manual stock-in should not fail at runtime because the workflow writes a source label the cost-layer table does not own; finance/audit source identity remains explicit instead of being collapsed to generic adjustment.
- Architecture standards checked: route/page/hook/cache behavior is unchanged; source identity is owned at schema/database/helper boundaries; helper now rejects unsupported cost-layer references at compile time; UI badge behavior remains compatible with `manual_receive`.
- Tenant isolation and data integrity checked: no tenant predicates, transactions, quantity math, value recompute paths, serialized lineage, or cache mutations changed; the change is an enum/schema/source contract alignment.
- Query/cache contract checked: no query keys, invalidation, stale times, optimistic updates, or rollback behavior changed.
- Smells removed: receiving wrote `manual_receive` while cost-layer enum/schema did not own it; shared finance helper accepted arbitrary strings and hid enum drift behind casts.
- Smells deferred: live migration application against a real database; broader cost-layer reference taxonomy review for shipment/order/count labels in movement-only paths; receipt UX redesign.
- Gates run: focused cost-layer reference/schema/mutation tests; focused ESLint; TypeScript; full inventory suite; migration journal JSON parse; `git diff --check`.
- Gates skipped: browser QA, because this was a schema/database contract alignment with no UI behavior change.
- Goal adaptations: declined. The standing maintainer goal already requires domain ownership, schema/database continuity, transactional finance integrity, meaningful tests, and closeout evidence.
- Residual risk: the migration SQL and source contracts are verified locally, but the enum addition still needs to be applied in the target database environment before manual receive can rely on `manual_receive` there.
