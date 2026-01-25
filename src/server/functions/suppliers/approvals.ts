/**
 * Purchase Order Approval Server Functions
 *
 * Multi-level approval workflow for purchase orders with:
 * - Rule-based approval routing
 * - Escalation (automatic + manual)
 * - Delegation (approve on behalf of)
 *
 * @see drizzle/schema/suppliers/purchase-order-approvals.ts
 * @see src/lib/schemas/approvals/index.ts
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, desc, asc, sql, count, isNull, or } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  purchaseOrderApprovals,
  purchaseOrderApprovalRules,
  purchaseOrders,
} from 'drizzle/schema/suppliers';
import { users } from 'drizzle/schema/users';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/constants';
import {
  approvalStatusEnum,
  approvalRejectionReasonEnum,
} from '@/lib/schemas/approvals';

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

const listPendingApprovalsSchema = z.object({
  status: approvalStatusEnum.optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'dueAt', 'level']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

const getApprovalDetailsSchema = z.object({
  approvalId: z.string().uuid(),
});

const approveRejectSchema = z.object({
  approvalId: z.string().uuid(),
  comments: z.string().optional(),
});

const rejectSchema = z.object({
  approvalId: z.string().uuid(),
  reason: approvalRejectionReasonEnum,
  comments: z.string().min(1, 'Rejection comments are required'),
});

const escalateSchema = z.object({
  approvalId: z.string().uuid(),
  escalateTo: z.string().uuid(),
  reason: z.string().min(1, 'Escalation reason is required'),
});

const delegateSchema = z.object({
  approvalId: z.string().uuid(),
  delegateTo: z.string().uuid(),
});

const bulkApproveSchema = z.object({
  approvalIds: z.array(z.string().uuid()).min(1),
  comments: z.string().optional(),
});

const evaluateRulesSchema = z.object({
  purchaseOrderId: z.string().uuid(),
});

// ============================================================================
// LIST & QUERY FUNCTIONS
// ============================================================================

/**
 * List approvals for the current user (as approver or escalation target).
 * Supports filtering by status and pagination.
 */
export const listPendingApprovals = createServerFn({ method: 'GET' })
  .inputValidator(listPendingApprovalsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.SUPPLIERS.APPROVE });

    const {
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      pageSize = 20,
    } = data;

    // Build where conditions - approvals assigned to current user or escalated to them
    const conditions = [
      eq(purchaseOrderApprovals.organizationId, ctx.organizationId),
      or(
        eq(purchaseOrderApprovals.approverId, ctx.user.id),
        eq(purchaseOrderApprovals.escalatedTo, ctx.user.id)
      ),
    ];

    if (status) {
      conditions.push(eq(purchaseOrderApprovals.status, status));
    }

    const whereClause = and(...conditions);

    // Get total count
    const countResult = await db
      .select({ count: count() })
      .from(purchaseOrderApprovals)
      .where(whereClause);

    const totalItems = Number(countResult[0]?.count ?? 0);

    // Get paginated results with PO details
    const offset = (page - 1) * pageSize;
    const orderFn = sortOrder === 'asc' ? asc : desc;

    const orderColumn =
      sortBy === 'dueAt'
        ? purchaseOrderApprovals.dueAt
        : sortBy === 'level'
          ? purchaseOrderApprovals.level
          : purchaseOrderApprovals.createdAt;

    const items = await db
      .select({
        id: purchaseOrderApprovals.id,
        purchaseOrderId: purchaseOrderApprovals.purchaseOrderId,
        approverId: purchaseOrderApprovals.approverId,
        level: purchaseOrderApprovals.level,
        status: purchaseOrderApprovals.status,
        comments: purchaseOrderApprovals.comments,
        dueAt: purchaseOrderApprovals.dueAt,
        createdAt: purchaseOrderApprovals.createdAt,
        escalatedTo: purchaseOrderApprovals.escalatedTo,
        escalationReason: purchaseOrderApprovals.escalationReason,
        // PO fields
        poNumber: purchaseOrders.poNumber,
        totalAmount: purchaseOrders.totalAmount,
        currency: purchaseOrders.currency,
        poStatus: purchaseOrders.status,
      })
      .from(purchaseOrderApprovals)
      .innerJoin(purchaseOrders, eq(purchaseOrderApprovals.purchaseOrderId, purchaseOrders.id))
      .where(whereClause)
      .orderBy(orderFn(orderColumn))
      .limit(pageSize)
      .offset(offset);

    return {
      items,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
      },
    };
  });

/**
 * Get detailed approval information including PO and approver details.
 */
