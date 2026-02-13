/**
 * Picking Validation Schemas
 *
 * Zod schemas for order picking operations.
 *
 * @see drizzle/schema/orders/orders.ts for database schema
 */

import { z } from 'zod';

// ============================================================================
// PICK LINE ITEM SCHEMA
// ============================================================================

export const pickLineItemSchema = z.object({
  lineItemId: z.string().uuid('Valid line item ID is required'),
  qtyPicked: z.coerce.number().int().min(1, 'Must pick at least 1'),
  serialNumbers: z.array(z.string().trim().min(1)).optional(),
});

export type PickLineItem = z.infer<typeof pickLineItemSchema>;

// ============================================================================
// PICK ORDER ITEMS SCHEMA
// ============================================================================

export const pickOrderItemsSchema = z.object({
  orderId: z.string().uuid('Valid order ID is required'),
  items: z
    .array(pickLineItemSchema)
    .min(1, 'At least one item is required'),
});

export type PickOrderItems = z.infer<typeof pickOrderItemsSchema>;
