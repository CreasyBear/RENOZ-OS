/**
 * Approval Workflow Schemas
 *
 * Zod schemas for PO approval workflow UI components.
 * Matches server function inputs and drizzle schema types.
 */

import { z } from 'zod';
import { cursorPaginationSchema } from '@/lib/db/pagination';
import { approvalsSearchSchema } from './approval-search';

// ============================================================================
// APPROVAL STATUS ENUM
// ============================================================================

export const approvalStatusEnum = z.enum(['pending', 'approved', 'rejected', 'escalated']);
export type ApprovalStatus = z.infer<typeof approvalStatusEnum>;

// ============================================================================
// APPROVAL REJECTION REASONS (for PO approval workflow)
// ============================================================================

export const approvalRejectionReasons = [
  'price_too_high',
  'incorrect_items',
  'wrong_supplier',
  'needs_budget_approval',
  'other',
] as const;

export const approvalRejectionReasonEnum = z.enum(approvalRejectionReasons);
export type ApprovalRejectionReason = z.infer<typeof approvalRejectionReasonEnum>;

export const approvalRejectionReasonLabels: Record<ApprovalRejectionReason, string> = {
  price_too_high: 'Price too high',
  incorrect_items: 'Incorrect items',
  wrong_supplier: 'Wrong supplier',
  needs_budget_approval: 'Needs budget approval',
  other: 'Other',
};

// ============================================================================
// APPROVAL ACTION SCHEMAS
// ============================================================================

export const submitForApprovalSchema = z.object({
  id: z.string().uuid(),
  note: z.string().optional(),
});
export type SubmitForApprovalInput = z.infer<typeof submitForApprovalSchema>;

export const approveOrderSchema = z.object({
  id: z.string().uuid(),
  notes: z.string().optional(),
});
export type ApproveOrderInput = z.infer<typeof approveOrderSchema>;

export const rejectOrderSchema = z.object({
  id: z.string().uuid(),
  reason: approvalRejectionReasonEnum,
  comments: z.string().min(1, 'Please provide rejection details'),
});
export type RejectOrderInput = z.infer<typeof rejectOrderSchema>;

// ============================================================================
// APPROVAL HISTORY TYPES
// ============================================================================

export const approvalEventTypeEnum = z.enum([
  'submitted',
  'approved',
  'rejected',
  'escalated',
  'created',
]);
export type ApprovalEventType = z.infer<typeof approvalEventTypeEnum>;

export interface ApprovalEvent {
  id: string;
  type: ApprovalEventType;
  user: {
    id: string;
    name: string;
    role?: string;
  };
  date: string;
  note?: string;
  reason?: string;
}

export interface ApprovalRule {
  id: string;
  name: string;
  condition: string;
  approverRole: string;
  approvers: Array<{ id: string; name: string; email: string }>;
  escalationHours?: number;
  escalationRole?: string;
}

// ============================================================================
// APPROVAL ACTION BAR PROPS
// ============================================================================

export interface ApprovalActionBarOrder {
  id: string;
  poNumber: string;
  status: string;
  totalAmount: number;
  currency: string;
  supplierName: string | null;
  submittedBy?: {
    id: string;
    name: string;
    date: string;
  };
  submitterNote?: string;
}

// ============================================================================
// APPROVAL RULE SCHEMAS (Settings)
// ============================================================================

export const approvalRuleSchema = z.object({
  name: z.string().min(1, 'Rule name is required'),
  minAmount: z.number().nonnegative(),
  maxAmount: z.number().nonnegative().nullable(),
  approverRole: z.string().min(1, 'Approver role is required'),
  requireAll: z.boolean().default(false),
  escalationHours: z.number().int().positive().nullable(),
  escalationRole: z.string().nullable(),
  isActive: z.boolean().default(true),
});
export type ApprovalRuleInput = z.infer<typeof approvalRuleSchema>;

export interface ApprovalRuleData extends ApprovalRuleInput {
  id: string;
}

// ============================================================================
// SERVER FUNCTION INPUT SCHEMAS
// ============================================================================

/**
 * Schema for listing pending approvals with filtering and pagination.
 */
