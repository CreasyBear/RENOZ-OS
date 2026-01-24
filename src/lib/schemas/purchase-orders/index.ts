/**
 * Purchase Orders Zod Schemas
 *
 * Client-side validation schemas matching server function inputs.
 * SUPP-PO-MANAGEMENT story implementation.
 */

import { z } from 'zod';
import { currencySchema } from '../_shared/patterns';

// ============================================================================
// ENUMS
// ============================================================================

export const purchaseOrderStatusEnum = z.enum([
  'draft',
  'pending_approval',
  'approved',
  'ordered',
  'partial_received',
  'received',
  'closed',
  'cancelled',
]);

export type PurchaseOrderStatus = z.infer<typeof purchaseOrderStatusEnum>;

// ============================================================================
// FILTER STATE
// ============================================================================

export interface PurchaseOrderFiltersState {
  search: string;
  status: PurchaseOrderStatus[];
  supplierId: string | null;
  dateFrom: Date | null;
  dateTo: Date | null;
  valueMin: number | null;
  valueMax: number | null;
}

export const defaultPurchaseOrderFilters: PurchaseOrderFiltersState = {
  search: '',
  status: [],
  supplierId: null,
  dateFrom: null,
  dateTo: null,
  valueMin: null,
  valueMax: null,
};

// ============================================================================
// LIST SCHEMA
// ============================================================================

export const listPurchaseOrdersSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
  sortBy: z
    .enum(['poNumber', 'orderDate', 'requiredDate', 'totalAmount', 'status', 'createdAt'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().optional(),
  status: purchaseOrderStatusEnum.optional(),
  supplierId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type ListPurchaseOrdersInput = z.infer<typeof listPurchaseOrdersSchema>;

// ============================================================================
// TABLE DATA TYPES
// ============================================================================

export interface PurchaseOrderTableData {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string | null;
  status: PurchaseOrderStatus;
  totalAmount: number;
  currency: string;
  orderDate: string | null;
  requiredDate: string | null;
  expectedDeliveryDate: string | null;
  createdAt: string;
}

// ============================================================================
// CRUD SCHEMAS
// ============================================================================

export const createPurchaseOrderSchema = z.object({
  supplierId: z.string().uuid(),
  expectedDeliveryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(), // YYYY-MM-DD format
  paymentTerms: z.string().optional(),
  shippingMethod: z.string().optional(),
  deliveryAddress: z.string().optional(),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid().optional(),
        productName: z.string().min(1),
        productSku: z.string().optional(),
        quantity: z.number().int().positive(),
        unitPrice: currencySchema,
        notes: z.string().optional(),
      })
    )
    .min(1),
});

export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;

export const updatePurchaseOrderSchema = z.object({
  id: z.string().uuid(),
  expectedDeliveryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(), // YYYY-MM-DD format
  paymentTerms: z.string().optional(),
  shippingMethod: z.string().optional(),
  deliveryAddress: z.string().optional(),
  notes: z.string().optional(),
});

export type UpdatePurchaseOrderInput = z.infer<typeof updatePurchaseOrderSchema>;

// ============================================================================
// STATUS COUNTS
// ============================================================================

export interface PurchaseOrderStatusCounts {
  all: number;
  draft: number;
  pending_approval: number;
  approved: number;
  sent: number;
  partially_received: number;
  received: number;
  closed: number;
  cancelled: number;
}
