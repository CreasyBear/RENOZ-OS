/**
 * Order Amendments Validation Schemas
 *
 * Zod schemas for amendment operations.
 *
 * @see drizzle/schema/order-amendments.ts for database schema
 * @see _Initiation/_prd/2-domains/orders/orders.prd.json (ORD-AMENDMENTS-SCHEMA)
 */

import { z } from 'zod';
import { currencySchema, percentageSchema } from '../_shared/patterns';

// ============================================================================
// ENUMS
// ============================================================================

export const amendmentStatusValues = [
  'requested',
  'approved',
  'rejected',
  'applied',
  'cancelled',
] as const;

export const amendmentTypeValues = [
  'quantity_change',
  'item_add',
  'item_remove',
  'price_change',
  'discount_change',
  'shipping_change',
  'address_change',
  'date_change',
  'cancel_order',
  'other',
] as const;

export const amendmentStatusSchema = z.enum(amendmentStatusValues);
export const amendmentTypeSchema = z.enum(amendmentTypeValues);

export type AmendmentStatus = z.infer<typeof amendmentStatusSchema>;
export type AmendmentType = z.infer<typeof amendmentTypeSchema>;

// ============================================================================
// ITEM CHANGE SCHEMAS
// ============================================================================

export const itemChangeBeforeAfterSchema = z.object({
  quantity: z.number().int().min(0).optional(),
  unitPrice: currencySchema.optional(),
  description: z.string().max(500).optional(),
  discountPercent: percentageSchema.optional(),
  discountAmount: currencySchema.optional(),
});

export const itemChangeSchema = z.object({
  orderLineItemId: z.string().uuid().optional(), // For existing items
  productId: z.string().uuid().optional(), // For new items
  action: z.enum(['add', 'modify', 'remove']),
  before: itemChangeBeforeAfterSchema.optional(),
  after: itemChangeBeforeAfterSchema.optional(),
});

export type ItemChange = z.infer<typeof itemChangeSchema>;

// ============================================================================
// FINANCIAL IMPACT SCHEMA
// ============================================================================

export const financialImpactSchema = z.object({
  subtotalBefore: currencySchema,
  subtotalAfter: currencySchema,
  taxBefore: currencySchema,
  taxAfter: currencySchema,
  totalBefore: currencySchema,
  totalAfter: currencySchema,
  difference: currencySchema, // Can be negative
});

export type FinancialImpact = z.infer<typeof financialImpactSchema>;

// ============================================================================
// CHANGES SCHEMA
// ============================================================================

export const amendmentChangesSchema = z.object({
  type: z.string().max(50),
  description: z.string().max(1000),
  before: z.record(z.string(), z.unknown()).optional(),
  after: z.record(z.string(), z.unknown()).optional(),
  itemChanges: z.array(itemChangeSchema).optional(),
  financialImpact: financialImpactSchema.optional(),
});

export type AmendmentChanges = z.infer<typeof amendmentChangesSchema>;

// ============================================================================
// APPROVAL NOTES SCHEMA
// ============================================================================

export const approvalNotesSchema = z.object({
  note: z.string().max(2000).optional(),
  conditions: z.array(z.string().max(500)).optional(),
  internalOnly: z.boolean().optional(),
});

export type ApprovalNotes = z.infer<typeof approvalNotesSchema>;

// ============================================================================
// REQUEST AMENDMENT SCHEMA
// ============================================================================

export const requestAmendmentSchema = z.object({
  orderId: z.string().uuid(),
  amendmentType: amendmentTypeSchema,
  reason: z.string().min(1, 'Reason is required').max(2000),
  changes: amendmentChangesSchema,
});

export type RequestAmendment = z.infer<typeof requestAmendmentSchema>;

// ============================================================================
// APPROVE/REJECT SCHEMAS
// ============================================================================

export const approveAmendmentSchema = z.object({
  amendmentId: z.string().uuid(),
  notes: approvalNotesSchema.optional(),
});

export type ApproveAmendment = z.infer<typeof approveAmendmentSchema>;

export const rejectAmendmentSchema = z.object({
  amendmentId: z.string().uuid(),
  reason: z.string().min(1, 'Rejection reason is required').max(2000),
});

export type RejectAmendment = z.infer<typeof rejectAmendmentSchema>;

// ============================================================================
// APPLY AMENDMENT SCHEMA
// ============================================================================

export const applyAmendmentSchema = z.object({
  amendmentId: z.string().uuid(),
  forceApply: z.boolean().default(false), // Skip version check
});

export type ApplyAmendment = z.infer<typeof applyAmendmentSchema>;

// ============================================================================
// CANCEL AMENDMENT SCHEMA
// ============================================================================

export const cancelAmendmentSchema = z.object({
  amendmentId: z.string().uuid(),
  reason: z.string().max(500).optional(),
});

export type CancelAmendment = z.infer<typeof cancelAmendmentSchema>;

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

export const amendmentParamsSchema = z.object({
  id: z.string().uuid(),
});

export const amendmentListQuerySchema = z.object({
  orderId: z.string().uuid().optional(),
  status: amendmentStatusSchema.optional(),
  amendmentType: amendmentTypeSchema.optional(),
  requestedBy: z.string().uuid().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['requestedAt', 'reviewedAt', 'appliedAt']).default('requestedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type AmendmentListQuery = z.infer<typeof amendmentListQuerySchema>;

// ============================================================================
// OUTPUT SCHEMA
// ============================================================================

export const amendmentSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  orderId: z.string().uuid(),
  amendmentType: amendmentTypeSchema,
  reason: z.string(),
  changes: amendmentChangesSchema,
  status: amendmentStatusSchema,
  requestedAt: z.coerce.date(),
  requestedBy: z.string().uuid(),
  reviewedAt: z.coerce.date().nullable(),
  reviewedBy: z.string().uuid().nullable(),
  approvalNotes: approvalNotesSchema.nullable(),
  appliedAt: z.coerce.date().nullable(),
  appliedBy: z.string().uuid().nullable(),
  orderVersionBefore: z.number().int().nullable(),
  orderVersionAfter: z.number().int().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  deletedAt: z.coerce.date().nullable(),
});

export type Amendment = z.infer<typeof amendmentSchema>;
