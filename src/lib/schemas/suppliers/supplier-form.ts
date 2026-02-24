/**
 * Supplier Form Schema
 *
 * Form validation schema for supplier create/edit.
 * Maps to createSupplierSchema for API submission.
 */
import { z } from 'zod';
import {
  supplierStatusSchema,
  supplierTypeSchema,
  paymentTermsSchema,
} from './index';

export const supplierFormSchema = z.object({
  name: z.string().min(1, 'Supplier name is required'),
  legalName: z.string().default(''),
  email: z.string().default(''),
  phone: z.string().default(''),
  website: z.string().default(''),
  status: supplierStatusSchema.default('active'),
  supplierType: supplierTypeSchema.optional().nullable(),
  taxId: z.string().default(''),
  registrationNumber: z.string().default(''),
  primaryContactName: z.string().default(''),
  primaryContactEmail: z.string().default(''),
  primaryContactPhone: z.string().default(''),
  paymentTerms: paymentTermsSchema.optional().nullable(),
  currency: z.string().default('AUD'),
  leadTimeDays: z
    .union([z.literal(''), z.coerce.number().int().min(0)])
    .transform((v) => (v === '' || Number.isNaN(v as number) ? undefined : (v as number)))
    .optional(),
  minimumOrderValue: z
    .union([z.literal(''), z.coerce.number().min(0)])
    .transform((v) => (v === '' || Number.isNaN(v as number) ? undefined : (v as number)))
    .optional(),
  maximumOrderValue: z
    .union([z.literal(''), z.coerce.number().min(0)])
    .transform((v) => (v === '' || Number.isNaN(v as number) ? undefined : (v as number)))
    .optional(),
  notes: z.string().default(''),
}).refine(
  (data) => {
    if (!data.email) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email);
  },
  { message: 'Invalid email address', path: ['email'] }
).refine(
  (data) => {
    if (!data.website) return true;
    try {
      new URL(data.website);
      return true;
    } catch {
      return false;
    }
  },
  { message: 'Invalid URL', path: ['website'] }
).refine(
  (data) => {
    if (!data.primaryContactEmail) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.primaryContactEmail);
  },
  { message: 'Invalid email address', path: ['primaryContactEmail'] }
);

export type SupplierFormValues = z.infer<typeof supplierFormSchema>;
