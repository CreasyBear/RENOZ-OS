/**
 * Create PO Form Schemas
 *
 * Form validation for creating purchase orders from alerts/recommendations.
 */
import { z } from 'zod'

export const createPOFromAlertFormSchema = z.object({
  supplierId: z.string().min(1, 'Select a supplier'),
  quantity: z.number().int().positive('Quantity must be at least 1'),
  unitPrice: z.number().positive('Price must be positive'),
  notes: z.string().optional(),
})

export type CreatePOFromAlertFormValues = z.infer<typeof createPOFromAlertFormSchema>
