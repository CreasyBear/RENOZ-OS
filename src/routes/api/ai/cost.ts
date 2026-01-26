/**
 * AI Cost Usage Endpoint
 *
 * GET /api/ai/cost
 *
 * Get AI usage and cost metrics.
 * Implements AI-INFRA-017 acceptance criteria.
 *
 * @see _Initiation/_prd/3-integrations/ai-infrastructure/ai-infrastructure.prd.json
 */

import { withAuth } from '@/lib/server/protected';
import { db } from '@/lib/db';
import { aiCostTracking } from 'drizzle/schema/_ai';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import { getOrgDailyLimitCents } from '@/lib/ai/utils/budget';

export async function GET({ request }: { request: Request }) {
  try {
    // Authenticate user
    const ctx = await withAuth();

    // Parse query parameters
    const url = new URL(request.url);
    const dateFrom = url.searchParams.get('dateFrom');
    const dateTo = url.searchParams.get('dateTo');
    const groupBy = url.searchParams.get('groupBy') || 'day';

    // Default date range: last 30 days
    const now = new Date();
    const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const fromDate = dateFrom || defaultFrom.toISOString().split('T')[0];
    const toDate = dateTo || now.toISOString().split('T')[0];

    // Build conditions
    const conditions = [
      eq(aiCostTracking.organizationId, ctx.organizationId),
      gte(aiCostTracking.date, fromDate),
      lte(aiCostTracking.date, toDate),
    ];

    // Get usage data grouped by day or model
    let usage: Array<{
      date?: string;
      model?: string;
      feature?: string | null;
      inputTokens: number;
      outputTokens: number;
      costCents: number;
    }>;

    if (groupBy === 'model') {
      usage = await db
        .select({
          model: aiCostTracking.model,
          inputTokens: sql<number>`SUM(${aiCostTracking.inputTokens})::integer`,
          outputTokens: sql<number>`SUM(${aiCostTracking.outputTokens})::integer`,
          costCents: sql<number>`SUM(${aiCostTracking.costCents})::integer`,
        })
        .from(aiCostTracking)
        .where(and(...conditions))
        .groupBy(aiCostTracking.model)
        .orderBy(desc(sql`SUM(${aiCostTracking.costCents})`));
    } else if (groupBy === 'feature') {
      usage = await db
        .select({
          feature: aiCostTracking.feature,
          inputTokens: sql<number>`SUM(${aiCostTracking.inputTokens})::integer`,
          outputTokens: sql<number>`SUM(${aiCostTracking.outputTokens})::integer`,
          costCents: sql<number>`SUM(${aiCostTracking.costCents})::integer`,
        })
        .from(aiCostTracking)
        .where(and(...conditions))
        .groupBy(aiCostTracking.feature)
        .orderBy(desc(sql`SUM(${aiCostTracking.costCents})`));
    } else {
      // Default: group by day
      usage = await db
        .select({
          date: aiCostTracking.date,
          inputTokens: sql<number>`SUM(${aiCostTracking.inputTokens})::integer`,
          outputTokens: sql<number>`SUM(${aiCostTracking.outputTokens})::integer`,
          costCents: sql<number>`SUM(${aiCostTracking.costCents})::integer`,
        })
        .from(aiCostTracking)
        .where(and(...conditions))
        .groupBy(aiCostTracking.date)
        .orderBy(aiCostTracking.date);
    }

    // Calculate totals
    const [totals] = await db
      .select({
        totalCents: sql<number>`COALESCE(SUM(${aiCostTracking.costCents}), 0)::integer`,
        totalInputTokens: sql<number>`COALESCE(SUM(${aiCostTracking.inputTokens}), 0)::integer`,
        totalOutputTokens: sql<number>`COALESCE(SUM(${aiCostTracking.outputTokens}), 0)::integer`,
      })
      .from(aiCostTracking)
      .where(and(...conditions));

    // Get budget info
    const budgetLimit = getOrgDailyLimitCents() * 30; // Monthly limit
    const budgetRemaining = Math.max(0, budgetLimit - (totals?.totalCents ?? 0));

    return new Response(
      JSON.stringify({
        usage,
        totalCents: totals?.totalCents ?? 0,
        totalInputTokens: totals?.totalInputTokens ?? 0,
        totalOutputTokens: totals?.totalOutputTokens ?? 0,
        budgetRemaining,
        budgetLimit,
        dateRange: { from: fromDate, to: toDate },
        groupBy,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[API /ai/cost] Error:', error);

    // Handle auth errors
    if (error instanceof Error && error.message.includes('Authentication')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', code: 'UNAUTHORIZED' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
