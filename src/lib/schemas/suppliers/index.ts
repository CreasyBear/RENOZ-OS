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
import { cursorPaginationSchema } from '@/lib/db/pagination';

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

/** Cursor pagination for list suppliers (uses createdAt + id for stable sort) */
export const listSuppliersCursorSchema = cursorPaginationSchema.merge(
  z.object({
    search: z.string().optional(),
    status: supplierStatusSchema.optional(),
    supplierType: supplierTypeSchema.optional(),
    ratingMin: z.number().min(0).max(5).optional(),
    ratingMax: z.number().min(0).max(5).optional(),
  })
);
export type ListSuppliersCursorInput = z.infer<typeof listSuppliersCursorSchema>;

export const getSupplierSchema = z.object({
  id: z.string().uuid(),
});

// Optional field helpers: accept '', undefined, or value; output undefined when empty
const optionalEmail = z
  .union([z.string().email(), z.literal(''), z.undefined()])
  .transform((v) => (v === '' || v === undefined ? undefined : v));
const optionalUrl = z
  .union([z.string().url(), z.literal(''), z.undefined()])
  .transform((v) => (v === '' || v === undefined ? undefined : v));
const optionalString = z
  .union([z.string(), z.literal(''), z.undefined()])
  .transform((v) => (v === '' || v === undefined ? undefined : v));

export const createSupplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required'),
  legalName: z.string().optional().or(z.literal('')).transform((v) => (v === '' ? undefined : v)),
  email: optionalEmail,
  phone: optionalString,
  website: optionalUrl,
  status: supplierStatusSchema.default('active'),
  supplierType: supplierTypeSchema.optional(),
  taxId: optionalString,
  registrationNumber: optionalString,
  primaryContactName: optionalString,
  primaryContactEmail: optionalEmail,
  primaryContactPhone: optionalString,
  billingAddress: addressSchema.optional(),
  shippingAddress: addressSchema.optional(),
  paymentTerms: paymentTermsSchema.optional(),
  currency: z.string().default('AUD'),
  leadTimeDays: z.number().int().min(0).optional(),
  minimumOrderValue: currencySchema.optional(),
  maximumOrderValue: currencySchema.optional(),
  tags: z.array(z.string()).optional(),
  notes: optionalString,
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

/** Valid sort fields for supplier list */
export type SupplierSortField = ListSuppliersInput['sortBy'];

/** Type guard for sort field validation (avoids `as SupplierSortField` assertions) */
export const SUPPLIER_SORT_FIELDS = [
  'name',
  'status',
  'overallRating',
  'createdAt',
  'lastOrderDate',
] as const satisfies readonly SupplierSortField[];

export function isSupplierSortField(f: string): f is SupplierSortField {
  return (SUPPLIER_SORT_FIELDS as readonly string[]).includes(f);
}
export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
export type UpdateSupplierRatingInput = z.infer<typeof updateSupplierRatingSchema>;

// ============================================================================
// TABLE / LIST TYPES (for DataTable columns and list views)
// ============================================================================

export interface SupplierTableItem {
  id: string;
  supplierCode: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  status: SupplierStatus;
  supplierType: SupplierType | null;
  overallRating: number | null;
  totalPurchaseOrders: number | null;
  leadTimeDays: number | null;
  lastOrderDate: string | null;
}

export interface ListSuppliersResult {
  items: SupplierTableItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

// ============================================================================
// FILTER STATE (for UI components)
// ============================================================================

export interface SupplierFiltersState {
  search: string;
  status: SupplierStatus | null;
  supplierType: SupplierType | null;
  ratingMin?: number;
  ratingMax?: number;
}

export const defaultSupplierFilters: SupplierFiltersState = {
  search: '',
  status: null,
  supplierType: null,
};

// ============================================================================
// FILTER BAR STATE (UI)
// ============================================================================

export interface SupplierFilterBarState extends Record<string, unknown> {
  search: string;
  status: SupplierStatus | null;
  supplierType: SupplierType | null;
  ratingRange: { min: number | null; max: number | null } | null;
}

// ============================================================================
// PRICING SCHEMAS
// ============================================================================

export const listPriceListsCursorSchema = cursorPaginationSchema.merge(
  z.object({
    search: z.string().optional(),
    supplierId: z.string().uuid().optional(),
    status: z.enum(['active', 'inactive', 'pending', 'expired']).optional(),
  })
);
export type ListPriceListsCursorInput = z.infer<typeof listPriceListsCursorSchema>;

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

export const listPriceAgreementsCursorSchema = cursorPaginationSchema.merge(
  z.object({
    search: z.string().optional(),
    supplierId: z.string().uuid().optional(),
    status: z.enum(['draft', 'pending', 'approved', 'rejected', 'expired', 'cancelled']).optional(),
  })
);
export type ListPriceAgreementsCursorInput = z.infer<typeof listPriceAgreementsCursorSchema>;

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
