/**
 * Win/Loss Reasons Server Functions
 *
 * API for managing win/loss reasons and analysis.
 *
 * @see _Initiation/_prd/2-domains/pipeline/pipeline.prd.json (PIPE-WINLOSS-API)
 */

import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { eq, and, desc, asc, sql, gte, lte, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { winLossReasons, opportunities } from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import {
  createWinLossReasonSchema,
  updateWinLossReasonSchema,
  winLossReasonFilterSchema,
  winLossReasonParamsSchema,
  type WinLossReasonType,
} from '@/lib/schemas';

// ============================================================================
// LIST WIN/LOSS REASONS
// ============================================================================

/**
 * List all win/loss reasons for the organization.
 * Can filter by type (win or loss) and active status.
 */
export const listWinLossReasons = createServerFn({ method: 'GET' })
  .inputValidator(winLossReasonFilterSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.read ?? 'opportunity:read' });

    const { type, isActive } = data;

    // Build conditions
    const conditions = [eq(winLossReasons.organizationId, ctx.organizationId)];

    if (type) {
      conditions.push(eq(winLossReasons.type, type));
    }
    if (isActive !== undefined) {
      conditions.push(eq(winLossReasons.isActive, isActive));
    }

    const results = await db
      .select()
      .from(winLossReasons)
      .where(and(...conditions))
      .orderBy(asc(winLossReasons.sortOrder), asc(winLossReasons.name));

    return {
      reasons: results,
      totalCount: results.length,
    };
  });

// ============================================================================
// GET WIN/LOSS REASON
// ============================================================================

/**
 * Get a single win/loss reason by ID.
 */
export const getWinLossReason = createServerFn({ method: 'GET' })
  .inputValidator(winLossReasonParamsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.read ?? 'opportunity:read' });

    const { id } = data;

    const result = await db
      .select()
      .from(winLossReasons)
      .where(and(eq(winLossReasons.id, id), eq(winLossReasons.organizationId, ctx.organizationId)))
      .limit(1);

    if (!result[0]) {
      throw new Error('Win/Loss reason not found');
    }

    return { reason: result[0] };
  });

// ============================================================================
// CREATE WIN/LOSS REASON
// ============================================================================

/**
 * Create a new win/loss reason.
 * Requires admin permission.
 */
export const createWinLossReason = createServerFn({ method: 'POST' })
  .inputValidator(createWinLossReasonSchema)
  .handler(async ({ data }) => {
    // Admin-only permission - use organization.update for settings management
    const ctx = await withAuth({
      permission: PERMISSIONS.organization?.update ?? 'organization:update',
    });

    const { name, type, description, isActive, sortOrder } = data;

    // Get max sort order if not provided
    let order = sortOrder;
    if (order === 0) {
      const maxOrder = await db
        .select({ max: sql<number>`COALESCE(MAX(${winLossReasons.sortOrder}), 0)` })
        .from(winLossReasons)
        .where(eq(winLossReasons.organizationId, ctx.organizationId));
      order = (maxOrder[0]?.max ?? 0) + 1;
    }

    const result = await db
      .insert(winLossReasons)
      .values({
        organizationId: ctx.organizationId,
        name,
        type,
        description: description ?? null,
        isActive: isActive ?? true,
        sortOrder: order,
        createdBy: ctx.user.id,
      })
      .returning();

    return { reason: result[0] };
  });

// ============================================================================
// UPDATE WIN/LOSS REASON
// ============================================================================

/**
 * Update a win/loss reason.
 * Requires admin permission.
 */
