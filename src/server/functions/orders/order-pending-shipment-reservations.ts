'use server'

import { and, eq, ne } from 'drizzle-orm';
import type { Database } from '@/lib/db';
import { orderShipments, shipmentItems } from 'drizzle/schema';
import { normalizeSerial } from '@/lib/serials';

type OrderTransaction = Parameters<Parameters<Database['transaction']>[0]>[0];
type QueryExecutor = Database | OrderTransaction;

export interface PendingShipmentReservationSummary {
  pendingShipmentIds: Set<string>;
  quantitiesByLineItem: Map<string, number>;
  reservedSerialsByLineItem: Map<string, Set<string>>;
}

export async function getPendingShipmentReservations(
  executor: QueryExecutor,
  params: {
    organizationId: string;
    orderId: string;
    excludeShipmentId?: string;
  }
): Promise<PendingShipmentReservationSummary> {
  const conditions = [
    eq(orderShipments.organizationId, params.organizationId),
    eq(orderShipments.orderId, params.orderId),
    eq(orderShipments.status, 'pending'),
  ];
  if (params.excludeShipmentId) {
    conditions.push(ne(orderShipments.id, params.excludeShipmentId));
  }

  const rows = await executor
    .select({
      shipmentId: shipmentItems.shipmentId,
      orderLineItemId: shipmentItems.orderLineItemId,
      quantity: shipmentItems.quantity,
      serialNumbers: shipmentItems.serialNumbers,
    })
    .from(shipmentItems)
    .innerJoin(orderShipments, eq(shipmentItems.shipmentId, orderShipments.id))
    .where(and(...conditions));

  const pendingShipmentIds = new Set<string>();
  const quantitiesByLineItem = new Map<string, number>();
  const reservedSerialsByLineItem = new Map<string, Set<string>>();

  for (const row of rows) {
    pendingShipmentIds.add(row.shipmentId);
    quantitiesByLineItem.set(
      row.orderLineItemId,
      (quantitiesByLineItem.get(row.orderLineItemId) ?? 0) + Number(row.quantity ?? 0)
    );

    const existingSerials = reservedSerialsByLineItem.get(row.orderLineItemId) ?? new Set<string>();
    for (const serial of (row.serialNumbers as string[] | null) ?? []) {
      const normalized = normalizeSerial(serial);
      if (normalized) existingSerials.add(normalized);
    }
    reservedSerialsByLineItem.set(row.orderLineItemId, existingSerials);
  }

  return {
    pendingShipmentIds,
    quantitiesByLineItem,
    reservedSerialsByLineItem,
  };
}
