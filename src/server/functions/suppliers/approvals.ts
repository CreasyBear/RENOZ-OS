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
import { eq, and, desc, asc, count, isNull, or, lt, gt, gte, lte, ilike, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  purchaseOrderApprovals,
  purchaseOrderApprovalRules,
  purchaseOrders,
  purchaseOrderItems,
  suppliers,
} from 'drizzle/schema/suppliers';
import { users } from 'drizzle/schema/users';
import { userRoleEnum } from 'drizzle/schema/_shared/enums';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import {
  listPendingApprovalsSchema,
  listPendingApprovalsCursorSchema,
  getApprovalDetailsSchema,
  approveRejectSchema,
  rejectSchema,
  escalateSchema,
  delegateSchema,
  revokeDelegationSchema,
  bulkApproveSchema,
  getApprovalIdsForPurchaseOrdersSchema,
  evaluateRulesSchema,
} from '@/lib/schemas/approvals';
import { NotFoundError, AuthError, ValidationError } from '@/lib/server/errors';
import { logger } from '@/lib/logger';
import { decodeCursor, buildCursorCondition, buildStandardCursorResponse } from '@/lib/db/pagination';
import { containsPattern } from '@/lib/db/utils';
import type { SQL } from 'drizzle-orm';

// ============================================================================
// CONSTANTS
// ============================================================================

const MS_PER_HOUR = 60 * 60 * 1000;

const PRIORITY_HOURS = {
  HIGH: 24,      // Due within 24 hours
  MEDIUM: 72,    // Due within 3 days
} as const;

const DEFAULT_ESCALATION_HOURS = 24;

const APPROVAL_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  ESCALATED: 'escalated',
} as const;

// Removed AUTO_ESCALATE_BATCH_SIZE - deprecated function removed

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Verify that the current user is authorized to act on an approval.
 * User must be either the assigned approver or the escalation target.
 */
function verifyApproverAuthorization(
  approval: { approverId: string; escalatedTo: string | null },
  userId: string,
  action: 'approve' | 'reject'
): void {
  if (approval.approverId !== userId && approval.escalatedTo !== userId) {
    throw new AuthError(`You are not authorized to ${action} this request`);
  }
}

/**
 * Check if there are remaining approval levels and update PO status if final level.
 * Returns true if PO status was updated to approved.
 */
async function checkAndUpdateFinalApprovalStatus(
  purchaseOrderId: string,
  currentLevel: number,
  userId: string
): Promise<boolean> {
  const nextLevel = await db
    .select()
    .from(purchaseOrderApprovals)
    .where(
      and(
        eq(purchaseOrderApprovals.purchaseOrderId, purchaseOrderId),
        eq(purchaseOrderApprovals.status, APPROVAL_STATUS.PENDING),
        gt(purchaseOrderApprovals.level, currentLevel)
      )
    )
    .limit(1);

  if (!nextLevel[0]) {
    await db
      .update(purchaseOrders)
      .set({ status: APPROVAL_STATUS.APPROVED, updatedBy: userId })
      .where(eq(purchaseOrders.id, purchaseOrderId));
    return true;
  }
  return false;
}

/**
 * Build priority filter condition based on due date ranges.
 */
