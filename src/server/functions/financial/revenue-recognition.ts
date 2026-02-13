/**
 * Revenue Recognition Server Functions
 *
 * Recognition engine for battery equipment revenue.
 * Supports milestone-based, on-delivery, and time-based recognition
 * with Xero sync state machine.
 *
 * Recognition types:
 * - on_delivery: Residential - full recognition when delivered
 * - milestone: Commercial - recognize on milestones (Battery delivery, Installation, Commission)
 * - time_based: Spread recognition over contract period
 *
 * State machine: PENDING -> RECOGNIZED -> SYNCING -> SYNCED
 *                                            \-> SYNC_FAILED (retry 5x) -> MANUAL_OVERRIDE
 *
 * @see _Initiation/_prd/2-domains/financial/financial.prd.json for DOM-FIN-008b
 */

import { createServerFn } from '@tanstack/react-start';
import { setResponseStatus } from '@tanstack/react-start/server';
import { eq, and, isNull, gte, lte, desc, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  revenueRecognition,
  deferredRevenue,
  orders,
  customers as customersTable,
} from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import {
  recognizeRevenueSchema,
  createDeferredRevenueSchema,
  releaseDeferredRevenueSchema,
  syncRecognitionToXeroSchema,
  retryRecognitionSyncSchema,
  getOrderRecognitionsSchema,
  getOrderDeferredRevenueSchema,
  listRecognitionsByStateSchema,
  getRecognitionSummarySchema,
  getDeferredRevenueBalanceSchema,
  type RevenueRecognitionRecord,
  type DeferredRevenueRecord,
  type RecognitionSummary,
  type DeferredRevenueBalance,
} from '@/lib/schemas';
import { NotFoundError, ValidationError } from '@/lib/server/errors';
import { createActivityLoggerWithContext } from '@/server/middleware/activity-context';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Maximum Xero sync retries before manual override */
const MAX_SYNC_RETRIES = 5;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// ============================================================================
// RECOGNIZE REVENUE
// ============================================================================

/**
 * Recognize revenue for an order.
 *
 * Creates a revenue recognition record and transitions state to RECOGNIZED.
 * For commercial milestones, specify the milestone name.
 */
export const recognizeRevenue = createServerFn({ method: 'POST' })
  .inputValidator(recognizeRevenueSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    const { orderId, recognitionType, milestoneName, amount, recognitionDate, notes } = data;

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
          isNull(orders.deletedAt)
        )
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
        recognitionDate: recognitionDate ?? new Date().toISOString().split('T')[0],
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
        recognizedAmount: Number(recognizedAmount),
        recognitionDate: recognition.recognitionDate,
      },
    });

    // Fire-and-forget sync to Xero
    void syncRecognitionToXero({ data: { recognitionId: recognition.id, force: false } }).catch(
      () => null
    );

    return {
      success: true,
      recognitionId: recognition.id,
      recognizedAmount,
      state: recognition.state,
    };
  });

// ============================================================================
// CREATE DEFERRED REVENUE
// ============================================================================

/**
 * Create a deferred revenue record for advance payments.
 * Used for 50% commercial deposits.
 */
export const createDeferredRevenue = createServerFn({ method: 'POST' })
  .inputValidator(createDeferredRevenueSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    const { orderId, amount, expectedRecognitionDate, reason } = data;

    // Verify order exists
    const [order] = await db
      .select({ id: orders.id })
      .from(orders)
      .where(
        and(
          eq(orders.id, orderId),
          eq(orders.organizationId, ctx.organizationId),
          isNull(orders.deletedAt)
        )
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
        total: Number(amount),
        expectedRecognitionDate: expectedRecognitionDate ?? undefined,
        reason: reason ?? undefined,
      },
    });

    return {
      success: true,
      deferredRevenueId: deferred.id,
      amount,
    };
  });

// ============================================================================
// RELEASE DEFERRED REVENUE
// ============================================================================

/**
 * Release (recognize) deferred revenue.
 * Creates a recognition record and updates deferred balance.
 * Both operations are wrapped in a transaction for atomicity.
 */
