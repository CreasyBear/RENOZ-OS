/**
 * Support Metrics Server Functions
 *
 * Server functions for support dashboard metrics including
 * issue counts, SLA performance, and breakdown statistics.
 *
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-006
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, count, sql, gte, isNull, isNotNull } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { issues } from 'drizzle/schema/support/issues';
import { slaTracking } from 'drizzle/schema/support/sla-tracking';
import { withAuth } from '@/lib/server/protected';

// ============================================================================
// SCHEMAS
// ============================================================================

const getSupportMetricsSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface SupportMetricsResponse {
  overview: {
    openIssues: number;
    inProgressIssues: number;
    resolvedToday: number;
    avgResolutionHours: number;
  };
  sla: {
    totalTracked: number;
    breached: number;
    atRisk: number;
    onTrack: number;
    complianceRate: number;
  };
  breakdown: {
    byStatus: { status: string; count: number }[];
    byType: { type: string; count: number }[];
    byPriority: { priority: string; count: number }[];
  };
  trend: {
    openedThisWeek: number;
    closedThisWeek: number;
    netChange: number;
  };
  /** Triage counts for filter chips (Overdue SLA, Escalated, My Issues) */
  triage: {
    overdueSla: number;
    escalated: number;
    myIssues: number;
  };
}

// ============================================================================
// GET SUPPORT METRICS
// ============================================================================

