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
import { eq, and, isNull, gte, lte, desc } from 'drizzle-orm';
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

// ============================================================================
// CONSTANTS
// ============================================================================

/** Maximum Xero sync retries before manual override */
const MAX_SYNC_RETRIES = 5;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get month key for grouping.
 */
function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Get month label.
 */
function getMonthLabel(date: Date): string {
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

// ============================================================================
// RECOGNIZE REVENUE
// ============================================================================

/**
 * Recognize revenue for an order.
 *
 * Creates a revenue recognition record and transitions state to RECOGNIZED.
 * For commercial milestones, specify the milestone name.
 */
export const recognizeRevenue = createServerFn()
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
      throw new Error('Order not found');
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
export const createDeferredRevenue = createServerFn()
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
      throw new Error('Order not found');
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
export const releaseDeferredRevenue = createServerFn()
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
        throw new Error('Deferred revenue record not found');
      }

      // Determine amount to release
      const releaseAmount = amount ?? deferred.remainingAmount;

      if (releaseAmount > deferred.remainingAmount) {
        throw new Error(
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
        releaseAmount,
        newRemainingAmount,
        newStatus,
      };
    });

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
export const syncRecognitionToXero = createServerFn()
  .inputValidator(syncRecognitionToXeroSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    const { recognitionId, force } = data;

    // Get recognition record
    const [recognition] = await db
      .select()
      .from(revenueRecognition)
      .where(
        and(
          eq(revenueRecognition.id, recognitionId),
          eq(revenueRecognition.organizationId, ctx.organizationId)
        )
      );

    if (!recognition) {
      throw new Error('Recognition record not found');
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
      throw new Error('Recognition requires manual override. Please resolve in Xero.');
    }

    // Update to syncing
    await db
      .update(revenueRecognition)
      .set({
        state: 'syncing',
        lastXeroSyncAt: new Date(),
      })
      .where(eq(revenueRecognition.id, recognitionId));

    try {
      // TODO: Actual Xero API call to create manual journal
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
        .where(eq(revenueRecognition.id, recognitionId));

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
        .where(eq(revenueRecognition.id, recognitionId));

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
export const retryRecognitionSync = createServerFn()
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
export const getOrderRecognitions = createServerFn()
  .inputValidator(getOrderRecognitionsSchema)
  .handler(async ({ data }): Promise<RevenueRecognitionRecord[]> => {
    const ctx = await withAuth();

    const results = await db
      .select({
        id: revenueRecognition.id,
        orderId: revenueRecognition.orderId,
        orderNumber: orders.orderNumber,
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
      .orderBy(desc(revenueRecognition.recognitionDate));

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
export const getOrderDeferredRevenue = createServerFn()
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
      .orderBy(desc(deferredRevenue.deferralDate));

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
export const listRecognitionsByState = createServerFn()
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

    const results = await db
      .select({
        id: revenueRecognition.id,
        orderId: revenueRecognition.orderId,
        orderNumber: orders.orderNumber,
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
      .offset(offset);

    return {
      records: results.map((r) => ({
        ...r,
        recognitionDate: new Date(r.recognitionDate),
        createdAt: new Date(r.createdAt),
      })),
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
export const getRecognitionSummary = createServerFn()
  .inputValidator(getRecognitionSummarySchema)
  .handler(async ({ data }): Promise<RecognitionSummary[]> => {
    const ctx = await withAuth();
    const { dateFrom, dateTo } = data;

    const results = await db
      .select({
        recognitionDate: revenueRecognition.recognitionDate,
        recognitionType: revenueRecognition.recognitionType,
        recognizedAmount: revenueRecognition.recognizedAmount,
      })
      .from(revenueRecognition)
      .where(
        and(
          eq(revenueRecognition.organizationId, ctx.organizationId),
          gte(revenueRecognition.recognitionDate, dateFrom.toISOString().split('T')[0]),
          lte(revenueRecognition.recognitionDate, dateTo.toISOString().split('T')[0])
        )
      )
      .orderBy(revenueRecognition.recognitionDate);

    // Group by month
    const periodMap = new Map<string, RecognitionSummary>();

    for (const r of results) {
      const date = new Date(r.recognitionDate);
      const periodKey = getMonthKey(date);

      if (!periodMap.has(periodKey)) {
        periodMap.set(periodKey, {
          period: periodKey,
          periodLabel: getMonthLabel(date),
          totalRecognized: 0,
          onDeliveryAmount: 0,
          milestoneAmount: 0,
          timeBasedAmount: 0,
          recordCount: 0,
        });
      }

      const summary = periodMap.get(periodKey)!;
      summary.totalRecognized += r.recognizedAmount;
      summary.recordCount++;

      switch (r.recognitionType) {
        case 'on_delivery':
          summary.onDeliveryAmount += r.recognizedAmount;
          break;
        case 'milestone':
          summary.milestoneAmount += r.recognizedAmount;
          break;
        case 'time_based':
          summary.timeBasedAmount += r.recognizedAmount;
          break;
      }
    }

    return Array.from(periodMap.values()).sort((a, b) => a.period.localeCompare(b.period));
  });

// ============================================================================
// GET DEFERRED REVENUE BALANCE
// ============================================================================

/**
 * Get deferred revenue balance summary.
 */
export const getDeferredRevenueBalance = createServerFn()
  .inputValidator(getDeferredRevenueBalanceSchema)
  .handler(async ({ data: _data }): Promise<DeferredRevenueBalance> => {
    // Note: asOfDate filtering can be added later for historical snapshots
    const ctx = await withAuth();

    const results = await db
      .select({
        originalAmount: deferredRevenue.originalAmount,
        remainingAmount: deferredRevenue.remainingAmount,
        recognizedAmount: deferredRevenue.recognizedAmount,
        status: deferredRevenue.status,
      })
      .from(deferredRevenue)
      .where(eq(deferredRevenue.organizationId, ctx.organizationId));

    let totalDeferred = 0;
    let totalRecognized = 0;
    let totalRemaining = 0;
    const byStatus = {
      deferred: 0,
      partiallyRecognized: 0,
      fullyRecognized: 0,
    };

    for (const r of results) {
      totalDeferred += r.originalAmount;
      totalRecognized += r.recognizedAmount ?? 0;
      totalRemaining += r.remainingAmount;

      switch (r.status) {
        case 'deferred':
          byStatus.deferred += r.remainingAmount;
          break;
        case 'partially_recognized':
          byStatus.partiallyRecognized += r.remainingAmount;
          break;
        case 'fully_recognized':
          byStatus.fullyRecognized += r.originalAmount;
          break;
      }
    }

    return {
      totalDeferred,
      totalRecognized,
      totalRemaining,
      recordCount: results.length,
      byStatus,
    };
  });
