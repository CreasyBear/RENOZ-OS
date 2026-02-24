/**
 * Fetch serial numbers by order line item for document generation.
 *
 * Queries shipment_items for shipped serials (preferred when shipments exist).
 * Callers use: shipmentSerialMap.get(lineItemId) ?? allocatedSerialNumbers ?? []
 *
 * Single source of truth for packing slip and delivery note serial resolution.
 */
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  shipmentItems,
  orderShipments,
  shipmentItemSerials,
  serializedItems,
  orderLineSerialAllocations,
} from 'drizzle/schema';

export async function fetchShipmentSerialsByOrderLineItem(
  orderId: string
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  try {
    // Prefer canonical shipment_item_serials when available.
    const canonicalRows = await db
      .select({
        orderLineItemId: shipmentItems.orderLineItemId,
        serialNumber: serializedItems.serialNumberNormalized,
      })
      .from(shipmentItemSerials)
      .innerJoin(shipmentItems, eq(shipmentItemSerials.shipmentItemId, shipmentItems.id))
      .innerJoin(orderShipments, eq(shipmentItems.shipmentId, orderShipments.id))
      .innerJoin(serializedItems, eq(shipmentItemSerials.serializedItemId, serializedItems.id))
      .where(eq(orderShipments.orderId, orderId));

    if (canonicalRows.length > 0) {
      for (const row of canonicalRows) {
        const existing = map.get(row.orderLineItemId) ?? [];
        map.set(row.orderLineItemId, [...existing, row.serialNumber]);
      }
      return map;
    }
  } catch (error) {
    const code = (error as { code?: string })?.code;
    const message = (error as { message?: string })?.message ?? '';
    const missingCanonicalTables =
      code === '42P01' || code === '42703' || message.includes('does not exist');
    if (!missingCanonicalTables) {
      throw error;
    }
  }

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

export async function fetchAllocatedSerialsByOrderLineItem(
  orderLineItemIds: string[]
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (orderLineItemIds.length === 0) {
    return map;
  }

  try {
    const rows = await db
      .select({
        orderLineItemId: orderLineSerialAllocations.orderLineItemId,
        serialNumber: serializedItems.serialNumberNormalized,
      })
      .from(orderLineSerialAllocations)
      .innerJoin(serializedItems, eq(orderLineSerialAllocations.serializedItemId, serializedItems.id))
      .where(
        and(
          inArray(orderLineSerialAllocations.orderLineItemId, orderLineItemIds),
          eq(orderLineSerialAllocations.isActive, true)
        )
      );

    for (const row of rows) {
      const existing = map.get(row.orderLineItemId) ?? [];
      map.set(row.orderLineItemId, [...existing, row.serialNumber]);
    }
  } catch {
    // Canonical allocation tables may be unavailable during phased rollout.
  }

  return map;
}
