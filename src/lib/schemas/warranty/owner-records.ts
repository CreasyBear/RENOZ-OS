/**
 * Warranty Owner Record Schemas
 *
 * Owner-of-record data used by activated warranties without promoting the
 * owner into CRM customers.
 */
import { z } from 'zod';
import {
  addressSchema,
  normalizeObjectInput,
  optionalEmailSchema,
  phoneSchema,
} from '../_shared/patterns';

export const warrantyOwnerAddressSchema = addressSchema;
export type WarrantyOwnerAddress = z.infer<typeof warrantyOwnerAddressSchema>;

export const warrantyOwnerRecordSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  address: warrantyOwnerAddressSchema.nullable(),
  notes: z.string().nullable(),
});

export type WarrantyOwnerRecord = z.infer<typeof warrantyOwnerRecordSchema>;

export const warrantyOwnerRecordInputSchema = z.object({
  fullName: z.string().min(1).max(255),
  email: optionalEmailSchema,
  phone: phoneSchema,
  address: warrantyOwnerAddressSchema.optional(),
  notes: z.string().max(2000).optional(),
});

export type WarrantyOwnerRecordInput = z.infer<typeof warrantyOwnerRecordInputSchema>;

export const getWarrantyOwnerRecordSchema = normalizeObjectInput(
  z.object({
    id: z.string().uuid(),
  })
);

export type GetWarrantyOwnerRecordInput = z.input<typeof getWarrantyOwnerRecordSchema>;
