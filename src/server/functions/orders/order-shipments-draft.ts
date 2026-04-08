'use server'

import { and, eq, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { NotFoundError, ValidationError } from '@/lib/server/errors';
import { withAuth } from '@/lib/server/protected';
import { addresses, customers, orderShipments, orders, shipmentItems } from 'drizzle/schema';
import {
  createShipmentSchema,
  shipmentParamsSchema,
  type ShipmentAddress,
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

  const normalizedItems = data.items.map((item) => ({
    ...item,
    serialNumbers: item.serialNumbers?.map((serial) => normalizeSerial(serial)) ?? undefined,
  }));

  const shipmentNumber =
    data.shipmentNumber || (await generateShipmentNumber(ctx.organizationId, data.orderId));

  const trackingUrl =
    data.trackingUrl || generateTrackingUrl(data.carrier ?? null, data.trackingNumber ?? null);

  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
    );

    const [order] = await tx
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

    await validateShipmentItems(tx, ctx.organizationId, data.orderId, normalizedItems);

    let customerAddress: {
      name?: string;
      street1: string;
      street2?: string;
      city: string;
      state?: string | null;
      postcode: string;
      country: string;
      phone?: string;
    } | undefined;

    if (data.addressSource === 'customer') {
      if (!order.customerId) {
        throw new ValidationError('Customer address is unavailable for this order', {
          customerAddressId: ['This order does not have a customer to source an address from.'],
        });
      }

      if (!data.customerAddressId) {
        throw new ValidationError('Customer address is required', {
          customerAddressId: ['Select a saved customer address before creating the shipment.'],
        });
      }

      const [selectedAddress] = await tx
        .select({
          id: addresses.id,
          street1: addresses.street1,
          street2: addresses.street2,
          city: addresses.city,
          state: addresses.state,
          postcode: addresses.postcode,
          country: addresses.country,
          customerName: customers.name,
        })
        .from(addresses)
        .innerJoin(
          customers,
          and(
            eq(addresses.customerId, customers.id),
            eq(customers.organizationId, ctx.organizationId),
            isNull(customers.deletedAt)
          )
        )
        .where(
          and(
            eq(addresses.id, data.customerAddressId),
            eq(addresses.organizationId, ctx.organizationId),
            eq(addresses.customerId, order.customerId)
          )
        )
        .limit(1);

      if (!selectedAddress) {
        throw new ValidationError('Selected customer address was not found', {
          customerAddressId: ['Choose a valid saved customer address for this shipment.'],
        });
      }

      customerAddress = {
        name: selectedAddress.customerName ?? undefined,
        street1: selectedAddress.street1,
        street2: selectedAddress.street2 ?? undefined,
        city: selectedAddress.city,
        state: selectedAddress.state,
        postcode: selectedAddress.postcode,
        country: selectedAddress.country,
      };
    }

    const shipmentShippingAddress =
      data.addressSource === 'custom' && data.shippingAddress
        ? data.shippingAddress
        : data.addressSource === 'customer'
          ? customerAddress
          : data.shippingAddress
            ? data.shippingAddress
            : data.addressSource === 'order' && order.shippingAddress?.street1
        ? {
            name: order.shippingAddress.contactName ?? undefined,
            street1: order.shippingAddress.street1,
            street2: order.shippingAddress.street2 ?? undefined,
            city: order.shippingAddress.city,
            state: order.shippingAddress.state,
            postcode: order.shippingAddress.postalCode,
            country: order.shippingAddress.country,
            phone: order.shippingAddress.contactPhone ?? undefined,
          }
            : undefined;

    if (data.addressSource === 'custom' && !shipmentShippingAddress?.street1) {
      throw new ValidationError('Custom shipment address is required', {
        shippingAddress: ['Enter the custom shipment address before creating the shipment.'],
      });
    }

    if (data.saveToOrderShippingAddress) {
      if (!shipmentShippingAddress?.street1 || !shipmentShippingAddress.city || !shipmentShippingAddress.postcode) {
        throw new ValidationError('Shipment address is required to save back to the order', {
          shippingAddress: ['Select or enter a shipment address before saving it to the order.'],
        });
      }

      await tx
        .update(orders)
        .set({
          shippingAddress: {
            street1: shipmentShippingAddress.street1,
            street2: shipmentShippingAddress.street2,
            city: shipmentShippingAddress.city,
            state: shipmentShippingAddress.state ?? '',
            postalCode: shipmentShippingAddress.postcode,
            country: shipmentShippingAddress.country ?? 'AU',
            contactName: shipmentShippingAddress.name,
            contactPhone: shipmentShippingAddress.phone,
          },
          updatedBy: ctx.user.id,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, data.orderId));
    }

    const shipmentAddressForStorage: ShipmentAddress | undefined = shipmentShippingAddress
      ? {
          name:
            shipmentShippingAddress.name ??
            customerAddress?.name ??
            order.shippingAddress?.contactName ??
            'Delivery Contact',
          street1: shipmentShippingAddress.street1,
          street2: shipmentShippingAddress.street2,
          city: shipmentShippingAddress.city,
          state: shipmentShippingAddress.state ?? '',
          postcode: shipmentShippingAddress.postcode,
          country: shipmentShippingAddress.country ?? 'AU',
          phone: shipmentShippingAddress.phone,
        }
      : undefined;

    const returnAddressForStorage: ShipmentAddress | undefined = data.returnAddress
      ? {
          name: data.returnAddress.name,
          company: data.returnAddress.company,
          street1: data.returnAddress.street1,
          street2: data.returnAddress.street2,
          city: data.returnAddress.city,
          state: data.returnAddress.state,
          postcode: data.returnAddress.postcode,
          country: data.returnAddress.country,
          phone: data.returnAddress.phone,
          email: data.returnAddress.email,
          instructions: data.returnAddress.instructions,
        }
      : undefined;

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
        shippingAddress: shipmentAddressForStorage,
        returnAddress: returnAddressForStorage,
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

  if (existing.status !== 'pending') {
    throw new ValidationError('Only pending shipments can be edited directly', {
      status: [
        existing.status === 'delivered' || existing.status === 'returned'
          ? `Shipment is ${existing.status}`
          : 'Reopen the shipment before editing physical fulfillment details.',
      ],
    });
  }

  const trackingUrl =
    updateData.trackingUrl ||
    generateTrackingUrl(
      updateData.carrier ?? existing.carrier,
      updateData.trackingNumber ?? existing.trackingNumber
    );

  const shippingAddressChanged =
    updateData.shippingAddress !== undefined &&
    JSON.stringify(existing.shippingAddress ?? null) !== JSON.stringify(updateData.shippingAddress);

  const [shipment] = await db
    .update(orderShipments)
    .set({
      ...updateData,
      trackingUrl,
      ...(shippingAddressChanged && {
        operationalDocumentRevision: sql`${orderShipments.operationalDocumentRevision} + 1`,
      }),
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
