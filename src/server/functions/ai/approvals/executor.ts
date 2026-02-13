'use server'

/**
 * AI Approval Executor
 *
 * Executes approved AI actions with transaction safety.
 * Implements AI-INFRA-015 acceptance criteria.
 *
 * @see _Initiation/_prd/3-integrations/ai-infrastructure/ai-infrastructure.prd.json
 */

import { db } from '@/lib/db';
import { aiApprovals, aiApprovalEntities, type ExecutionResult } from 'drizzle/schema/_ai';
import { eq, and, sql, desc } from 'drizzle-orm';
import { getActionHandler } from './handlers';
import type { ExecuteActionResult, RejectActionResult } from '@/lib/ai/approvals/types';
import { logger } from '@/lib/logger';

// Re-export types
export type { ExecuteActionResult, RejectActionResult } from '@/lib/ai/approvals/types';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Maximum number of retry attempts before giving up */
const MAX_RETRIES = 3;

// ============================================================================
// EXECUTOR
// ============================================================================

/**
 * Execute an approved AI action.
 *
 * This function:
 * 1. Fetches and validates the approval record
 * 2. Uses SELECT FOR UPDATE to prevent race conditions
 * 3. Uses optimistic locking (version column) as additional safety
 * 4. Executes the action handler in a transaction
 * 5. Updates the approval record with the result
 *
 * @param approvalId - The approval ID to execute
 * @param userId - The user executing the action
 * @param organizationId - The organization ID for validation
 * @param expectedVersion - Expected version for optimistic locking (optional)
 * @returns Execution result
 */
export async function executeAction(
  approvalId: string,
  userId: string,
  organizationId: string,
  expectedVersion?: number
): Promise<ExecuteActionResult> {
  try {
    // Use transaction for atomicity
    const result = await db.transaction(async (tx) => {
      // Fetch approval with SELECT FOR UPDATE to prevent race conditions
      const [approval] = await tx
        .select()
        .from(aiApprovals)
        .where(
          and(
            eq(aiApprovals.id, approvalId),
            eq(aiApprovals.organizationId, organizationId)
          )
        )
        .for('update');

      // Validate approval exists
      if (!approval) {
        return {
          success: false,
          error: 'Approval not found',
          code: 'NOT_FOUND',
        };
      }

      // Validate status is pending
      if (approval.status !== 'pending') {
        return {
          success: false,
          error: `Approval is already ${approval.status}`,
          code: 'INVALID_STATUS',
        };
      }

      // Check if max retries exceeded
      if (approval.retryCount >= MAX_RETRIES) {
        return {
          success: false,
          error: `Maximum retries (${MAX_RETRIES}) exceeded`,
          code: 'MAX_RETRIES_EXCEEDED',
        };
      }

      // Optimistic locking: verify version matches if provided
      if (expectedVersion !== undefined && approval.version !== expectedVersion) {
        return {
          success: false,
          error: 'Approval was modified by another request (version mismatch)',
          code: 'VERSION_CONFLICT',
        };
      }

      // Check if expired
      if (approval.expiresAt < new Date()) {
        // Mark as expired with version increment
        await tx
          .update(aiApprovals)
          .set({
            status: 'expired',
            version: sql`${aiApprovals.version} + 1`,
          })
          .where(eq(aiApprovals.id, approvalId));

        return {
          success: false,
          error: 'Approval has expired',
          code: 'EXPIRED',
        };
      }

      // Get the action handler
      const handler = getActionHandler(approval.action);
      if (!handler) {
        return {
          success: false,
          error: `No handler found for action: ${approval.action}`,
          code: 'NO_HANDLER',
        };
      }

      // Build handler context - use db as base (tx is a compatible interface)
      const context = {
        userId,
        organizationId,
        approvalId,
        tx: tx as unknown as typeof db,
      };

      // Execute the handler
      const handlerResult = await handler(
        approval.actionData as unknown as Record<string, unknown>,
        context
      );

      // Update approval record based on result
      if (handlerResult.success) {
        const successResult: ExecutionResult = {
          success: true,
          entityId: handlerResult.entityId,
          entityType: handlerResult.entityType,
          details: handlerResult.data as Record<string, unknown> | undefined,
        };

        // Increment version on successful status change
        await tx
          .update(aiApprovals)
          .set({
            status: 'approved',
            approvedBy: userId,
            approvedAt: new Date(),
            executedAt: new Date(),
            executionResult: successResult,
            version: sql`${aiApprovals.version} + 1`,
          })
          .where(eq(aiApprovals.id, approvalId));

        // Record entity link for audit trail (if handler returned entity info)
        if (handlerResult.entityId && handlerResult.entityType) {
          await tx.insert(aiApprovalEntities).values({
            approvalId,
            entityType: handlerResult.entityType,
            entityId: handlerResult.entityId,
            action: approval.action.startsWith('create')
              ? 'created'
              : approval.action.startsWith('delete')
                ? 'deleted'
                : 'updated',
          });
        }

        return {
          success: true,
          result: handlerResult.data,
        };
      } else {
        // Handler failed - record error, increment retry count, keep status as pending for retry
        // Still increment version to track the attempt
        const failureResult: ExecutionResult = {
          success: false,
          error: handlerResult.error,
          details: {
            attemptedAt: new Date().toISOString(),
            attemptedBy: userId,
            retryCount: approval.retryCount + 1,
          },
        };

        await tx
          .update(aiApprovals)
          .set({
            executionResult: failureResult,
            retryCount: sql`${aiApprovals.retryCount} + 1`,
            lastError: handlerResult.error ?? 'Unknown handler error',
            lastAttemptAt: new Date(),
            version: sql`${aiApprovals.version} + 1`,
          })
          .where(eq(aiApprovals.id, approvalId));

        return {
          success: false,
          error: handlerResult.error,
          code: 'HANDLER_ERROR',
        };
      }
    });

    return result;
  } catch (error) {
    logger.error('[AI Approval Executor] Error executing action', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      code: 'EXECUTION_ERROR',
    };
  }
}

