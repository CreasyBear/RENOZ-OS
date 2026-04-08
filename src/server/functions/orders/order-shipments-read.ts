'use server'

import { and, asc, desc, eq, gte, ilike, inArray, lte, sql } from 'drizzle-orm';
import { decodeCursor, buildCursorCondition, buildStandardCursorResponse } from '@/lib/db/pagination';
import { containsPattern } from '@/lib/db/utils';
import { z } from 'zod';
import { db } from '@/lib/db';
import { NotFoundError } from '@/lib/server/errors';
import { withAuth } from '@/lib/server/protected';
import { orderShipments, orders, shipmentItems, orderLineItems } from 'drizzle/schema';
import {
  shipmentListCursorQuerySchema,
  shipmentListQuerySchema,
  shipmentParamsSchema,
} from '@/lib/schemas';
import type { ShipmentWithItems, ListShipmentsResult } from './order-shipment-types';
import { getPendingShipmentReservations } from './order-pending-shipment-reservations';
type ShipmentListQueryInput = z.infer<typeof shipmentListQuerySchema>;
type ShipmentListCursorQueryInput = z.infer<typeof shipmentListCursorQuerySchema>;
type ShipmentParamsInput = z.infer<typeof shipmentParamsSchema>;

export async function listShipmentsHandler({
  data,
}: {
  data: ShipmentListQueryInput;
}): Promise<ListShipmentsResult> {
  const ctx = await withAuth();
  const { orderId, status, carrier, dateFrom, dateTo, page, pageSize, sortBy, sortOrder } = data;

  const conditions = [eq(orderShipments.organizationId, ctx.organizationId)];

  if (orderId) {
    conditions.push(eq(orderShipments.orderId, orderId));
  }
  if (status) {
    conditions.push(eq(orderShipments.status, status));
  }
  if (carrier) {
    conditions.push(ilike(orderShipments.carrier, containsPattern(carrier)));
  }
  if (dateFrom) {
    conditions.push(gte(orderShipments.createdAt, dateFrom));
  }
  if (dateTo) {
    conditions.push(lte(orderShipments.createdAt, dateTo));
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orderShipments)
    .where(and(...conditions));

  const total = count || 0;

  const sortColumn = {
    createdAt: orderShipments.createdAt,
    shippedAt: orderShipments.shippedAt,
    deliveredAt: orderShipments.deliveredAt,
    status: orderShipments.status,
  }[sortBy];

  const orderFn = sortOrder === 'asc' ? asc : desc;

  const shipments = await db
    .select()
    .from(orderShipments)
    .where(and(...conditions))
    .orderBy(orderFn(sortColumn))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return {
    shipments,
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total,
  };
}

export async function listShipmentsCursorHandler({
  data,
}: {
  data: ShipmentListCursorQueryInput;
}) {
  const ctx = await withAuth();
  const { cursor, pageSize = 20, sortOrder = 'desc', orderId, status, carrier, dateFrom, dateTo } = data;

  const conditions = [eq(orderShipments.organizationId, ctx.organizationId)];
  if (orderId) conditions.push(eq(orderShipments.orderId, orderId));
  if (status) conditions.push(eq(orderShipments.status, status));
  if (carrier) conditions.push(ilike(orderShipments.carrier, containsPattern(carrier)));
  if (dateFrom) conditions.push(gte(orderShipments.createdAt, dateFrom));
  if (dateTo) conditions.push(lte(orderShipments.createdAt, dateTo));

  if (cursor) {
    const cursorPosition = decodeCursor(cursor);
    if (cursorPosition) {
      conditions.push(
        buildCursorCondition(orderShipments.createdAt, orderShipments.id, cursorPosition, sortOrder)
      );
    }
  }

  const orderDir = sortOrder === 'asc' ? asc : desc;

  const shipments = await db
    .select()
    .from(orderShipments)
    .where(and(...conditions))
    .orderBy(orderDir(orderShipments.createdAt), orderDir(orderShipments.id))
    .limit(pageSize + 1);

  return buildStandardCursorResponse(shipments, pageSize);
}

