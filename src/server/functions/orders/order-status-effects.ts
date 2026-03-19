'use server'

import { generateDeliveryNotePdf, generateInvoicePdf } from '@/trigger/jobs';
import { ordersLogger } from '@/lib/logger';
import { orders } from 'drizzle/schema';

type OrderStatusArtifactTarget = Pick<
  typeof orders.$inferSelect,
  'id' | 'orderNumber' | 'customerId' | 'dueDate' | 'status'
> & {
  shippedDate?: string | null;
};

export async function queueStatusArtifacts(
  organizationId: string,
  updatedOrders: OrderStatusArtifactTarget[]
) {
  for (const order of updatedOrders) {
    if (order.status === 'confirmed') {
      generateInvoicePdf.trigger({
        orderId: order.id,
        orderNumber: order.orderNumber,
        organizationId,
        customerId: order.customerId,
        dueDate: order.dueDate ?? undefined,
      }).catch((error) => {
        ordersLogger.error('[INT-DOC-007] Failed to trigger invoice PDF generation', error);
      });
    }

    if (order.status === 'shipped') {
      generateDeliveryNotePdf.trigger({
        orderId: order.id,
        orderNumber: order.orderNumber,
        organizationId,
        customerId: order.customerId,
        deliveryDate: order.shippedDate ?? null,
      }).catch((error) => {
        ordersLogger.error('[INT-DOC-007] Failed to trigger delivery note PDF generation', error);
      });
    }
  }
}
