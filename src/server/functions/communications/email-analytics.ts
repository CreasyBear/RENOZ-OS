/**
 * Email Analytics Server Functions
 *
 * Aggregates email delivery metrics from email_history table.
 *
 * @see INT-RES-005
 */

import { createServerFn } from "@tanstack/react-start";
import { and, eq, sql, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { emailHistory } from "drizzle/schema";
import { withAuth } from "@/lib/server/protected";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  emailMetricsFiltersSchema,
  type EmailMetricsResult,
} from "@/lib/schemas/communications/email-analytics";

// ============================================================================
// GET EMAIL METRICS
// ============================================================================

/**
 * Get aggregated email metrics for the specified period.
 * Calculates sent, delivered, opened, clicked, bounced counts and rates.
 */
export const getEmailMetrics = createServerFn({ method: "GET" })
  .inputValidator(emailMetricsFiltersSchema)
  .handler(async ({ data }): Promise<EmailMetricsResult> => {
    const ctx = await withAuth({ permission: PERMISSIONS.settings.read });

    // Determine date range based on period or custom dates
    const now = new Date();
    let periodStart: Date;
    let periodEnd: Date = now;

    if (data.period === "custom" && data.startDate && data.endDate) {
      periodStart = new Date(data.startDate);
      periodEnd = new Date(data.endDate);
    } else {
      const days = data.period === "7d" ? 7 : data.period === "90d" ? 90 : 30;
      periodStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    }

    // Build base conditions
    const conditions = [
      eq(emailHistory.organizationId, ctx.organizationId),
      gte(emailHistory.createdAt, periodStart),
      lte(emailHistory.createdAt, periodEnd),
    ];

    // Aggregate metrics in a single query
    // NOTE: COUNT(*) FILTER (WHERE ...) is PostgreSQL-specific aggregation syntax
    // This is more efficient than multiple separate COUNT queries with WHERE clauses
    // Drizzle ORM doesn't provide a direct abstraction for FILTER, so raw SQL is acceptable here
    const [metricsResult] = await db
      .select({
        sent: sql<number>`COUNT(*) FILTER (WHERE ${emailHistory.sentAt} IS NOT NULL)::int`,
        delivered: sql<number>`COUNT(*) FILTER (WHERE ${emailHistory.deliveredAt} IS NOT NULL)::int`,
        opened: sql<number>`COUNT(*) FILTER (WHERE ${emailHistory.openedAt} IS NOT NULL)::int`,
        clicked: sql<number>`COUNT(*) FILTER (WHERE ${emailHistory.clickedAt} IS NOT NULL)::int`,
        bounced: sql<number>`COUNT(*) FILTER (WHERE ${emailHistory.bouncedAt} IS NOT NULL)::int`,
        complained: sql<number>`COUNT(*) FILTER (WHERE ${emailHistory.complainedAt} IS NOT NULL)::int`,
        total: sql<number>`COUNT(*)::int`,
      })
      .from(emailHistory)
      .where(and(...conditions));

    const metrics = metricsResult ?? {
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
      complained: 0,
      total: 0,
    };

    // Calculate rates (avoid division by zero)
    const deliveryRate =
      metrics.sent > 0
        ? Math.round((metrics.delivered / metrics.sent) * 10000) / 100
        : 0;
    const openRate =
      metrics.delivered > 0
        ? Math.round((metrics.opened / metrics.delivered) * 10000) / 100
        : 0;
    const clickRate =
      metrics.opened > 0
        ? Math.round((metrics.clicked / metrics.opened) * 10000) / 100
        : 0;
    const bounceRate =
      metrics.sent > 0
        ? Math.round((metrics.bounced / metrics.sent) * 10000) / 100
        : 0;
    const complaintRate =
      metrics.delivered > 0
        ? Math.round((metrics.complained / metrics.delivered) * 10000) / 100
        : 0;

    return {
      metrics: {
        sent: metrics.sent,
        delivered: metrics.delivered,
        opened: metrics.opened,
        clicked: metrics.clicked,
        bounced: metrics.bounced,
        complained: metrics.complained,
        deliveryRate,
        openRate,
        clickRate,
        bounceRate,
        complaintRate,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
      },
    };
  });
