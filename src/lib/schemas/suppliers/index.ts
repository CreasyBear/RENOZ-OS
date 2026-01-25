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
// SUPPLIER ADDRESS SCHEMA (domain-specific, simpler than shared Address)
// ============================================================================

export const supplierAddressSchema = z.object({
  street1: z.string(),
  street2: z.string().optional(),
  city: z.string(),
  state: z.string().optional(),
  postcode: z.string(),
  country: z.string(),
});

// Alias for backward compatibility with createSupplierSchema
const addressSchema = supplierAddressSchema;

export type SupplierAddress = z.infer<typeof supplierAddressSchema>;

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

// ============================================================================
// PRICING SCHEMAS
// ============================================================================

export const listPriceListsSchema = z.object({
  search: z.string().optional(),
  supplierId: z.string().uuid().optional(),
  status: z.enum(['active', 'inactive', 'pending', 'expired']).optional(),
  sortBy: z.enum(['productName', 'unitPrice', 'basePrice', 'effectivePrice', 'effectiveDate', 'expiryDate']).default('productName'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export const discountTypeSchema = z.enum(['none', 'percentage', 'fixed', 'volume']);

export const createPriceListSchema = z.object({
  supplierId: z.string().uuid(),
  productId: z.string().uuid().optional(),
  productSku: z.string().optional(),
  productName: z.string(),
  basePrice: z.number().min(0),
  unitPrice: z.number().min(0).optional(), // Alias for basePrice
  currency: z.string().default('AUD'),
  discountType: discountTypeSchema.default('none'),
  discountValue: z.number().min(0).default(0),
  unitOfMeasure: z.string().optional(),
  minimumOrderQty: z.number().int().min(1).optional(),
  minOrderQty: z.number().int().min(1).optional(), // Alias
  maxOrderQty: z.number().int().min(1).optional(),
  leadTimeDays: z.number().int().min(0).optional(),
  effectiveDate: z.string().optional(),
  expiryDate: z.string().optional(),
  notes: z.string().optional(),
});

export const updatePriceListSchema = createPriceListSchema.partial().extend({
  id: z.string().uuid(),
  status: z.enum(['active', 'inactive', 'pending']).optional(),
});

export const listPriceAgreementsSchema = z.object({
  search: z.string().optional(),
  supplierId: z.string().uuid().optional(),
  status: z.enum(['draft', 'pending', 'approved', 'rejected', 'expired', 'cancelled']).optional(),
  sortBy: z.enum(['title', 'effectiveDate', 'status', 'createdAt']).default('title'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export const createPriceAgreementSchema = z.object({
  supplierId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  effectiveDate: z.string(),
  expiryDate: z.string().optional(),
  notes: z.string().optional(),
});

export const updatePriceAgreementSchema = createPriceAgreementSchema.partial().extend({
  id: z.string().uuid(),
  status: z.enum(['draft', 'pending', 'approved', 'rejected', 'expired', 'cancelled']).optional(),
});

// Inferred types for pricing
export type ListPriceListsInput = z.infer<typeof listPriceListsSchema>;
export type CreatePriceListInput = z.infer<typeof createPriceListSchema>;
export type UpdatePriceListInput = z.infer<typeof updatePriceListSchema>;
export type ListPriceAgreementsInput = z.infer<typeof listPriceAgreementsSchema>;
export type CreatePriceAgreementInput = z.infer<typeof createPriceAgreementSchema>;
export type UpdatePriceAgreementInput = z.infer<typeof updatePriceAgreementSchema>;
