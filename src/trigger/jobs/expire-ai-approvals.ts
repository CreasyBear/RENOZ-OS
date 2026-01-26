/**
 * Expire AI Approvals Cron Job
 *
 * Scheduled job to expire stale AI approvals and notify users.
 * Implements AI-INFRA-017 acceptance criteria.
 *
 * @see _Initiation/_prd/3-integrations/ai-infrastructure/ai-infrastructure.prd.json
 */

import { cronTrigger, invokeTrigger } from '@trigger.dev/sdk';
import { client } from '../client';
import { db } from '@/lib/db';
import { aiApprovals } from 'drizzle/schema/_ai';
import { eq, and, lt, inArray } from 'drizzle-orm';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Expired approval info for notifications.
 */
interface ExpiredApprovalInfo {
  id: string;
  userId: string;
  organizationId: string;
  action: string;
  agent: string;
}

// ============================================================================
// SCHEDULED JOB
// ============================================================================

/**
 * Expire AI Approvals Schedule
 *
 * Runs every hour to expire pending approvals that have passed their expiresAt timestamp.
 */
export const expireAiApprovalsSchedule = client.defineJob({
  id: 'expire-ai-approvals-schedule',
  name: 'Expire AI Approvals (Scheduled)',
  version: '1.0.0',
  trigger: cronTrigger({
    // Run every hour at minute 0
    cron: '0 * * * *',
  }),
  run: async (_payload, io) => {
    await io.logger.info('Starting AI approvals expiry check');

    // Find all pending approvals that have expired
    const expiredResult = await io.runTask('find-expired', async () => {
      const now = new Date();

      const expired = await db
        .select({
          id: aiApprovals.id,
          userId: aiApprovals.userId,
          organizationId: aiApprovals.organizationId,
          action: aiApprovals.action,
          agent: aiApprovals.agent,
        })
        .from(aiApprovals)
        .where(
          and(
            eq(aiApprovals.status, 'pending'),
            lt(aiApprovals.expiresAt, now)
          )
        );

      return { approvals: expired, count: expired.length };
    }) as { approvals: ExpiredApprovalInfo[]; count: number };

    const expiredApprovals = expiredResult?.approvals ?? [];
    const expiredCount = expiredResult?.count ?? 0;

    await io.logger.info(`Found ${expiredCount} expired approvals`);

    if (expiredCount === 0) {
      return { expiredCount: 0, notificationsSent: 0 };
    }

    // Update all expired approvals
    const updateResult = await io.runTask('update-expired', async () => {
      const expiredIds = expiredApprovals.map((a: ExpiredApprovalInfo) => a.id);

      await db
        .update(aiApprovals)
        .set({ status: 'expired' })
        .where(inArray(aiApprovals.id, expiredIds));

      return { updated: expiredIds.length };
    }) as { updated: number };

    await io.logger.info(`Updated ${updateResult?.updated ?? 0} approvals to expired status`);

    // Create notifications for each affected user
    let notificationsSent = 0;
    for (const approval of expiredApprovals) {
      await io.runTask(`notify-${approval.id}`, async () => {
        // TODO: Integrate with notification system when available
        // For now, just log
        await io.logger.info('Approval expired notification', {
          approvalId: approval.id,
          userId: approval.userId,
          action: approval.action,
          agent: approval.agent,
        });

        notificationsSent++;

        // When notification system is ready:
        // await notifications.create({
        //   type: 'ai_approval_expired',
        //   userId: approval.userId,
        //   organizationId: approval.organizationId,
        //   data: {
        //     approvalId: approval.id,
        //     action: approval.action,
        //     agent: approval.agent,
        //   },
        // });

        return { notified: approval.id };
      });
    }

    return {
      expiredCount,
      notificationsSent,
    };
  },
});

// ============================================================================
// MANUAL TRIGGER (FOR TESTING)
// ============================================================================

/**
 * Expire AI Approvals Task (Manual)
 *
 * Can be triggered manually to expire approvals on demand.
 */
export const expireAiApprovalsTask = client.defineJob({
  id: 'expire-ai-approvals-task',
  name: 'Expire AI Approvals (Manual)',
  version: '1.0.0',
  trigger: invokeTrigger(),
  run: async (_payload, io) => {
    await io.logger.info('Manual AI approvals expiry triggered');

    // Find all pending approvals that have expired
    const now = new Date();

    const expiredApprovals = await db
      .select({
        id: aiApprovals.id,
        userId: aiApprovals.userId,
        organizationId: aiApprovals.organizationId,
        action: aiApprovals.action,
        agent: aiApprovals.agent,
      })
      .from(aiApprovals)
      .where(
        and(
          eq(aiApprovals.status, 'pending'),
          lt(aiApprovals.expiresAt, now)
        )
      );

    if (expiredApprovals.length === 0) {
      await io.logger.info('No expired approvals found');
      return { expiredCount: 0 };
    }

    // Update all expired approvals
    const expiredIds = expiredApprovals.map((a) => a.id);
    await db
      .update(aiApprovals)
      .set({ status: 'expired' })
      .where(inArray(aiApprovals.id, expiredIds));

    await io.logger.info(`Expired ${expiredApprovals.length} approvals`);

    return {
      expiredCount: expiredApprovals.length,
      expiredIds,
    };
  },
});
