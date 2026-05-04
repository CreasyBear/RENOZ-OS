/**
 * Revenue recognition read helpers.
 */

import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  customers as customersTable,
  deferredRevenue,
  orders,
  revenueRecognition,
} from 'drizzle/schema';
import type { SessionContext } from '@/lib/server/protected';
import {
  getDeferredRevenueBalanceSchema,
  getOrderDeferredRevenueSchema,
  getOrderRecognitionsSchema,
  getRecognitionSummarySchema,
  listRecognitionsByStateSchema,
  type DeferredRevenueBalance,
  type DeferredRevenueRecord,
  type RecognitionSummary,
  type RevenueRecognitionRecord,
} from '@/lib/schemas';
import { safeNumber } from '@/lib/numeric';
import type { z } from 'zod';

export async function readOrderRecognitions(
  ctx: SessionContext,
  data: z.infer<typeof getOrderRecognitionsSchema>,
): Promise<RevenueRecognitionRecord[]> {
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
        eq(revenueRecognition.organizationId, ctx.organizationId),
      ),
    )
    .orderBy(desc(revenueRecognition.recognitionDate))
    .limit(100);

  return results.map((r) => ({
    ...r,
    recognitionDate: new Date(r.recognitionDate),
    createdAt: new Date(r.createdAt),
  }));
}

export async function readOrderDeferredRevenue(
  ctx: SessionContext,
  data: z.infer<typeof getOrderDeferredRevenueSchema>,
): Promise<DeferredRevenueRecord[]> {
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
        eq(deferredRevenue.organizationId, ctx.organizationId),
      ),
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
}

export async function readRecognitionsByState(
  ctx: SessionContext,
  data: z.infer<typeof listRecognitionsByStateSchema>,
) {
  const { state, dateFrom, dateTo, page, pageSize } = data;
  const offset = (page - 1) * pageSize;

  const conditions = [
    eq(revenueRecognition.organizationId, ctx.organizationId),
  ];

  if (state) {
    conditions.push(eq(revenueRecognition.state, state));
  }

  if (dateFrom) {
    conditions.push(
      gte(
        revenueRecognition.recognitionDate,
        dateFrom.toISOString().split('T')[0],
      ),
    );
  }

  if (dateTo) {
    conditions.push(
      lte(
        revenueRecognition.recognitionDate,
        dateTo.toISOString().split('T')[0],
      ),
    );
  }

  // Run data query and count query in parallel
  const countConditions = conditions;
  const [results, countResult, stateCountRows] = await Promise.all([
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
      .where(and(...countConditions)),
    db
      .select({
        state: revenueRecognition.state,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(revenueRecognition)
      .where(
        and(
          eq(revenueRecognition.organizationId, ctx.organizationId),
          ...(dateFrom
            ? [
                gte(
                  revenueRecognition.recognitionDate,
                  dateFrom.toISOString().split('T')[0],
                ),
              ]
            : []),
          ...(dateTo
            ? [
                lte(
                  revenueRecognition.recognitionDate,
                  dateTo.toISOString().split('T')[0],
                ),
              ]
            : []),
        ),
      )
      .groupBy(revenueRecognition.state),
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
    stateCounts: Object.fromEntries(
      stateCountRows.map((row) => [row.state, row.count]),
    ),
  };
}

export async function readRecognitionSummary(
  ctx: SessionContext,
  data: z.infer<typeof getRecognitionSummarySchema>,
): Promise<RecognitionSummary[]> {
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
        gte(
          revenueRecognition.recognitionDate,
          dateFrom.toISOString().split('T')[0],
        ),
        lte(
          revenueRecognition.recognitionDate,
          dateTo.toISOString().split('T')[0],
        ),
      ),
    )
    // RAW SQL (Phase 11 Keep): DATE_TRUNC for month grouping. Drizzle cannot express. See PHASE11-RAW-SQL-AUDIT.md
    .groupBy(
      sql`DATE_TRUNC('month', ${revenueRecognition.recognitionDate}::date)`,
    )
    .orderBy(
      sql`DATE_TRUNC('month', ${revenueRecognition.recognitionDate}::date)`,
    );

  return results.map(
    (r): RecognitionSummary => ({
      period: r.period,
      periodLabel: r.periodLabel,
      totalRecognized: safeNumber(r.totalRecognized),
      onDeliveryAmount: safeNumber(r.onDeliveryAmount),
      milestoneAmount: safeNumber(r.milestoneAmount),
      timeBasedAmount: safeNumber(r.timeBasedAmount),
      recordCount: r.recordCount,
    }),
  );
}

export async function readDeferredRevenueBalance(
  ctx: SessionContext,
  _data: z.infer<typeof getDeferredRevenueBalanceSchema>,
): Promise<DeferredRevenueBalance> {
  // Note: asOfDate filtering can be added later for historical snapshots

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
    totalDeferred: safeNumber(result?.totalDeferred),
    totalRecognized: safeNumber(result?.totalRecognized),
    totalRemaining: safeNumber(result?.totalRemaining),
    recordCount: result?.recordCount ?? 0,
    byStatus: {
      deferred: safeNumber(result?.deferredAmount),
      partiallyRecognized: safeNumber(result?.partiallyRecognizedAmount),
      fullyRecognized: safeNumber(result?.fullyRecognizedAmount),
    },
  };
}