export const getApprovalDetails = createServerFn({ method: 'GET' })
  .inputValidator(getApprovalDetailsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.SUPPLIERS.READ });

    const result = await db
      .select({
        // Approval fields
        id: purchaseOrderApprovals.id,
        purchaseOrderId: purchaseOrderApprovals.purchaseOrderId,
        approverId: purchaseOrderApprovals.approverId,
        level: purchaseOrderApprovals.level,
        status: purchaseOrderApprovals.status,
        comments: purchaseOrderApprovals.comments,
        approvedAt: purchaseOrderApprovals.approvedAt,
        rejectedAt: purchaseOrderApprovals.rejectedAt,
        dueAt: purchaseOrderApprovals.dueAt,
        escalatedTo: purchaseOrderApprovals.escalatedTo,
        escalatedAt: purchaseOrderApprovals.escalatedAt,
        escalationReason: purchaseOrderApprovals.escalationReason,
        delegatedFrom: purchaseOrderApprovals.delegatedFrom,
        createdAt: purchaseOrderApprovals.createdAt,
        // PO fields
        poNumber: purchaseOrders.poNumber,
        totalAmount: purchaseOrders.totalAmount,
        currency: purchaseOrders.currency,
        poStatus: purchaseOrders.status,
        supplierId: purchaseOrders.supplierId,
        notes: purchaseOrders.notes,
        // Approver info
        approverName: users.name,
        approverEmail: users.email,
      })
      .from(purchaseOrderApprovals)
      .innerJoin(purchaseOrders, eq(purchaseOrderApprovals.purchaseOrderId, purchaseOrders.id))
      .innerJoin(users, eq(purchaseOrderApprovals.approverId, users.id))
      .where(
        and(
          eq(purchaseOrderApprovals.id, data.approvalId),
          eq(purchaseOrderApprovals.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!result[0]) {
      throw new Error('Approval not found');
    }

    return result[0];
  });

/**
 * Get approval history for a purchase order.
 */
export const getApprovalHistory = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ purchaseOrderId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.SUPPLIERS.READ });

    const history = await db
      .select({
        id: purchaseOrderApprovals.id,
        level: purchaseOrderApprovals.level,
        status: purchaseOrderApprovals.status,
        comments: purchaseOrderApprovals.comments,
        approvedAt: purchaseOrderApprovals.approvedAt,
        rejectedAt: purchaseOrderApprovals.rejectedAt,
        escalatedAt: purchaseOrderApprovals.escalatedAt,
        escalationReason: purchaseOrderApprovals.escalationReason,
        createdAt: purchaseOrderApprovals.createdAt,
        approverName: users.name,
        approverEmail: users.email,
      })
      .from(purchaseOrderApprovals)
      .innerJoin(users, eq(purchaseOrderApprovals.approverId, users.id))
      .where(
        and(
          eq(purchaseOrderApprovals.purchaseOrderId, data.purchaseOrderId),
          eq(purchaseOrderApprovals.organizationId, ctx.organizationId)
        )
      )
      .orderBy(asc(purchaseOrderApprovals.level), desc(purchaseOrderApprovals.createdAt));

    return { history };
  });

/**
 * Get approval stats for the current user.
 */
export const getApprovalStats = createServerFn({ method: 'GET' }).handler(async () => {
  const ctx = await withAuth({ permission: PERMISSIONS.SUPPLIERS.READ });

  const stats = await db
    .select({
      status: purchaseOrderApprovals.status,
      count: count(),
    })
    .from(purchaseOrderApprovals)
    .where(
      and(
        eq(purchaseOrderApprovals.organizationId, ctx.organizationId),
        or(
          eq(purchaseOrderApprovals.approverId, ctx.user.id),
          eq(purchaseOrderApprovals.escalatedTo, ctx.user.id)
        )
      )
    )
    .groupBy(purchaseOrderApprovals.status);

  // Transform to object
  const result = {
    pending: 0,
    approved: 0,
    rejected: 0,
    escalated: 0,
    total: 0,
  };

  stats.forEach((stat) => {
    const countNum = Number(stat.count);
    result[stat.status as keyof typeof result] = countNum;
    result.total += countNum;
  });

  // Get overdue count
  const overdueResult = await db
    .select({ count: count() })
    .from(purchaseOrderApprovals)
    .where(
      and(
        eq(purchaseOrderApprovals.organizationId, ctx.organizationId),
        eq(purchaseOrderApprovals.status, 'pending'),
        or(
          eq(purchaseOrderApprovals.approverId, ctx.user.id),
          eq(purchaseOrderApprovals.escalatedTo, ctx.user.id)
        ),
        sql`${purchaseOrderApprovals.dueAt} < NOW()`
      )
    );

  return {
    ...result,
    overdue: Number(overdueResult[0]?.count ?? 0),
  };
});