export const releaseDeferredRevenue = createServerFn({ method: 'POST' })
  .inputValidator(releaseDeferredRevenueSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    const { deferredRevenueId, amount, recognitionDate, milestoneName } = data;

    // Wrap all operations in a transaction for atomicity
    const result = await db.transaction(async (tx) => {
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
            eq(deferredRevenue.organizationId, ctx.organizationId)
          )
        );

      if (!deferred) {
        setResponseStatus(404);
        throw new NotFoundError('Deferred revenue record not found', 'deferredRevenue');
      }

      // Determine amount to release
      const releaseAmount = amount ?? deferred.remainingAmount;

      if (releaseAmount > deferred.remainingAmount) {
        throw new ValidationError(
          `Cannot release ${releaseAmount}. Only ${deferred.remainingAmount} remaining.`
        );
      }

      // Calculate new balances
      const newRemainingAmount = deferred.remainingAmount - releaseAmount;
      const newRecognizedAmount = (deferred.recognizedAmount ?? 0) + releaseAmount;

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
          recognitionDate: recognitionDate ?? new Date().toISOString().split('T')[0],
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
        releasedAmount: Number(result.releaseAmount),
        remainingAmount: Number(result.newRemainingAmount),
        newStatus: result.newStatus,
        milestoneName: milestoneName ?? undefined,
      },
    });

    // Fire-and-forget sync to Xero
    void syncRecognitionToXero({ data: { recognitionId: result.recognitionId, force: false } }).catch(
      () => null
    );

    return {
      success: true,
      recognitionId: result.recognitionId,
      releasedAmount: result.releaseAmount,
      remainingAmount: result.newRemainingAmount,
      status: result.newStatus,
    };
  });

// ============================================================================
// SYNC RECOGNITION TO XERO
// ============================================================================

/**
 * Sync a revenue recognition record to Xero as a manual journal.
 */
