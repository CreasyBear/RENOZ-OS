import { z } from 'zod';

export const templateItemSchema = z.object({
  id: z.string().optional(),
  lineNumber: z.string().max(10),
  sortOrder: z.string().max(10).default('0'),
  productId: z.string().uuid().optional(),
  sku: z.string().max(50).optional(),
  description: z.string().min(1, 'Description is required').max(500),
  defaultQuantity: z.number().int().min(1).default(1),
  fixedUnitPrice: z.number().int().min(0).optional(),
  useCurrentPrice: z.boolean().default(true),
  discountPercent: z.number().min(0).max(100).optional(),
  discountAmount: z.number().int().min(0).optional(),
  taxType: z.enum(['gst', 'gst_free', 'input_taxed']).default('gst'),
  notes: z.string().max(500).optional(),
});

export const templateFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(1000).optional(),
  isActive: z.boolean().default(true),
  isGlobal: z.boolean().default(false),
  defaultCustomerId: z.string().uuid().optional().nullable(),
  category: z.string().max(100).optional(),
  tags: z.array(z.string().max(50)).optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  discountAmount: z.number().int().min(0).optional(),
  shippingAmount: z.number().int().min(0).optional(),
  paymentTermsDays: z.number().int().min(0).max(365).optional(),
  internalNotes: z.string().max(2000).optional(),
  customerNotes: z.string().max(2000).optional(),
  items: z.array(templateItemSchema).min(1, 'At least one item is required'),
});

export type TemplateFormData = z.infer<typeof templateFormSchema>;
