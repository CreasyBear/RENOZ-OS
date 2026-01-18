/**
 * Order Zod Schemas
 *
 * Validation schemas for order operations.
 */

import { z } from "zod";
import {
  addressSchema,
  currencySchema,
  quantitySchema,
  percentageSchema,
  paginationSchema,
  filterSchema,
  idParamSchema,
} from "./patterns";
import { taxTypeSchema } from "./products";
import { cursorPaginationSchema } from "@/lib/db/pagination";

// ============================================================================
// ENUMS (must match canonical-enums.json)
// ============================================================================

export const orderStatusValues = [
  "draft",
  "confirmed",
  "picking",
  "picked",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export const paymentStatusValues = [
  "pending",
  "partial",
  "paid",
  "refunded",
  "overdue",
] as const;

export const orderStatusSchema = z.enum(orderStatusValues);
export const paymentStatusSchema = z.enum(paymentStatusValues);

export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

// ============================================================================
// ORDER ADDRESS
// ============================================================================

export const orderAddressSchema = addressSchema.extend({
  contactName: z.string().max(255).optional(),
  contactPhone: z.string().max(20).optional(),
});

export type OrderAddress = z.infer<typeof orderAddressSchema>;

// ============================================================================
// ORDER METADATA
// ============================================================================

export const orderMetadataSchema = z
  .object({
    source: z.enum(["web", "phone", "email", "api", "pos"]).optional(),
    externalRef: z.string().max(255).optional(),
    notes: z.string().max(2000).optional(),
  })
  .passthrough();

export type OrderMetadata = z.infer<typeof orderMetadataSchema>;

// ============================================================================
// ORDER LINE ITEM
// ============================================================================

export const createOrderLineItemSchema = z.object({
  productId: z.string().uuid().optional(),
  lineNumber: z.string().max(10),
  sku: z.string().max(50).optional(),
  description: z.string().min(1, "Description is required").max(500),
  quantity: quantitySchema,
  unitPrice: currencySchema,
  discountPercent: percentageSchema.optional(),
  discountAmount: currencySchema.optional(),
  taxType: taxTypeSchema.default("gst"),
  notes: z.string().max(500).optional(),
});

export type CreateOrderLineItem = z.infer<typeof createOrderLineItemSchema>;

export const orderLineItemSchema = createOrderLineItemSchema.extend({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  organizationId: z.string().uuid(),
  taxAmount: z.number(),
  lineTotal: z.number(),
  qtyPicked: z.number(),
  qtyShipped: z.number(),
  qtyDelivered: z.number(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type OrderLineItem = z.infer<typeof orderLineItemSchema>;

// ============================================================================
// CREATE ORDER
// ============================================================================

export const createOrderSchema = z.object({
  customerId: z.string().uuid("Customer is required"),
  orderNumber: z.string().min(1, "Order number is required").max(50).optional(),
  status: orderStatusSchema.default("draft"),
  paymentStatus: paymentStatusSchema.default("pending"),
  orderDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
  billingAddress: orderAddressSchema.optional(),
  shippingAddress: orderAddressSchema.optional(),
  discountPercent: percentageSchema.optional(),
  discountAmount: currencySchema.optional(),
  shippingAmount: currencySchema.default(0),
  metadata: orderMetadataSchema.default({}),
  internalNotes: z.string().max(2000).optional(),
  customerNotes: z.string().max(2000).optional(),
  lineItems: z.array(createOrderLineItemSchema).min(1, "At least one line item required"),
});

export type CreateOrder = z.infer<typeof createOrderSchema>;

// ============================================================================
// UPDATE ORDER
// ============================================================================

export const updateOrderSchema = createOrderSchema
  .partial()
  .omit({ lineItems: true });

export type UpdateOrder = z.infer<typeof updateOrderSchema>;

// ============================================================================
// ORDER (output)
// ============================================================================

export const orderSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  customerId: z.string().uuid(),
  orderNumber: z.string(),
  status: orderStatusSchema,
  paymentStatus: paymentStatusSchema,
  orderDate: z.coerce.date(),
  dueDate: z.coerce.date().nullable(),
  shippedDate: z.coerce.date().nullable(),
  deliveredDate: z.coerce.date().nullable(),
  billingAddress: orderAddressSchema.nullable(),
  shippingAddress: orderAddressSchema.nullable(),
  subtotal: z.number(),
  discountAmount: z.number(),
  discountPercent: z.number().nullable(),
  taxAmount: z.number(),
  shippingAmount: z.number(),
  total: z.number(),
  paidAmount: z.number(),
  balanceDue: z.number(),
  metadata: orderMetadataSchema,
  internalNotes: z.string().nullable(),
  customerNotes: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  createdBy: z.string().uuid().nullable(),
  updatedBy: z.string().uuid().nullable(),
  deletedAt: z.coerce.date().nullable(),
  lineItems: z.array(orderLineItemSchema).optional(),
});

export type Order = z.infer<typeof orderSchema>;

// ============================================================================
// ORDER FILTERS
// ============================================================================

export const orderFilterSchema = filterSchema.extend({
  status: orderStatusSchema.optional(),
  paymentStatus: paymentStatusSchema.optional(),
  customerId: z.string().uuid().optional(),
  minTotal: currencySchema.optional(),
  maxTotal: currencySchema.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

export type OrderFilter = z.infer<typeof orderFilterSchema>;

// ============================================================================
// ORDER LIST QUERY
// ============================================================================

export const orderListQuerySchema = paginationSchema.merge(orderFilterSchema);

export type OrderListQuery = z.infer<typeof orderListQuerySchema>;

/**
 * Cursor-based pagination query for orders.
 * More efficient for large datasets than offset pagination.
 */
export const orderCursorQuerySchema =
  cursorPaginationSchema.merge(orderFilterSchema);

export type OrderCursorQuery = z.infer<typeof orderCursorQuerySchema>;

// ============================================================================
// ORDER PARAMS
// ============================================================================

export const orderParamsSchema = idParamSchema;
export type OrderParams = z.infer<typeof orderParamsSchema>;

// ============================================================================
// ORDER STATUS TRANSITION
// ============================================================================

export const updateOrderStatusSchema = z.object({
  status: orderStatusSchema,
  notes: z.string().max(500).optional(),
});

export type UpdateOrderStatus = z.infer<typeof updateOrderStatusSchema>;
