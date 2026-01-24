/**
 * Pricing Domain Schemas
 *
 * Zod schemas for supplier pricing UI components.
 * Aligns with server functions in src/server/functions/suppliers/pricing.ts.
 *
 * @see SUPP-PRICING-MANAGEMENT story
 */

import { z } from 'zod';

// ============================================================================
// PRICE LIST ENUMS & CONSTANTS
// ============================================================================

export const priceListStatuses = ['active', 'expired', 'draft'] as const;
export type PriceListStatus = (typeof priceListStatuses)[number];

export const discountTypes = ['percent', 'fixed'] as const;
export type DiscountType = (typeof discountTypes)[number];

export const priceListStatusLabels: Record<PriceListStatus, string> = {
  active: 'Active',
  expired: 'Expired',
  draft: 'Draft',
};

export const discountTypeLabels: Record<DiscountType, string> = {
  percent: 'Percentage',
  fixed: 'Fixed Amount',
};

// ============================================================================
// PRICE AGREEMENT ENUMS & CONSTANTS
// ============================================================================

export const priceAgreementStatuses = [
  'draft',
  'pending',
  'approved',
  'rejected',
  'expired',
  'cancelled',
] as const;
export type PriceAgreementStatus = (typeof priceAgreementStatuses)[number];

export const priceAgreementStatusLabels: Record<PriceAgreementStatus, string> = {
  draft: 'Draft',
  pending: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  expired: 'Expired',
  cancelled: 'Cancelled',
};

// ============================================================================
// PRICE LIST SCHEMAS
// ============================================================================

export const PriceListSchema = z.object({
  id: z.string().uuid(),
  supplierId: z.string().uuid(),
  supplierName: z.string().nullable(),
  productId: z.string().uuid(),
  productName: z.string().nullable(),
  productSku: z.string().nullable(),
  price: z.number().nonnegative(),
  basePrice: z.number().nonnegative().nullable(),
  effectivePrice: z.number().nonnegative().nullable(),
  currency: z.string(),
  status: z.enum(priceListStatuses),
  minQuantity: z.number().int().min(1),
  maxQuantity: z.number().int().min(1).nullable(),
  discountPercent: z.number().min(0).max(100).nullable(),
  discountType: z.enum(discountTypes).nullable(),
  discountValue: z.number().nonnegative().nullable(),
  effectiveDate: z.string(),
  expiryDate: z.string().nullable(),
  isPreferredPrice: z.boolean(),
  leadTimeDays: z.number().int().min(0).nullable(),
  createdAt: z.string(),
  updatedAt: z.string().nullable(),
});

export type PriceList = z.infer<typeof PriceListSchema>;

export const CreatePriceListInputSchema = z.object({
  supplierId: z.string().uuid(),
  productId: z.string().uuid(),
  price: z.number().nonnegative(),
  basePrice: z.number().nonnegative().optional(),
  currency: z.string().default('AUD'),
  minQuantity: z.number().int().min(1).default(1),
  maxQuantity: z.number().int().min(1).optional(),
  minOrderQty: z.number().int().min(1).optional(),
  maxOrderQty: z.number().int().optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  discountType: z.enum(discountTypes).optional(),
  discountValue: z.number().nonnegative().optional(),
  effectiveDate: z.string().optional(),
  expiryDate: z.string().optional(),
  isPreferredPrice: z.boolean().default(false),
  supplierProductCode: z.string().optional(),
  supplierProductName: z.string().optional(),
  leadTimeDays: z.number().int().min(0).optional(),
  notes: z.string().optional(),
});

export type CreatePriceListInput = z.infer<typeof CreatePriceListInputSchema>;

export const UpdatePriceListInputSchema = CreatePriceListInputSchema.partial().extend({
  id: z.string().uuid(),
});

export type UpdatePriceListInput = z.infer<typeof UpdatePriceListInputSchema>;

// ============================================================================
// PRICE AGREEMENT SCHEMAS
// ============================================================================

