/**
 * Financial close readiness read model.
 */

import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import type { SessionContext } from '@/lib/server/protected';
import type { FinancialCloseReadiness } from '@/lib/schemas';

export async function readFinancialCloseReadiness(
  ctx: SessionContext,
): Promise<FinancialCloseReadiness> {
  const [row] = await db.execute<{
    stock_without_active_layers: number;
    rows_value_mismatch: number;
    total_abs_value_drift: number;
    layer_negative_or_overconsumed: number;
    duplicate_active_serialized_allocations: number;
    shipment_link_not_shipped_or_returned: number;
  }>(sql`
        WITH layer_totals AS (
          SELECT
            inventory_id,
            COALESCE(SUM(CASE WHEN quantity_remaining > 0 THEN quantity_remaining ELSE 0 END), 0) AS active_qty,
            COALESCE(SUM(CASE WHEN quantity_remaining > 0 THEN quantity_remaining * unit_cost ELSE 0 END), 0)::numeric AS active_value
          FROM inventory_cost_layers
          WHERE organization_id = ${ctx.organizationId}
          GROUP BY inventory_id
        ),
        stock_without_layers AS (
          SELECT COUNT(*)::int AS stock_without_active_layers
          FROM inventory i
          LEFT JOIN layer_totals lt ON lt.inventory_id = i.id
          WHERE i.organization_id = ${ctx.organizationId}
            AND i.quantity_on_hand > 0
            AND COALESCE(lt.active_qty, 0) = 0
        ),
        value_mismatch AS (
          SELECT
            COUNT(*)::int AS rows_value_mismatch,
            COALESCE(SUM(ABS(COALESCE(i.total_value, 0) - COALESCE(lt.active_value, 0))), 0)::numeric AS total_abs_value_drift
          FROM inventory i
          LEFT JOIN layer_totals lt ON lt.inventory_id = i.id
          WHERE i.organization_id = ${ctx.organizationId}
            AND ABS(COALESCE(i.total_value, 0) - COALESCE(lt.active_value, 0)) > 0.01
        ),
        layer_bounds AS (
          SELECT COUNT(*)::int AS layer_negative_or_overconsumed
          FROM inventory_cost_layers
          WHERE organization_id = ${ctx.organizationId}
            AND (quantity_remaining < 0 OR quantity_remaining > quantity_received)
        ),
        dup_alloc AS (
          SELECT COUNT(*)::int AS duplicate_active_serialized_allocations
          FROM (
            SELECT serialized_item_id
            FROM order_line_serial_allocations
            WHERE organization_id = ${ctx.organizationId}
              AND is_active = true
              AND released_at IS NULL
            GROUP BY serialized_item_id
            HAVING COUNT(*) > 1
          ) dup
        ),
        shipment_mismatch AS (
          SELECT COUNT(*)::int AS shipment_link_not_shipped_or_returned
          FROM shipment_item_serials sis
          JOIN serialized_items si ON si.id = sis.serialized_item_id
          WHERE sis.organization_id = ${ctx.organizationId}
            AND si.organization_id = ${ctx.organizationId}
            AND si.status NOT IN ('shipped', 'returned')
        )
        SELECT
          stock_without_layers.stock_without_active_layers,
          value_mismatch.rows_value_mismatch,
          value_mismatch.total_abs_value_drift,
          layer_bounds.layer_negative_or_overconsumed,
          dup_alloc.duplicate_active_serialized_allocations,
          shipment_mismatch.shipment_link_not_shipped_or_returned
        FROM stock_without_layers, value_mismatch, layer_bounds, dup_alloc, shipment_mismatch
      `);

  const gates = {
    stockWithoutActiveLayers: Number(row?.stock_without_active_layers ?? 0),
    rowsValueMismatch: Number(row?.rows_value_mismatch ?? 0),
    layerNegativeOrOverconsumed: Number(
      row?.layer_negative_or_overconsumed ?? 0,
    ),
    duplicateActiveSerializedAllocations: Number(
      row?.duplicate_active_serialized_allocations ?? 0,
    ),
    shipmentLinkNotShippedOrReturned: Number(
      row?.shipment_link_not_shipped_or_returned ?? 0,
    ),
  };
  const blockingReasons = Object.entries(gates)
    .filter(([, value]) => value > 0)
    .map(([key]) => key);

  return {
    isReady: blockingReasons.length === 0,
    blockingReasons,
    generatedAt: new Date().toISOString(),
    gates,
    totals: {
      totalAbsValueDrift: Number(row?.total_abs_value_drift ?? 0),
    },
  };
}
