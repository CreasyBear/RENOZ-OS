/**
 * Auto-Escalate Issues Job
 *
 * Scheduled cron job that runs every 15 minutes to check for issues
 * that should be automatically escalated based on configured rules:
 * - Time-based: Issues unresponded for X hours
 * - VIP customer: Issues from VIP customers
 * - SLA breach: Issues that have breached SLA
 *
 * @see _Initiation/_prd/2-domains/support/support.prd.json DOM-SUP-002b
 */
import { cronTrigger } from '@trigger.dev/sdk';
import { and, eq, lt, isNull, inArray, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { issues, customers, notifications, users, activities } from '@/../drizzle/schema';
import { client } from '../client';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Default escalation thresholds
 */
const DEFAULT_THRESHOLDS = {
  /** Hours before unresponded issue is escalated */
  unrespondedHours: 24,
  /** Auto-escalate VIP customer issues */
  vipCustomerAutoEscalate: true,
  /** Auto-escalate issues that breach SLA */
  slaBreachAutoEscalate: true,
} as const;

/**
 * Statuses that are considered "active" and eligible for escalation
 */
const ACTIVE_STATUSES = ['new', 'open', 'in_progress'] as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create an activity record for the escalation
 */
async function createEscalationActivity(
  issueId: string,
  organizationId: string,
  reason: string,
  notes: string
) {
  await db.insert(activities).values({
    entityType: 'issue',
    entityId: issueId,
    organizationId,
    action: 'escalated',
    metadata: {
      escalationType: 'automatic',
      reason,
      notes,
      escalatedAt: new Date().toISOString(),
    },
  });
}

/**
 * Send notification to manager about escalation
 */
async function notifyManagerOfEscalation(
  issue: {
    id: string;
    issueNumber: string;
    title: string;
    organizationId: string;
    customerId: string | null;
    assignedToUserId: string | null;
  },
  reason: string,
  customerName: string | null
) {
  // Get managers in the organization (users with manager role)
  // For now, notify the assigned user's manager or create org-wide notification
  if (issue.assignedToUserId) {
    // Notify the assigned user about the escalation
    await db.insert(notifications).values({
      organizationId: issue.organizationId,
      userId: issue.assignedToUserId,
      type: 'issue',
      title: `Issue Auto-Escalated: ${issue.issueNumber}`,
      message: `${issue.title} has been automatically escalated. Reason: ${reason}.${customerName ? ` Customer: ${customerName}` : ''}`,
      data: {
        entityId: issue.id,
        entityType: 'issue',
        subType: 'auto_escalation',
        issueNumber: issue.issueNumber,
        reason,
        customerId: issue.customerId,
        customerName,
      },
      status: 'pending',
    });
  }

  // Also get organization admins/managers to notify
  const orgAdmins = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.organizationId, issue.organizationId),
        eq(users.role, 'admin'),
        isNull(users.deletedAt)
      )
    )
    .limit(5);

  // Create notifications for admins (skip if same as assigned user)
  for (const admin of orgAdmins) {
    if (admin.id !== issue.assignedToUserId) {
      await db.insert(notifications).values({
        organizationId: issue.organizationId,
        userId: admin.id,
        type: 'issue',
        title: `Issue Auto-Escalated: ${issue.issueNumber}`,
        message: `${issue.title} has been automatically escalated. Reason: ${reason}.${customerName ? ` Customer: ${customerName}` : ''}`,
        data: {
          entityId: issue.id,
          entityType: 'issue',
          subType: 'auto_escalation',
          issueNumber: issue.issueNumber,
          reason,
          customerId: issue.customerId,
          customerName,
        },
        status: 'pending',
      });
    }
  }
}

// ============================================================================
// AUTO-ESCALATE ISSUES JOB (Scheduled)
// ============================================================================

/**
 * Scheduled job that runs every 15 minutes to check for issues
 * that should be automatically escalated.
 *
 * Acceptance criteria from DOM-SUP-002b:
 * 1. Trigger.dev job runs every 15 minutes to check escalation rules
 * 2. Time-based escalation works (e.g., after 24h unresponded)
 * 3. VIP customer escalation works (if customer has VIP flag)
 * 4. Manager notification sent on auto-escalation
 */