function buildPriorityCondition(
  priority: 'urgent' | 'high' | 'medium' | 'low',
  now: Date
): SQL<unknown> {
  const nowMs = now.getTime();

  switch (priority) {
    case 'urgent':
      // Overdue: dueAt < now
      return lt(purchaseOrderApprovals.dueAt, now);
    case 'high': {
      // Due within 24 hours: now <= dueAt < now + 24h
      const tomorrow = new Date(nowMs + PRIORITY_HOURS.HIGH * MS_PER_HOUR);
      return and(
        gte(purchaseOrderApprovals.dueAt, now),
        lt(purchaseOrderApprovals.dueAt, tomorrow)
      )!;
    }
    case 'medium': {
      // Due within 3 days: now + 24h <= dueAt < now + 72h
      const tomorrow = new Date(nowMs + PRIORITY_HOURS.HIGH * MS_PER_HOUR);
      const threeDays = new Date(nowMs + PRIORITY_HOURS.MEDIUM * MS_PER_HOUR);
      return and(
        gte(purchaseOrderApprovals.dueAt, tomorrow),
        lt(purchaseOrderApprovals.dueAt, threeDays)
      )!;
    }
    case 'low': {
      // Due after 3 days: dueAt >= now + 72h
      const threeDays = new Date(nowMs + PRIORITY_HOURS.MEDIUM * MS_PER_HOUR);
      return gte(purchaseOrderApprovals.dueAt, threeDays);
    }
    default:
      throw new ValidationError(`Invalid priority: ${priority}`, {
        priority: ['Invalid priority value'],
      });
  }
}

/**
 * Find approvers by roles (reusable query pattern).
 */
async function findApproversByRoles(
  organizationId: string,
  roles: string[]
): Promise<Array<{ id: string; email: string; name: string | null }>> {
  // Filter and cast roles to valid enum values
  const validRoles = roles.filter((role) =>
    userRoleEnum.enumValues.includes(role as (typeof userRoleEnum.enumValues)[number])
  ) as (typeof userRoleEnum.enumValues)[number][];

  if (validRoles.length === 0) {
    return [];
  }

  return await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
    })
    .from(users)
    .where(
      and(
        eq(users.organizationId, organizationId),
        isNull(users.deletedAt),
        eq(users.status, 'active'),
        inArray(users.role, validRoles)
      )
    );
}

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
    const ctx = await withAuth({ permission: PERMISSIONS.suppliers.approve });

    const {
      status,
      search,
      type,
      priority,
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

    // Type filter: Currently all approvals are purchase orders
    // Reject non-'all' values until type field is implemented in schema
    if (type && type !== 'all') {
      throw new ValidationError(
        'Type filtering is not yet supported. All approvals are purchase orders.',
        { type: ['Type filtering not implemented'] }
      );
    }

    // Priority filter: Filter by dueAt date ranges
    if (priority && priority !== 'all') {
      const now = new Date();
      conditions.push(buildPriorityCondition(priority, now));
    }

    // Search filter: Search across PO number, supplier name, requester name/email (use containsPattern for safe search)
    if (search) {
      const searchPattern = containsPattern(search);
      conditions.push(
        or(
          ilike(purchaseOrders.poNumber, searchPattern),
          ilike(suppliers.name, searchPattern),
          ilike(users.name, searchPattern),
          ilike(users.email, searchPattern)
        )!
      );
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
        createdBy: purchaseOrders.createdBy,
        // Supplier fields
        supplierName: suppliers.name,
        // Requester/submitter fields (user who created the PO)
        requesterName: users.name,
        requesterEmail: users.email,
      })
      .from(purchaseOrderApprovals)
      .innerJoin(purchaseOrders, eq(purchaseOrderApprovals.purchaseOrderId, purchaseOrders.id))
      .leftJoin(
        suppliers,
        and(
          eq(purchaseOrders.supplierId, suppliers.id),
          eq(suppliers.organizationId, ctx.organizationId),
          isNull(suppliers.deletedAt)
        )
      )
      .leftJoin(
        users,
        and(
          eq(purchaseOrders.createdBy, users.id),
          eq(users.organizationId, ctx.organizationId),
          isNull(users.deletedAt)
        )
      )
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
 * List pending approvals with cursor pagination (recommended for large datasets).
 */