export const syncRecognitionToXero = createServerFn({ method: 'POST' })
  .inputValidator(syncRecognitionToXeroSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    const { recognitionId, force } = data;

    // Get recognition record
    // Select only columns needed for sync logic
    const [recognition] = await db
      .select({
        id: revenueRecognition.id,
        state: revenueRecognition.state,
        xeroJournalId: revenueRecognition.xeroJournalId,
        xeroSyncAttempts: revenueRecognition.xeroSyncAttempts,
      })
      .from(revenueRecognition)
      .where(
        and(
          eq(revenueRecognition.id, recognitionId),
          eq(revenueRecognition.organizationId, ctx.organizationId)
        )
      );

    if (!recognition) {
      setResponseStatus(404);
      throw new NotFoundError('Recognition record not found', 'revenueRecognition');
    }

    // Check if already synced
    if (recognition.state === 'synced' && recognition.xeroJournalId && !force) {
      return {
        success: true,
        xeroJournalId: recognition.xeroJournalId,
        state: recognition.state,
      };
    }

    // Check if manual override required
    if (recognition.state === 'manual_override') {
      throw new ValidationError('Recognition requires manual override. Please resolve in Xero.');
    }

    // Update to syncing — orgId for defense-in-depth
    await db
      .update(revenueRecognition)
      .set({
        state: 'syncing',
        lastXeroSyncAt: new Date(),
      })
      .where(
        and(
          eq(revenueRecognition.id, recognitionId),
          eq(revenueRecognition.organizationId, ctx.organizationId)
        )
      );

    try {
      // TODO(PHASE12-002): Actual Xero API call to create manual journal
      // This would use the Xero Manual Journals API
      // For now, simulate successful sync

      const mockJournalId = `MJ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      await db
        .update(revenueRecognition)
        .set({
          state: 'synced',
          xeroJournalId: mockJournalId,
          xeroSyncError: null,
          lastXeroSyncAt: new Date(),
        })
        .where(
          and(
            eq(revenueRecognition.id, recognitionId),
            eq(revenueRecognition.organizationId, ctx.organizationId)
          )
        );

      return {
        success: true,
        xeroJournalId: mockJournalId,
        state: 'synced',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const newAttempts = recognition.xeroSyncAttempts + 1;
      const newState = newAttempts >= MAX_SYNC_RETRIES ? 'manual_override' : 'sync_failed';

      await db
        .update(revenueRecognition)
        .set({
          state: newState,
          xeroSyncAttempts: newAttempts,
          xeroSyncError: errorMessage,
          lastXeroSyncAt: new Date(),
        })
        .where(
          and(
            eq(revenueRecognition.id, recognitionId),
            eq(revenueRecognition.organizationId, ctx.organizationId)
          )
        );

      return {
        success: false,
        error: errorMessage,
        state: newState,
        attempts: newAttempts,
      };
    }
  });

// ============================================================================
// RETRY SYNC
// ============================================================================

/**
 * Retry a failed recognition sync.
 */
export const retryRecognitionSync = createServerFn({ method: 'POST' })
  .inputValidator(retryRecognitionSyncSchema)
  .handler(async ({ data }) => {
    // Delegate to syncRecognitionToXero with force=true
    return syncRecognitionToXero({ data: { recognitionId: data.recognitionId, force: true } });
  });

// ============================================================================
// GET ORDER RECOGNITIONS
// ============================================================================

/**
 * Get all revenue recognition records for an order.
 */
export const getOrderRecognitions = createServerFn({ method: 'GET' })
  .inputValidator(getOrderRecognitionsSchema)
  .handler(async ({ data }): Promise<RevenueRecognitionRecord[]> => {
    const ctx = await withAuth();

    const results = await db
      .select({
        id: revenueRecognition.id,
        orderId: revenueRecognition.orderId,
        orderNumber: orders.orderNumber,
        customerId: orders.customerId,
        customerName: customersTable.name,
        recognitionType: revenueRecognition.recognitionType,
        milestoneName: revenueRecognition.milestoneName,
        recognizedAmount: revenueRecognition.recognizedAmount,
        recognitionDate: revenueRecognition.recognitionDate,
        state: revenueRecognition.state,
        xeroSyncAttempts: revenueRecognition.xeroSyncAttempts,
        xeroSyncError: revenueRecognition.xeroSyncError,
        lastXeroSyncAt: revenueRecognition.lastXeroSyncAt,
        xeroJournalId: revenueRecognition.xeroJournalId,
        notes: revenueRecognition.notes,
        createdAt: revenueRecognition.createdAt,
      })
      .from(revenueRecognition)
      .innerJoin(orders, eq(revenueRecognition.orderId, orders.id))
      .innerJoin(customersTable, eq(orders.customerId, customersTable.id))
      .where(
        and(
          eq(revenueRecognition.orderId, data.orderId),
          eq(revenueRecognition.organizationId, ctx.organizationId)
        )
      )
      .orderBy(desc(revenueRecognition.recognitionDate))
      .limit(100);

    return results.map((r) => ({
      ...r,
      recognitionDate: new Date(r.recognitionDate),
      createdAt: new Date(r.createdAt),
    }));
  });

// ============================================================================
// GET ORDER DEFERRED REVENUE
// ============================================================================

/**
 * Get deferred revenue records for an order.
 */
export const getOrderDeferredRevenue = createServerFn({ method: 'GET' })
  .inputValidator(getOrderDeferredRevenueSchema)
  .handler(async ({ data }): Promise<DeferredRevenueRecord[]> => {
    const ctx = await withAuth();

    const results = await db
      .select({
        id: deferredRevenue.id,
        orderId: deferredRevenue.orderId,
        orderNumber: orders.orderNumber,
        customerName: customersTable.name,
        originalAmount: deferredRevenue.originalAmount,
        remainingAmount: deferredRevenue.remainingAmount,
        recognizedAmount: deferredRevenue.recognizedAmount,
        deferralDate: deferredRevenue.deferralDate,
        expectedRecognitionDate: deferredRevenue.expectedRecognitionDate,
        status: deferredRevenue.status,
        reason: deferredRevenue.reason,
        createdAt: deferredRevenue.createdAt,
      })
      .from(deferredRevenue)
      .innerJoin(orders, eq(deferredRevenue.orderId, orders.id))
      .innerJoin(customersTable, eq(orders.customerId, customersTable.id))
      .where(
        and(
          eq(deferredRevenue.orderId, data.orderId),
          eq(deferredRevenue.organizationId, ctx.organizationId)
        )
      )
      .orderBy(desc(deferredRevenue.deferralDate))
      .limit(100);

    return results.map((r) => ({
      ...r,
      deferralDate: new Date(r.deferralDate),
      expectedRecognitionDate: r.expectedRecognitionDate
        ? new Date(r.expectedRecognitionDate)
        : null,
      createdAt: new Date(r.createdAt),
    }));
  });

// ============================================================================
// LIST RECOGNITIONS BY STATE
// ============================================================================

/**
 * List recognition records filtered by state.
 * Useful for finding failed syncs and manual overrides.
 */
export const listRecognitionsByState = createServerFn({ method: 'GET' })
  .inputValidator(listRecognitionsByStateSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    const { state, dateFrom, dateTo, page, pageSize } = data;
    const offset = (page - 1) * pageSize;

    const conditions = [eq(revenueRecognition.organizationId, ctx.organizationId)];

    if (state) {
      conditions.push(eq(revenueRecognition.state, state));
    }

    if (dateFrom) {
      conditions.push(
        gte(revenueRecognition.recognitionDate, dateFrom.toISOString().split('T')[0])
      );
    }

    if (dateTo) {
      conditions.push(lte(revenueRecognition.recognitionDate, dateTo.toISOString().split('T')[0]));
    }

    // Run data query and count query in parallel
    const [results, countResult] = await Promise.all([
      db
        .select({
          id: revenueRecognition.id,
          orderId: revenueRecognition.orderId,
          orderNumber: orders.orderNumber,
          customerId: orders.customerId,
          customerName: customersTable.name,
          recognitionType: revenueRecognition.recognitionType,
          milestoneName: revenueRecognition.milestoneName,
          recognizedAmount: revenueRecognition.recognizedAmount,
          recognitionDate: revenueRecognition.recognitionDate,
          state: revenueRecognition.state,
          xeroSyncAttempts: revenueRecognition.xeroSyncAttempts,
          xeroSyncError: revenueRecognition.xeroSyncError,
          lastXeroSyncAt: revenueRecognition.lastXeroSyncAt,
          xeroJournalId: revenueRecognition.xeroJournalId,
          notes: revenueRecognition.notes,
          createdAt: revenueRecognition.createdAt,
        })
        .from(revenueRecognition)
        .innerJoin(orders, eq(revenueRecognition.orderId, orders.id))
        .innerJoin(customersTable, eq(orders.customerId, customersTable.id))
        .where(and(...conditions))
        .orderBy(desc(revenueRecognition.recognitionDate))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(revenueRecognition)
        .where(and(...conditions)),
    ]);

    return {
      records: results.map((r) => ({
        ...r,
        recognitionDate: new Date(r.recognitionDate),
        createdAt: new Date(r.createdAt),
      })),
      total: countResult[0]?.count ?? 0,
      page,
      pageSize,
    };
  });

// ============================================================================
// GET RECOGNITION SUMMARY
// ============================================================================

/**
 * Get recognition summary by period for reports.
 */
export const getRecognitionSummary = createServerFn({ method: 'GET' })
  .inputValidator(getRecognitionSummarySchema)
  .handler(async ({ data }): Promise<RecognitionSummary[]> => {
    const ctx = await withAuth();
    const { dateFrom, dateTo } = data;

    // Use SQL GROUP BY with DATE_TRUNC and SUM(CASE WHEN) instead of in-memory aggregation
    const results = await db
      .select({
        period: sql<string>`TO_CHAR(DATE_TRUNC('month', ${revenueRecognition.recognitionDate}::date), 'YYYY-MM')`,
        periodLabel: sql<string>`TO_CHAR(DATE_TRUNC('month', ${revenueRecognition.recognitionDate}::date), 'FMMonth YYYY')`,
        totalRecognized: sql<number>`COALESCE(SUM(${revenueRecognition.recognizedAmount}), 0)::numeric`,
        onDeliveryAmount: sql<number>`COALESCE(SUM(CASE WHEN ${revenueRecognition.recognitionType} = 'on_delivery' THEN ${revenueRecognition.recognizedAmount} ELSE 0 END), 0)::numeric`,
        milestoneAmount: sql<number>`COALESCE(SUM(CASE WHEN ${revenueRecognition.recognitionType} = 'milestone' THEN ${revenueRecognition.recognizedAmount} ELSE 0 END), 0)::numeric`,
        timeBasedAmount: sql<number>`COALESCE(SUM(CASE WHEN ${revenueRecognition.recognitionType} = 'time_based' THEN ${revenueRecognition.recognizedAmount} ELSE 0 END), 0)::numeric`,
        recordCount: sql<number>`COUNT(*)::int`,
      })
      .from(revenueRecognition)
      .where(
        and(
          eq(revenueRecognition.organizationId, ctx.organizationId),
          gte(revenueRecognition.recognitionDate, dateFrom.toISOString().split('T')[0]),
          lte(revenueRecognition.recognitionDate, dateTo.toISOString().split('T')[0])
        )
      )
      // RAW SQL (Phase 11 Keep): DATE_TRUNC for month grouping. Drizzle cannot express. See PHASE11-RAW-SQL-AUDIT.md
      .groupBy(
        sql`DATE_TRUNC('month', ${revenueRecognition.recognitionDate}::date)`
      )
      .orderBy(sql`DATE_TRUNC('month', ${revenueRecognition.recognitionDate}::date)`);

    return results.map((r): RecognitionSummary => ({
      period: r.period,
      periodLabel: r.periodLabel,
      totalRecognized: Number(r.totalRecognized),
      onDeliveryAmount: Number(r.onDeliveryAmount),
      milestoneAmount: Number(r.milestoneAmount),
      timeBasedAmount: Number(r.timeBasedAmount),
      recordCount: r.recordCount,
    }));
  });

// ============================================================================
// GET DEFERRED REVENUE BALANCE
// ============================================================================

/**
 * Get deferred revenue balance summary.
 */
export const getDeferredRevenueBalance = createServerFn({ method: 'GET' })
  .inputValidator(getDeferredRevenueBalanceSchema)
  .handler(async ({ data: _data }): Promise<DeferredRevenueBalance> => {
    // Note: asOfDate filtering can be added later for historical snapshots
    const ctx = await withAuth();

    // Use SQL SUM(CASE WHEN) aggregation instead of in-memory loop
    const [result] = await db
      .select({
        totalDeferred: sql<number>`COALESCE(SUM(${deferredRevenue.originalAmount}), 0)::numeric`,
        totalRecognized: sql<number>`COALESCE(SUM(COALESCE(${deferredRevenue.recognizedAmount}, 0)), 0)::numeric`,
        totalRemaining: sql<number>`COALESCE(SUM(${deferredRevenue.remainingAmount}), 0)::numeric`,
        recordCount: sql<number>`COUNT(*)::int`,
        deferredAmount: sql<number>`COALESCE(SUM(CASE WHEN ${deferredRevenue.status} = 'deferred' THEN ${deferredRevenue.remainingAmount} ELSE 0 END), 0)::numeric`,
        partiallyRecognizedAmount: sql<number>`COALESCE(SUM(CASE WHEN ${deferredRevenue.status} = 'partially_recognized' THEN ${deferredRevenue.remainingAmount} ELSE 0 END), 0)::numeric`,
        fullyRecognizedAmount: sql<number>`COALESCE(SUM(CASE WHEN ${deferredRevenue.status} = 'fully_recognized' THEN ${deferredRevenue.originalAmount} ELSE 0 END), 0)::numeric`,
      })
      .from(deferredRevenue)
      .where(eq(deferredRevenue.organizationId, ctx.organizationId));

    return {
      totalDeferred: Number(result?.totalDeferred ?? 0),
      totalRecognized: Number(result?.totalRecognized ?? 0),
      totalRemaining: Number(result?.totalRemaining ?? 0),
      recordCount: result?.recordCount ?? 0,
      byStatus: {
        deferred: Number(result?.deferredAmount ?? 0),
        partiallyRecognized: Number(result?.partiallyRecognizedAmount ?? 0),
        fullyRecognized: Number(result?.fullyRecognizedAmount ?? 0),
      },
    };
  });
