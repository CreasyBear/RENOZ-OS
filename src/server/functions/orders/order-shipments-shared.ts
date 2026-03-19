'use server'

import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { NotFoundError } from '@/lib/server/errors';
import { orderShipments, orders } from 'drizzle/schema';

export async function generateShipmentNumber(
  organizationId: string,
  orderId: string
): Promise<string> {
  const [order] = await db
    .select({ orderNumber: orders.orderNumber })
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.organizationId, organizationId)))
    .limit(1);

  if (!order) {
    throw new NotFoundError('Order not found');
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orderShipments)
    .where(
      and(eq(orderShipments.organizationId, organizationId), eq(orderShipments.orderId, orderId))
    );

  const shipmentNum = (count || 0) + 1;
  return `${order.orderNumber}-S${String(shipmentNum).padStart(2, '0')}`;
}

export function generateTrackingUrl(
  carrier: string | null,
  trackingNumber: string | null
): string | null {
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
