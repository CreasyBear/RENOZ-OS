/**
 * Shipment Validation Schemas
 *
 * Zod schemas for shipment operations.
 *
 * @see drizzle/schema/order-shipments.ts for database schema
 * @see _Initiation/_prd/2-domains/orders/orders.prd.json (ORD-SHIPPING-SCHEMA)
 */

import { z } from "zod";

// ============================================================================
// COMMON TYPES
// ============================================================================

export const shipmentStatusSchema = z.enum([
  "pending",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "failed",
  "returned",
]);

export type ShipmentStatus = z.infer<typeof shipmentStatusSchema>;

// ============================================================================
// ADDRESS SCHEMA
// ============================================================================

export const shipmentAddressSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  company: z.string().max(200).optional(),
  street1: z.string().min(1, "Street address is required").max(500),
  street2: z.string().max(500).optional(),
  city: z.string().min(1, "City is required").max(100),
  state: z.string().min(1, "State is required").max(50),
  postcode: z.string().min(1, "Postcode is required").max(20),
  country: z.string().min(2, "Country is required").max(2).default("AU"),
  phone: z.string().max(50).optional(),
  email: z.string().email().optional(),
  instructions: z.string().max(1000).optional(),
});

export type ShipmentAddress = z.infer<typeof shipmentAddressSchema>;

// ============================================================================
// TRACKING EVENT SCHEMA
// ============================================================================

export const trackingEventSchema = z.object({
  timestamp: z.string().datetime(),
  status: z.string().min(1).max(100),
  location: z.string().max(200).optional(),
  description: z.string().max(500).optional(),
});

export type TrackingEvent = z.infer<typeof trackingEventSchema>;

// ============================================================================
// DELIVERY CONFIRMATION SCHEMA
// ============================================================================

export const deliveryConfirmationSchema = z.object({
  signedBy: z.string().max(200).optional(),
  signature: z.string().optional(), // Base64 encoded
  photoUrl: z.string().url().optional(),
  confirmedAt: z.string().datetime(),
  notes: z.string().max(1000).optional(),
});

export type DeliveryConfirmation = z.infer<typeof deliveryConfirmationSchema>;

// ============================================================================
// CREATE SHIPMENT SCHEMA
// ============================================================================

export const createShipmentSchema = z.object({
  orderId: z.string().uuid("Valid order ID is required"),
  shipmentNumber: z.string().min(1).max(50).optional(), // Auto-generated if not provided
  carrier: z.string().max(100).optional(),
  carrierService: z.string().max(100).optional(),
  trackingNumber: z.string().max(200).optional(),
  trackingUrl: z.string().url().optional(),
  shippingAddress: shipmentAddressSchema.optional(),
  returnAddress: shipmentAddressSchema.optional(),
  weight: z.number().int().min(0).optional(), // grams
  length: z.number().int().min(0).optional(), // mm
  width: z.number().int().min(0).optional(), // mm
  height: z.number().int().min(0).optional(), // mm
  packageCount: z.number().int().min(1).default(1),
  estimatedDeliveryAt: z.coerce.date().optional(),
  notes: z.string().max(2000).optional(),
  // Items to include in shipment
  items: z
    .array(
      z.object({
        orderLineItemId: z.string().uuid("Valid line item ID is required"),
        quantity: z.number().int().min(1),
        serialNumbers: z.array(z.string()).optional(),
        lotNumber: z.string().max(100).optional(),
        expiryDate: z.coerce.date().optional(),
        notes: z.string().max(500).optional(),
      })
    )
    .min(1, "At least one item is required"),
});

export type CreateShipment = z.infer<typeof createShipmentSchema>;

// ============================================================================
// UPDATE SHIPMENT SCHEMA
// ============================================================================