export async function getShipmentHandler({
  data,
}: {
  data: ShipmentParamsInput;
}): Promise<ShipmentWithItems> {
  const ctx = await withAuth();

  const [shipment] = await db
    .select()
    .from(orderShipments)
    .where(
      and(eq(orderShipments.id, data.id), eq(orderShipments.organizationId, ctx.organizationId))
    )
    .limit(1);

  if (!shipment) {
    throw new NotFoundError('Shipment not found');
  }

  const items = await db
    .select()
    .from(shipmentItems)
    .where(eq(shipmentItems.shipmentId, data.id));

  return {
    ...shipment,
    items,
  };
}

export async function getOrderShipmentsHandler({
  data,
}: {
  data: { orderId: string };
}): Promise<ShipmentWithItems[]> {
  const ctx = await withAuth();

  const [order] = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.id, data.orderId), eq(orders.organizationId, ctx.organizationId)))
    .limit(1);

  if (!order) {
    throw new NotFoundError('Order not found');
  }

  const shipments = await db
    .select()
    .from(orderShipments)
    .where(
      and(
        eq(orderShipments.orderId, data.orderId),
        eq(orderShipments.organizationId, ctx.organizationId)
      )
    )
    .orderBy(desc(orderShipments.createdAt))
    .limit(100);

  const shipmentIds = shipments.map((shipment) => shipment.id);
  const allItems =
    shipmentIds.length > 0
      ? await db
          .select()
          .from(shipmentItems)
          .where(inArray(shipmentItems.shipmentId, shipmentIds))
      : [];

  type ShipmentItemRecord = (typeof allItems)[number];
  const itemsByShipment = allItems.reduce<Map<string, ShipmentItemRecord[]>>((acc, item) => {
    const existing = acc.get(item.shipmentId);
    if (existing) {
      existing.push(item);
    } else {
      acc.set(item.shipmentId, [item]);
    }
    return acc;
  }, new Map());

  const lineItemIds = Array.from(new Set(allItems.map((item) => item.orderLineItemId)));
  const lineItemQuantities =
    lineItemIds.length > 0
      ? await db
          .select({
            id: orderLineItems.id,
            qtyPicked: orderLineItems.qtyPicked,
            qtyShipped: orderLineItems.qtyShipped,
          })
          .from(orderLineItems)
          .where(inArray(orderLineItems.id, lineItemIds))
      : [];
  const lineItemMap = new Map(
    lineItemQuantities.map((item) => [
      item.id,
      {
        qtyPicked: Number(item.qtyPicked ?? 0),
        qtyShipped: Number(item.qtyShipped ?? 0),
      },
    ])
  );
  const pendingReservations = await getPendingShipmentReservations(db, {
    organizationId: ctx.organizationId,
    orderId: data.orderId,
  });

  return shipments.map((shipment) => {
    const shipmentItemsForShipment = itemsByShipment.get(shipment.id) ?? [];
    const canGenerateDispatchNote =
      shipment.status !== 'pending'
        ? true
        : shipmentItemsForShipment.length > 0 &&
          shipmentItemsForShipment.every((item) => {
            const line = lineItemMap.get(item.orderLineItemId);
            if (!line) return false;
            const globallyReserved =
              Number(pendingReservations.quantitiesByLineItem.get(item.orderLineItemId) ?? 0);
            return line.qtyPicked - line.qtyShipped >= globallyReserved;
          });

    return {
      ...shipment,
      items: shipmentItemsForShipment,
      canGenerateDispatchNote,
      dispatchNoteBlockedReason: canGenerateDispatchNote
        ? null
        : 'Every item in this shipment draft must be fully picked before a dispatch note can be generated.',
      canGenerateDeliveryNote: shipment.status === 'delivered',
      deliveryNoteBlockedReason:
        shipment.status === 'delivered'
          ? null
          : 'Confirm delivery on the shipment before generating the delivery note.',
    };
  });
}
