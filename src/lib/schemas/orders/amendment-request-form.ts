/**
 * Amendment Request Form Schema
 *
 * Zod schema for the amendment request dialog form.
 * Validates amendment type, reason, line items, shipping, and discount fields.
 *
 * @see docs/design-system/FORM-STANDARDS.md
 * @see src/components/domain/orders/amendments/amendment-request-dialog.tsx
 */

import { z } from 'zod';
import { amendmentTypeSchema } from './order-amendments';

// Optional numeric field: user can leave empty (undefined), or enter a number
const optionalNumberOrEmpty = z.union([z.number(), z.undefined()]);

export const amendmentFormLineItemSchema = z.object({
  id: z.string(),
  productId: z.string().uuid().nullable(),
  description: z.string(),
  sku: z.string().nullable(),
  originalQty: z.number().int().min(0),
  originalPrice: z.number().min(0),
  newQty: z.number().int().min(0),
  newPrice: z.number().min(0),
  qtyPicked: z.number().int().min(0),
  action: z.enum(['keep', 'modify', 'remove', 'add']),
});

export type AmendmentFormLineItem = z.infer<typeof amendmentFormLineItemSchema>;

export const amendmentRequestFormSchema = z
  .object({
    amendmentType: amendmentTypeSchema,
    reason: z.string().min(1, 'Reason is required').max(2000),
    lineItems: z.array(amendmentFormLineItemSchema),
    newShippingAmount: optionalNumberOrEmpty.optional(),
    newDiscountPercent: optionalNumberOrEmpty.optional(),
    newDiscountAmount: optionalNumberOrEmpty.optional(),
  })
  .superRefine((data, ctx) => {
    // Type-specific validation
    if (data.amendmentType === 'shipping_change') {
      const val = data.newShippingAmount;
      if (val === undefined || (typeof val === 'number' && isNaN(val))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please enter a valid shipping amount',
          path: ['newShippingAmount'],
        });
      }
    } else if (data.amendmentType === 'discount_change') {
      const pct = data.newDiscountPercent;
      const amt = data.newDiscountAmount;
      const hasPct = pct !== undefined && typeof pct === 'number' && !isNaN(pct);
      const hasAmt = amt !== undefined && typeof amt === 'number' && !isNaN(amt);
      if (!hasPct && !hasAmt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please enter a discount percentage or amount',
          path: ['newDiscountPercent'],
        });
      }
    } else {
      // quantity_change, price_change, item_add, item_remove
      const hasChanges = data.lineItems.some(
        (item) =>
          item.action === 'modify' ||
          item.action === 'remove' ||
          item.action === 'add' ||
          (item.action === 'keep' &&
            (item.newQty !== item.originalQty || item.newPrice !== item.originalPrice))
      );
      if (!hasChanges) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'No changes to submit',
          path: ['lineItems'],
        });
      }
      // Unpick guard: newQty < qtyPicked blocks amendment
      for (let i = 0; i < data.lineItems.length; i++) {
        const item = data.lineItems[i];
        if (
          (item.action === 'modify' || item.action === 'remove') &&
          item.qtyPicked > item.newQty
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Unpick ${item.qtyPicked - item.newQty} unit(s) before applying`,
            path: ['lineItems', i, 'newQty'],
          });
        }
      }
    }
  });

export type AmendmentRequestFormData = z.infer<typeof amendmentRequestFormSchema>;