export const listPendingApprovalsCursor = createServerFn({ method: 'GET' })
  .inputValidator(listPendingApprovalsCursorSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.suppliers.approve });

    const { cursor, pageSize = 20, sortOrder = 'desc', status, search, type, priority } = data;

    const conditions = [
      eq(purchaseOrderApprovals.organizationId, ctx.organizationId),
      or(
        eq(purchaseOrderApprovals.approverId, ctx.user.id),
        eq(purchaseOrderApprovals.escalatedTo, ctx.user.id)
      ),
    ];

    if (status) conditions.push(eq(purchaseOrderApprovals.status, status));
    if (type && type !== 'all') {
      throw new ValidationError(
        'Type filtering is not yet supported. All approvals are purchase orders.',
        { type: ['Type filtering not implemented'] }
      );
    }
    if (priority && priority !== 'all') {
      const now = new Date();
      conditions.push(buildPriorityCondition(priority, now));
    }
    if (search) {
      const searchPattern = containsPattern(search);
      conditions.push(
        or(
          ilike(purchaseOrders.poNumber, searchPattern),
          ilike(suppliers.name, searchPattern),
          ilike(users.name, searchPattern),
          ilike(users.email, searchPattern)
        )!
      );
    }

    if (cursor) {
      const cursorPosition = decodeCursor(cursor);
      if (cursorPosition) {
        conditions.push(
          buildCursorCondition(purchaseOrderApprovals.createdAt, purchaseOrderApprovals.id, cursorPosition, sortOrder)
        );
      }
    }

    const orderDir = sortOrder === 'asc' ? asc : desc;
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
        poNumber: purchaseOrders.poNumber,
        totalAmount: purchaseOrders.totalAmount,
        currency: purchaseOrders.currency,
        poStatus: purchaseOrders.status,
        createdBy: purchaseOrders.createdBy,
        supplierName: suppliers.name,
        requesterName: users.name,
        requesterEmail: users.email,
      })
      .from(purchaseOrderApprovals)
      .innerJoin(purchaseOrders, eq(purchaseOrderApprovals.purchaseOrderId, purchaseOrders.id))
      .leftJoin(
        suppliers,
        and(
          eq(purchaseOrders.supplierId, suppliers.id),
          eq(suppliers.organizationId, ctx.organizationId),
          isNull(suppliers.deletedAt)
        )
      )
      .leftJoin(
        users,
        and(
          eq(purchaseOrders.createdBy, users.id),
          eq(users.organizationId, ctx.organizationId),
          isNull(users.deletedAt)
        )
      )
      .where(and(...conditions))
      .orderBy(orderDir(purchaseOrderApprovals.createdAt), orderDir(purchaseOrderApprovals.id))
      .limit(pageSize + 1);

    return buildStandardCursorResponse(items, pageSize);
  });

/**
 * Get detailed approval information including PO and approver details.
 */
export const getApprovalDetails = createServerFn({ method: 'GET' })
  .inputValidator(getApprovalDetailsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.suppliers.read });

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
      throw new NotFoundError('Approval not found', 'approval');
    }

    const items = await db
      .select({
        id: purchaseOrderItems.id,
        lineNumber: purchaseOrderItems.lineNumber,
        productName: purchaseOrderItems.productName,
        productSku: purchaseOrderItems.productSku,
        quantity: purchaseOrderItems.quantity,
        unitPrice: purchaseOrderItems.unitPrice,
        lineTotal: purchaseOrderItems.lineTotal,
      })
      .from(purchaseOrderItems)
      .where(
        and(
          eq(purchaseOrderItems.purchaseOrderId, result[0].purchaseOrderId),
          eq(purchaseOrderItems.organizationId, ctx.organizationId)
        )
      )
      .orderBy(asc(purchaseOrderItems.lineNumber));

    return { ...result[0], items };
  });

/**
 * Get approval history for a purchase order.
 */
export const getApprovalHistory = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ purchaseOrderId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.suppliers.read });

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
 * Uses a single query with conditional aggregation to avoid race conditions.
 */
