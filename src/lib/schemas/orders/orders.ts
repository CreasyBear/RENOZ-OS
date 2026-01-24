/**
 * Order Zod Schemas
 *
 * Validation schemas for order operations.
 */

import { z } from 'zod';
import {
  addressSchema,
  currencySchema,
  quantitySchema,
  percentageSchema,
  paginationSchema,
  filterSchema,
  idParamSchema,
} from '../_shared/patterns';
import { taxTypeSchema } from '../products/products';
import { cursorPaginationSchema } from '@/lib/db/pagination';

// ============================================================================
// ENUMS (must match canonical-enums.json)
// ============================================================================

export const orderStatusValues = [
  'draft',
  'confirmed',
  'picking',
  'picked',
  'shipped',
  'delivered',
  'cancelled',
] as const;

export const paymentStatusValues = ['pending', 'partial', 'paid', 'refunded', 'overdue'] as const;

export const orderLineItemPickStatusValues = ['not_picked', 'picking', 'picked'] as const;

export const xeroSyncStatusValues = ['pending', 'syncing', 'synced', 'error'] as const;

export const orderStatusSchema = z.enum(orderStatusValues);
export const paymentStatusSchema = z.enum(paymentStatusValues);
export const orderLineItemPickStatusSchema = z.enum(orderLineItemPickStatusValues);
export const xeroSyncStatusSchema = z.enum(xeroSyncStatusValues);

export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;
export type OrderLineItemPickStatus = z.infer<typeof orderLineItemPickStatusSchema>;
export type XeroSyncStatus = z.infer<typeof xeroSyncStatusSchema>;

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
    source: z.enum(['web', 'phone', 'email', 'api', 'pos']).optional(),
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
  description: z.string().min(1, 'Description is required').max(500),
  quantity: quantitySchema,
  unitPrice: currencySchema,
  discountPercent: percentageSchema.optional(),
  discountAmount: currencySchema.optional(),
  taxType: taxTypeSchema.default('gst'),
  notes: z.string().max(500).optional(),
});

export type CreateOrderLineItem = z.infer<typeof createOrderLineItemSchema>;

export const orderLineItemSchema = createOrderLineItemSchema.extend({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  organizationId: z.string().uuid(),
  taxAmount: currencySchema,
  lineTotal: currencySchema,
  pickStatus: orderLineItemPickStatusSchema.default('not_picked'),
  pickedAt: z.coerce.date().nullable(),
  pickedBy: z.string().uuid().nullable(),
  qtyPicked: quantitySchema,
  qtyShipped: quantitySchema,
  qtyDelivered: quantitySchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type OrderLineItem = z.infer<typeof orderLineItemSchema>;

// ============================================================================
// CREATE ORDER
// ============================================================================

export const createOrderSchema = z.object({
  customerId: z.string().uuid('Customer is required'),
  orderNumber: z.string().min(1, 'Order number is required').max(50).optional(),
  status: orderStatusSchema.default('draft'),
  paymentStatus: paymentStatusSchema.default('pending'),
  orderDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  billingAddress: orderAddressSchema.optional(),
  shippingAddress: orderAddressSchema.optional(),
  discountPercent: percentageSchema.optional(),
  discountAmount: currencySchema.optional(),
  shippingAmount: currencySchema.default(0),
  metadata: orderMetadataSchema.default({}),
  internalNotes: z.string().max(2000).optional(),
  customerNotes: z.string().max(2000).optional(),
  lineItems: z.array(createOrderLineItemSchema).min(1, 'At least one line item required'),
});

export type CreateOrder = z.infer<typeof createOrderSchema>;

// ============================================================================
// UPDATE ORDER
// ============================================================================

export const updateOrderSchema = createOrderSchema.partial().omit({ lineItems: true });

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
  subtotal: currencySchema,
  discountAmount: currencySchema,
  discountPercent: percentageSchema.nullable(),
  taxAmount: currencySchema,
  shippingAmount: currencySchema,
  total: currencySchema,
  paidAmount: currencySchema,
  balanceDue: currencySchema,
  metadata: orderMetadataSchema,
  internalNotes: z.string().nullable(),
  customerNotes: z.string().nullable(),
  xeroInvoiceId: z.string().nullable(),
  xeroSyncStatus: xeroSyncStatusSchema.nullable(),
  xeroSyncError: z.string().nullable(),
  lastXeroSyncAt: z.string().datetime().nullable(),
  xeroInvoiceUrl: z.string().nullable(),
  version: z.number().int().positive(),
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
export const orderCursorQuerySchema = cursorPaginationSchema.merge(orderFilterSchema);

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
