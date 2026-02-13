'use server'

/**
 * Auto-Escalate Overdue Approvals Job
 *
 * Scheduled cron job that runs every 15 minutes to check for purchase order
 * approvals that are overdue and escalate them automatically.
 *
 * This replaces the public server function that required auth context.
 * The job iterates through all organizations to process their overdue approvals.
 *
 * @see src/server/functions/suppliers/approvals.ts (original function removed)
 */
import { schedules } from '@trigger.dev/sdk/v3';
import { and, eq, sql, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { logger as appLogger } from '@/lib/logger';
import { purchaseOrderApprovals } from 'drizzle/schema/suppliers';
import { organizations, notifications, users } from 'drizzle/schema';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Notify approvers about an escalated approval
 */
async function notifyEscalation(
  approval: {
    id: string;
    purchaseOrderId: string;
    organizationId: string;
  },
  reason: string
) {
  // Get organization admins to notify
  const admins = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.organizationId, approval.organizationId),
        eq(users.role, 'admin'),
        isNull(users.deletedAt)
      )
    )
    .limit(5);

  // Create notifications for admins
  for (const admin of admins) {
    await db.insert(notifications).values({
      organizationId: approval.organizationId,
      userId: admin.id,
      type: 'system',
      title: 'Purchase Order Approval Escalated',
      message: `A purchase order approval has been automatically escalated. Reason: ${reason}`,
      data: {
        entityId: approval.id,
        entityType: 'purchase_order_approval',
        subType: 'auto_escalation',
        purchaseOrderId: approval.purchaseOrderId,
        reason,
      },
      status: 'pending',
    });
  }
}

// ============================================================================
// AUTO-ESCALATE APPROVALS TASK
// ============================================================================

/**
 * Scheduled task that finds and escalates overdue purchase order approvals.
 * Runs across all organizations every 15 minutes.
 */
export const autoEscalateApprovalsTask = schedules.task({
  id: 'auto-escalate-approvals',
  cron: '*/15 * * * *',
  run: async () => {
    appLogger.debug('Starting approval escalation check');

    const now = new Date();
    let totalEscalated = 0;

    // Get all active organizations
    const orgs = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(isNull(organizations.deletedAt));

    appLogger.debug('Checking organizations for overdue approvals', { orgCount: orgs.length });

    for (const org of orgs) {
      // Find overdue pending approvals for this organization
      const overdueApprovals = await db
        .select({
          id: purchaseOrderApprovals.id,
          purchaseOrderId: purchaseOrderApprovals.purchaseOrderId,
          organizationId: purchaseOrderApprovals.organizationId,
        })
        .from(purchaseOrderApprovals)
        .where(
          and(
            eq(purchaseOrderApprovals.organizationId, org.id),
            eq(purchaseOrderApprovals.status, 'pending'),
            isNull(purchaseOrderApprovals.escalatedTo),
            sql`${purchaseOrderApprovals.dueAt} < NOW()`
          )
        )
        .limit(100);

      for (const approval of overdueApprovals) {
        const reason = 'Approval deadline exceeded - auto-escalated';

        // Update approval status to escalated
        await db
          .update(purchaseOrderApprovals)
          .set({
            status: 'escalated',
            escalatedAt: now,
            escalationReason: reason,
            updatedAt: now,
          })
          .where(eq(purchaseOrderApprovals.id, approval.id));

        // Notify relevant users
        await notifyEscalation(approval, reason);

        appLogger.debug('Escalated approval', { approvalId: approval.id, purchaseOrderId: approval.purchaseOrderId });
        totalEscalated++;
      }
    }

    appLogger.debug('Escalation check completed', { totalEscalated });

    return {
      success: true,
      totalEscalated,
      organizationsChecked: orgs.length,
    };
  },
});