// ============================================================================
// APPROVAL ACTIONS
// ============================================================================

/**
 * Approve a purchase order at the current approval level (multi-level workflow).
 */
export const approvePurchaseOrderAtLevel = createServerFn({ method: 'POST' })
  .inputValidator(approveRejectSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.SUPPLIERS.APPROVE });

    // Get the approval record
    const approval = await db
      .select()
      .from(purchaseOrderApprovals)
      .where(
        and(
          eq(purchaseOrderApprovals.id, data.approvalId),
          eq(purchaseOrderApprovals.organizationId, ctx.organizationId),
          eq(purchaseOrderApprovals.status, 'pending')
        )
      )
      .limit(1);

    if (!approval[0]) {
      throw new Error('Approval not found or already processed');
    }

    // Verify user is the assigned approver or escalation target
    if (
      approval[0].approverId !== ctx.user.id &&
      approval[0].escalatedTo !== ctx.user.id
    ) {
      throw new Error('You are not authorized to approve this request');
    }

    // Update approval record
    const [updatedApproval] = await db
      .update(purchaseOrderApprovals)
      .set({
        status: 'approved',
        comments: data.comments,
        approvedAt: new Date(),
        updatedBy: ctx.user.id,
      })
      .where(eq(purchaseOrderApprovals.id, data.approvalId))
      .returning();

    // Check if there are more levels required
    const nextLevel = await db
      .select()
      .from(purchaseOrderApprovals)
      .where(
        and(
          eq(purchaseOrderApprovals.purchaseOrderId, approval[0].purchaseOrderId),
          eq(purchaseOrderApprovals.status, 'pending'),
          sql`${purchaseOrderApprovals.level} > ${approval[0].level}`
        )
      )
      .limit(1);

    // If no more levels, update PO status to approved
    if (!nextLevel[0]) {
      await db
        .update(purchaseOrders)
        .set({
          status: 'approved',
          updatedBy: ctx.user.id,
        })
        .where(eq(purchaseOrders.id, approval[0].purchaseOrderId));
    }

    return { approval: updatedApproval };
  });

/**
 * Reject a purchase order at the current approval level (multi-level workflow).
 */
export const rejectPurchaseOrderAtLevel = createServerFn({ method: 'POST' })
  .inputValidator(rejectSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.SUPPLIERS.APPROVE });

    // Get the approval record
    const approval = await db
      .select()
      .from(purchaseOrderApprovals)
      .where(
        and(
          eq(purchaseOrderApprovals.id, data.approvalId),
          eq(purchaseOrderApprovals.organizationId, ctx.organizationId),
          eq(purchaseOrderApprovals.status, 'pending')
        )
      )
      .limit(1);

    if (!approval[0]) {
      throw new Error('Approval not found or already processed');
    }

    // Verify user is the assigned approver or escalation target
    if (
      approval[0].approverId !== ctx.user.id &&
      approval[0].escalatedTo !== ctx.user.id
    ) {
      throw new Error('You are not authorized to reject this request');
    }

    // Update approval record with rejection reason
    const [updatedApproval] = await db
      .update(purchaseOrderApprovals)
      .set({
        status: 'rejected',
        comments: `[${data.reason}] ${data.comments}`,
        rejectedAt: new Date(),
        updatedBy: ctx.user.id,
      })
      .where(eq(purchaseOrderApprovals.id, data.approvalId))
      .returning();

    // Update PO status back to draft
    await db
      .update(purchaseOrders)
      .set({
        status: 'draft',
        updatedBy: ctx.user.id,
      })
      .where(eq(purchaseOrders.id, approval[0].purchaseOrderId));

    return { approval: updatedApproval };
  });

/**
 * Bulk approve multiple approvals.
 */
