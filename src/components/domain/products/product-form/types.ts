/**
 * Product Form Types
 *
 * Shared types for the product form components.
 */
import { z } from 'zod';
import type { Control, FieldErrors, UseFormHandleSubmit, UseFormWatch } from 'react-hook-form';

// Form validation schema
export const productFormSchema = z.object({
  // Basic info
  sku: z.string().min(1, 'SKU is required').max(100),
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().optional(),
  type: z.enum(['physical', 'service', 'digital', 'bundle']).default('physical'),
  status: z.enum(['active', 'inactive', 'discontinued']).default('active'),
  categoryId: z.string().uuid().optional().nullable(),

  // Pricing
  basePrice: z.coerce.number().min(0, 'Price must be positive'),
  costPrice: z.coerce.number().min(0).optional().nullable(),

  // Settings
  trackInventory: z.boolean().default(true),
  isSerialized: z.boolean().default(false),
  isSellable: z.boolean().default(true),
  isPurchasable: z.boolean().default(true),

  // Physical attributes
  weight: z.coerce.number().min(0).optional().nullable(),
  dimensions: z
    .object({
      length: z.coerce.number().min(0).optional(),
      width: z.coerce.number().min(0).optional(),
      height: z.coerce.number().min(0).optional(),
    })
    .optional()
    .nullable(),

  // SEO
  seoTitle: z.string().max(255).optional().nullable(),
  seoDescription: z.string().optional().nullable(),

  // Other
  barcode: z.string().max(100).optional().nullable(),
  tags: z.array(z.string()).default([]),
  specifications: z.record(z.string(), z.unknown()).optional().nullable(),

  // Inventory settings
  reorderPoint: z.coerce.number().min(0).default(0),
  reorderQty: z.coerce.number().min(0).default(0),

  // Warranty
  warrantyPolicyId: z.string().uuid().optional().nullable(),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;

export interface Category {
  id: string;
  name: string;
  parentId: string | null;
  children?: Category[];
}

export interface ProductFormProps {
  categories?: Category[];
  onCancel: () => void;
  isEdit?: boolean;
  form: {
    control: Control<ProductFormValues>;
    errors: FieldErrors<ProductFormValues>;
    watch: UseFormWatch<ProductFormValues>;
    handleSubmit: UseFormHandleSubmit<ProductFormValues>;
    onFormSubmit: (data: ProductFormValues) => Promise<void>;
    isDirty: boolean;
    isSubmitting: boolean;
  };
}

// Section prop types
export interface BasicInfoSectionProps {
  control: Control<ProductFormValues>;
  errors: FieldErrors<ProductFormValues>;
  categories?: Category[];
}

export interface PricingSectionProps {
  control: Control<ProductFormValues>;
  errors: FieldErrors<ProductFormValues>;
  watch: UseFormWatch<ProductFormValues>;
}

export interface SettingsSectionProps {
  control: Control<ProductFormValues>;
  watch: UseFormWatch<ProductFormValues>;
}

export interface SpecificationsSectionProps {
  control: Control<ProductFormValues>;
  watch: UseFormWatch<ProductFormValues>;
}

export interface SEOSectionProps {
  control: Control<ProductFormValues>;
}
