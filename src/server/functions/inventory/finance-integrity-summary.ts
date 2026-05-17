import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import type { InventoryFinanceIntegritySummary } from '@/lib/schemas/inventory';
import { readInventoryFinanceIntegrityAggregate } from '@/server/functions/financial/_shared/inventory-finance-integrity-read';

interface ReadInventoryFinanceIntegritySummaryOptions {
  valueDriftTolerance?: number;
  topDriftLimit?: number;
}

export async function getFinanceIntegritySummary(
  organizationId: string,
  options?: ReadInventoryFinanceIntegritySummaryOptions
): Promise<InventoryFinanceIntegritySummary> {
  const valueDriftTolerance = options?.valueDriftTolerance ?? 0.01;
  const topDriftLimit = options?.topDriftLimit ?? 25;
  const aggregate = await readInventoryFinanceIntegrityAggregate({
    organizationId,
    valueDriftTolerance,
  });

  const topDriftRowsResult = await db.execute<{
    inventory_id: string;
    product_id: string;
    product_sku: string;
    product_name: string;
    location_id: string;
    location_name: string;
    quantity_on_hand: number;
    inventory_value: number;
    layer_value: number;
    absolute_drift: number;
  }>(
    sql`
      WITH layer_totals AS (
        SELECT
          icl.inventory_id,
          COALESCE(SUM(CASE WHEN icl.quantity_remaining > 0 THEN icl.quantity_remaining * icl.unit_cost ELSE 0 END), 0)::numeric AS layer_value
        FROM inventory_cost_layers icl
        WHERE icl.organization_id = ${organizationId}
        GROUP BY icl.inventory_id
      )
      SELECT
        i.id AS inventory_id,
        i.product_id,
        COALESCE(p.sku, '') AS product_sku,
        COALESCE(p.name, 'Unknown Product') AS product_name,
        i.location_id,
        COALESCE(l.name, 'Unknown') AS location_name,
        COALESCE(i.quantity_on_hand, 0)::numeric AS quantity_on_hand,
        COALESCE(i.total_value, 0)::numeric AS inventory_value,
        COALESCE(lt.layer_value, 0)::numeric AS layer_value,
        ABS(COALESCE(i.total_value, 0) - COALESCE(lt.layer_value, 0))::numeric AS absolute_drift
      FROM inventory i
      LEFT JOIN layer_totals lt ON lt.inventory_id = i.id
      LEFT JOIN products p ON p.id = i.product_id
        AND p.organization_id = ${organizationId}
        AND p.deleted_at IS NULL
      LEFT JOIN warehouse_locations l ON l.id = i.location_id
        AND l.organization_id = ${organizationId}
      WHERE i.organization_id = ${organizationId}
        AND ABS(COALESCE(i.total_value, 0) - COALESCE(lt.layer_value, 0)) > ${valueDriftTolerance}
      ORDER BY absolute_drift DESC
      LIMIT ${topDriftLimit}
    `
  );

  const topDriftRows = topDriftRowsResult as unknown as Array<{
    inventory_id: string;
    product_id: string;
    product_sku: string;
    product_name: string;
    location_id: string;
    location_name: string;
    quantity_on_hand: number;
    inventory_value: number;
    layer_value: number;
    absolute_drift: number;
  }>;

  const stockWithoutActiveLayers = aggregate.stockWithoutActiveLayers;
  const inventoryValueMismatchCount = aggregate.valueMismatchRows;
  const totalAbsoluteValueDrift = aggregate.totalAbsoluteValueDrift;
  const negativeOrOverconsumedLayers = aggregate.negativeOrOverconsumedLayers;
  const duplicateActiveSerializedAllocations = aggregate.duplicateActiveSerializedAllocations;
  const shipmentLinkStatusMismatch = aggregate.shipmentLinkStatusMismatch;

  const hardFailures = [
    stockWithoutActiveLayers,
    inventoryValueMismatchCount,
    negativeOrOverconsumedLayers,
    duplicateActiveSerializedAllocations,
    shipmentLinkStatusMismatch,
  ].some((v) => v > 0);
  const status: InventoryFinanceIntegritySummary['status'] = hardFailures
    ? 'red'
    : totalAbsoluteValueDrift > 0
      ? 'amber'
      : 'green';

  return {
    status,
    stockWithoutActiveLayers,
    inventoryValueMismatchCount,
    totalAbsoluteValueDrift,
    negativeOrOverconsumedLayers,
    duplicateActiveSerializedAllocations,
    shipmentLinkStatusMismatch,
    topDriftItems: topDriftRows.map((row) => ({
      inventoryId: row.inventory_id,
      productId: row.product_id,
      productSku: row.product_sku,
      productName: row.product_name,
      locationId: row.location_id,
      locationName: row.location_name,
      quantityOnHand: Number(row.quantity_on_hand ?? 0),
      inventoryValue: Number(row.inventory_value ?? 0),
      layerValue: Number(row.layer_value ?? 0),
      absoluteDrift: Number(row.absolute_drift ?? 0),
    })),
    asOf: new Date().toISOString(),
  };
}