export const bulkApproveApprovals = createServerFn({ method: 'POST' })
  .inputValidator(bulkApproveSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.SUPPLIERS.APPROVE });

    const results = {
      approved: [] as string[],
      failed: [] as { id: string; reason: string }[],
    };

    for (const approvalId of data.approvalIds) {
      try {
        // Get the approval record
        const approval = await db
          .select()
          .from(purchaseOrderApprovals)
          .where(
            and(
              eq(purchaseOrderApprovals.id, approvalId),
              eq(purchaseOrderApprovals.organizationId, ctx.organizationId),
              eq(purchaseOrderApprovals.status, 'pending'),
              or(
                eq(purchaseOrderApprovals.approverId, ctx.user.id),
                eq(purchaseOrderApprovals.escalatedTo, ctx.user.id)
              )
            )
          )
          .limit(1);

        if (!approval[0]) {
          results.failed.push({ id: approvalId, reason: 'Not found or not authorized' });
          continue;
        }

        // Update approval
        await db
          .update(purchaseOrderApprovals)
          .set({
            status: 'approved',
            comments: data.comments,
            approvedAt: new Date(),
            updatedBy: ctx.user.id,
          })
          .where(eq(purchaseOrderApprovals.id, approvalId));

        // Check if final level
        const nextLevel = await db
          .select()
          .from(purchaseOrderApprovals)
          .where(
            and(
              eq(purchaseOrderApprovals.purchaseOrderId, approval[0].purchaseOrderId),
              eq(purchaseOrderApprovals.status, 'pending'),
              sql`${purchaseOrderApprovals.level} > ${approval[0].level}`
            )
          )
          .limit(1);

        if (!nextLevel[0]) {
          await db
            .update(purchaseOrders)
            .set({ status: 'approved', updatedBy: ctx.user.id })
            .where(eq(purchaseOrders.id, approval[0].purchaseOrderId));
        }

        results.approved.push(approvalId);
      } catch {
        results.failed.push({ id: approvalId, reason: 'Processing error' });
      }
    }

    return results;
  });

// ============================================================================
// ESCALATION
// ============================================================================

/**
 * Escalate an approval to a different user.
 */
export const escalateApproval = createServerFn({ method: 'POST' })
  .inputValidator(escalateSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.SUPPLIERS.APPROVE });

    // Get the approval record
    const approval = await db
      .select()
      .from(purchaseOrderApprovals)
      .where(
        and(
          eq(purchaseOrderApprovals.id, data.approvalId),
          eq(purchaseOrderApprovals.organizationId, ctx.organizationId),
          eq(purchaseOrderApprovals.status, 'pending')
        )
      )
      .limit(1);

    if (!approval[0]) {
      throw new Error('Approval not found or already processed');
    }

    // Update with escalation
    const [updatedApproval] = await db
      .update(purchaseOrderApprovals)
      .set({
        status: 'escalated',
        escalatedTo: data.escalateTo,
        escalatedAt: new Date(),
        escalationReason: data.reason,
        updatedBy: ctx.user.id,
      })
      .where(eq(purchaseOrderApprovals.id, data.approvalId))
      .returning();

    return { approval: updatedApproval };
  });

/**
 * Auto-escalate overdue approvals (called by background job).
 */
export const autoEscalateOverdue = createServerFn({ method: 'POST' }).handler(async () => {
  const ctx = await withAuth({ permission: PERMISSIONS.SUPPLIERS.APPROVE });

  // Find overdue pending approvals
  const overdueApprovals = await db
    .select({
      id: purchaseOrderApprovals.id,
      purchaseOrderId: purchaseOrderApprovals.purchaseOrderId,
      organizationId: purchaseOrderApprovals.organizationId,
    })
    .from(purchaseOrderApprovals)
    .where(
      and(
        eq(purchaseOrderApprovals.organizationId, ctx.organizationId),
        eq(purchaseOrderApprovals.status, 'pending'),
        isNull(purchaseOrderApprovals.escalatedTo),
        sql`${purchaseOrderApprovals.dueAt} < NOW()`
      )
    )
    .limit(100);

  const escalated: string[] = [];

  for (const approval of overdueApprovals) {
    // Get the applicable rule to find escalation target
    const rule = await db
      .select()
      .from(purchaseOrderApprovalRules)
      .where(
        and(
          eq(purchaseOrderApprovalRules.organizationId, approval.organizationId),
          eq(purchaseOrderApprovalRules.isActive, true)
        )
      )
      .orderBy(asc(purchaseOrderApprovalRules.priority))
      .limit(1);

    if (rule[0]?.escalationApproverRoles?.length) {
      // Find a user with the escalation role
      // For now, mark as escalated without specific target
      await db
        .update(purchaseOrderApprovals)
        .set({
          status: 'escalated',
          escalatedAt: new Date(),
          escalationReason: 'Auto-escalated: overdue',
        })
        .where(eq(purchaseOrderApprovals.id, approval.id));

      escalated.push(approval.id);
    }
  }

  return { escalatedCount: escalated.length, escalatedIds: escalated };
});

// ============================================================================
// DELEGATION
// ============================================================================

/**
 * Delegate an approval to another user.
 */
