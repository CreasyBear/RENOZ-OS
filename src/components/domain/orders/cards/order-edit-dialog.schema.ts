import { z } from 'zod';

const blankStringToUndefined = (value: unknown) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

export const editOrderSchema = z.object({
  customerId: z.string().uuid('Customer is required'),
  orderNumber: z.string().min(1, 'Order number is required'),
  dueDate: z.string().optional(),
  internalNotes: z.string().optional(),
  customerNotes: z.string().optional(),
  shippingAddress: z.object({
    street1: z.string().max(500).optional(),
    street2: z.string().max(500).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(50).optional(),
    postalCode: z.string().max(20).optional(),
    country: z.preprocess(blankStringToUndefined, z.string().min(2).max(2).optional()),
    contactName: z.string().max(255).optional(),
    contactPhone: z.string().max(20).optional(),
  }),
}).superRefine((value, ctx) => {
  const shipping = value.shippingAddress;
  const hasAnyShippingField = Object.values(shipping).some((field) => Boolean(field?.trim?.() ?? field));
  if (!hasAnyShippingField) {
    return;
  }

  if (!shipping.street1?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['shippingAddress', 'street1'],
      message: 'Street address required',
    });
  }
  if (!shipping.city?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['shippingAddress', 'city'],
      message: 'City required',
    });
  }
  if (!shipping.state?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['shippingAddress', 'state'],
      message: 'State required',
    });
  }
  if (!shipping.postalCode?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['shippingAddress', 'postalCode'],
      message: 'Postal code required',
    });
  }
  if (!shipping.country?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['shippingAddress', 'country'],
      message: 'Country required',
    });
  }
});

export type EditOrderFormData = z.infer<typeof editOrderSchema>;
