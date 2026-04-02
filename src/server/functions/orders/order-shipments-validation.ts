'use server'

import { and, eq, inArray, isNull } from 'drizzle-orm';
import { type Database } from '@/lib/db';
import { ValidationError } from '@/lib/server/errors';
import { findDuplicateSerials, normalizeSerial } from '@/lib/serials';
import { orderLineItems, orderLineSerialAllocations, serializedItems } from 'drizzle/schema';
import { products } from 'drizzle/schema/products/products';
import type { ShipmentStatus } from '@/lib/schemas';
import { getPendingShipmentReservations } from './order-pending-shipment-reservations';

export interface ValidateShipmentItem {
  orderLineItemId: string;
  quantity: number;
  serialNumbers?: string[];
}

type OrderTransaction = Parameters<Parameters<Database['transaction']>[0]>[0];
type QueryExecutor = Database | OrderTransaction;

const VALID_SHIPMENT_STATUS_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  pending: ['in_transit', 'failed'],
  in_transit: ['out_for_delivery', 'delivered', 'failed', 'returned'],
  out_for_delivery: ['delivered', 'failed', 'returned'],
  delivered: [],
  failed: ['in_transit', 'returned'],
  returned: [],
};

export function validateShipmentStatusTransition(
  current: ShipmentStatus,
  next: ShipmentStatus
): boolean {
  return VALID_SHIPMENT_STATUS_TRANSITIONS[current]?.includes(next) ?? false;
}

export async function validateShipmentItems(
  executor: QueryExecutor,
  organizationId: string,
  orderId: string,
  items: ValidateShipmentItem[],
  options?: {
    excludeShipmentId?: string;
  }
): Promise<void> {
  if (items.length === 0) return;

  const lineItemIds = items.map((i) => i.orderLineItemId);

  const rows = await executor
    .select({
      lineItemId: orderLineItems.id,
      productId: orderLineItems.productId,
      quantity: orderLineItems.quantity,
      qtyPicked: orderLineItems.qtyPicked,
      qtyShipped: orderLineItems.qtyShipped,
      description: orderLineItems.description,
      allocatedSerialNumbers: orderLineItems.allocatedSerialNumbers,
      isSerialized: products.isSerialized,
    })
    .from(orderLineItems)
    .leftJoin(
      products,
      and(
        eq(orderLineItems.productId, products.id),
        eq(products.organizationId, organizationId),
        isNull(products.deletedAt)
      )
    )
    .where(
      and(
        inArray(orderLineItems.id, lineItemIds),
        eq(orderLineItems.organizationId, organizationId),
        eq(orderLineItems.orderId, orderId)
      )
    );

  const lineItemMap = new Map(
    rows.map((r) => [
      r.lineItemId,
      {
        productId: r.productId,
        quantity: r.quantity,
        qtyPicked: r.qtyPicked,
        qtyShipped: r.qtyShipped,
        description: r.description,
        allocatedSerialNumbers: (r.allocatedSerialNumbers as string[] | null) ?? [],
        isSerialized: r.isSerialized ?? false,
      },
    ])
  );
  const pendingReservations = await getPendingShipmentReservations(executor, {
    organizationId,
    orderId,
    excludeShipmentId: options?.excludeShipmentId,
  });
  const canonicalAllocations =
    lineItemIds.length > 0
      ? await executor
          .select({
            lineItemId: orderLineSerialAllocations.orderLineItemId,
            serialNumber: serializedItems.serialNumberNormalized,
          })
          .from(orderLineSerialAllocations)
          .innerJoin(
            serializedItems,
            eq(orderLineSerialAllocations.serializedItemId, serializedItems.id)
          )
          .where(
            and(
              eq(orderLineSerialAllocations.organizationId, organizationId),
              eq(orderLineSerialAllocations.isActive, true),
              inArray(orderLineSerialAllocations.orderLineItemId, lineItemIds)
            )
          )
      : [];
  const canonicalLineItemSerials = new Map<string, string[]>();
  for (const allocation of canonicalAllocations) {
    const existing = canonicalLineItemSerials.get(allocation.lineItemId) ?? [];
    existing.push(normalizeSerial(allocation.serialNumber));
    canonicalLineItemSerials.set(allocation.lineItemId, existing);
  }

  for (const item of items) {
    const lineData = lineItemMap.get(item.orderLineItemId);

    if (!lineData) {
      throw new ValidationError("Line item not found or doesn't belong to order", {
        [item.orderLineItemId]: ['Line item not found'],
      });
    }

    const pickedAvailable =
      Number(lineData.qtyPicked ?? 0) -
      Number(lineData.qtyShipped ?? 0) -
      Number(pendingReservations.quantitiesByLineItem.get(item.orderLineItemId) ?? 0);
    const available = Math.max(0, pickedAvailable);
    if (item.quantity > available) {
      throw new ValidationError('Insufficient picked quantity available for shipment', {
        [item.orderLineItemId]: [
          `Only ${available} picked unit${available !== 1 ? 's are' : ' is'} available for shipment, requested ${item.quantity}`,
        ],
      });
    }

    if (lineData.isSerialized && item.quantity > 0) {
      const rawSerials = item.serialNumbers ?? [];
      const serials = rawSerials.map((s) => normalizeSerial(s));
      const emptyIndex = serials.findIndex((s) => s === '');
      if (emptyIndex >= 0) {
        throw new ValidationError('Invalid serial number', {
          [item.orderLineItemId]: [`Serial number at position ${emptyIndex + 1} is empty after trimming`],
        });
      }
      if (serials.length === 0) {
        throw new ValidationError('Serial numbers required for serialized product', {
          [item.orderLineItemId]: [
            `"${lineData.description}" requires ${item.quantity} serial number${item.quantity !== 1 ? 's' : ''}`,
          ],
        });
      }
      if (serials.length !== item.quantity) {
        throw new ValidationError('Serial number count mismatch', {
          [item.orderLineItemId]: [
            `Expected ${item.quantity} serial number${item.quantity !== 1 ? 's' : ''} for "${lineData.description}", got ${serials.length}`,
          ],
        });
      }
      const duplicates = findDuplicateSerials(serials);
      if (duplicates.length > 0) {
        throw new ValidationError('Duplicate serial number', {
          [item.orderLineItemId]: [
            `Duplicate serial number "${duplicates[0]}" in shipment item`,
          ],
        });
      }
      const allocatedSet = new Set(
        (
          canonicalLineItemSerials.get(item.orderLineItemId) ??
          lineData.allocatedSerialNumbers.map((sn) => normalizeSerial(sn))
        ).map((sn) => normalizeSerial(sn))
      );
      const pendingReservedSerials =
        pendingReservations.reservedSerialsByLineItem.get(item.orderLineItemId) ?? new Set<string>();
      for (const sn of serials) {
        if (!allocatedSet.has(sn)) {
          throw new ValidationError('Serial number not allocated to this line item', {
            [item.orderLineItemId]: [`Serial number "${sn}" is not allocated to "${lineData.description}"`],
          });
        }
        if (pendingReservedSerials.has(sn)) {
          throw new ValidationError('Serial number already reserved by a pending shipment', {
            [item.orderLineItemId]: [
              `Serial number "${sn}" is already included in another pending shipment draft`,
            ],
          });
        }
      }
    }
  }
}
