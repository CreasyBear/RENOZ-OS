/**
 * RMA (Return Merchandise Authorization) Validation Schemas
 *
 * Zod schemas for RMA CRUD operations.
 *
 * @see drizzle/schema/support/return-authorizations.ts
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-003a
 */

import { z } from 'zod';

// ============================================================================
// ENUMS
// ============================================================================

export const rmaStatusSchema = z.enum([
  'requested',
  'approved',
  'received',
  'processed',
  'rejected',
]);
export type RmaStatus = z.infer<typeof rmaStatusSchema>;

export const rmaReasonSchema = z.enum([
  'defective',
  'damaged_in_shipping',
  'wrong_item',
  'not_as_described',
  'performance_issue',
  'installation_failure',
  'other',
]);
export type RmaReason = z.infer<typeof rmaReasonSchema>;

export const rmaResolutionSchema = z.enum([
  'refund',
  'replacement',
  'repair',
  'credit',
  'no_action',
]);
export type RmaResolution = z.infer<typeof rmaResolutionSchema>;

// ============================================================================
// NESTED SCHEMAS
// ============================================================================

export const rmaInspectionNotesSchema = z.object({
  inspectedAt: z.string().datetime().optional(),
  inspectedBy: z.string().uuid().optional(),
  condition: z.enum(['good', 'damaged', 'defective', 'missing_parts']).optional(),
  notes: z.string().max(2000).optional(),
  photos: z.array(z.string().uuid()).optional(),
});
export type RmaInspectionNotes = z.infer<typeof rmaInspectionNotesSchema>;

export const rmaResolutionDetailsSchema = z.object({
  resolvedAt: z.string().datetime().optional(),
  resolvedBy: z.string().uuid().optional(),
  refundAmount: z.number().min(0).optional(),
  replacementOrderId: z.string().uuid().optional(),
  creditNoteId: z.string().uuid().optional(),
  notes: z.string().max(2000).optional(),
});
export type RmaResolutionDetails = z.infer<typeof rmaResolutionDetailsSchema>;

// ============================================================================
// RMA LINE ITEM SCHEMAS
// ============================================================================

export const createRmaLineItemSchema = z.object({
  orderLineItemId: z.string().uuid(),
  quantityReturned: z.number().int().min(1).default(1),
  itemReason: z.string().max(500).nullable().optional(),
  serialNumber: z.string().max(100).nullable().optional(),
});
export type CreateRmaLineItemInput = z.infer<typeof createRmaLineItemSchema>;

// ============================================================================
// CREATE RMA
// ============================================================================

export const createRmaSchema = z.object({
  // Required fields
  orderId: z.string().uuid(),
  reason: rmaReasonSchema,
  lineItems: z.array(createRmaLineItemSchema).min(1, 'At least one item is required'),

  // Optional links
  issueId: z.string().uuid().nullable().optional(),
  customerId: z.string().uuid().nullable().optional(),

  // Optional details
  reasonDetails: z.string().max(2000).nullable().optional(),
  customerNotes: z.string().max(2000).nullable().optional(),
  internalNotes: z.string().max(2000).nullable().optional(),
});
export type CreateRmaInput = z.infer<typeof createRmaSchema>;

// ============================================================================
// UPDATE RMA
// ============================================================================

export const updateRmaSchema = z.object({
  // Status changes handled by dedicated functions (approve, receive, process, reject)
  // This schema is for general field updates

  reason: rmaReasonSchema.optional(),
  reasonDetails: z.string().max(2000).nullable().optional(),
  customerNotes: z.string().max(2000).nullable().optional(),
  internalNotes: z.string().max(2000).nullable().optional(),
  inspectionNotes: rmaInspectionNotesSchema.nullable().optional(),
  resolution: rmaResolutionSchema.nullable().optional(),
  resolutionDetails: rmaResolutionDetailsSchema.nullable().optional(),
});
export type UpdateRmaInput = z.infer<typeof updateRmaSchema>;

// ============================================================================
// WORKFLOW SCHEMAS
// ============================================================================

export const approveRmaSchema = z.object({
  rmaId: z.string().uuid(),
  notes: z.string().max(2000).nullable().optional(),
});
export type ApproveRmaInput = z.infer<typeof approveRmaSchema>;

export const rejectRmaSchema = z.object({
  rmaId: z.string().uuid(),
  rejectionReason: z.string().min(1).max(2000),
});
export type RejectRmaInput = z.infer<typeof rejectRmaSchema>;

export const receiveRmaSchema = z.object({
  rmaId: z.string().uuid(),
  inspectionNotes: rmaInspectionNotesSchema.optional(),
});
export type ReceiveRmaInput = z.infer<typeof receiveRmaSchema>;

export const processRmaSchema = z.object({
  rmaId: z.string().uuid(),
  resolution: rmaResolutionSchema,
  resolutionDetails: rmaResolutionDetailsSchema.optional(),
});
export type ProcessRmaInput = z.infer<typeof processRmaSchema>;

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

export const getRmaSchema = z.object({
  rmaId: z.string().uuid(),
});
export type GetRmaInput = z.infer<typeof getRmaSchema>;

export const listRmasSchema = z.object({
  // Filters
  status: rmaStatusSchema.optional(),
  reason: rmaReasonSchema.optional(),
  customerId: z.string().uuid().optional(),
  orderId: z.string().uuid().optional(),
  issueId: z.string().uuid().optional(),

  // Search
  search: z.string().max(100).optional(), // Search by RMA number

  // Pagination
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),

  // Sorting
  sortBy: z.enum(['createdAt', 'rmaNumber', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type ListRmasInput = z.infer<typeof listRmasSchema>;

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface RmaLineItemResponse {
  id: string;
  rmaId: string;
  orderLineItemId: string;
  quantityReturned: number;
  itemReason: string | null;
  itemCondition: string | null;
  serialNumber: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Joined data
  orderLineItem?: {
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
  };
}

export interface RmaResponse {
  id: string;
  organizationId: string;
  rmaNumber: string;
  issueId: string | null;
  customerId: string | null;
  orderId: string;
  status: RmaStatus;
  reason: RmaReason;
  reasonDetails: string | null;
  resolution: RmaResolution | null;
  resolutionDetails: RmaResolutionDetails | null;
  inspectionNotes: RmaInspectionNotes | null;
  internalNotes: string | null;
  customerNotes: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  receivedAt: string | null;
  receivedBy: string | null;
  processedAt: string | null;
  processedBy: string | null;
  rejectedAt: string | null;
  rejectedBy: string | null;
  rejectionReason: string | null;
  sequenceNumber: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  // Joined data
  lineItems?: RmaLineItemResponse[];
  customer?: { id: string; name: string } | null;
  issue?: { id: string; title: string } | null;
}

export interface ListRmasResponse {
  data: RmaResponse[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}
