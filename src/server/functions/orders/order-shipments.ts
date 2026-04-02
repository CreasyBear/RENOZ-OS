/**
 * Order Shipments Server Functions
 *
 * Compatibility facade over shipment read, draft, finalization, and status seams.
 */

import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { normalizeObjectInput } from '@/lib/schemas/_shared/patterns';
import { fulfillmentImportSchema } from '@/lib/schemas/orders/shipments';
import {
  createShipmentSchema,
  updateShipmentSchema,
  markShippedSchema,
  confirmDeliverySchema,
  updateShipmentStatusSchema,
  shipmentParamsSchema,
  shipmentListQuerySchema,
  shipmentListCursorQuerySchema,
} from '@/lib/schemas';
import {
  getOrderShipmentsHandler,
  getShipmentHandler,
  listShipmentsCursorHandler,
  listShipmentsHandler,
} from './order-shipments-read';
import {
  createShipmentHandler,
  deleteShipmentHandler,
  updateShipmentHandler,
} from './order-shipments-draft';
import {
  importFulfillmentShipmentsHandler,
  markShippedHandler,
} from './order-shipments-finalization';
import {
  addTrackingEventHandler,
  confirmDeliveryHandler,
  updateShipmentStatusHandler,
} from './order-shipments-status';

export { validateShipmentItems } from './order-shipments-validation';

export const listShipments = createServerFn({ method: 'GET' })
  .inputValidator(shipmentListQuerySchema)
  .handler(listShipmentsHandler);

export const listShipmentsCursor = createServerFn({ method: 'GET' })
  .inputValidator(shipmentListCursorQuerySchema)
  .handler(listShipmentsCursorHandler);

export const getShipment = createServerFn({ method: 'GET' })
  .inputValidator(normalizeObjectInput(shipmentParamsSchema))
  .handler(getShipmentHandler);

export const createShipment = createServerFn({ method: 'POST' })
  .inputValidator(createShipmentSchema)
  .handler(createShipmentHandler);

export const updateShipment = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      ...updateShipmentSchema.shape,
    })
  )
  .handler(updateShipmentHandler);

export const markShipped = createServerFn({ method: 'POST' })
  .inputValidator(markShippedSchema)
  .handler(markShippedHandler);

export const importFulfillmentShipments = createServerFn({ method: 'POST' })
  .inputValidator(fulfillmentImportSchema)
  .handler(importFulfillmentShipmentsHandler);

export const updateShipmentStatus = createServerFn({ method: 'POST' })
  .inputValidator(updateShipmentStatusSchema)
  .handler(updateShipmentStatusHandler);

export const confirmDelivery = createServerFn({ method: 'POST' })
  .inputValidator(confirmDeliverySchema)
  .handler(confirmDeliveryHandler);

const addTrackingEventInputSchema = z.object({
  shipmentId: z.string().uuid(),
  event: z.object({
    timestamp: z.string().datetime(),
    status: z.string().min(1).max(100),
    location: z.string().max(200).optional(),
    description: z.string().max(500).optional(),
  }),
});

export const addTrackingEvent = createServerFn({ method: 'POST' })
  .inputValidator(addTrackingEventInputSchema)
  .handler(addTrackingEventHandler);

export const getOrderShipments = createServerFn({ method: 'GET' })
  .inputValidator(normalizeObjectInput(z.object({ orderId: z.string().uuid() })))
  .handler(getOrderShipmentsHandler);

export const deleteShipment = createServerFn({ method: 'POST' })
  .inputValidator(shipmentParamsSchema)
  .handler(deleteShipmentHandler);
