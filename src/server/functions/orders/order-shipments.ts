/**
 * Order Shipments Server Functions
 *
 * Shipment creation, tracking, and delivery confirmation.
 *
 * @see drizzle/schema/order-shipments.ts for database schema
 * @see _Initiation/_prd/2-domains/orders/orders.prd.json (ORD-SHIPPING-API)
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, desc, asc, gte, lte, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { orderShipments, shipmentItems, orders, orderLineItems } from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { ValidationError, NotFoundError } from '@/lib/server/errors';
import {
  createShipmentSchema,
  updateShipmentSchema,
  markShippedSchema,
  confirmDeliverySchema,
  updateShipmentStatusSchema,
  shipmentParamsSchema,
  shipmentListQuerySchema,
  type ShipmentStatus,
  type TrackingEvent,
} from '@/lib/schemas';

// ============================================================================
// TYPES
// ============================================================================

type OrderShipment = typeof orderShipments.$inferSelect;
type ShipmentItem = typeof shipmentItems.$inferSelect;

interface ShipmentWithItems extends OrderShipment {
  items: ShipmentItem[];
}

interface ListShipmentsResult {
  shipments: OrderShipment[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Generate a unique shipment number.
 */
async function generateShipmentNumber(organizationId: string, orderId: string): Promise<string> {
  // Get order number for prefix
  const [order] = await db
    .select({ orderNumber: orders.orderNumber })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) {
    throw new NotFoundError('Order not found');
  }

  // Count existing shipments for this order
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orderShipments)
    .where(
      and(eq(orderShipments.organizationId, organizationId), eq(orderShipments.orderId, orderId))
    );

  const shipmentNum = (count || 0) + 1;
  return `${order.orderNumber}-S${String(shipmentNum).padStart(2, '0')}`;
}

/**
 * Generate carrier tracking URL based on carrier and tracking number.
 */
function generateTrackingUrl(carrier: string | null, trackingNumber: string | null): string | null {
  if (!carrier || !trackingNumber) return null;

  const carrierUrls: Record<string, string> = {
    'australia post': `https://auspost.com.au/track/#!/details/${trackingNumber}`,
    auspost: `https://auspost.com.au/track/#!/details/${trackingNumber}`,
    startrack: `https://startrack.com.au/track/details/${trackingNumber}`,
    tnt: `https://www.tnt.com/express/en_au/site/tracking.html?searchType=con&cons=${trackingNumber}`,
    dhl: `https://www.dhl.com/au-en/home/tracking/tracking-parcel.html?submit=1&tracking-id=${trackingNumber}`,
    fedex: `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`,
    ups: `https://www.ups.com/track?tracknum=${trackingNumber}`,
    sendle: `https://track.sendle.com/${trackingNumber}`,
    aramex: `https://www.aramex.com.au/track/shipments/${trackingNumber}`,
    'toll ipec': `https://www.tollgroup.com/tools/tracktrace?consignmentNumber=${trackingNumber}`,
    toll: `https://www.tollgroup.com/tools/tracktrace?consignmentNumber=${trackingNumber}`,
    couriers_please: `https://www.couriersplease.com.au/track/${trackingNumber}`,
  };

  const normalizedCarrier = carrier.toLowerCase().trim();
  return carrierUrls[normalizedCarrier] || null;
}

/**
 * Validate that all items belong to the order and have sufficient quantity.
 */
async function validateShipmentItems(
  organizationId: string,
  orderId: string,
  items: Array<{ orderLineItemId: string; quantity: number }>
): Promise<void> {
  for (const item of items) {
    // Get line item
    const [lineItem] = await db
      .select()
      .from(orderLineItems)
      .where(
        and(
          eq(orderLineItems.id, item.orderLineItemId),
          eq(orderLineItems.organizationId, organizationId),
          eq(orderLineItems.orderId, orderId)
        )
      )
      .limit(1);

    if (!lineItem) {
      throw new ValidationError("Line item not found or doesn't belong to order", {
        orderLineItemId: [`Line item ${item.orderLineItemId} not found`],
      });
    }

    // Check available quantity (ordered - already shipped)
    const available = lineItem.quantity - lineItem.qtyShipped;
    if (item.quantity > available) {
      throw new ValidationError('Insufficient quantity available for shipment', {
        orderLineItemId: [`Only ${available} units available, requested ${item.quantity}`],
      });
    }
  }
}