export const updateShipmentSchema = z.object({
  carrier: z.string().max(100).optional(),
  carrierService: z.string().max(100).optional(),
  trackingNumber: z.string().max(200).optional(),
  trackingUrl: z.string().url().optional(),
  shippingAddress: shipmentAddressSchema.optional(),
  returnAddress: shipmentAddressSchema.optional(),
  weight: z.number().int().min(0).optional(),
  length: z.number().int().min(0).optional(),
  width: z.number().int().min(0).optional(),
  height: z.number().int().min(0).optional(),
  packageCount: z.number().int().min(1).optional(),
  estimatedDeliveryAt: z.coerce.date().optional(),
  notes: z.string().max(2000).optional(),
  carrierNotes: z.string().max(2000).optional(),
});

export type UpdateShipment = z.infer<typeof updateShipmentSchema>;

// ============================================================================
// SHIPMENT STATUS UPDATE SCHEMA
// ============================================================================

export const updateShipmentStatusSchema = z.object({
  id: z.string().uuid(),
  status: shipmentStatusSchema,
  trackingEvent: trackingEventSchema.optional(),
  deliveryConfirmation: deliveryConfirmationSchema.optional(),
});

export type UpdateShipmentStatus = z.infer<typeof updateShipmentStatusSchema>;

// ============================================================================
// MARK AS SHIPPED SCHEMA
// ============================================================================

export const markShippedSchema = z.object({
  id: z.string().uuid(),
  carrier: z.string().min(1, "Carrier is required").max(100),
  carrierService: z.string().max(100).optional(),
  trackingNumber: z.string().max(200).optional(),
  trackingUrl: z.string().url().optional(),
  shippedAt: z.coerce.date().optional(), // Defaults to now
});

export type MarkShipped = z.infer<typeof markShippedSchema>;

// ============================================================================
// CONFIRM DELIVERY SCHEMA
// ============================================================================

export const confirmDeliverySchema = z.object({
  id: z.string().uuid(),
  deliveredAt: z.coerce.date().optional(), // Defaults to now
  signedBy: z.string().max(200).optional(),
  signature: z.string().optional(),
  photoUrl: z.string().url().optional(),
  notes: z.string().max(1000).optional(),
});

export type ConfirmDelivery = z.infer<typeof confirmDeliverySchema>;

// ============================================================================
// SHIPMENT QUERY SCHEMAS
// ============================================================================

export const shipmentParamsSchema = z.object({
  id: z.string().uuid(),
});

export const shipmentListQuerySchema = z.object({
  orderId: z.string().uuid().optional(),
  status: shipmentStatusSchema.optional(),
  carrier: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  sortBy: z
    .enum(["createdAt", "shippedAt", "deliveredAt", "status"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type ShipmentListQuery = z.infer<typeof shipmentListQuerySchema>;

// ============================================================================
// SHIPMENT OUTPUT SCHEMA
// ============================================================================

export const shipmentSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  orderId: z.string().uuid(),
  shipmentNumber: z.string(),
  status: shipmentStatusSchema,
  carrier: z.string().nullable(),
  carrierService: z.string().nullable(),
  trackingNumber: z.string().nullable(),
  trackingUrl: z.string().nullable(),
  shippingAddress: shipmentAddressSchema.nullable(),
  returnAddress: shipmentAddressSchema.nullable(),
  weight: z.number().nullable(),
  length: z.number().nullable(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  packageCount: z.number(),
  shippedAt: z.coerce.date().nullable(),
  estimatedDeliveryAt: z.coerce.date().nullable(),
  deliveredAt: z.coerce.date().nullable(),
  deliveryConfirmation: deliveryConfirmationSchema.nullable(),
  trackingEvents: z.array(trackingEventSchema).nullable(),
  shippedBy: z.string().uuid().nullable(),
  notes: z.string().nullable(),
  carrierNotes: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Shipment = z.infer<typeof shipmentSchema>;

export const shipmentItemSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  shipmentId: z.string().uuid(),
  orderLineItemId: z.string().uuid(),
  quantity: z.number(),
  serialNumbers: z.array(z.string()).nullable(),
  lotNumber: z.string().nullable(),
  expiryDate: z.coerce.date().nullable(),
  notes: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type ShipmentItem = z.infer<typeof shipmentItemSchema>;
