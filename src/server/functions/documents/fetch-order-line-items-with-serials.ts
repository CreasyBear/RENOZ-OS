/**
 * Fetch serial numbers by order line item for document generation.
 *
 * Queries shipment_items for shipped serials (preferred when shipments exist).
 * Callers use: shipmentSerialMap.get(lineItemId) ?? allocatedSerialNumbers ?? []
 *
 * Single source of truth for packing slip and delivery note serial resolution.
 */
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { shipmentItems, orderShipments } from 'drizzle/schema';

export async function fetchShipmentSerialsByOrderLineItem(
  orderId: string
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  try {
    const rows = await db
      .select({
        orderLineItemId: shipmentItems.orderLineItemId,
        serialNumbers: shipmentItems.serialNumbers,
      })
      .from(shipmentItems)
      .innerJoin(orderShipments, eq(shipmentItems.shipmentId, orderShipments.id))
      .where(eq(orderShipments.orderId, orderId));

    for (const row of rows) {
      const serials = (row.serialNumbers as string[] | null) ?? [];
      if (serials.length > 0) {
        const existing = map.get(row.orderLineItemId) ?? [];
        map.set(row.orderLineItemId, [...existing, ...serials]);
      }
    }
  } catch {
    // If shipment query fails, caller will fall back to allocated serial numbers
  }
  return map;
}
