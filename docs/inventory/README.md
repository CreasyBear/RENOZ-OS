# Inventory and COGS Management (Serialized + Cost Layers)

This document explains how inventory valuation works in `renoz-v3`, with focus on serialized tracking, FIFO cost layers, procurement receipts, shipments, returns, and warranty/RMA continuity.

## Scope

This README covers:

1. Canonical data model for inventory value and serialized lineage.
2. How quantity-changing workflows must update COGS/valuation.
3. How procurement, orders, shipments, and warranty/RMA connect.
4. Operational guardrails, invariants, and troubleshooting.

Related standards:

1. `STANDARDS.md`
2. `SCHEMA-TRACE.md`
3. `docs/reliability/RELIABILITY-STANDARDS.md`
4. `docs/reliability/MUTATION-CONTRACT-STANDARD.md`
5. `docs/reliability/sql/finance-cost-layer-invariants.sql`
6. `docs/reliability/sql/serialized-lineage-invariants.sql`

## Canonical Source of Truth

### Finance / valuation

1. `inventory_cost_layers`: FIFO inventory value source.
2. `inventory.total_value`: persisted cache, derived from active layers.
3. `inventory_movements`: operational movement audit and quantity deltas.

### Serialized lineage

1. `serialized_items`: canonical serial identity and current state.
2. `serialized_item_events`: serial lifecycle timeline.
3. `order_line_serial_allocations`: active/released serial allocations.
4. `shipment_item_serials`: serials physically linked to shipment lines.

## Core Rules

1. Any quantity-changing mutation must update quantity, layers, and derived value in one transaction.
2. `inventory.total_value` must be recomputed from active layers, never trusted as standalone authoring input.
3. Serialized inventory rows are unit-bound: on-hand and active layer quantity must stay in `0|1`.
4. Writes use canonical flows; legacy fields are compatibility-only.
5. Recoverable errors must be deterministic and actionable (not toast-only ambiguity).

## Canonical Helpers

Shared finance helpers live in `src/server/functions/_shared/inventory-finance.ts`:

1. `consumeLayersFIFO`: consumes active layers on outbound stock.
2. `moveLayersBetweenInventory`: consumes source layers and recreates at destination.
3. `createReceiptLayersWithCostComponents`: creates inbound layers with capitalization components.
4. `recomputeInventoryValueFromLayers`: recomputes `inventory.total_value` (and unit cost cache).
5. `assertSerializedInventoryCostIntegrity`: verifies serialized unit/value parity.

Shared serialized helpers live in `src/server/functions/_shared/serialized-lineage.ts`.

## Finance Mutation Contract

Inventory-affecting mutations should return a standardized envelope:

1. `success`
2. `message`
3. `affectedInventoryIds`
4. `affectedLayerIds`
5. `financeMetadata`:
   - `valuationBefore`
   - `valuationAfter`
   - `cogsImpact`
   - `layerDeltas[]` (per-layer quantity/cost deltas)
6. Optional `partialFailure` and `errorsById` for mixed outcomes.

Schema and helpers:

1. `src/lib/schemas/inventory/finance-mutation-contract.ts`
2. `src/lib/server/inventory-finance-mutation-contract.ts`

## Domain Flow Mapping

### Procurement receive (PO/receipt)

1. Receipt creates/updates inventory rows.
2. Creates receipt-linked cost layers (base + allocated extras where present).
3. Recomputes inventory value from active layers.
4. For serialized products, creates/updates canonical serial rows and events.

### Inventory adjustments and stock counts

1. Negative variance/adjustment consumes FIFO layers.
2. Positive variance/adjustment creates adjustment layers.
3. Always recompute derived value.
4. Serialized rows enforce `0|1` and cost-layer parity checks.

### Transfers

1. Source quantity reduced, destination quantity increased in one transaction.
2. Cost layers moved source -> destination with validation.
3. Both source and destination values recomputed.
4. Serialized transfers enforce serial existence/availability and per-serial integrity.

### Orders/shipments (COGS realization)

1. Allocations and shipments must resolve canonical serials.
2. Shipment-linked serials must have matching lifecycle status.
3. Outbound quantity movement must consume FIFO layers and reflect COGS impact.

### Returns/RMA/warranty

1. Returned units create deterministic inbound layer behavior.
2. Serial lifecycle events continue across shipment -> return -> warranty/RMA.
3. Warranty/RMA actions must not break serialized status/value continuity.

## Operational Invariants (Do-Not-Ship)

Must be zero before signoff:

1. Stock rows with no active layers.
2. `inventory.total_value` mismatch against active-layer sum.
3. Negative or overconsumed layer quantities.
4. Duplicate active serialized allocations.
5. Shipment-linked serials not in shipped/returned states.
6. Orphan canonical references (allocations/shipments/current inventory pointers).

SQL packs:

1. `docs/reliability/sql/finance-cost-layer-invariants.sql`
2. `docs/reliability/sql/serialized-lineage-invariants.sql`
3. Reconciliation SQL scripts in `docs/reliability/sql/`.

## UI/UX Reliability Rules

1. Pending lock for submit/destructive actions (single-flight behavior).
2. Preserve dialog/form state on recoverable failure.
3. Inline actionable error mapping for finance/serial conflicts.
4. No route-intent no-op (URL must mount intended dialog/tab view).
5. Bulk failures keep failed IDs selected and provide retry path.

## Debugging Checklist

1. Trace path end-to-end: route -> hook -> server function -> transaction -> tables.
2. Confirm quantity mutation and layer mutation both occurred.
3. Confirm value recomputation happened after layer changes.
4. For serialized rows, verify unit bound and serial event continuity.
5. Re-run invariant SQL before and after repair.

## Practical Notes

1. Manual non-workflow COGS posting should stay disabled; COGS should post through shipment/RMA workflows.
2. Legacy mutation entrypoints can remain for compatibility, but must delegate to canonical finance services.
3. Legacy serial/json fields remain temporary compatibility paths until cutover stability is proven.
