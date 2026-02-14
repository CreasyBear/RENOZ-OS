/**
 * Ship Order Form Schema
 *
 * Zod schema for ShipOrderDialog form (carrier details + optional address).
 * Address validation uses shipmentAddressSchema when any address field is filled.
 *
 * @see FORM-STANDARDS.md - TanStack Form with Zod
 * @see lib/schemas/orders/shipments.ts - shipmentAddressSchema
 */

import { z } from 'zod';
import { shipmentAddressSchema } from './shipments';

const DEFAULT_COUNTRY = 'AU';

export const shipOrderFormSchema = z
  .object({
    carrier: z.string().max(100).optional(),
    carrierService: z.string().max(100).optional(),
    trackingNumber: z.string().max(200).optional(),
    shippingCost: z
      .union([
        z.undefined(),
        z.literal(''),
        z.number().min(0, 'Shipping cost must be 0 or greater'),
      ])
      .optional(),
    notes: z.string().max(2000).optional(),
    shipNow: z.boolean(),
    addressName: z.string().optional(),
    addressStreet1: z.string().optional(),
    addressStreet2: z.string().optional(),
    addressCity: z.string().optional(),
    addressState: z.string().optional(),
    addressPostcode: z.string().optional(),
    addressCountry: z.string().optional(),
    addressPhone: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const hasAny =
      !!(
        data.addressStreet1?.trim() ||
        data.addressCity?.trim() ||
        data.addressState?.trim() ||
        data.addressPostcode?.trim()
      );
    if (!hasAny) return;

    const result = shipmentAddressSchema.safeParse({
      name: data.addressName?.trim() ?? '',
      street1: data.addressStreet1?.trim() ?? '',
      street2: data.addressStreet2?.trim() || undefined,
      city: data.addressCity?.trim() ?? '',
      state: data.addressState?.trim() ?? '',
      postcode: data.addressPostcode?.trim() ?? '',
      country: data.addressCountry?.trim() || DEFAULT_COUNTRY,
      phone: data.addressPhone?.trim() || undefined,
    });

    if (!result.success) {
      const err = result.error.flatten();
      const pathMap: Record<string, keyof typeof data> = {
        name: 'addressName',
        street1: 'addressStreet1',
        street2: 'addressStreet2',
        city: 'addressCity',
        state: 'addressState',
        postcode: 'addressPostcode',
        country: 'addressCountry',
        phone: 'addressPhone',
      };
      for (const [key, msgs] of Object.entries(err.fieldErrors)) {
        if (msgs?.[0]) {
          const formKey = pathMap[key] ?? key;
          ctx.addIssue({
            code: 'custom',
            path: [formKey],
            message: msgs[0],
          });
        }
      }
    }
  });

export type ShipOrderFormData = z.infer<typeof shipOrderFormSchema>;
