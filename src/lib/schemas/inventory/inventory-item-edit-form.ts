/**
 * Inventory Item Edit Form Schema
 *
 * Form validation for editing product details from inventory detail view.
 * Subset of UpdateProduct fields used by InventoryItemEditDialog.
 *
 * @see src/components/domain/inventory/inventory-item-edit-dialog.tsx
 */

import { z } from 'zod';
import { currencySchema } from '../_shared/patterns';

export const inventoryItemEditFormSchema = z.object({
  sku: z.string().min(1, 'SKU is required').max(100),
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(5000).optional(),
  barcode: z.string().max(50).optional(),
  basePrice: currencySchema.default(0),
  costPrice: currencySchema.optional(),
  weight: z
    .number()
    .nonnegative('Weight must be non-negative')
    .multipleOf(0.001, 'Weight supports up to 3 decimal places')
    .optional(),
  isActive: z.boolean().default(true),
  isSellable: z.boolean().default(true),
  trackInventory: z.boolean().default(true),
});

export type InventoryItemEditFormValues = z.infer<typeof inventoryItemEditFormSchema>;
