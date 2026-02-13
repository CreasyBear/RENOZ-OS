'use server';

/**
 * Opportunity Detail Extended Server Functions
 *
 * Server-side functions for opportunity alerts and active items.
 * These support the 5-zone layout pattern from DETAIL-VIEW-STANDARDS.md.
 *
 * SECURITY: All functions use withAuth for authentication and
 * filter by organizationId for multi-tenant isolation.
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 * @see src/lib/schemas/pipeline/opportunity-detail-extended.ts
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, desc, isNull, lt, gt, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  opportunities,
  opportunityActivities,
  quoteVersions,
} from 'drizzle/schema';
import {
  opportunityAlertsQuerySchema,
  opportunityActiveItemsQuerySchema,
  type OpportunityAlert,
  type OpportunityAlertsResponse,
  type OpportunityActiveItems,
  type PendingActivity,
  type RecentQuoteVersion,
} from '@/lib/schemas/pipeline/opportunity-detail-extended';
import { withAuth } from '@/lib/server/protected';
import { NotFoundError } from '@/lib/server/errors';
import { PERMISSIONS } from '@/lib/auth/permissions';

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Calculate days between two dates (positive if date is in the past)
 */
function daysBetween(date1: Date, date2: Date): number {
  const diff = date2.getTime() - date1.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Generate a unique alert ID for a specific opportunity and alert type
 */
function generateAlertId(opportunityId: string, alertType: string): string {
  return `opp-${opportunityId}-${alertType}`;
}

// ============================================================================
// GET OPPORTUNITY ALERTS
// ============================================================================

/**
 * Calculate and return all active alerts for an opportunity.
 *
 * Alert types:
 * - expired_quote: Quote has passed its expiration date
 * - expiring_quote: Quote will expire within threshold
 * - overdue_followup: Scheduled follow-up date has passed
 * - stale_deal: No activity logged in threshold period
 * - approaching_close: Expected close date is within threshold
 */
export const getOpportunityAlerts = createServerFn({ method: 'GET' })
  .inputValidator(opportunityAlertsQuerySchema)
  .handler(async ({ data }): Promise<OpportunityAlertsResponse> => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.read ?? 'opportunity:read' });

    const {
      opportunityId,
      quoteExpiryWarningDays,
      stalenessDays,
      closeWarningDays,
    } = data;

    // Get opportunity with organization check
    const opportunityResult = await db
      .select({
        id: opportunities.id,
        stage: opportunities.stage,
        quoteExpiresAt: opportunities.quoteExpiresAt,
        followUpDate: opportunities.followUpDate,
        expectedCloseDate: opportunities.expectedCloseDate,
      })
      .from(opportunities)
      .where(
        and(
          eq(opportunities.id, opportunityId),
          eq(opportunities.organizationId, ctx.organizationId),
          isNull(opportunities.deletedAt)
        )
      )
      .limit(1);

    if (!opportunityResult[0]) {
      throw new NotFoundError('Opportunity not found', 'opportunity');
    }

    const opportunity = opportunityResult[0];
    const now = new Date();
    const alerts: OpportunityAlert[] = [];

    // Skip alerts for closed opportunities
    if (opportunity.stage === 'won' || opportunity.stage === 'lost') {
      return {
        opportunityId,
        hasAlerts: false,
        alerts: [],
        counts: { critical: 0, warning: 0, info: 0, total: 0 },
      };
    }

    // Check for expired quote
    if (opportunity.quoteExpiresAt) {
      const expiryDate = new Date(opportunity.quoteExpiresAt);
      const daysUntilExpiry = daysBetween(now, expiryDate);

      if (daysUntilExpiry < 0) {
        // Quote has expired
        const daysOverdue = Math.abs(daysUntilExpiry);
        alerts.push({
          id: generateAlertId(opportunityId, 'expired_quote'),
          type: 'expired_quote',
          severity: 'critical',
          title: 'Quote Expired',
          message: `Quote expired ${daysOverdue} day${daysOverdue === 1 ? '' : 's'} ago`,
          actionLabel: 'Extend Quote',
          actionType: 'extend_quote',
          metadata: { daysOverdue, expiryDate: expiryDate.toISOString() },
          dismissable: true,
          createdAt: now,
        });
      } else if (daysUntilExpiry <= quoteExpiryWarningDays) {
        // Quote expiring soon
        alerts.push({
          id: generateAlertId(opportunityId, 'expiring_quote'),
          type: 'expiring_quote',
          severity: 'warning',
          title: 'Quote Expiring Soon',
          message: daysUntilExpiry === 0
            ? 'Quote expires today'
            : `Quote expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}`,
          actionLabel: 'Extend Quote',
          actionType: 'extend_quote',
          metadata: { daysUntilExpiry, expiryDate: expiryDate.toISOString() },
          dismissable: true,
          createdAt: now,
        });
      }
    }

    // Check for overdue follow-up
    if (opportunity.followUpDate) {
      const followUpDate = new Date(opportunity.followUpDate);
      const daysUntilFollowUp = daysBetween(now, followUpDate);

      if (daysUntilFollowUp < 0) {
        const daysOverdue = Math.abs(daysUntilFollowUp);
        alerts.push({
          id: generateAlertId(opportunityId, 'overdue_followup'),
          type: 'overdue_followup',
          severity: 'warning',
          title: 'Follow-up Overdue',
          message: `Follow-up was due ${daysOverdue} day${daysOverdue === 1 ? '' : 's'} ago`,
          actionLabel: 'Log Activity',
          actionType: 'log_activity',
          metadata: { daysOverdue, followUpDate: followUpDate.toISOString() },
          dismissable: true,
          createdAt: now,
        });
      }
    }

    // Check for stale deal (no recent activity)
    const lastActivityResult = await db
      .select({ createdAt: opportunityActivities.createdAt })
      .from(opportunityActivities)
      .where(eq(opportunityActivities.opportunityId, opportunityId))
      .orderBy(desc(opportunityActivities.createdAt))
      .limit(1);

    const lastActivityDate = lastActivityResult[0]?.createdAt;
    if (lastActivityDate) {
      const daysSinceActivity = daysBetween(lastActivityDate, now);
      if (daysSinceActivity >= stalenessDays) {
        alerts.push({
          id: generateAlertId(opportunityId, 'stale_deal'),
          type: 'stale_deal',
          severity: 'warning',
          title: 'Deal Going Stale',
          message: `No activity for ${daysSinceActivity} days`,
          actionLabel: 'Log Activity',
          actionType: 'log_activity',
          metadata: { daysSinceActivity, lastActivityDate: lastActivityDate.toISOString() },
          dismissable: true,
          createdAt: now,
        });
      }
    } else {
      // No activities at all - also stale
      alerts.push({
        id: generateAlertId(opportunityId, 'stale_deal'),
        type: 'stale_deal',
        severity: 'warning',
        title: 'No Activity Logged',
        message: 'No activities have been logged for this opportunity',
        actionLabel: 'Log Activity',
        actionType: 'log_activity',
        metadata: { daysSinceActivity: null, lastActivityDate: null },
        dismissable: true,
        createdAt: now,
      });
    }

    // Check for approaching close date
    if (opportunity.expectedCloseDate) {
      const closeDate = new Date(opportunity.expectedCloseDate);
      const daysUntilClose = daysBetween(now, closeDate);

      if (daysUntilClose >= 0 && daysUntilClose <= closeWarningDays) {
        alerts.push({
          id: generateAlertId(opportunityId, 'approaching_close'),
          type: 'approaching_close',
          severity: 'info',
          title: 'Close Date Approaching',
          message: daysUntilClose === 0
            ? 'Expected to close today'
            : `Expected to close in ${daysUntilClose} day${daysUntilClose === 1 ? '' : 's'}`,
          actionLabel: 'Update Stage',
          actionType: 'update_stage',
          metadata: { daysUntilClose, closeDate: closeDate.toISOString() },
          dismissable: true,
          createdAt: now,
        });
      }
    }

    // Calculate counts by severity
    const counts = {
      critical: alerts.filter((a) => a.severity === 'critical').length,
      warning: alerts.filter((a) => a.severity === 'warning').length,
      info: alerts.filter((a) => a.severity === 'info').length,
      total: alerts.length,
    };

    return {
      opportunityId,
      hasAlerts: alerts.length > 0,
      alerts,
      counts,
    };
  });