// ============================================================================
// LIST SHIPMENTS
// ============================================================================

export const listShipments = createServerFn({ method: 'GET' })
  .inputValidator(shipmentListQuerySchema)
  .handler(async ({ data }): Promise<ListShipmentsResult> => {
    const ctx = await withAuth();
    const { orderId, status, carrier, dateFrom, dateTo, page, pageSize, sortBy, sortOrder } = data;

    // Build conditions
    const conditions = [eq(orderShipments.organizationId, ctx.organizationId)];

    if (orderId) {
      conditions.push(eq(orderShipments.orderId, orderId));
    }
    if (status) {
      conditions.push(eq(orderShipments.status, status));
    }
    if (carrier) {
      conditions.push(sql`${orderShipments.carrier} ILIKE ${`%${carrier}%`}`);
    }
    if (dateFrom) {
      conditions.push(gte(orderShipments.createdAt, dateFrom));
    }
    if (dateTo) {
      conditions.push(lte(orderShipments.createdAt, dateTo));
    }

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(orderShipments)
      .where(and(...conditions));

    const total = count || 0;

    // Sort
    const sortColumn = {
      createdAt: orderShipments.createdAt,
      shippedAt: orderShipments.shippedAt,
      deliveredAt: orderShipments.deliveredAt,
      status: orderShipments.status,
    }[sortBy];

    const orderFn = sortOrder === 'asc' ? asc : desc;

    // Fetch shipments
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
  });

// ============================================================================
// GET SHIPMENT
// ============================================================================

export const getShipment = createServerFn({ method: 'GET' })
  .inputValidator(shipmentParamsSchema)
  .handler(async ({ data }): Promise<ShipmentWithItems> => {
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

    // Get items
    const items = await db
      .select()
      .from(shipmentItems)
      .where(eq(shipmentItems.shipmentId, data.id));

    return {
      ...shipment,
      items,
    };
  });

// ============================================================================
// CREATE SHIPMENT
// ============================================================================

export const createShipment = createServerFn({ method: 'POST' })
  .inputValidator(createShipmentSchema)
  .handler(async ({ data }): Promise<ShipmentWithItems> => {
    const ctx = await withAuth();

    // Verify order exists and belongs to org
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

    // Validate items
    await validateShipmentItems(ctx.organizationId, data.orderId, data.items);

    // Generate shipment number
    const shipmentNumber =
      data.shipmentNumber || (await generateShipmentNumber(ctx.organizationId, data.orderId));

    // Generate tracking URL if carrier and tracking number provided
    const trackingUrl =
      data.trackingUrl || generateTrackingUrl(data.carrier ?? null, data.trackingNumber ?? null);

    // Create shipment
    const [shipment] = await db
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
        notes: data.notes,
        createdBy: ctx.user.id,
      })
      .returning();

    // Create shipment items and update line item shipped quantities
    const createdItems: ShipmentItem[] = [];
    for (const item of data.items) {
      const [shipmentItem] = await db
        .insert(shipmentItems)
        .values({
          organizationId: ctx.organizationId,
          shipmentId: shipment.id,
          orderLineItemId: item.orderLineItemId,
          quantity: item.quantity,
          serialNumbers: item.serialNumbers,
          lotNumber: item.lotNumber,
          expiryDate: item.expiryDate,
          notes: item.notes,
        })
        .returning();

      createdItems.push(shipmentItem);

      // Update line item qtyShipped (this will be done when marking as shipped)
    }

    return {
      ...shipment,
      items: createdItems,
    };
  });

// ============================================================================
// UPDATE SHIPMENT
// ============================================================================

export const updateShipment = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      ...updateShipmentSchema.shape,
    })
  )
  .handler(async ({ data }): Promise<OrderShipment> => {
    const ctx = await withAuth();
    const { id, ...updateData } = data;

    // Verify shipment exists
    const [existing] = await db
      .select()
      .from(orderShipments)
      .where(and(eq(orderShipments.id, id), eq(orderShipments.organizationId, ctx.organizationId)))
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Shipment not found');
    }

    // Cannot update delivered or returned shipments
    if (existing.status === 'delivered' || existing.status === 'returned') {
      throw new ValidationError('Cannot update completed shipment', {
        status: [`Shipment is ${existing.status}`],
      });
    }

    // Generate tracking URL if carrier or tracking number changed
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
  });

