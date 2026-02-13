import { z } from 'zod';

export const editOrderSchema = z.object({
  customerId: z.string().uuid('Customer is required'),
  orderNumber: z.string().min(1, 'Order number is required'),
  status: z.enum(['draft', 'confirmed', 'picking', 'picked', 'partially_shipped', 'shipped', 'delivered', 'cancelled']),
  dueDate: z.string().optional(),
  internalNotes: z.string().optional(),
  customerNotes: z.string().optional(),
});

export type EditOrderFormData = z.infer<typeof editOrderSchema>;