export const delegateApproval = createServerFn({ method: 'POST' })
  .inputValidator(delegateSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.SUPPLIERS.APPROVE });

    // Get the approval record
    const approval = await db
      .select()
      .from(purchaseOrderApprovals)
      .where(
        and(
          eq(purchaseOrderApprovals.id, data.approvalId),
          eq(purchaseOrderApprovals.organizationId, ctx.organizationId),
          eq(purchaseOrderApprovals.status, 'pending'),
          eq(purchaseOrderApprovals.approverId, ctx.user.id)
        )
      )
      .limit(1);

    if (!approval[0]) {
      throw new Error('Approval not found or you are not the assigned approver');
    }

    // Update approval with delegation
    const [updatedApproval] = await db
      .update(purchaseOrderApprovals)
      .set({
        approverId: data.delegateTo,
        delegatedFrom: ctx.user.id,
        updatedBy: ctx.user.id,
      })
      .where(eq(purchaseOrderApprovals.id, data.approvalId))
      .returning();

    return { approval: updatedApproval };
  });

// ============================================================================
// RULE EVALUATION
// ============================================================================

/**
 * Evaluate approval rules for a purchase order and create approval records.
 */
export const evaluateApprovalRules = createServerFn({ method: 'POST' })
  .inputValidator(evaluateRulesSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.SUPPLIERS.CREATE });

    // Get the purchase order
    const po = await db
      .select()
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.id, data.purchaseOrderId),
          eq(purchaseOrders.organizationId, ctx.organizationId),
          isNull(purchaseOrders.deletedAt)
        )
      )
      .limit(1);

    if (!po[0]) {
      throw new Error('Purchase order not found');
    }

    const orderAmount = Number(po[0].totalAmount);

    // Get applicable rules
    const rules = await db
      .select()
      .from(purchaseOrderApprovalRules)
      .where(
        and(
          eq(purchaseOrderApprovalRules.organizationId, ctx.organizationId),
          eq(purchaseOrderApprovalRules.isActive, true),
          or(
            isNull(purchaseOrderApprovalRules.minAmount),
            sql`${purchaseOrderApprovalRules.minAmount} <= ${orderAmount}`
          ),
          or(
            isNull(purchaseOrderApprovalRules.maxAmount),
            sql`${purchaseOrderApprovalRules.maxAmount} >= ${orderAmount}`
          )
        )
      )
      .orderBy(asc(purchaseOrderApprovalRules.priority));

    // Check for auto-approve
    const autoApproveRule = rules.find(
      (rule) =>
        rule.autoApproveUnder && Number(rule.autoApproveUnder) > orderAmount
    );

    if (autoApproveRule) {
      // Auto-approve the PO
      await db
        .update(purchaseOrders)
        .set({ status: 'approved', updatedBy: ctx.user.id })
        .where(eq(purchaseOrders.id, data.purchaseOrderId));

      return {
        autoApproved: true,
        rule: autoApproveRule.name,
        approvalRecords: [],
      };
    }

    // Create approval records for each required level
    const approvalRecords: string[] = [];
    let level = 1;

    for (const rule of rules) {
      if (!rule.requiresApproval) continue;

      // For each approver role in the rule, we would normally find users
      // For now, we create a placeholder approval record
      // The actual approver assignment would be done by finding users with matching roles

      const [approval] = await db
        .insert(purchaseOrderApprovals)
        .values({
          organizationId: ctx.organizationId,
          purchaseOrderId: data.purchaseOrderId,
          approverId: ctx.user.id, // Placeholder - should be actual approver
          level,
          status: 'pending',
          dueAt: new Date(Date.now() + (rule.escalationHours || 24) * 60 * 60 * 1000),
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        })
        .returning();

      approvalRecords.push(approval.id);
      level++;
    }

    // Update PO status to pending_approval
    if (approvalRecords.length > 0) {
      await db
        .update(purchaseOrders)
        .set({ status: 'pending_approval', updatedBy: ctx.user.id })
        .where(eq(purchaseOrders.id, data.purchaseOrderId));
    }

    return {
      autoApproved: false,
      requiredLevels: approvalRecords.length,
      approvalRecords,
    };
  });

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ListPendingApprovalsInput = z.infer<typeof listPendingApprovalsSchema>;
export type ApproveRejectInput = z.infer<typeof approveRejectSchema>;
export type RejectInput = z.infer<typeof rejectSchema>;
export type EscalateInput = z.infer<typeof escalateSchema>;
export type DelegateInput = z.infer<typeof delegateSchema>;
export type BulkApproveInput = z.infer<typeof bulkApproveSchema>;
