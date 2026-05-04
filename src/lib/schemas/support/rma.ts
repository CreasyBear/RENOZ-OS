/**
 * RMA (Return Merchandise Authorization) Validation Schemas
 *
 * Zod schemas for RMA CRUD operations.
 *
 * @see drizzle/schema/support/return-authorizations.ts
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-003a
 */

import { z } from 'zod';
import { cursorPaginationSchema } from '@/lib/db/pagination';
import { normalizeObjectInput } from '../_shared/patterns';

// ============================================================================
// ENUMS
// ============================================================================

export const rmaStatusSchema = z.enum([
  'requested',
  'approved',
  'received',
  'processed',
  'rejected',
  'cancelled',
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

export const rmaExecutionStatusSchema = z.enum(['pending', 'blocked', 'completed']);
export type RmaExecutionStatus = z.infer<typeof rmaExecutionStatusSchema>;

export const linkedIssueOpenStateSchema = z.enum(['any', 'open', 'closed']);
export type LinkedIssueOpenState = z.infer<typeof linkedIssueOpenStateSchema>;

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

export const rmaArtifactRefSchema = z.object({
  id: z.string().uuid(),
  label: z.string().nullable().optional(),
});
export type RmaArtifactRef = z.infer<typeof rmaArtifactRefSchema>;

export const rmaExecutionSummarySchema = z.object({
  status: rmaExecutionStatusSchema,
  blockedReason: z.string().nullable(),
  refundPayment: rmaArtifactRefSchema.nullable(),
  creditNote: rmaArtifactRefSchema.nullable(),
  replacementOrder: rmaArtifactRefSchema.nullable(),
  linkedIssueOpen: z.boolean().nullable(),
  completedAt: z.string().datetime().nullable(),
  completedBy: z.string().uuid().nullable(),
});
export type RmaExecutionSummary = z.infer<typeof rmaExecutionSummarySchema>;

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
  locationId: z.string().uuid('Receiving location is required').optional(),
  inspectionNotes: rmaInspectionNotesSchema.optional(),
});
export type ReceiveRmaInput = z.infer<typeof receiveRmaSchema>;

const processRmaCommonFields = {
  rmaId: z.string().uuid(),
  notes: z.string().max(2000).optional(),
};

export const processRmaSchema = z.discriminatedUnion('resolution', [
  z.object({
    ...processRmaCommonFields,
    resolution: z.literal('refund'),
    originalPaymentId: z.string().uuid('A source payment is required'),
    amount: z.number().positive('Refund amount must be greater than 0'),
  }),
  z.object({
    ...processRmaCommonFields,
    resolution: z.literal('credit'),
    amount: z.number().positive('Credit amount must be greater than 0'),
    creditReason: z.string().min(1, 'Credit reason is required').max(500),
    applyNow: z.boolean().default(true),
  }),
  z.object({
    ...processRmaCommonFields,
    resolution: z.literal('replacement'),
    confirmReplacement: z.literal(true),
  }),
  z.object({
    ...processRmaCommonFields,
    resolution: z.literal('repair'),
  }),
  z.object({
    ...processRmaCommonFields,
    resolution: z.literal('no_action'),
  }),
]);
export type ProcessRmaInput = z.infer<typeof processRmaSchema>;
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, Extract<K, keyof T>>
  : never;
export type ProcessRmaPayload = DistributiveOmit<ProcessRmaInput, 'rmaId'>;

// ============================================================================
// BULK WORKFLOW SCHEMAS
// ============================================================================

export const bulkApproveRmaSchema = z.object({
  rmaIds: z.array(z.string().uuid()).min(1, 'At least one RMA is required').max(50, 'Maximum 50 RMAs per batch'),
  notes: z.string().max(2000).nullable().optional(),
});
export type BulkApproveRmaInput = z.infer<typeof bulkApproveRmaSchema>;

export const bulkReceiveRmaSchema = z.object({
  rmaIds: z.array(z.string().uuid()).min(1, 'At least one RMA is required').max(50, 'Maximum 50 RMAs per batch'),
  locationId: z.string().uuid('Receiving location is required').optional(),
  inspectionNotes: rmaInspectionNotesSchema.optional(),
});
export type BulkReceiveRmaInput = z.infer<typeof bulkReceiveRmaSchema>;

/** Result of bulk RMA operation */
export interface BulkRmaResult {
  updated: number;
  failed: { rmaId: string; error: string }[];
}

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

export const getRmaSchema = z.object({
  rmaId: z.string().uuid(),
});
export type GetRmaInput = z.infer<typeof getRmaSchema>;

export const getRmaLookupSchema = z
  .object({
    rmaId: z.string().uuid().optional(),
    rmaNumber: z.string().trim().min(1).max(100).optional(),
  })
  .refine((data) => data.rmaId || data.rmaNumber, 'Either rmaId or rmaNumber is required');
export type GetRmaLookupInput = z.infer<typeof getRmaLookupSchema>;

export const listRmasSchema = normalizeObjectInput(
  z.object({
    // Filters
    status: rmaStatusSchema.optional(),
    reason: rmaReasonSchema.optional(),
    customerId: z.string().uuid().optional(),
    orderId: z.string().uuid().optional(),
    issueId: z.string().uuid().optional(),
    resolution: rmaResolutionSchema.optional(),
    executionStatus: rmaExecutionStatusSchema.optional(),
    linkedIssueOpenState: linkedIssueOpenStateSchema.optional(),

    // Search
    search: z.string().max(100).optional(), // Search by RMA number

    // Pagination
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(100).default(20),

    // Sorting
    sortBy: z.enum(['createdAt', 'rmaNumber', 'status']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
);
export type ListRmasInput = z.infer<typeof listRmasSchema>;

export const listRmasCursorSchema = normalizeObjectInput(
  cursorPaginationSchema.merge(
    z.object({
      status: rmaStatusSchema.optional(),
      reason: rmaReasonSchema.optional(),
      customerId: z.string().uuid().optional(),
      orderId: z.string().uuid().optional(),
      issueId: z.string().uuid().optional(),
      resolution: rmaResolutionSchema.optional(),
      executionStatus: rmaExecutionStatusSchema.optional(),
      linkedIssueOpenState: linkedIssueOpenStateSchema.optional(),
      search: z.string().max(100).optional(),
    })
  )
);
export type ListRmasCursorInput = z.infer<typeof listRmasCursorSchema>;

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
  executionStatus: RmaExecutionStatus;
  executionBlockedReason: string | null;
  executionCompletedAt: string | null;
  executionCompletedBy: string | null;
  refundPaymentId: string | null;
  creditNoteId: string | null;
  replacementOrderId: string | null;
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
  execution?: RmaExecutionSummary;
  linkedIssueOpen?: boolean | null;
  /** Units restored to inventory (receiveRma only) */
  unitsRestored?: number;
}

export type RmaProcessResult = RmaResponse;

export interface ListRmasResponse {
  data: RmaResponse[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}
