/**
 * Revenue recognition mutation helpers.
 */

import { setResponseStatus } from '@tanstack/react-start/server';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { deferredRevenue, orders, revenueRecognition } from 'drizzle/schema';
import { NotFoundError, ValidationError } from '@/lib/server/errors';
import type { SessionContext } from '@/lib/server/protected';
import { createActivityLoggerWithContext } from '@/server/middleware/activity-context';
import { safeNumber } from '@/lib/numeric';
import {
  createDeferredRevenueSchema,
  recognizeRevenueSchema,
  releaseDeferredRevenueSchema,
} from '@/lib/schemas';
import { syncRevenueRecognitionToXero } from './revenue-recognition-xero-sync';
import type { z } from 'zod';

export async function recognizeRevenueRecord(
  ctx: SessionContext,
  data: z.infer<typeof recognizeRevenueSchema>,
) {
  const {
    orderId,
    recognitionType,
    milestoneName,
    amount,
    recognitionDate,
    notes,
  } = data;

  // Get order details
  const [order] = await db
    .select({
      id: orders.id,
      total: orders.total,
      orderNumber: orders.orderNumber,
    })
    .from(orders)
    .where(
      and(
        eq(orders.id, orderId),
        eq(orders.organizationId, ctx.organizationId),
        isNull(orders.deletedAt),
      ),
    );

  if (!order) {
    setResponseStatus(404);
    throw new NotFoundError('Order not found', 'order');
  }

  // Determine amount to recognize
  const recognizedAmount = amount ?? order.total;

  // Create recognition record
  const [recognition] = await db
    .insert(revenueRecognition)
    .values({
      organizationId: ctx.organizationId,
      orderId,
      recognitionType,
      milestoneName: milestoneName ?? null,
      recognizedAmount,
      recognitionDate:
        recognitionDate ?? new Date().toISOString().split('T')[0],
      state: 'recognized',
      notes: notes ?? null,
    })
    .returning();

  // Activity logging
  const logger = createActivityLoggerWithContext(ctx);
  logger.logAsync({
    entityType: 'order',
    entityId: orderId,
    action: 'updated',
    description: `Recognized revenue: ${milestoneName ?? recognitionType}`,
    metadata: {
      orderId,
      orderNumber: order.orderNumber ?? undefined,
      recognitionId: recognition.id,
      recognitionType,
      milestoneName: milestoneName ?? undefined,
      recognizedAmount: safeNumber(recognizedAmount),
      recognitionDate: recognition.recognitionDate,
    },
  });

  // Fire-and-forget sync to Xero
  void syncRevenueRecognitionToXero(ctx, {
    recognitionId: recognition.id,
    force: false,
  }).catch(() => null);

  return {
    success: true,
    recognitionId: recognition.id,
    recognizedAmount,
    state: recognition.state,
  };
}

export async function createDeferredRevenueRecord(
  ctx: SessionContext,
  data: z.infer<typeof createDeferredRevenueSchema>,
) {
  const { orderId, amount, expectedRecognitionDate, reason } = data;

  // Verify order exists
  const [order] = await db
    .select({ id: orders.id })
    .from(orders)
    .where(
      and(
        eq(orders.id, orderId),
        eq(orders.organizationId, ctx.organizationId),
        isNull(orders.deletedAt),
      ),
    );

  if (!order) {
    setResponseStatus(404);
    throw new NotFoundError('Order not found', 'order');
  }

  // Create deferred revenue record
  const [deferred] = await db
    .insert(deferredRevenue)
    .values({
      organizationId: ctx.organizationId,
      orderId,
      originalAmount: amount,
      remainingAmount: amount,
      recognizedAmount: 0,
      deferralDate: new Date().toISOString().split('T')[0],
      expectedRecognitionDate: expectedRecognitionDate ?? null,
      status: 'deferred',
      reason: reason ?? null,
    })
    .returning();

  // Activity logging
  const logger = createActivityLoggerWithContext(ctx);
  logger.logAsync({
    entityType: 'order',
    entityId: orderId,
    action: 'created',
    description: `Created deferred revenue record`,
    metadata: {
      orderId,
      deferredRevenueId: deferred.id,
      total: safeNumber(amount),
      expectedRecognitionDate: expectedRecognitionDate ?? undefined,
      reason: reason ?? undefined,
    },
  });

  return {
    success: true,
    deferredRevenueId: deferred.id,
    amount,
  };
}

