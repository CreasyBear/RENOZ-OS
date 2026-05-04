import { z } from 'zod';
import {
  addressSchema,
  normalizeObjectInput,
  optionalEmailSchema,
  phoneSchema,
} from '../_shared/patterns';

export const serviceOwnerAddressSchema = addressSchema;
export type ServiceOwnerAddress = z.infer<typeof serviceOwnerAddressSchema>;

export const serviceOwnerSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  address: serviceOwnerAddressSchema.nullable(),
  notes: z.string().nullable(),
});

export type ServiceOwner = z.infer<typeof serviceOwnerSchema>;

export const serviceOwnerInputSchema = z.object({
  fullName: z.string().min(1).max(255),
  email: optionalEmailSchema,
  phone: phoneSchema,
  address: serviceOwnerAddressSchema.optional(),
  notes: z.string().max(2000).optional(),
});

export type ServiceOwnerInput = z.infer<typeof serviceOwnerInputSchema>;

export const getServiceOwnerSchema = normalizeObjectInput(
  z.object({
    id: z.string().uuid(),
  })
);

export type GetServiceOwnerInput = z.input<typeof getServiceOwnerSchema>;
