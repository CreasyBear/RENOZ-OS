import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';

export interface InventoryFinanceIntegrityAggregate {
  stockWithoutActiveLayers: number;
  valueMismatchRows: number;
  totalAbsoluteValueDrift: number;
  negativeOrOverconsumedLayers: number;
  duplicateActiveSerializedAllocations: number;
  shipmentLinkStatusMismatch: number;
}

interface ReadInventoryFinanceIntegrityAggregateInput {
  organizationId: string;
  valueDriftTolerance?: number;
}

export async function readInventoryFinanceIntegrityAggregate({
  organizationId,
  valueDriftTolerance = 0.01,
}: ReadInventoryFinanceIntegrityAggregateInput): Promise<InventoryFinanceIntegrityAggregate> {
  const [row] = await db.execute<{
    stock_without_active_layers: number;
    value_mismatch_rows: number;
    total_absolute_value_drift: number;
    negative_or_overconsumed_layers: number;
    duplicate_active_serialized_allocations: number;
    shipment_link_status_mismatch: number;
  }>(
    sql`
      WITH layer_totals AS (
        SELECT
          icl.inventory_id,
          COALESCE(SUM(CASE WHEN icl.quantity_remaining > 0 THEN icl.quantity_remaining ELSE 0 END), 0)::numeric AS active_qty,
          COALESCE(SUM(CASE WHEN icl.quantity_remaining > 0 THEN icl.quantity_remaining * icl.unit_cost ELSE 0 END), 0)::numeric AS active_value
        FROM inventory_cost_layers icl
        WHERE icl.organization_id = ${organizationId}
        GROUP BY icl.inventory_id
      ),
      inv AS (
        SELECT
          i.id,
          COALESCE(i.quantity_on_hand, 0)::numeric AS quantity_on_hand,
          COALESCE(i.total_value, 0)::numeric AS inventory_value,
          COALESCE(lt.active_qty, 0)::numeric AS active_qty,
          COALESCE(lt.active_value, 0)::numeric AS active_value
        FROM inventory i
        LEFT JOIN layer_totals lt ON lt.inventory_id = i.id
        WHERE i.organization_id = ${organizationId}
      ),
      serialized_dupes AS (
        SELECT COUNT(*)::int AS cnt
        FROM (
          SELECT serialized_item_id
          FROM order_line_serial_allocations
          WHERE organization_id = ${organizationId}
            AND is_active = true
            AND released_at IS NULL
          GROUP BY serialized_item_id
          HAVING COUNT(*) > 1
        ) t
      ),
      shipment_mismatch AS (
        SELECT COUNT(*)::int AS cnt
        FROM shipment_item_serials sis
        INNER JOIN serialized_items si ON si.id = sis.serialized_item_id
        WHERE sis.organization_id = ${organizationId}
          AND si.organization_id = ${organizationId}
          AND si.status NOT IN ('shipped', 'returned')
          AND NOT EXISTS (
            SELECT 1
            FROM serialized_item_events sie
            WHERE sie.organization_id = sis.organization_id
              AND sie.serialized_item_id = sis.serialized_item_id
              AND sie.event_type = 'rma_received'
              AND sie.occurred_at >= COALESCE(sis.shipped_at, sis.created_at)
          )
      ),
      layer_bounds AS (
        SELECT COUNT(*)::int AS cnt
        FROM inventory_cost_layers icl
        WHERE icl.organization_id = ${organizationId}
          AND (
            icl.quantity_remaining < 0
            OR icl.quantity_remaining > icl.quantity_received
          )
      )
      SELECT
        COALESCE(SUM(
          CASE
            WHEN inv.quantity_on_hand > 0 AND inv.active_qty = 0 THEN 1
            ELSE 0
          END
        ), 0)::int AS stock_without_active_layers,
        COALESCE(SUM(
          CASE
            WHEN ABS(inv.inventory_value - inv.active_value) > ${valueDriftTolerance} THEN 1
            ELSE 0
          END
        ), 0)::int AS value_mismatch_rows,
        COALESCE(SUM(ABS(inv.inventory_value - inv.active_value)), 0)::numeric AS total_absolute_value_drift,
        (SELECT cnt FROM layer_bounds) AS negative_or_overconsumed_layers,
        (SELECT cnt FROM serialized_dupes) AS duplicate_active_serialized_allocations,
        (SELECT cnt FROM shipment_mismatch) AS shipment_link_status_mismatch
      FROM inv
    `
  );

  return {
    stockWithoutActiveLayers: Number(row?.stock_without_active_layers ?? 0),
    valueMismatchRows: Number(row?.value_mismatch_rows ?? 0),
    totalAbsoluteValueDrift: Number(row?.total_absolute_value_drift ?? 0),
    negativeOrOverconsumedLayers: Number(row?.negative_or_overconsumed_layers ?? 0),
    duplicateActiveSerializedAllocations: Number(
      row?.duplicate_active_serialized_allocations ?? 0
    ),
    shipmentLinkStatusMismatch: Number(row?.shipment_link_status_mismatch ?? 0),
  };
}