export const getApprovalStats = createServerFn({ method: 'GET' }).handler(async () => {
  const ctx = await withAuth({ permission: PERMISSIONS.suppliers.read });

  // Base conditions for user's approvals
  const baseConditions = and(
    eq(purchaseOrderApprovals.organizationId, ctx.organizationId),
    or(
      eq(purchaseOrderApprovals.approverId, ctx.user.id),
      eq(purchaseOrderApprovals.escalatedTo, ctx.user.id)
    )
  );

  // Get status counts and overdue count in parallel (single point in time)
  const [statusStats, overdueResult] = await Promise.all([
    db
      .select({
        status: purchaseOrderApprovals.status,
        count: count(),
      })
      .from(purchaseOrderApprovals)
      .where(baseConditions)
      .groupBy(purchaseOrderApprovals.status),
    db
      .select({ count: count() })
      .from(purchaseOrderApprovals)
      .where(
        and(
          baseConditions,
          eq(purchaseOrderApprovals.status, APPROVAL_STATUS.PENDING),
          lt(purchaseOrderApprovals.dueAt, new Date())
        )
      ),
  ]);

  // Transform to object with type-safe status handling
  const result = {
    pending: 0,
    approved: 0,
    rejected: 0,
    escalated: 0,
    total: 0,
  };

  const validStatuses = [
    APPROVAL_STATUS.PENDING,
    APPROVAL_STATUS.APPROVED,
    APPROVAL_STATUS.REJECTED,
    APPROVAL_STATUS.ESCALATED,
  ] as const;

  statusStats.forEach((stat) => {
    const countNum = Number(stat.count);
    if (validStatuses.includes(stat.status as typeof validStatuses[number])) {
      result[stat.status as keyof typeof result] = countNum;
      result.total += countNum;
    } else {
      logger.warn('Unknown approval status in stats', { status: stat.status });
    }
  });

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
    const ctx = await withAuth({ permission: PERMISSIONS.suppliers.approve });

    // Get the approval record
    const approval = await db
      .select()
      .from(purchaseOrderApprovals)
      .where(
        and(
          eq(purchaseOrderApprovals.id, data.approvalId),
          eq(purchaseOrderApprovals.organizationId, ctx.organizationId),
          eq(purchaseOrderApprovals.status, APPROVAL_STATUS.PENDING)
        )
      )
      .limit(1);

    if (!approval[0]) {
      throw new NotFoundError('Approval not found or already processed', 'approval');
    }

    // Verify user is the assigned approver or escalation target
    verifyApproverAuthorization(approval[0], ctx.user.id, 'approve');

    // Update approval record
    const [updatedApproval] = await db
      .update(purchaseOrderApprovals)
      .set({
        status: APPROVAL_STATUS.APPROVED,
        comments: data.comments,
        approvedAt: new Date(),
        updatedBy: ctx.user.id,
      })
      .where(eq(purchaseOrderApprovals.id, data.approvalId))
      .returning();

    // Check if there are more levels required and update PO status if final level
    await checkAndUpdateFinalApprovalStatus(
      approval[0].purchaseOrderId,
      approval[0].level,
      ctx.user.id
    );

    return { approval: updatedApproval };
  });

/**
 * Reject a purchase order at the current approval level (multi-level workflow).
 */
export const rejectPurchaseOrderAtLevel = createServerFn({ method: 'POST' })
  .inputValidator(rejectSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.suppliers.approve });

    // Get the approval record
    const approval = await db
      .select()
      .from(purchaseOrderApprovals)
      .where(
        and(
          eq(purchaseOrderApprovals.id, data.approvalId),
          eq(purchaseOrderApprovals.organizationId, ctx.organizationId),
          eq(purchaseOrderApprovals.status, APPROVAL_STATUS.PENDING)
        )
      )
      .limit(1);

    if (!approval[0]) {
      throw new NotFoundError('Approval not found or already processed', 'approval');
    }

    // Verify user is the assigned approver or escalation target
    verifyApproverAuthorization(approval[0], ctx.user.id, 'reject');

    // Update approval record with rejection reason
    const [updatedApproval] = await db
      .update(purchaseOrderApprovals)
      .set({
        status: APPROVAL_STATUS.REJECTED,
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
 * Resolve approval IDs for selected purchase orders.
 * Returns pending approval IDs assigned to the current user for the given POs.
 * Used when bulk approving from the PO list.
 */
export const getApprovalIdsForPurchaseOrders = createServerFn({ method: 'POST' })
  .inputValidator(getApprovalIdsForPurchaseOrdersSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.suppliers.approve });

    const approvals = await db
      .select({ id: purchaseOrderApprovals.id })
      .from(purchaseOrderApprovals)
      .where(
        and(
          eq(purchaseOrderApprovals.organizationId, ctx.organizationId),
          eq(purchaseOrderApprovals.status, APPROVAL_STATUS.PENDING),
          inArray(purchaseOrderApprovals.purchaseOrderId, data.purchaseOrderIds),
          or(
            eq(purchaseOrderApprovals.approverId, ctx.user.id),
            eq(purchaseOrderApprovals.escalatedTo, ctx.user.id)
          )
        )
      );

    return { approvalIds: approvals.map((a) => a.id) };
  });

