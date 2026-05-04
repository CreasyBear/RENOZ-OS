import { z } from 'zod';
import { orderAddressSchema } from '@/lib/schemas/orders/orders';

const blankStringToUndefined = (value: unknown) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

const trimToUndefined = (value?: string) => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
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

export function normalizeEditOrderShippingAddress(
  address: EditOrderFormData['shippingAddress']
) {
  const normalized = {
    street1: trimToUndefined(address.street1),
    street2: trimToUndefined(address.street2),
    city: trimToUndefined(address.city),
    state: trimToUndefined(address.state),
    postalCode: trimToUndefined(address.postalCode),
    country: trimToUndefined(address.country)?.toUpperCase(),
    contactName: trimToUndefined(address.contactName),
    contactPhone: trimToUndefined(address.contactPhone),
  };

  if (!Object.values(normalized).some(Boolean)) {
    return null;
  }

  return orderAddressSchema.parse({
    street1: normalized.street1 ?? '',
    city: normalized.city ?? '',
    state: normalized.state ?? '',
    postalCode: normalized.postalCode ?? '',
    country: normalized.country ?? 'AU',
    ...(normalized.street2 ? { street2: normalized.street2 } : {}),
    ...(normalized.contactName ? { contactName: normalized.contactName } : {}),
    ...(normalized.contactPhone ? { contactPhone: normalized.contactPhone } : {}),
  });
}
