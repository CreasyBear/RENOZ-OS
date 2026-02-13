/**
 * Payment Plans Search Schemas
 *
 * Zod schemas for payment plans route search state.
 */
import { z } from 'zod';

export const paymentPlansSearchSchema = z.object({
  orderId: z.string().optional(),
  orderTotal: z.coerce.number().optional(),
});

export type PaymentPlansSearch = z.infer<typeof paymentPlansSearchSchema>;