// ============================================================================
// MARK AS SHIPPED
// ============================================================================

export const markShipped = createServerFn({ method: 'POST' })
  .inputValidator(markShippedSchema)
  .handler(async ({ data }): Promise<OrderShipment> => {
    const ctx = await withAuth();

    // Verify shipment exists and is pending
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
      throw new ValidationError('Shipment already shipped', {
        status: [`Current status is ${existing.status}`],
      });
    }

    const shippedAt = data.shippedAt || new Date();
    const trackingUrl =
      data.trackingUrl || generateTrackingUrl(data.carrier, data.trackingNumber ?? null);

    // Create initial tracking event
    const trackingEvents: TrackingEvent[] = [
      {
        timestamp: shippedAt.toISOString(),
        status: 'Shipped',
        description: `Package picked up by ${data.carrier}`,
      },
    ];

    // Wrap shipment update and line item updates in a transaction
    const shipment = await db.transaction(async (tx) => {
      // Update shipment
      const [updatedShipment] = await tx
        .update(orderShipments)
        .set({
          status: 'in_transit',
          carrier: data.carrier,
          carrierService: data.carrierService,
          trackingNumber: data.trackingNumber,
          trackingUrl,
          shippedAt,
          shippedBy: ctx.user.id,
          trackingEvents,
          updatedBy: ctx.user.id,
        })
        .where(eq(orderShipments.id, data.id))
        .returning();

      // Update line item qtyShipped
      const items = await tx
        .select()
        .from(shipmentItems)
        .where(eq(shipmentItems.shipmentId, data.id));

      for (const item of items) {
        await tx
          .update(orderLineItems)
          .set({
            qtyShipped: sql`${orderLineItems.qtyShipped} + ${item.quantity}`,
          })
          .where(eq(orderLineItems.id, item.orderLineItemId));
      }

      return updatedShipment;
    });

    return shipment;
  });

// ============================================================================
// UPDATE SHIPMENT STATUS
// ============================================================================

export const updateShipmentStatus = createServerFn({ method: 'POST' })
  .inputValidator(updateShipmentStatusSchema)
  .handler(async ({ data }): Promise<OrderShipment> => {
    const ctx = await withAuth();

    // Verify shipment exists
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

    // Validate status transition
    const validTransitions: Record<ShipmentStatus, ShipmentStatus[]> = {
      pending: ['in_transit', 'failed'],
      in_transit: ['out_for_delivery', 'delivered', 'failed', 'returned'],
      out_for_delivery: ['delivered', 'failed', 'returned'],
      delivered: [], // Terminal state
      failed: ['in_transit', 'returned'],
      returned: [], // Terminal state
    };

    if (!validTransitions[existing.status].includes(data.status)) {
      throw new ValidationError('Invalid status transition', {
        status: [`Cannot transition from ${existing.status} to ${data.status}`],
      });
    }

    // Add tracking event
    const trackingEvents = [...(existing.trackingEvents || [])];
    if (data.trackingEvent) {
      trackingEvents.push(data.trackingEvent);
    } else {
      trackingEvents.push({
        timestamp: new Date().toISOString(),
        status: data.status,
        description: `Status changed to ${data.status}`,
      });
    }

    // Build update
    const updateValues: Partial<typeof orderShipments.$inferInsert> = {
      status: data.status,
      trackingEvents,
      updatedBy: ctx.user.id,
    };

    // Handle delivery
    if (data.status === 'delivered') {
      updateValues.deliveredAt = new Date();
      if (data.deliveryConfirmation) {
        updateValues.deliveryConfirmation = data.deliveryConfirmation;
      }

      // Update line item qtyDelivered
      const items = await db
        .select()
        .from(shipmentItems)
        .where(eq(shipmentItems.shipmentId, data.id));

      for (const item of items) {
        await db
          .update(orderLineItems)
          .set({
            qtyDelivered: sql`${orderLineItems.qtyDelivered} + ${item.quantity}`,
          })
          .where(eq(orderLineItems.id, item.orderLineItemId));
      }
    }

    const [shipment] = await db
      .update(orderShipments)
      .set(updateValues)
      .where(eq(orderShipments.id, data.id))
      .returning();

    return shipment;
  });

