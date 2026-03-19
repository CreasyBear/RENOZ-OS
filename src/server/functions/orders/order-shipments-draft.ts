'use server'

import { and, eq, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { NotFoundError, ValidationError } from '@/lib/server/errors';
import { withAuth } from '@/lib/server/protected';
import { orderShipments, orders, shipmentItems } from 'drizzle/schema';
import {
  createShipmentSchema,
  shipmentParamsSchema,
  updateShipmentSchema,
} from '@/lib/schemas';
import { normalizeSerial } from '@/lib/serials';
import type { OrderShipment, ShipmentWithItems } from './order-shipment-types';
import { generateShipmentNumber, generateTrackingUrl } from './order-shipments-shared';
import { validateShipmentItems } from './order-shipments-validation';
type CreateShipmentInput = z.infer<typeof createShipmentSchema>;
type UpdateShipmentInput = z.infer<typeof updateShipmentSchema>;
type ShipmentParamsInput = z.infer<typeof shipmentParamsSchema>;

export async function createShipmentHandler({
  data,
}: {
  data: CreateShipmentInput;
}): Promise<ShipmentWithItems> {
  const ctx = await withAuth();

  const [order] = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.id, data.orderId),
        eq(orders.organizationId, ctx.organizationId),
        isNull(orders.deletedAt)
      )
    )
    .limit(1);

  if (!order) {
    throw new NotFoundError('Order not found');
  }

  const normalizedItems = data.items.map((item) => ({
    ...item,
    serialNumbers: item.serialNumbers?.map((serial) => normalizeSerial(serial)) ?? undefined,
  }));

  await validateShipmentItems(ctx.organizationId, data.orderId, normalizedItems);

  const shipmentNumber =
    data.shipmentNumber || (await generateShipmentNumber(ctx.organizationId, data.orderId));

  const trackingUrl =
    data.trackingUrl || generateTrackingUrl(data.carrier ?? null, data.trackingNumber ?? null);

  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
    );

    const [shipment] = await tx
      .insert(orderShipments)
      .values({
        organizationId: ctx.organizationId,
        orderId: data.orderId,
        shipmentNumber,
        status: 'pending',
        carrier: data.carrier,
        carrierService: data.carrierService,
        trackingNumber: data.trackingNumber,
        trackingUrl,
        shippingAddress: data.shippingAddress,
        returnAddress: data.returnAddress,
        weight: data.weight,
        length: data.length,
        width: data.width,
        height: data.height,
        packageCount: data.packageCount,
        estimatedDeliveryAt: data.estimatedDeliveryAt,
        shippingCost: data.shippingCost,
        notes: data.notes,
        createdBy: ctx.user.id,
      })
      .returning();

    const createdItems = await tx
      .insert(shipmentItems)
      .values(
        normalizedItems.map((item) => ({
          organizationId: ctx.organizationId,
          shipmentId: shipment.id,
          orderLineItemId: item.orderLineItemId,
          quantity: item.quantity,
          serialNumbers: item.serialNumbers,
          lotNumber: item.lotNumber,
          expiryDate: item.expiryDate,
          notes: item.notes,
        }))
      )
      .returning();

    return {
      ...shipment,
      items: createdItems,
    };
  });
}

export async function updateShipmentHandler({
  data,
}: {
  data: { id: string } & UpdateShipmentInput;
}): Promise<OrderShipment> {
  const ctx = await withAuth();
  const { id, ...updateData } = data;

  const [existing] = await db
    .select()
    .from(orderShipments)
    .where(and(eq(orderShipments.id, id), eq(orderShipments.organizationId, ctx.organizationId)))
    .limit(1);

  if (!existing) {
    throw new NotFoundError('Shipment not found');
  }

  if (existing.status === 'delivered' || existing.status === 'returned') {
    throw new ValidationError('Cannot update completed shipment', {
      status: [`Shipment is ${existing.status}`],
    });
  }

  const trackingUrl =
    updateData.trackingUrl ||
    generateTrackingUrl(
      updateData.carrier ?? existing.carrier,
      updateData.trackingNumber ?? existing.trackingNumber
    );

  const [shipment] = await db
    .update(orderShipments)
    .set({
      ...updateData,
      trackingUrl,
      updatedBy: ctx.user.id,
    })
    .where(eq(orderShipments.id, id))
    .returning();

  return shipment;
}

export async function deleteShipmentHandler({
  data,
}: {
  data: ShipmentParamsInput;
}): Promise<{ success: boolean }> {
  const ctx = await withAuth();

  const [existing] = await db
    .select()
    .from(orderShipments)
    .where(
      and(eq(orderShipments.id, data.id), eq(orderShipments.organizationId, ctx.organizationId))
    )
    .limit(1);

  if (!existing) {
    throw new NotFoundError('Shipment not found');
  }

  if (existing.status !== 'pending') {
    throw new ValidationError('Only pending shipments can be deleted', {
      status: [`Current status is ${existing.status}`],
    });
  }

  await db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
    );
    await tx.delete(shipmentItems).where(eq(shipmentItems.shipmentId, data.id));

    const [deleted] = await tx
      .delete(orderShipments)
      .where(eq(orderShipments.id, data.id))
      .returning({ id: orderShipments.id });

    if (!deleted) {
      throw new NotFoundError('Shipment not found or already deleted');
    }
  });

  return { success: true };
}
