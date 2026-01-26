/**
 * AI Approval Executor
 *
 * Executes approved AI actions with transaction safety.
 * Implements AI-INFRA-015 acceptance criteria.
 *
 * @see _Initiation/_prd/3-integrations/ai-infrastructure/ai-infrastructure.prd.json
 */

import { db } from '@/lib/db';
import { aiApprovals, type ExecutionResult } from 'drizzle/schema/_ai';
import { eq, and, sql } from 'drizzle-orm';
import { getActionHandler } from './handlers';

// ============================================================================
// TYPES
// ============================================================================

export interface ExecuteActionResult {
  /** Whether the action was executed successfully */
  success: boolean;
  /** Result data from the handler */
  result?: unknown;
  /** Error message if failed */
  error?: string;
  /** Error code for categorization */
  code?: string;
}

export interface RejectActionResult {
  /** Whether the rejection was recorded */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

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

        return {
          success: true,
          result: handlerResult.data,
        };
      } else {
        // Handler failed - record error but keep status as pending for retry
        // Still increment version to track the attempt
        const failureResult: ExecutionResult = {
          success: false,
          error: handlerResult.error,
          details: {
            attemptedAt: new Date().toISOString(),
            attemptedBy: userId,
          },
        };

        await tx
          .update(aiApprovals)
          .set({
            executionResult: failureResult,
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
    console.error('[AI Approval Executor] Error executing action:', error);
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
    console.error('[AI Approval Executor] Error rejecting action:', error);
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