export const PriceAgreementSchema = z.object({
  id: z.string().uuid(),
  supplierId: z.string().uuid(),
  supplierName: z.string().nullable(),
  agreementNumber: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  effectiveDate: z.string(),
  expiryDate: z.string().nullable(),
  status: z.enum(priceAgreementStatuses),
  currency: z.string(),
  discountPercent: z.number().nullable(),
  minimumOrderValue: z.number().nullable(),
  totalItems: z.number().int(),
  createdBy: z.string().uuid(),
  approvedBy: z.string().uuid().nullable(),
  approvedAt: z.string().nullable(),
  rejectedBy: z.string().uuid().nullable(),
  rejectedAt: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string().nullable(),
});

export type PriceAgreement = z.infer<typeof PriceAgreementSchema>;

export const CreatePriceAgreementInputSchema = z.object({
  supplierId: z.string().uuid(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  effectiveDate: z.string(),
  expiryDate: z.string().optional(),
  currency: z.string().default('AUD'),
  discountPercent: z.number().min(0).max(100).optional(),
  minimumOrderValue: z.number().nonnegative().optional(),
  notes: z.string().optional(),
});

export type CreatePriceAgreementInput = z.infer<typeof CreatePriceAgreementInputSchema>;

export const UpdatePriceAgreementInputSchema = CreatePriceAgreementInputSchema.partial().extend({
  id: z.string().uuid(),
});

export type UpdatePriceAgreementInput = z.infer<typeof UpdatePriceAgreementInputSchema>;

// ============================================================================
// PRICE COMPARISON TYPES
// ============================================================================

/**
 * Item for price comparison across suppliers.
 * Shows the same product from different suppliers side-by-side.
 */
export interface PriceComparisonItem {
  productId: string;
  productName: string;
  productSku: string | null;
  suppliers: Array<{
    supplierId: string;
    supplierName: string;
    price: number;
    effectivePrice: number;
    currency: string;
    minQuantity: number;
    maxQuantity: number | null;
    discountPercent: number | null;
    leadTimeDays: number | null;
    isPreferred: boolean;
    effectiveDate: string;
    expiryDate: string | null;
  }>;
  lowestPrice: number;
  preferredSupplierId: string | null;
}

/**
 * Summary row for price list table display.
 */
export interface PriceListRow {
  id: string;
  supplierId: string;
  supplierName: string;
  productId: string;
  productName: string;
  productSku: string | null;
  price: number;
  effectivePrice: number;
  currency: string;
  status: PriceListStatus;
  minQuantity: number;
  maxQuantity: number | null;
  discountPercent: number | null;
  effectiveDate: string;
  expiryDate: string | null;
  isPreferredPrice: boolean;
  leadTimeDays: number | null;
}

/**
 * Summary row for price agreement table display.
 */
export interface PriceAgreementRow {
  id: string;
  agreementNumber: string;
  title: string;
  supplierId: string;
  supplierName: string;
  status: PriceAgreementStatus;
  effectiveDate: string;
  expiryDate: string | null;
  discountPercent: number | null;
  totalItems: number;
  currency: string;
}

// ============================================================================
// FILTER SCHEMAS
// ============================================================================

export const PriceListFiltersSchema = z.object({
  supplierId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  status: z.enum(priceListStatuses).optional(),
  isPreferred: z.boolean().optional(),
  search: z.string().optional(),
  sortBy: z
    .enum(['price', 'supplierName', 'productName', 'effectiveDate', 'createdAt'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export type PriceListFilters = z.infer<typeof PriceListFiltersSchema>;

export const PriceAgreementFiltersSchema = z.object({
  supplierId: z.string().uuid().optional(),
  status: z.enum(priceAgreementStatuses).optional(),
  search: z.string().optional(),
  sortBy: z
    .enum(['agreementNumber', 'title', 'supplierName', 'effectiveDate', 'status', 'createdAt'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export type PriceAgreementFilters = z.infer<typeof PriceAgreementFiltersSchema>;