export const updateWinLossReason = createServerFn({ method: 'POST' })
  .inputValidator(
    winLossReasonParamsSchema.extend({
      data: updateWinLossReasonSchema,
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({
      permission: PERMISSIONS.organization?.update ?? 'organization:update',
    });

    const { id, data: updateData } = data;

    // Verify reason exists and belongs to org
    const existing = await db
      .select()
      .from(winLossReasons)
      .where(and(eq(winLossReasons.id, id), eq(winLossReasons.organizationId, ctx.organizationId)))
      .limit(1);

    if (!existing[0]) {
      throw new Error('Win/Loss reason not found');
    }

    // Optimistic locking
    if (updateData.version && existing[0].version !== updateData.version) {
      throw new Error('Win/Loss reason has been modified by another user');
    }

    const result = await db
      .update(winLossReasons)
      .set({
        ...updateData,
        version: existing[0].version + 1,
        updatedBy: ctx.user.id,
      })
      .where(eq(winLossReasons.id, id))
      .returning();

    return { reason: result[0] };
  });

// ============================================================================
// DELETE WIN/LOSS REASON
// ============================================================================

/**
 * Delete a win/loss reason (soft delete via isActive = false).
 * Requires admin permission.
 */
export const deleteWinLossReason = createServerFn({ method: 'POST' })
  .inputValidator(winLossReasonParamsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({
      permission: PERMISSIONS.organization?.update ?? 'organization:update',
    });

    const { id } = data;

    // Verify reason exists and belongs to org
    const existing = await db
      .select()
      .from(winLossReasons)
      .where(and(eq(winLossReasons.id, id), eq(winLossReasons.organizationId, ctx.organizationId)))
      .limit(1);

    if (!existing[0]) {
      throw new Error('Win/Loss reason not found');
    }

    // Check if reason is in use
    const usageCount = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(opportunities)
      .where(eq(opportunities.winLossReasonId, id));

    if (Number(usageCount[0]?.count ?? 0) > 0) {
      // Soft delete by setting isActive = false
      await db
        .update(winLossReasons)
        .set({
          isActive: false,
          updatedBy: ctx.user.id,
        })
        .where(eq(winLossReasons.id, id));

      return { deleted: false, deactivated: true, usageCount: Number(usageCount[0]?.count) };
    }

    // Hard delete if not in use
    await db.delete(winLossReasons).where(eq(winLossReasons.id, id));

    return { deleted: true, deactivated: false };
  });

// ============================================================================
// WIN/LOSS ANALYSIS
// ============================================================================

const winLossAnalysisQuerySchema = z.object({
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  type: z.enum(['win', 'loss']).optional(),
});

/**
 * Get win/loss analysis with trends.
 * Shows breakdown of reasons with counts and values.
 */