/**
 * Bulk approve multiple approvals.
 */
export const bulkApproveApprovals = createServerFn({ method: 'POST' })
  .inputValidator(bulkApproveSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.suppliers.approve });

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
              eq(purchaseOrderApprovals.status, APPROVAL_STATUS.PENDING),
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
            status: APPROVAL_STATUS.APPROVED,
            comments: data.comments,
            approvedAt: new Date(),
            updatedBy: ctx.user.id,
          })
          .where(eq(purchaseOrderApprovals.id, approvalId));

        // Check if final level and update PO status if needed
        await checkAndUpdateFinalApprovalStatus(
          approval[0].purchaseOrderId,
          approval[0].level,
          ctx.user.id
        );

        results.approved.push(approvalId);
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'Processing error';
        results.failed.push({ id: approvalId, reason });
        // Log error for debugging (in production, use proper logger)
        logger.error(`Bulk approve failed for ${approvalId}`, error);
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
    const ctx = await withAuth({ permission: PERMISSIONS.suppliers.approve });

    // Get the approval record
    const approval = await db
      .select()
      .from(purchaseOrderApprovals)
      .where(
        and(
          eq(purchaseOrderApprovals.id, data.approvalId),
          eq(purchaseOrderApprovals.organizationId, ctx.organizationId),
          eq(purchaseOrderApprovals.status, APPROVAL_STATUS.PENDING)
        )
      )
      .limit(1);

    if (!approval[0]) {
      throw new NotFoundError('Approval not found or already processed', 'approval');
    }

    // Validate escalation target exists and is active
    await validateApprover(data.escalateTo, ctx.organizationId);

    // Update with escalation
    const [updatedApproval] = await db
      .update(purchaseOrderApprovals)
      .set({
        status: APPROVAL_STATUS.ESCALATED,
        escalatedTo: data.escalateTo,
        escalatedAt: new Date(),
        escalationReason: data.reason,
        updatedBy: ctx.user.id,
      })
      .where(eq(purchaseOrderApprovals.id, data.approvalId))
      .returning();

    return { approval: updatedApproval };
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
    const ctx = await withAuth({ permission: PERMISSIONS.suppliers.approve });

    // Get the approval record
    const approval = await db
      .select()
      .from(purchaseOrderApprovals)
      .where(
        and(
          eq(purchaseOrderApprovals.id, data.approvalId),
          eq(purchaseOrderApprovals.organizationId, ctx.organizationId),
          eq(purchaseOrderApprovals.status, APPROVAL_STATUS.PENDING),
          eq(purchaseOrderApprovals.approverId, ctx.user.id)
        )
      )
      .limit(1);

    if (!approval[0]) {
      throw new NotFoundError('Approval not found or you are not the assigned approver', 'approval');
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

/**
 * Revoke a delegation, returning the approval to the original approver.
 * Can be called by either the original delegator or the current delegatee.
 */
export const revokeDelegation = createServerFn({ method: 'POST' })
  .inputValidator(revokeDelegationSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.suppliers.approve });

    // Get the approval record
    const approval = await db
      .select()
      .from(purchaseOrderApprovals)
      .where(
        and(
          eq(purchaseOrderApprovals.id, data.approvalId),
          eq(purchaseOrderApprovals.organizationId, ctx.organizationId),
          eq(purchaseOrderApprovals.status, APPROVAL_STATUS.PENDING)
        )
      )
      .limit(1);

    if (!approval[0]) {
      throw new NotFoundError('Approval not found or already processed', 'approval');
    }

    // Check if there's a delegation to revoke
    if (!approval[0].delegatedFrom) {
      throw new AuthError('This approval has not been delegated');
    }

    // Verify user is either the original delegator or the current delegatee
    const isOriginalDelegator = approval[0].delegatedFrom === ctx.user.id;
    const isCurrentDelegatee = approval[0].approverId === ctx.user.id;

    if (!isOriginalDelegator && !isCurrentDelegatee) {
      throw new AuthError(
        'You are not authorized to revoke this delegation. Only the original delegator or current delegatee can revoke.'
      );
    }

    // Revert approval back to original approver
    const [updatedApproval] = await db
      .update(purchaseOrderApprovals)
      .set({
        approverId: approval[0].delegatedFrom,
        delegatedFrom: null,
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
 * Find an approver for a given set of roles, considering workload balance.
 * Returns the approver with the least pending approvals.
 *
 * @param organizationId - Organization ID
 * @param approverRoles - Array of role names to match
 * @param escalationRoles - Optional escalation roles if primary approvers unavailable
 * @returns Approver user ID, or null if no approvers found
 */
async function findApproverByRoles(
  organizationId: string,
  approverRoles: string[],
  escalationRoles?: string[]
): Promise<{ id: string; email: string; name: string | null } | null> {
  if (!approverRoles || approverRoles.length === 0) {
    return null;
  }

  // Filter and cast approver roles to valid enum values (following invoices.ts pattern)
  const validApproverRoles = approverRoles.filter((role) =>
    userRoleEnum.enumValues.includes(role as (typeof userRoleEnum.enumValues)[number])
  ) as (typeof userRoleEnum.enumValues)[number][];

  if (validApproverRoles.length === 0) {
    return null;
  }

  // Get all active users with matching roles using shared helper
  const approvers = await findApproversByRoles(organizationId, approverRoles);

  if (approvers.length === 0) {
    // Try escalation roles if provided
    if (escalationRoles && escalationRoles.length > 0) {
      const escalationApprovers = await findApproversByRoles(organizationId, escalationRoles);

      if (escalationApprovers.length > 0) {
        // Return escalation approver with least workload (workload balancing below)
        return workloadBalanceApprovers(organizationId, escalationApprovers);
      }
    }

    return null;
  }

  // Return approver with least workload (P3: Workload balancing)
  return workloadBalanceApprovers(organizationId, approvers);
}

/**
 * Select approver with least pending approvals (workload balancing).
 *
 * @param organizationId - Organization ID
 * @param approvers - Array of potential approvers
 * @returns Approver with least workload, or first approver if all have same workload
 */
async function workloadBalanceApprovers(
  organizationId: string,
  approvers: Array<{ id: string; email: string; name: string | null }>
): Promise<{ id: string; email: string; name: string | null }> {
  if (approvers.length === 0) {
    throw new Error('No approvers provided for workload balancing');
  }

  if (approvers.length === 1) {
    return approvers[0] ?? null;
  }

  // Get pending approval counts for each approver
  const approverIds = approvers.map((a) => a.id);
  const workloadCounts = await db
    .select({
      approverId: purchaseOrderApprovals.approverId,
      count: count(),
    })
    .from(purchaseOrderApprovals)
    .where(
      and(
        eq(purchaseOrderApprovals.organizationId, organizationId),
        eq(purchaseOrderApprovals.status, 'pending'),
        inArray(purchaseOrderApprovals.approverId, approverIds)
      )
    )
    .groupBy(purchaseOrderApprovals.approverId);

  // Create workload map
  const workloadMap = new Map<string, number>();
  workloadCounts.forEach((wc) => {
    workloadMap.set(wc.approverId, wc.count);
  });

  // Sort by workload (ascending), then by name for consistency
  const sortedApprovers = approvers
    .map((approver) => ({
      ...approver,
      workload: workloadMap.get(approver.id) || 0,
    }))
    .sort((a, b) => {
      if (a.workload !== b.workload) {
        return a.workload - b.workload;
      }
      // If same workload, sort by name for consistency
      return (a.name || a.email).localeCompare(b.name || b.email);
    });

  return sortedApprovers[0] ?? null;
}

/**
 * Validate that an approver exists and is active.
 *
 * @param approverId - Approver user ID
 * @param organizationId - Organization ID
 * @throws ValidationError if approver not found or inactive
 */
async function validateApprover(
  approverId: string,
  organizationId: string
): Promise<void> {
  const approver = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      status: users.status,
    })
    .from(users)
    .where(
      and(
        eq(users.id, approverId),
        eq(users.organizationId, organizationId),
        isNull(users.deletedAt)
      )
    )
    .limit(1);

  if (!approver[0]) {
    throw new ValidationError(`Approver ${approverId} not found`, {
      approverId: ['Approver not found'],
    });
  }

  if (approver[0].status !== 'active') {
    throw new ValidationError(
      `Approver ${approver[0].email} is not active (status: ${approver[0].status})`,
      {
        approverId: [`Approver is ${approver[0].status}`],
      }
    );
  }
}

