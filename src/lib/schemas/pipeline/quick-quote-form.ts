/**
 * Quick Quote Form Schema
 *
 * Validation schema for the quick quote creation form.
 */
import { z } from 'zod';

const lineItemSchema = z.object({
  productId: z.string().uuid(),
  productName: z.string(),
  productSku: z.string(),
  unitPrice: z.number().min(0),
  quantity: z.number().int().min(1),
  discount: z.number().min(0).max(100),
});

export const quickQuoteFormSchema = z.object({
  customerId: z.string().min(1, 'Please select a customer'),
  lineItems: z.array(lineItemSchema).min(1, 'Please add at least one product'),
  validityDays: z.number().int().min(1).max(365),
  notes: z.string().optional(),
});

export type QuickQuoteFormValues = z.infer<typeof quickQuoteFormSchema>;
export type QuickQuoteLineItem = z.infer<typeof lineItemSchema>;