export const getWinLossAnalysis = createServerFn({ method: 'GET' })
  .inputValidator(winLossAnalysisQuerySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.read ?? 'opportunity:read' });

    const { dateFrom, dateTo, type } = data;

    // Build conditions for opportunities
    const oppConditions = [
      eq(opportunities.organizationId, ctx.organizationId),
      isNull(opportunities.deletedAt),
    ];

    if (dateFrom) {
      oppConditions.push(gte(opportunities.actualCloseDate, dateFrom.toISOString().split('T')[0]));
    }
    if (dateTo) {
      oppConditions.push(lte(opportunities.actualCloseDate, dateTo.toISOString().split('T')[0]));
    }

    // Get win analysis
    const winResults = await db
      .select({
        reasonId: winLossReasons.id,
        reasonName: winLossReasons.name,
        reasonType: winLossReasons.type,
        count: sql<number>`COUNT(*)`,
        totalValue: sql<number>`COALESCE(SUM(${opportunities.value}), 0)`,
        avgValue: sql<number>`COALESCE(AVG(${opportunities.value}), 0)`,
        avgDaysToClose: sql<number>`COALESCE(AVG(
          EXTRACT(EPOCH FROM (${opportunities.actualCloseDate} - ${opportunities.createdAt})) / 86400
        ), 0)`,
      })
      .from(opportunities)
      .leftJoin(winLossReasons, eq(opportunities.winLossReasonId, winLossReasons.id))
      .where(
        and(
          ...oppConditions,
          eq(opportunities.stage, 'won'),
          type === 'loss' ? sql`FALSE` : sql`TRUE`
        )
      )
      .groupBy(winLossReasons.id, winLossReasons.name, winLossReasons.type);

    // Get loss analysis
    const lossResults = await db
      .select({
        reasonId: winLossReasons.id,
        reasonName: winLossReasons.name,
        reasonType: winLossReasons.type,
        count: sql<number>`COUNT(*)`,
        totalValue: sql<number>`COALESCE(SUM(${opportunities.value}), 0)`,
        avgValue: sql<number>`COALESCE(AVG(${opportunities.value}), 0)`,
        avgDaysToClose: sql<number>`COALESCE(AVG(
          EXTRACT(EPOCH FROM (${opportunities.actualCloseDate} - ${opportunities.createdAt})) / 86400
        ), 0)`,
        topCompetitor: sql<string>`MODE() WITHIN GROUP (ORDER BY ${opportunities.competitorName})`,
      })
      .from(opportunities)
      .leftJoin(winLossReasons, eq(opportunities.winLossReasonId, winLossReasons.id))
      .where(
        and(
          ...oppConditions,
          eq(opportunities.stage, 'lost'),
          type === 'win' ? sql`FALSE` : sql`TRUE`
        )
      )
      .groupBy(winLossReasons.id, winLossReasons.name, winLossReasons.type);

    // Get monthly trends
    const monthlyTrends = await db
      .select({
        month: sql<string>`TO_CHAR(${opportunities.actualCloseDate}, 'YYYY-MM')`,
        wonCount: sql<number>`SUM(CASE WHEN ${opportunities.stage} = 'won' THEN 1 ELSE 0 END)`,
        lostCount: sql<number>`SUM(CASE WHEN ${opportunities.stage} = 'lost' THEN 1 ELSE 0 END)`,
        wonValue: sql<number>`COALESCE(SUM(CASE WHEN ${opportunities.stage} = 'won' THEN ${opportunities.value} ELSE 0 END), 0)`,
        lostValue: sql<number>`COALESCE(SUM(CASE WHEN ${opportunities.stage} = 'lost' THEN ${opportunities.value} ELSE 0 END), 0)`,
      })
      .from(opportunities)
      .where(and(...oppConditions))
      .groupBy(sql`TO_CHAR(${opportunities.actualCloseDate}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${opportunities.actualCloseDate}, 'YYYY-MM')`);

    // Format results
    const winAnalysis = winResults.map((row) => ({
      reasonId: row.reasonId,
      reasonName: row.reasonName ?? 'No reason specified',
      reasonType: row.reasonType ?? ('win' as WinLossReasonType),
      count: Number(row.count),
      totalValue: Number(row.totalValue),
      avgValue: Math.round(Number(row.avgValue)),
      avgDaysToClose: Math.round(Number(row.avgDaysToClose)),
    }));

    const lossAnalysis = lossResults.map((row) => ({
      reasonId: row.reasonId,
      reasonName: row.reasonName ?? 'No reason specified',
      reasonType: row.reasonType ?? ('loss' as WinLossReasonType),
      count: Number(row.count),
      totalValue: Number(row.totalValue),
      avgValue: Math.round(Number(row.avgValue)),
      avgDaysToClose: Math.round(Number(row.avgDaysToClose)),
      topCompetitor: row.topCompetitor,
    }));

    const trends = monthlyTrends.map((row) => ({
      month: row.month,
      wonCount: Number(row.wonCount),
      lostCount: Number(row.lostCount),
      wonValue: Number(row.wonValue),
      lostValue: Number(row.lostValue),
      winRate:
        Number(row.wonCount) + Number(row.lostCount) > 0
          ? Math.round(
              (Number(row.wonCount) / (Number(row.wonCount) + Number(row.lostCount))) * 100
            )
          : 0,
    }));

    // Calculate totals
    const totalWon = winAnalysis.reduce((acc, row) => acc + row.count, 0);
    const totalLost = lossAnalysis.reduce((acc, row) => acc + row.count, 0);
    const totalWonValue = winAnalysis.reduce((acc, row) => acc + row.totalValue, 0);
    const totalLostValue = lossAnalysis.reduce((acc, row) => acc + row.totalValue, 0);

    return {
      wins: winAnalysis,
      losses: lossAnalysis,
      trends,
      summary: {
        totalWon,
        totalLost,
        totalWonValue,
        totalLostValue,
        overallWinRate:
          totalWon + totalLost > 0 ? Math.round((totalWon / (totalWon + totalLost)) * 100) : 0,
      },
      dateRange: { dateFrom, dateTo },
    };
  });

// ============================================================================
// GET COMPETITORS
// ============================================================================

/**
 * Get list of competitors from lost opportunities.
 */
export const getCompetitors = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      dateFrom: z.coerce.date().optional(),
      dateTo: z.coerce.date().optional(),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.read ?? 'opportunity:read' });

    const { dateFrom, dateTo } = data;

    // Build conditions
    const conditions = [
      eq(opportunities.organizationId, ctx.organizationId),
      isNull(opportunities.deletedAt),
      eq(opportunities.stage, 'lost'),
      sql`${opportunities.competitorName} IS NOT NULL`,
      sql`${opportunities.competitorName} != ''`,
    ];

    if (dateFrom) {
      conditions.push(gte(opportunities.actualCloseDate, dateFrom.toISOString().split('T')[0]));
    }
    if (dateTo) {
      conditions.push(lte(opportunities.actualCloseDate, dateTo.toISOString().split('T')[0]));
    }

    const results = await db
      .select({
        competitor: opportunities.competitorName,
        lossCount: sql<number>`COUNT(*)`,
        totalLostValue: sql<number>`COALESCE(SUM(${opportunities.value}), 0)`,
      })
      .from(opportunities)
      .where(and(...conditions))
      .groupBy(opportunities.competitorName)
      .orderBy(desc(sql`COUNT(*)`));

    return {
      competitors: results.map((row) => ({
        name: row.competitor,
        lossCount: Number(row.lossCount),
        totalLostValue: Number(row.totalLostValue),
      })),
    };
  });
