import { z } from 'zod';

export const inlineEditSchema = z.object({
  priority: z.enum(['normal', 'high', 'urgent']),
  orderNumber: z.string().min(1, 'Order number is required'),
  dueDate: z.date().optional(),
});

export type InlineEditFormData = z.infer<typeof inlineEditSchema>;