// ============================================================================
// GET OPPORTUNITY ACTIVE ITEMS
// ============================================================================

/**
 * Get active items (pending activities, scheduled follow-ups, recent quotes)
 * for the opportunity detail view.
 */
export const getOpportunityActiveItems = createServerFn({ method: 'GET' })
  .inputValidator(opportunityActiveItemsQuerySchema)
  .handler(async ({ data }): Promise<OpportunityActiveItems> => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.read ?? 'opportunity:read' });

    const { opportunityId, pendingActivitiesLimit, quoteVersionsLimit } = data;

    // Verify opportunity exists and belongs to organization
    const opportunityResult = await db
      .select({ id: opportunities.id })
      .from(opportunities)
      .where(
        and(
          eq(opportunities.id, opportunityId),
          eq(opportunities.organizationId, ctx.organizationId),
          isNull(opportunities.deletedAt)
        )
      )
      .limit(1);

    if (!opportunityResult[0]) {
      throw new NotFoundError('Opportunity not found', 'opportunity');
    }

    const now = new Date();

    // Run all 6 independent queries in parallel
    const [
      pendingActivitiesResult,
      scheduledFollowUpsResult,
      overdueFollowUpsResult,
      quoteVersionsResult,
      totalQuoteVersionsResult,
      lastActivityResult,
    ] = await Promise.all([
      // Get pending activities (not completed, with optional scheduled date)
      db
        .select({
          id: opportunityActivities.id,
          type: opportunityActivities.type,
          description: opportunityActivities.description,
          scheduledAt: opportunityActivities.scheduledAt,
          createdAt: opportunityActivities.createdAt,
          createdBy: opportunityActivities.createdBy,
        })
        .from(opportunityActivities)
        .where(
          and(
            eq(opportunityActivities.opportunityId, opportunityId),
            isNull(opportunityActivities.completedAt)
          )
        )
        .orderBy(desc(opportunityActivities.createdAt))
        .limit(pendingActivitiesLimit),

      // Get scheduled follow-ups (future scheduledAt, not completed)
      db
        .select({
          id: opportunityActivities.id,
          type: opportunityActivities.type,
          description: opportunityActivities.description,
          scheduledAt: opportunityActivities.scheduledAt,
          createdAt: opportunityActivities.createdAt,
          createdBy: opportunityActivities.createdBy,
        })
        .from(opportunityActivities)
        .where(
          and(
            eq(opportunityActivities.opportunityId, opportunityId),
            isNull(opportunityActivities.completedAt),
            gt(opportunityActivities.scheduledAt, now)
          )
        )
        .orderBy(opportunityActivities.scheduledAt)
        .limit(pendingActivitiesLimit),

      // Count overdue follow-ups — use COUNT(*) instead of selecting an id column
      db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(opportunityActivities)
        .where(
          and(
            eq(opportunityActivities.opportunityId, opportunityId),
            isNull(opportunityActivities.completedAt),
            lt(opportunityActivities.scheduledAt, now)
          )
        ),

      // Get recent quote versions
      db
        .select({
          id: quoteVersions.id,
          versionNumber: quoteVersions.versionNumber,
          total: quoteVersions.total,
          items: quoteVersions.items,
          createdAt: quoteVersions.createdAt,
          createdBy: quoteVersions.createdBy,
        })
        .from(quoteVersions)
        .where(eq(quoteVersions.opportunityId, opportunityId))
        .orderBy(desc(quoteVersions.versionNumber))
        .limit(quoteVersionsLimit),

      // Get total quote versions count — use COUNT(*) instead of selecting an id column
      db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(quoteVersions)
        .where(eq(quoteVersions.opportunityId, opportunityId)),

      // Get last activity for staleness
      db
        .select({ createdAt: opportunityActivities.createdAt })
        .from(opportunityActivities)
        .where(eq(opportunityActivities.opportunityId, opportunityId))
        .orderBy(desc(opportunityActivities.createdAt))
        .limit(1),
    ]);

    const lastActivityAt = lastActivityResult[0]?.createdAt ?? null;
    const daysSinceLastActivity = lastActivityAt
      ? daysBetween(lastActivityAt, now)
      : null;

    // Map activities to PendingActivity type
    const mapActivity = (activity: typeof pendingActivitiesResult[0]): PendingActivity => {
      const scheduledAt = activity.scheduledAt ? new Date(activity.scheduledAt) : null;
      const isOverdue = scheduledAt ? scheduledAt < now : false;
      const daysUntilDue = scheduledAt ? daysBetween(now, scheduledAt) : null;

      return {
        id: activity.id,
        type: activity.type,
        description: activity.description,
        scheduledAt,
        createdAt: activity.createdAt,
        createdByName: null, // Would need user join for name
        isOverdue,
        daysUntilDue,
      };
    };

    // Map quote versions
    const mapQuoteVersion = (version: typeof quoteVersionsResult[0]): RecentQuoteVersion => {
      const items = version.items as Array<{ description: string }> | null;
      return {
        id: version.id,
        versionNumber: version.versionNumber,
        total: Number(version.total),
        itemCount: items?.length ?? 0,
        createdAt: version.createdAt,
        createdByName: null, // Would need user join for name
      };
    };

    return {
      opportunityId,
      pendingActivities: pendingActivitiesResult.map(mapActivity),
      scheduledFollowUps: scheduledFollowUpsResult.map(mapActivity),
      recentQuoteVersions: quoteVersionsResult.map(mapQuoteVersion),
      counts: {
        pendingActivities: pendingActivitiesResult.length,
        scheduledFollowUps: scheduledFollowUpsResult.length,
        overdueFollowUps: overdueFollowUpsResult[0]?.count ?? 0,
        quoteVersions: totalQuoteVersionsResult[0]?.count ?? 0,
      },
      lastActivityAt,
      daysSinceLastActivity,
    };
  });
