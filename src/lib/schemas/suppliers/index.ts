/**
 * Supplier Domain Zod Schemas
 *
 * Client-side validation schemas matching server function inputs.
 * These are the canonical schemas for the supplier domain.
 *
 * @see src/server/functions/suppliers/suppliers.ts
 */

import { z } from 'zod';
import { currencySchema } from '../_shared/patterns';

// ============================================================================
// ENUMS
// ============================================================================

export const supplierStatusSchema = z.enum(['active', 'inactive', 'suspended', 'blacklisted']);

export const supplierTypeSchema = z.enum([
  'manufacturer',
  'distributor',
  'retailer',
  'service',
  'raw_materials',
]);

export const paymentTermsSchema = z.enum([
  'net_15',
  'net_30',
  'net_45',
  'net_60',
  'cod',
  'prepaid',
]);

export type SupplierStatus = z.infer<typeof supplierStatusSchema>;
export type SupplierType = z.infer<typeof supplierTypeSchema>;
export type PaymentTerms = z.infer<typeof paymentTermsSchema>;

// ============================================================================
// ADDRESS SCHEMA
// ============================================================================

export const addressSchema = z.object({
  street1: z.string(),
  street2: z.string().optional(),
  city: z.string(),
  state: z.string().optional(),
  postcode: z.string(),
  country: z.string(),
});

export type Address = z.infer<typeof addressSchema>;

// ============================================================================
// SUPPLIER CRUD SCHEMAS
// ============================================================================

export const listSuppliersSchema = z.object({
  search: z.string().optional(),
  status: supplierStatusSchema.optional(),
  supplierType: supplierTypeSchema.optional(),
  ratingMin: z.number().min(0).max(5).optional(),
  ratingMax: z.number().min(0).max(5).optional(),
  sortBy: z.enum(['name', 'status', 'overallRating', 'createdAt', 'lastOrderDate']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export const getSupplierSchema = z.object({
  id: z.string().uuid(),
});

export const createSupplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required'),
  legalName: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().optional(),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  status: supplierStatusSchema.default('active'),
  supplierType: supplierTypeSchema.optional(),
  taxId: z.string().optional(),
  registrationNumber: z.string().optional(),
  primaryContactName: z.string().optional(),
  primaryContactEmail: z.string().email().optional().or(z.literal('')),
  primaryContactPhone: z.string().optional(),
  billingAddress: addressSchema.optional(),
  shippingAddress: addressSchema.optional(),
  paymentTerms: paymentTermsSchema.optional(),
  currency: z.string().default('AUD'),
  leadTimeDays: z.number().int().min(0).optional(),
  minimumOrderValue: currencySchema.optional(),
  maximumOrderValue: currencySchema.optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export const updateSupplierSchema = createSupplierSchema.partial();

export const updateSupplierRatingSchema = z.object({
  id: z.string().uuid(),
  qualityRating: z.number().min(0).max(5),
  deliveryRating: z.number().min(0).max(5),
  communicationRating: z.number().min(0).max(5),
  notes: z.string().optional(),
});

// ============================================================================
// INFERRED TYPES
// ============================================================================

export type ListSuppliersInput = z.infer<typeof listSuppliersSchema>;
export type GetSupplierInput = z.infer<typeof getSupplierSchema>;
export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
export type UpdateSupplierRatingInput = z.infer<typeof updateSupplierRatingSchema>;

// ============================================================================
// FILTER STATE (for UI components)
// ============================================================================

export interface SupplierFiltersState {
  search: string;
  status: SupplierStatus[];
  supplierType: SupplierType[];
  ratingMin?: number;
  ratingMax?: number;
}

export const defaultSupplierFilters: SupplierFiltersState = {
  search: '',
  status: [],
  supplierType: [],
};