export const autoEscalateIssuesJob = client.defineJob({
  id: 'auto-escalate-issues',
  name: 'Auto-Escalate Issues',
  version: '1.0.0',
  trigger: cronTrigger({
    cron: '*/15 * * * *', // Run every 15 minutes
  }),
  run: async (_payload, io) => {
    await io.logger.info('Starting auto-escalation check');

    const now = new Date();
    const escalationCutoff = new Date(
      now.getTime() - DEFAULT_THRESHOLDS.unrespondedHours * 60 * 60 * 1000
    );

    // Track escalation stats
    let timeBasedEscalations = 0;
    let vipEscalations = 0;
    let slaBreachEscalations = 0;
    let skipped = 0;

    // ========================================================================
    // 1. TIME-BASED ESCALATION
    // Find issues that have been unresponded for too long
    // ========================================================================
    const unrespondedIssues = await io.runTask('query-unresponded-issues', async () => {
      return db
        .select({
          id: issues.id,
          issueNumber: issues.issueNumber,
          title: issues.title,
          organizationId: issues.organizationId,
          customerId: issues.customerId,
          assignedToUserId: issues.assignedToUserId,
          createdAt: issues.createdAt,
          status: issues.status,
        })
        .from(issues)
        .where(
          and(
            // Active status (not escalated, resolved, or closed)
            inArray(issues.status, [...ACTIVE_STATUSES]),
            // No first response yet (firstResponseAt is null)
            isNull(issues.firstResponseAt),
            // Created before cutoff time
            lt(issues.createdAt, escalationCutoff),
            // Not already escalated
            isNull(issues.escalatedAt),
            // Not deleted
            isNull(issues.deletedAt)
          )
        );
    });

    await io.logger.info(
      `Found ${unrespondedIssues.length} unresponded issues older than ${DEFAULT_THRESHOLDS.unrespondedHours}h`
    );

    // Escalate each unresponded issue
    for (const issue of unrespondedIssues) {
      await io.runTask(`escalate-time-${issue.id}`, async () => {
        const reason = `No response for ${DEFAULT_THRESHOLDS.unrespondedHours}+ hours`;

        // Update issue status to escalated
        await db
          .update(issues)
          .set({
            status: 'escalated',
            escalatedAt: now,
            escalationReason: reason,
            updatedAt: now,
          })
          .where(eq(issues.id, issue.id));

        // Create activity record
        await createEscalationActivity(
          issue.id,
          issue.organizationId,
          'time_based',
          reason
        );

        // Notify manager
        await notifyManagerOfEscalation(issue, reason, null);

        await io.logger.info(`Escalated issue ${issue.issueNumber} - time-based`);
        timeBasedEscalations++;
      });
    }

    // ========================================================================
    // 2. VIP CUSTOMER ESCALATION
    // Find active issues from VIP customers that aren't escalated
    // ========================================================================
    if (DEFAULT_THRESHOLDS.vipCustomerAutoEscalate) {
      const vipIssues = await io.runTask('query-vip-issues', async () => {
        return db
          .select({
            id: issues.id,
            issueNumber: issues.issueNumber,
            title: issues.title,
            organizationId: issues.organizationId,
            customerId: issues.customerId,
            assignedToUserId: issues.assignedToUserId,
            customerName: customers.name,
          })
          .from(issues)
          .innerJoin(customers, eq(customers.id, issues.customerId))
          .where(
            and(
              // Active status
              inArray(issues.status, [...ACTIVE_STATUSES]),
              // VIP customer
              eq(customers.isVip, true),
              // Not already escalated
              isNull(issues.escalatedAt),
              // Created in the last 15 minutes (only escalate new VIP issues)
              sql`${issues.createdAt} > NOW() - INTERVAL '15 minutes'`,
              // Not deleted
              isNull(issues.deletedAt)
            )
          );
      });

      await io.logger.info(`Found ${vipIssues.length} new issues from VIP customers`);

      for (const issue of vipIssues) {
        await io.runTask(`escalate-vip-${issue.id}`, async () => {
          const reason = 'VIP customer - auto-escalated';

          // Update issue status to escalated
          await db
            .update(issues)
            .set({
              status: 'escalated',
              escalatedAt: now,
              escalationReason: reason,
              updatedAt: now,
            })
            .where(eq(issues.id, issue.id));

          // Create activity record
          await createEscalationActivity(
            issue.id,
            issue.organizationId,
            'vip_customer',
            reason
          );

          // Notify manager with customer name
          await notifyManagerOfEscalation(issue, reason, issue.customerName);

          await io.logger.info(
            `Escalated issue ${issue.issueNumber} - VIP customer: ${issue.customerName}`
          );
          vipEscalations++;
        });
      }
    }

    // ========================================================================
    // 3. SLA BREACH ESCALATION
    // Find issues that have breached SLA but aren't escalated
    // ========================================================================
    if (DEFAULT_THRESHOLDS.slaBreachAutoEscalate) {
      // Query issues with breached SLA via sla_tracking
      const slaBreachedIssues = await io.runTask('query-sla-breach-issues', async () => {
        // Note: This assumes issues have a slaTrackingId FK
        // If the schema uses a different approach, adjust accordingly
        return db
          .select({
            id: issues.id,
            issueNumber: issues.issueNumber,
            title: issues.title,
            organizationId: issues.organizationId,
            customerId: issues.customerId,
            assignedToUserId: issues.assignedToUserId,
          })
          .from(issues)
          .where(
            and(
              // Active status
              inArray(issues.status, [...ACTIVE_STATUSES]),
              // Not already escalated
              isNull(issues.escalatedAt),
              // Has SLA breach (check via slaResponseBreached or slaResolutionBreached columns)
              sql`(${issues.slaResponseBreached} = true OR ${issues.slaResolutionBreached} = true)`,
              // Not deleted
              isNull(issues.deletedAt)
            )
          );
      });

      await io.logger.info(`Found ${slaBreachedIssues.length} issues with SLA breaches`);

      for (const issue of slaBreachedIssues) {
        await io.runTask(`escalate-sla-${issue.id}`, async () => {
          const reason = 'SLA breach - auto-escalated';

          // Update issue status to escalated
          await db
            .update(issues)
            .set({
              status: 'escalated',
              escalatedAt: now,
              escalationReason: reason,
              updatedAt: now,
            })
            .where(eq(issues.id, issue.id));

          // Create activity record
          await createEscalationActivity(
            issue.id,
            issue.organizationId,
            'sla_breach',
            reason
          );

          // Notify manager
          await notifyManagerOfEscalation(issue, reason, null);

          await io.logger.info(`Escalated issue ${issue.issueNumber} - SLA breach`);
          slaBreachEscalations++;
        });
      }
    }

    await io.logger.info('Auto-escalation check completed', {
      timeBasedEscalations,
      vipEscalations,
      slaBreachEscalations,
      totalEscalated: timeBasedEscalations + vipEscalations + slaBreachEscalations,
      skipped,
    });

    return {
      success: true,
      timeBasedEscalations,
      vipEscalations,
      slaBreachEscalations,
      totalEscalated: timeBasedEscalations + vipEscalations + slaBreachEscalations,
    };
  },
});
