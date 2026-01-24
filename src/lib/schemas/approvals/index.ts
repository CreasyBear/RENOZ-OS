/**
 * Approval Workflow Schemas
 *
 * Zod schemas for PO approval workflow UI components.
 * Matches server function inputs and drizzle schema types.
 */

import { z } from 'zod';

// ============================================================================
// APPROVAL STATUS ENUM
// ============================================================================

export const approvalStatusEnum = z.enum(['pending', 'approved', 'rejected', 'escalated']);
export type ApprovalStatus = z.infer<typeof approvalStatusEnum>;

// ============================================================================
// REJECTION REASONS
// ============================================================================

export const rejectionReasons = [
  'price_too_high',
  'incorrect_items',
  'wrong_supplier',
  'needs_budget_approval',
  'other',
] as const;

export const rejectionReasonEnum = z.enum(rejectionReasons);
export type RejectionReason = z.infer<typeof rejectionReasonEnum>;

export const rejectionReasonLabels: Record<RejectionReason, string> = {
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
  reason: rejectionReasonEnum,
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
