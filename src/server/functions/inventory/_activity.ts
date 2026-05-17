import { and, eq, isNotNull, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { inventoryLogger } from '@/lib/logger';
import { activities } from 'drizzle/schema';

export type InventoryDbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface InventoryActivityContext {
  organizationId: string;
  user: {
    id: string;
  };
}

/**
 * Safely check if an activity with the given movementId already exists.
 * Uses safe JSON extraction with NULL checks to prevent errors.
 */
export async function checkActivityExists(
  tx: InventoryDbTransaction,
  organizationId: string,
  movementId: string
): Promise<boolean> {
  // RAW SQL (Phase 11 Keep): JSONB extract, historical CTEs, complex EXISTS. Drizzle cannot express. See PHASE11-RAW-SQL-AUDIT.md
  const [existing] = await tx
    .select({ id: activities.id })
    .from(activities)
    .where(
      and(
        eq(activities.organizationId, organizationId),
        isNotNull(activities.metadata),
        sql`${activities.metadata}->>'movementId' = ${movementId}`
      )
    )
    .limit(1);
  return !!existing;
}

/**
 * Log activity inside transaction with safe error handling.
 * If logging fails, transaction continues (activity logging is non-critical).
 */
export async function logActivityInTransaction(
  tx: InventoryDbTransaction,
  ctx: InventoryActivityContext,
  params: {
    entityType: 'product' | 'inventory';
    entityId: string;
    action: 'created' | 'updated' | 'deleted';
    description: string;
    metadata: Record<string, unknown>;
  }
): Promise<void> {
  try {
    await tx.insert(activities).values({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      description: params.description,
      metadata: params.metadata as Record<string, unknown>,
      createdBy: ctx.user.id,
    });
  } catch (error) {
    // Activity logging is non-critical for inventory mutations.
    inventoryLogger.error('[logActivityInTransaction] Failed to log activity', error, {
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
    });
  }
}
