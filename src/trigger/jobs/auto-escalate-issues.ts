/**
 * Auto-Escalate Issues Job
 *
 * Scheduled cron job that runs every 15 minutes to check for issues
 * that should be automatically escalated based on configured rules:
 * - Time-based: Issues unresponded for X hours
 * - Priority-based: High/critical priority issues
 * - SLA breach: Issues linked to breached SLA tracking
 *
 * @see _Initiation/_prd/2-domains/support/support.prd.json DOM-SUP-002b
 */
import { schedules } from '@trigger.dev/sdk/v3';
import { and, eq, lt, isNull, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { issues, notifications, users, activities, slaTracking } from 'drizzle/schema';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Default escalation thresholds
 */
const DEFAULT_THRESHOLDS = {
  /** Hours before unresponded issue is escalated */
  unrespondedHours: 24,
  /** Auto-escalate high priority issues after this many hours */
  highPriorityEscalateHours: 12,
  /** Auto-escalate issues that breach SLA */
  slaBreachAutoEscalate: true,
} as const;

/**
 * Statuses that are considered "active" and eligible for escalation
 */
const ACTIVE_STATUSES = ['open', 'in_progress'] as const;

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
    action: 'updated',
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
  // Notify the assigned user about the escalation if there is one
  if (issue.assignedToUserId) {
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

  // Also get organization admins to notify
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
 * 3. Priority-based escalation works (high/critical priority)
 * 4. Manager notification sent on auto-escalation
 */
export const autoEscalateIssuesTask = schedules.task({
  id: 'auto-escalate-issues',
  cron: '*/15 * * * *',
  run: async () => {
    console.log('Starting auto-escalation check');

    const now = new Date();
    const escalationCutoff = new Date(
      now.getTime() - DEFAULT_THRESHOLDS.unrespondedHours * 60 * 60 * 1000
    );
    const highPriorityCutoff = new Date(
      now.getTime() - DEFAULT_THRESHOLDS.highPriorityEscalateHours * 60 * 60 * 1000
    );

    // Track escalation stats
    let timeBasedEscalations = 0;
    let priorityEscalations = 0;
    let slaBreachEscalations = 0;

    // ========================================================================
    // 1. TIME-BASED ESCALATION
    // Find issues that have been open for too long without resolution
    // ========================================================================
    const unrespondedIssues = await db
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
          // Created before cutoff time
          lt(issues.createdAt, escalationCutoff),
          // Not already escalated
          isNull(issues.escalatedAt),
          // Not deleted
          isNull(issues.deletedAt)
        )
      );

    console.log(
      `Found ${unrespondedIssues.length} unresponded issues older than ${DEFAULT_THRESHOLDS.unrespondedHours}h`
    );

    // Escalate each unresponded issue
    for (const issue of unrespondedIssues) {
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
      await createEscalationActivity(issue.id, issue.organizationId, 'time_based', reason);

      // Notify manager
      await notifyManagerOfEscalation(issue, reason, null);

      console.log(`Escalated issue ${issue.issueNumber} - time-based`);
      timeBasedEscalations++;
    }

    // ========================================================================
    // 2. PRIORITY-BASED ESCALATION
    // Find high/critical priority issues that haven't been addressed quickly
    // ========================================================================
    const highPriorityIssues = await db
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
          // High or critical priority
          inArray(issues.priority, ['high', 'critical']),
          // Created before high priority cutoff
          lt(issues.createdAt, highPriorityCutoff),
          // Not already escalated
          isNull(issues.escalatedAt),
          // Not deleted
          isNull(issues.deletedAt)
        )
      );

    console.log(`Found ${highPriorityIssues.length} high priority issues needing escalation`);

    for (const issue of highPriorityIssues) {
      const reason = `High priority issue unaddressed for ${DEFAULT_THRESHOLDS.highPriorityEscalateHours}+ hours`;

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
      await createEscalationActivity(issue.id, issue.organizationId, 'priority_based', reason);

      // Notify manager
      await notifyManagerOfEscalation(issue, reason, null);

      console.log(`Escalated issue ${issue.issueNumber} - priority-based`);
      priorityEscalations++;
    }

    // ========================================================================
    // 3. SLA BREACH ESCALATION
    // Find issues linked to SLA tracking records that have been breached
    // ========================================================================
    if (DEFAULT_THRESHOLDS.slaBreachAutoEscalate) {
      const slaBreachedIssues = await db
        .select({
          id: issues.id,
          issueNumber: issues.issueNumber,
          title: issues.title,
          organizationId: issues.organizationId,
          customerId: issues.customerId,
          assignedToUserId: issues.assignedToUserId,
        })
        .from(issues)
        .innerJoin(slaTracking, eq(slaTracking.id, issues.slaTrackingId))
        .where(
          and(
            // Active status
            inArray(issues.status, [...ACTIVE_STATUSES]),
            // Not already escalated
            isNull(issues.escalatedAt),
            // Has SLA breach (check slaTracking status)
            eq(slaTracking.status, 'breached'),
            // Not deleted
            isNull(issues.deletedAt)
          )
        );

      console.log(`Found ${slaBreachedIssues.length} issues with SLA breaches`);

      for (const issue of slaBreachedIssues) {
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
        await createEscalationActivity(issue.id, issue.organizationId, 'sla_breach', reason);

        // Notify manager
        await notifyManagerOfEscalation(issue, reason, null);

        console.log(`Escalated issue ${issue.issueNumber} - SLA breach`);
        slaBreachEscalations++;
      }
    }

    console.log('Auto-escalation check completed', {
      timeBasedEscalations,
      priorityEscalations,
      slaBreachEscalations,
      totalEscalated: timeBasedEscalations + priorityEscalations + slaBreachEscalations,
    });

    return {
      success: true,
      timeBasedEscalations,
      priorityEscalations,
      slaBreachEscalations,
      totalEscalated: timeBasedEscalations + priorityEscalations + slaBreachEscalations,
    };
  },
});