/**
 * Reject an AI approval.
 *
 * Uses a transaction with SELECT FOR UPDATE to prevent race conditions
 * where the same approval could be approved and rejected simultaneously.
 * Also uses optimistic locking (version column) as additional safety.
 *
 * @param approvalId - The approval ID to reject
 * @param userId - The user rejecting the action
 * @param organizationId - The organization ID for validation
 * @param reason - Reason for rejection
 * @param expectedVersion - Expected version for optimistic locking (optional)
 * @returns Rejection result
 */
export async function rejectAction(
  approvalId: string,
  userId: string,
  organizationId: string,
  reason?: string,
  expectedVersion?: number
): Promise<RejectActionResult> {
  try {
    // Use transaction with SELECT FOR UPDATE to prevent race conditions
    const result = await db.transaction(async (tx) => {
      // Fetch approval with lock to prevent concurrent modifications
      const [approval] = await tx
        .select()
        .from(aiApprovals)
        .where(
          and(
            eq(aiApprovals.id, approvalId),
            eq(aiApprovals.organizationId, organizationId)
          )
        )
        .for('update');

      // Validate approval exists
      if (!approval) {
        return {
          success: false,
          error: 'Approval not found',
        };
      }

      // Validate status is pending
      if (approval.status !== 'pending') {
        return {
          success: false,
          error: `Approval is already ${approval.status}`,
        };
      }

      // Optimistic locking: verify version matches if provided
      if (expectedVersion !== undefined && approval.version !== expectedVersion) {
        return {
          success: false,
          error: 'Approval was modified by another request (version mismatch)',
        };
      }

      // Update approval as rejected with version increment
      await tx
        .update(aiApprovals)
        .set({
          status: 'rejected',
          approvedBy: userId, // Using approvedBy to track who acted
          approvedAt: new Date(),
          rejectionReason: reason ?? 'User rejected',
          version: sql`${aiApprovals.version} + 1`,
        })
        .where(eq(aiApprovals.id, approvalId));

      return { success: true };
    });

    return result;
  } catch (error) {
    logger.error('[AI Approval Executor] Error rejecting action', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get pending approvals for a user.
 *
 * @param organizationId - Organization ID
 * @param options - Query options
 * @returns List of pending approvals
 */
export async function getPendingApprovals(
  organizationId: string,
  options: {
    userId?: string;
    limit?: number;
  } = {}
): Promise<{
  approvals: Array<typeof aiApprovals.$inferSelect>;
  total: number;
}> {
  const { userId, limit = 50 } = options;

  // Build conditions
  const conditions = [
    eq(aiApprovals.organizationId, organizationId),
    eq(aiApprovals.status, 'pending'),
    sql`${aiApprovals.expiresAt} > NOW()`,
  ];

  if (userId) {
    conditions.push(eq(aiApprovals.userId, userId));
  }

  // Get approvals
  const approvals = await db
    .select()
    .from(aiApprovals)
    .where(and(...conditions))
    .orderBy(aiApprovals.createdAt)
    .limit(limit);

  // Get total count
  const [countResult] = await db
    .select({ count: sql<number>`COUNT(*)::integer` })
    .from(aiApprovals)
    .where(and(...conditions));

  return {
    approvals,
    total: countResult?.count ?? 0,
  };
}

/**
 * Get approvals that have failed multiple times (stuck approvals).
 *
 * Useful for monitoring and alerting on repeatedly failing approvals.
 *
 * @param organizationId - Organization ID
 * @param options - Query options
 * @returns List of stuck approvals ordered by retry count (highest first)
 */
export async function getStuckApprovals(
  organizationId: string,
  options: {
    minRetries?: number;
    limit?: number;
  } = {}
): Promise<{
  approvals: Array<typeof aiApprovals.$inferSelect>;
  total: number;
}> {
  const { minRetries = 2, limit = 50 } = options;

  // Build conditions for stuck approvals
  const conditions = [
    eq(aiApprovals.organizationId, organizationId),
    eq(aiApprovals.status, 'pending'),
    sql`${aiApprovals.retryCount} >= ${minRetries}`,
  ];

  // Get stuck approvals ordered by retry count (most retries first)
  const approvals = await db
    .select()
    .from(aiApprovals)
    .where(and(...conditions))
    .orderBy(sql`${aiApprovals.retryCount} DESC`, aiApprovals.createdAt)
    .limit(limit);

  // Get total count
  const [countResult] = await db
    .select({ count: sql<number>`COUNT(*)::integer` })
    .from(aiApprovals)
    .where(and(...conditions));

  return {
    approvals,
    total: countResult?.count ?? 0,
  };
}

// ============================================================================
// ENTITY QUERY HELPERS
// ============================================================================

/**
 * Get all approvals that affected a specific entity.
 *
 * Useful for auditing what AI actions have been performed on an entity.
 *
 * @param entityType - The type of entity (e.g., 'customer', 'order', 'quote')
 * @param entityId - The entity's UUID
 * @param organizationId - The organization ID for tenant isolation
 * @returns List of approvals with the action taken on the entity
 */
export async function getApprovalsForEntity(
  entityType: string,
  entityId: string,
  organizationId: string
): Promise<
  Array<{
    approval: typeof aiApprovals.$inferSelect;
    entityLink: typeof aiApprovalEntities.$inferSelect;
  }>
> {
  const results = await db
    .select({
      approval: aiApprovals,
      entityLink: aiApprovalEntities,
    })
    .from(aiApprovalEntities)
    .innerJoin(aiApprovals, eq(aiApprovalEntities.approvalId, aiApprovals.id))
    .where(
      and(
        eq(aiApprovalEntities.entityType, entityType),
        eq(aiApprovalEntities.entityId, entityId),
        eq(aiApprovals.organizationId, organizationId)
      )
    )
    .orderBy(desc(aiApprovalEntities.createdAt));

  return results;
}

/**
 * Get all entities affected by a specific approval.
 *
 * @param approvalId - The approval's UUID
 * @param organizationId - The organization ID for tenant isolation
 * @returns List of entity links
 */
export async function getEntitiesForApproval(
  approvalId: string,
  organizationId: string
): Promise<Array<typeof aiApprovalEntities.$inferSelect>> {
  // First verify the approval belongs to the organization
  const [approval] = await db
    .select({ id: aiApprovals.id })
    .from(aiApprovals)
    .where(
      and(
        eq(aiApprovals.id, approvalId),
        eq(aiApprovals.organizationId, organizationId)
      )
    )
    .limit(1);

  if (!approval) {
    return [];
  }

  // Then fetch entities for this approval (limit to avoid unbounded reads)
  return db
    .select()
    .from(aiApprovalEntities)
    .where(eq(aiApprovalEntities.approvalId, approvalId))
    .limit(100);
}
