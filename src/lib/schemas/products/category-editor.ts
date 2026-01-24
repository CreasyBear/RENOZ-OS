import { z } from 'zod';

// Validation schema
export const categorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  description: z.string().max(500, 'Description is too long').optional(),
  parentId: z.string().uuid().nullable().optional(),
  isActive: z.boolean(),
  inheritAttributes: z.boolean(),
  defaultWarrantyPolicyId: z.string().uuid().nullable().optional(),
  seoTitle: z.string().max(70, 'SEO title should be under 70 characters').optional(),
  seoDescription: z.string().max(160, 'SEO description should be under 160 characters').optional(),
});

export type CategoryFormData = z.infer<typeof categorySchema>;
