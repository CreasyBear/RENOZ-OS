import { z } from 'zod';

/**
 * Minimal schema for deprecated OrderCreateDialog.
 * Canonical order creation schema: @/lib/schemas/orders/orders.ts createOrderSchema
 *
 * @deprecated OrderCreateDialog is unused. This schema exists only for that component.
 */
export const createOrderSchema = z.object({
  customerId: z.string().uuid('Customer is required'),
  orderNumber: z.string().optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateOrderFormData = z.infer<typeof createOrderSchema>;
