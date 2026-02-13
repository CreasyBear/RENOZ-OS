/**
 * Bulk Operation Rollback Server Functions
 *
 * Server functions for rolling back bulk operations using audit logs.
 * Uses audit_logs table to restore previous state.
 *
 * SECURITY: All functions use withAuth for authentication and
 * filter by organizationId for multi-tenant isolation.
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, gte, desc, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/server/protected';
import { NotFoundError, ValidationError } from '@/lib/server/errors';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { auditLogs } from 'drizzle/schema/_shared/audit-logs';
import { customers } from 'drizzle/schema/customers/customers';
import {
  listRecentBulkOperationsSchema,
  rollbackBulkOperationSchema,
} from '@/lib/schemas/customers/rollback';

// ============================================================================
// LIST RECENT BULK OPERATIONS
// ============================================================================

/**
 * List recent bulk operations that can be rolled back
 */
export const listRecentBulkOperations = createServerFn({ method: 'GET' })
  .inputValidator(listRecentBulkOperationsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });

    const { entityType, limit = 10, hours = 24 } = data;

    // Calculate cutoff time
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hours);

    // Build where conditions
    const conditions = [
      eq(auditLogs.organizationId, ctx.organizationId),
      gte(auditLogs.timestamp, cutoffTime),
      // Only bulk operations
      sql`${auditLogs.action} LIKE '%.bulk_%'`,
    ];

    if (entityType) {
      conditions.push(eq(auditLogs.entityType, entityType));
    }

    const whereClause = and(...conditions);

    // Get recent bulk operations
    const operations = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        timestamp: auditLogs.timestamp,
        oldValues: auditLogs.oldValues,
        newValues: auditLogs.newValues,
        metadata: auditLogs.metadata,
        userId: auditLogs.userId,
      })
      .from(auditLogs)
      .where(whereClause)
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit);

    return {
      operations: operations.map((op) => ({
        id: op.id,
        action: op.action,
        entityType: op.entityType,
        timestamp: op.timestamp,
        affectedCount: (op.metadata as { affectedCount?: number })?.affectedCount ?? 0,
        operationType: (op.metadata as { operationType?: string })?.operationType ?? 'unknown',
        canRollback: !!op.oldValues && Object.keys(op.oldValues).length > 0,
      })),
    };
  });

// ============================================================================
// ROLLBACK BULK OPERATION
// ============================================================================

/**
 * Rollback a bulk operation by restoring oldValues from audit log
 */
export const rollbackBulkOperation = createServerFn({ method: 'POST' })
  .inputValidator(rollbackBulkOperationSchema)
  .handler(async ({ data }): Promise<{ success: boolean; restored: number }> => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update });

    const { auditLogId } = data;

    // Get the audit log entry
    const [auditLog] = await db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.id, auditLogId),
          eq(auditLogs.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!auditLog) {
      throw new NotFoundError('Audit log entry not found', 'auditLog');
    }

    // Check if rollback is possible
    if (!auditLog.oldValues || typeof auditLog.oldValues !== 'object') {
      throw new ValidationError('Cannot rollback: no previous state available', { rollback: ['Cannot rollback: no previous state available'] });
    }

    // Check if operation is too old (24 hour limit)
    const operationAge = Date.now() - new Date(auditLog.timestamp).getTime();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    if (operationAge > maxAge) {
      throw new ValidationError(
        'Cannot rollback: operation is older than 24 hours',
        { rollback: ['Cannot rollback: operation is older than 24 hours'] }
      );
    }

    const oldValues = auditLog.oldValues as Record<string, unknown>;
    const newValues = auditLog.newValues as Record<string, unknown> | null;

    // Determine operation type and rollback accordingly
    if (auditLog.action === 'customer.bulk_update_health_scores') {
      // Rollback health score updates
      const customerIds = newValues?.customerIds as string[] | undefined;
      if (!customerIds || !Array.isArray(customerIds)) {
        throw new ValidationError('Invalid audit log: missing customer IDs', { rollback: ['Invalid audit log: missing customer IDs'] });
      }

      // C29: Wrap loop in transaction to avoid N+1 partial failures
      const restored = await db.transaction(async (tx) => {
        let count = 0;
        interface CustomerRollbackState {
          healthScore?: number | null;
          healthScoreUpdatedAt?: string | Date | null;
        }
        for (const customerId of customerIds) {
          const oldState = oldValues[customerId] as CustomerRollbackState | undefined;
          if (oldState && typeof oldState === 'object') {
            const healthScoreUpdatedAt =
              oldState.healthScoreUpdatedAt != null
                ? typeof oldState.healthScoreUpdatedAt === 'string'
                  ? oldState.healthScoreUpdatedAt
                  : oldState.healthScoreUpdatedAt.toISOString()
                : null;
            await tx
              .update(customers)
              .set({
                healthScore: oldState.healthScore ?? null,
                healthScoreUpdatedAt,
                updatedBy: ctx.user.id,
              })
              .where(
                and(
                  eq(customers.id, customerId),
                  eq(customers.organizationId, ctx.organizationId)
                )
              );
            count++;
          }
        }

        // Log the rollback operation
        await tx.insert(auditLogs).values({
          organizationId: ctx.organizationId,
          userId: ctx.user.id,
          action: 'customer.bulk_operation.rollback',
          entityType: auditLog.entityType,
          entityId: null,
          oldValues: newValues,
          newValues: oldValues,
          metadata: {
            rolledBackAuditLogId: auditLogId,
            originalAction: auditLog.action,
            restoredCount: count,
          },
        });

        return count;
      });

      return { success: true, restored };
    }

    // Add more operation types as needed
    throw new ValidationError(
      `Rollback not supported for operation type: ${auditLog.action}`,
      { rollback: [`Rollback not supported for operation type: ${auditLog.action}`] }
    );
  });