// ============================================================================
// CONFIRM DELIVERY
// ============================================================================

export const confirmDelivery = createServerFn({ method: 'POST' })
  .inputValidator(confirmDeliverySchema)
  .handler(async ({ data }): Promise<OrderShipment> => {
    const ctx = await withAuth();

    // Verify shipment exists and is in deliverable status
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

    if (!['in_transit', 'out_for_delivery'].includes(existing.status)) {
      throw new ValidationError('Shipment cannot be confirmed as delivered', {
        status: [`Current status is ${existing.status}`],
      });
    }

    const deliveredAt = data.deliveredAt || new Date();

    // Add tracking event
    const trackingEvents = [...(existing.trackingEvents || [])];
    trackingEvents.push({
      timestamp: deliveredAt.toISOString(),
      status: 'delivered',
      description: data.signedBy ? `Delivered and signed by ${data.signedBy}` : 'Delivered',
    });

    // Wrap shipment update and line item updates in a transaction
    const shipment = await db.transaction(async (tx) => {
      // Update shipment
      const [updatedShipment] = await tx
        .update(orderShipments)
        .set({
          status: 'delivered',
          deliveredAt,
          deliveryConfirmation: {
            signedBy: data.signedBy,
            signature: data.signature,
            photoUrl: data.photoUrl,
            confirmedAt: deliveredAt.toISOString(),
            notes: data.notes,
          },
          trackingEvents,
          updatedBy: ctx.user.id,
        })
        .where(eq(orderShipments.id, data.id))
        .returning();

      // Update line item qtyDelivered
      const items = await tx
        .select()
        .from(shipmentItems)
        .where(eq(shipmentItems.shipmentId, data.id));

      for (const item of items) {
        await tx
          .update(orderLineItems)
          .set({
            qtyDelivered: sql`${orderLineItems.qtyDelivered} + ${item.quantity}`,
          })
          .where(eq(orderLineItems.id, item.orderLineItemId));
      }

      return updatedShipment;
    });

    return shipment;
  });

// ============================================================================
// ADD TRACKING EVENT
// ============================================================================

export const addTrackingEvent = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      shipmentId: z.string().uuid(),
      event: z.object({
        timestamp: z.string().datetime(),
        status: z.string().min(1).max(100),
        location: z.string().max(200).optional(),
        description: z.string().max(500).optional(),
      }),
    })
  )
  .handler(async ({ data }): Promise<OrderShipment> => {
    const ctx = await withAuth();

    // Verify shipment exists
    const [existing] = await db
      .select()
      .from(orderShipments)
      .where(
        and(
          eq(orderShipments.id, data.shipmentId),
          eq(orderShipments.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Shipment not found');
    }

    // Add event
    const trackingEvents = [...(existing.trackingEvents || []), data.event];

    const [shipment] = await db
      .update(orderShipments)
      .set({
        trackingEvents,
        updatedBy: ctx.user.id,
      })
      .where(eq(orderShipments.id, data.shipmentId))
      .returning();

    return shipment;
  });

// ============================================================================
// GET ORDER SHIPMENTS
// ============================================================================

export const getOrderShipments = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ orderId: z.string().uuid() }))
  .handler(async ({ data }): Promise<ShipmentWithItems[]> => {
    const ctx = await withAuth();

    // Verify order exists
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
      .orderBy(desc(orderShipments.createdAt));

    // Get items for each shipment
    const result: ShipmentWithItems[] = [];
    for (const shipment of shipments) {
      const items = await db
        .select()
        .from(shipmentItems)
        .where(eq(shipmentItems.shipmentId, shipment.id));

      result.push({
        ...shipment,
        items,
      });
    }

    return result;
  });

// ============================================================================
// DELETE SHIPMENT (only pending)
// ============================================================================

export const deleteShipment = createServerFn({ method: 'POST' })
  .inputValidator(shipmentParamsSchema)
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    const ctx = await withAuth();

    // Verify shipment exists and is pending
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

    // Delete items first (cascade should handle this, but be explicit)
    await db.delete(shipmentItems).where(eq(shipmentItems.shipmentId, data.id));

    // Delete shipment
    await db.delete(orderShipments).where(eq(orderShipments.id, data.id));

    return { success: true };
  });