export async function releaseDeferredRevenueRecord(
  ctx: SessionContext,
  data: z.infer<typeof releaseDeferredRevenueSchema>,
) {
  const { deferredRevenueId, amount, recognitionDate, milestoneName } = data;

  // Wrap all operations in a transaction for atomicity
  const result = await db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`,
    );
    // Get deferred revenue record INSIDE transaction
    const [deferred] = await tx
      .select({
        id: deferredRevenue.id,
        orderId: deferredRevenue.orderId,
        remainingAmount: deferredRevenue.remainingAmount,
        recognizedAmount: deferredRevenue.recognizedAmount,
        originalAmount: deferredRevenue.originalAmount,
      })
      .from(deferredRevenue)
      .where(
        and(
          eq(deferredRevenue.id, deferredRevenueId),
          eq(deferredRevenue.organizationId, ctx.organizationId),
        ),
      );

    if (!deferred) {
      setResponseStatus(404);
      throw new NotFoundError(
        'Deferred revenue record not found',
        'deferredRevenue',
      );
    }

    // Determine amount to release
    const releaseAmount = amount ?? deferred.remainingAmount;

    if (releaseAmount > deferred.remainingAmount) {
      throw new ValidationError(
        `Cannot release ${releaseAmount}. Only ${deferred.remainingAmount} remaining.`,
      );
    }

    // Calculate new balances
    const newRemainingAmount = deferred.remainingAmount - releaseAmount;
    const newRecognizedAmount =
      (deferred.recognizedAmount ?? 0) + releaseAmount;

    // Determine new status
    const newStatus =
      newRemainingAmount === 0
        ? 'fully_recognized'
        : newRecognizedAmount > 0
          ? 'partially_recognized'
          : 'deferred';

    // Update deferred revenue record
    await tx
      .update(deferredRevenue)
      .set({
        remainingAmount: newRemainingAmount,
        recognizedAmount: newRecognizedAmount,
        status: newStatus,
      })
      .where(eq(deferredRevenue.id, deferredRevenueId));

    // Create recognition record
    const [recognition] = await tx
      .insert(revenueRecognition)
      .values({
        organizationId: ctx.organizationId,
        orderId: deferred.orderId,
        recognitionType: 'milestone',
        milestoneName: milestoneName ?? 'Deferred revenue release',
        recognizedAmount: releaseAmount,
        recognitionDate:
          recognitionDate ?? new Date().toISOString().split('T')[0],
        state: 'recognized',
        notes: `Released from deferred revenue ${deferredRevenueId}`,
      })
      .returning();

    return {
      recognitionId: recognition.id,
      orderId: deferred.orderId,
      releaseAmount,
      newRemainingAmount,
      newStatus,
    };
  });

  // Activity logging - orderId is now returned from the transaction
  const logger = createActivityLoggerWithContext(ctx);
  logger.logAsync({
    entityType: 'order',
    entityId: result.orderId,
    action: 'updated',
    description: `Released deferred revenue: ${milestoneName ?? 'Deferred revenue release'}`,
    metadata: {
      orderId: result.orderId,
      deferredRevenueId,
      recognitionId: result.recognitionId,
      releasedAmount: safeNumber(result.releaseAmount),
      remainingAmount: safeNumber(result.newRemainingAmount),
      newStatus: result.newStatus,
      milestoneName: milestoneName ?? undefined,
    },
  });

  // Fire-and-forget sync to Xero
  void syncRevenueRecognitionToXero(ctx, {
    recognitionId: result.recognitionId,
    force: false,
  }).catch(() => null);

  return {
    success: true,
    recognitionId: result.recognitionId,
    releasedAmount: result.releaseAmount,
    remainingAmount: result.newRemainingAmount,
    status: result.newStatus,
  };
}
