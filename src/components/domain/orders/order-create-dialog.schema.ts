import { z } from 'zod';

export const createOrderSchema = z.object({
  customerId: z.string().uuid('Customer is required'),
  orderNumber: z.string().optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateOrderFormData = z.infer<typeof createOrderSchema>;