export const listPendingApprovalsSchema = z.object({
  status: approvalStatusEnum.optional(),
  search: z.string().optional(),
  type: z.enum(['all', 'purchase_order', 'amendment']).optional(),
  priority: z.enum(['all', 'low', 'medium', 'high', 'urgent']).optional(),
  sortBy: z.enum(['createdAt', 'dueAt', 'level']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});
export type ListPendingApprovalsInput = z.infer<typeof listPendingApprovalsSchema>;

/** Cursor pagination for list pending approvals */
export const listPendingApprovalsCursorSchema = cursorPaginationSchema.merge(
  z.object({
    status: approvalStatusEnum.optional(),
    search: z.string().optional(),
    type: z.enum(['all', 'purchase_order', 'amendment']).optional(),
    priority: z.enum(['all', 'low', 'medium', 'high', 'urgent']).optional(),
  })
);
export type ListPendingApprovalsCursorInput = z.infer<typeof listPendingApprovalsCursorSchema>;

/**
 * Schema for getting approval details.
 */
export const getApprovalDetailsSchema = z.object({
  approvalId: z.string().uuid(),
});
export type GetApprovalDetailsInput = z.infer<typeof getApprovalDetailsSchema>;

/**
 * Schema for approving an approval request.
 */
export const approveRejectSchema = z.object({
  approvalId: z.string().uuid(),
  comments: z.string().optional(),
});
export type ApproveRejectInput = z.infer<typeof approveRejectSchema>;

/**
 * Schema for rejecting an approval request.
 */
export const rejectSchema = z.object({
  approvalId: z.string().uuid(),
  reason: approvalRejectionReasonEnum,
  comments: z.string().min(1, 'Rejection comments are required'),
});
export type RejectInput = z.infer<typeof rejectSchema>;

/**
 * Schema for escalating an approval.
 */
export const escalateSchema = z.object({
  approvalId: z.string().uuid(),
  escalateTo: z.string().uuid(),
  reason: z.string().min(1, 'Escalation reason is required'),
});
export type EscalateInput = z.infer<typeof escalateSchema>;

/**
 * Schema for delegating an approval.
 */
export const delegateSchema = z.object({
  approvalId: z.string().uuid(),
  delegateTo: z.string().uuid(),
});
export type DelegateInput = z.infer<typeof delegateSchema>;

/**
 * Schema for revoking a delegation.
 * Only the original delegator or current delegatee can revoke.
 */
export const revokeDelegationSchema = z.object({
  approvalId: z.string().uuid(),
});
export type RevokeDelegationInput = z.infer<typeof revokeDelegationSchema>;

/**
 * Schema for bulk approving multiple approvals.
 */
export const bulkApproveSchema = z.object({
  approvalIds: z.array(z.string().uuid()).min(1),
  comments: z.string().optional(),
});
export type BulkApproveInput = z.infer<typeof bulkApproveSchema>;

/**
 * Schema for resolving approval IDs from purchase order IDs.
 * Used when bulk approving from the PO list.
 */
export const getApprovalIdsForPurchaseOrdersSchema = z.object({
  purchaseOrderIds: z.array(z.string().uuid()).min(1),
});
export type GetApprovalIdsForPurchaseOrdersInput = z.infer<
  typeof getApprovalIdsForPurchaseOrdersSchema
>;

/**
 * Schema for evaluating approval rules for a purchase order.
 */
export const evaluateRulesSchema = z.object({
  purchaseOrderId: z.string().uuid(),
});
export type EvaluateRulesInput = z.infer<typeof evaluateRulesSchema>;

// ============================================================================
// APPROVAL ITEM (UI Component Type)
// ============================================================================

/**
 * Approval item for dashboard display.
 * Represents a purchase order or amendment requiring approval.
 */
export interface ApprovalItem {
  id: string;
  type: 'purchase_order' | 'amendment';
  title: string;
  description: string;
  amount: number;
  currency: string;
  requester: string;
  submittedAt: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  status: 'pending' | 'approved' | 'rejected' | 'escalated';
  supplierName?: string;
  poNumber?: string;
  level?: number;
  escalatedTo?: string | null;
}

/**
 * Approval filters for dashboard filtering.
 */
export interface ApprovalFilters extends Record<string, unknown> {
  type: 'all' | 'purchase_order' | 'amendment';
  priority: 'all' | 'low' | 'medium' | 'high' | 'urgent';
  search: string;
}

// ============================================================================
// ROUTE SEARCH SCHEMAS
// ============================================================================

export { approvalsSearchSchema };
export type { ApprovalsSearch } from './approval-search';