/**
 * Evaluate approval rules for a purchase order and create approval records.
 */
export const evaluateApprovalRules = createServerFn({ method: 'POST' })
  .inputValidator(evaluateRulesSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.suppliers.create });

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
      throw new NotFoundError('Purchase order not found', 'purchaseOrder');
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
            lte(purchaseOrderApprovalRules.minAmount, orderAmount)
          ),
          or(
            isNull(purchaseOrderApprovalRules.maxAmount),
            gte(purchaseOrderApprovalRules.maxAmount, orderAmount)
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
        .set({ status: APPROVAL_STATUS.APPROVED, updatedBy: ctx.user.id })
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

      // Find approver based on roles (P1: Role-based assignment)
      const approverRoles = rule.approverRoles || [];
      if (approverRoles.length === 0) {
        throw new ValidationError(
          `Approval rule "${rule.name}" has no approver roles configured. ` +
            `Please configure approver roles in the rule settings.`,
          {
            ruleId: ['Rule has no approver roles'],
          }
        );
      }

      const approver = await findApproverByRoles(
        ctx.organizationId,
        approverRoles,
        rule.escalationApproverRoles || undefined
      );

      if (!approver) {
        throw new ValidationError(
          `No active approvers found for roles: ${approverRoles.join(', ')}. ` +
            `Please ensure users with these roles exist and are active, ` +
            `or configure escalation approver roles in rule "${rule.name}".`,
          {
            approverRoles: ['No approvers found for these roles'],
          }
        );
      }

      // Validate approver exists and is active (P2: Approver validation)
      await validateApprover(approver.id, ctx.organizationId);

      // Create approval record with assigned approver
      const [approval] = await db
        .insert(purchaseOrderApprovals)
        .values({
          organizationId: ctx.organizationId,
          purchaseOrderId: data.purchaseOrderId,
          approverId: approver.id, // Use actual approver from role lookup
          level,
          status: APPROVAL_STATUS.PENDING,
          dueAt: new Date(Date.now() + (rule.escalationHours || DEFAULT_ESCALATION_HOURS) * MS_PER_HOUR),
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

// Types are now exported from @/lib/schemas/approvals
// Re-export for backwards compatibility
export type {
  ListPendingApprovalsInput,
  ApproveRejectInput,
  RejectInput,
  EscalateInput,
  DelegateInput,
  RevokeDelegationInput,
  BulkApproveInput,
  EvaluateRulesInput,
} from '@/lib/schemas/approvals';