export const getSupportMetrics = createServerFn({ method: 'GET' })
  .inputValidator(getSupportMetricsSchema)
  .handler(async (): Promise<SupportMetricsResponse> => {
    const ctx = await withAuth();

    // Date boundaries
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    // === Overview Metrics ===

    // Open issues
    const [openResult] = await db
      .select({ count: count() })
      .from(issues)
      .where(
        and(
          eq(issues.organizationId, ctx.organizationId),
          eq(issues.status, 'open'),
          isNull(issues.deletedAt)
        )
      );

    // In-progress issues
    const [inProgressResult] = await db
      .select({ count: count() })
      .from(issues)
      .where(
        and(
          eq(issues.organizationId, ctx.organizationId),
          eq(issues.status, 'in_progress'),
          isNull(issues.deletedAt)
        )
      );

    // Resolved today
    const [resolvedTodayResult] = await db
      .select({ count: count() })
      .from(issues)
      .where(
        and(
          eq(issues.organizationId, ctx.organizationId),
          eq(issues.status, 'resolved'),
          gte(issues.resolvedAt, todayStart),
          isNull(issues.deletedAt)
        )
      );

    // Average resolution time (in hours) for resolved issues
    const avgResolutionResult = await db
      .select({
        avgHours: sql<number>`AVG(EXTRACT(EPOCH FROM (${issues.resolvedAt} - ${issues.createdAt})) / 3600)`,
      })
      .from(issues)
      .where(
        and(
          eq(issues.organizationId, ctx.organizationId),
          eq(issues.status, 'resolved'),
          isNull(issues.deletedAt)
        )
      );

    const avgResolutionHours = avgResolutionResult[0]?.avgHours
      ? Math.round(avgResolutionResult[0].avgHours * 10) / 10
      : 0;

    // === SLA Metrics ===

    const [totalTrackedResult] = await db
      .select({ count: count() })
      .from(slaTracking)
      .where(eq(slaTracking.organizationId, ctx.organizationId));

    const [breachedResult] = await db
      .select({ count: count() })
      .from(slaTracking)
      .where(
        and(eq(slaTracking.organizationId, ctx.organizationId), eq(slaTracking.status, 'breached'))
      );

    // "Active" means on track (not yet breached or resolved)
    const [activeResult] = await db
      .select({ count: count() })
      .from(slaTracking)
      .where(
        and(eq(slaTracking.organizationId, ctx.organizationId), eq(slaTracking.status, 'active'))
      );

    // "Responded" counts as on track (SLA met for response)
    const [respondedResult] = await db
      .select({ count: count() })
      .from(slaTracking)
      .where(
        and(eq(slaTracking.organizationId, ctx.organizationId), eq(slaTracking.status, 'responded'))
      );

    const totalTracked = totalTrackedResult?.count ?? 0;
    const breached = breachedResult?.count ?? 0;
    const complianceRate =
      totalTracked > 0
        ? Math.round(((totalTracked - breached) / totalTracked) * 100 * 10) / 10
        : 100;

    // === Breakdown Metrics ===

    // By status
    const statusBreakdown = await db
      .select({
        status: issues.status,
        count: count(),
      })
      .from(issues)
      .where(and(eq(issues.organizationId, ctx.organizationId), isNull(issues.deletedAt)))
      .groupBy(issues.status);

    // By type
    const typeBreakdown = await db
      .select({
        type: issues.type,
        count: count(),
      })
      .from(issues)
      .where(and(eq(issues.organizationId, ctx.organizationId), isNull(issues.deletedAt)))
      .groupBy(issues.type);

    // By priority
    const priorityBreakdown = await db
      .select({
        priority: issues.priority,
        count: count(),
      })
      .from(issues)
      .where(and(eq(issues.organizationId, ctx.organizationId), isNull(issues.deletedAt)))
      .groupBy(issues.priority);

    // === Trend ===

    // Opened this week
    const [openedThisWeekResult] = await db
      .select({ count: count() })
      .from(issues)
      .where(
        and(
          eq(issues.organizationId, ctx.organizationId),
          gte(issues.createdAt, weekStart),
          isNull(issues.deletedAt)
        )
      );

    // Closed this week
    const [closedThisWeekResult] = await db
      .select({ count: count() })
      .from(issues)
      .where(
        and(
          eq(issues.organizationId, ctx.organizationId),
          eq(issues.status, 'resolved'),
          gte(issues.resolvedAt, weekStart),
          isNull(issues.deletedAt)
        )
      );

    const openedThisWeek = openedThisWeekResult?.count ?? 0;
    const closedThisWeek = closedThisWeekResult?.count ?? 0;

    // === Triage Counts (for filter chips) ===

    // Escalated issues
    const [escalatedResult] = await db
      .select({ count: count() })
      .from(issues)
      .where(
        and(
          eq(issues.organizationId, ctx.organizationId),
          isNotNull(issues.escalatedAt),
          isNull(issues.deletedAt)
        )
      );

    // My Issues (assigned to current user)
    const [myIssuesResult] = await db
      .select({ count: count() })
      .from(issues)
      .where(
        and(
          eq(issues.organizationId, ctx.organizationId),
          eq(issues.assignedToUserId, ctx.user.id),
          isNull(issues.deletedAt)
        )
      );

    return {
      overview: {
        openIssues: openResult?.count ?? 0,
        inProgressIssues: inProgressResult?.count ?? 0,
        resolvedToday: resolvedTodayResult?.count ?? 0,
        avgResolutionHours,
      },
      sla: {
        totalTracked,
        breached,
        atRisk: 0, // Not tracked in current schema - would need time-based calculation
        onTrack: (activeResult?.count ?? 0) + (respondedResult?.count ?? 0),
        complianceRate,
      },
      breakdown: {
        byStatus: statusBreakdown.map((s) => ({ status: s.status, count: s.count })),
        byType: typeBreakdown.map((t) => ({ type: t.type, count: t.count })),
        byPriority: priorityBreakdown.map((p) => ({
          priority: p.priority,
          count: p.count,
        })),
      },
      trend: {
        openedThisWeek,
        closedThisWeek,
        netChange: openedThisWeek - closedThisWeek,
      },
      triage: {
        overdueSla: breached,
        escalated: escalatedResult?.count ?? 0,
        myIssues: myIssuesResult?.count ?? 0,
      },
    };
  });
