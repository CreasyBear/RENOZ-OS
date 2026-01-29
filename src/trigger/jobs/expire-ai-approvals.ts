'use server'

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
import { eq, and, lt, sql } from 'drizzle-orm';

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
  version: '1.0.1', // Bumped for atomic update fix
  trigger: cronTrigger({
    // Run every hour at minute 0
    cron: '0 * * * *',
  }),
  run: async (_payload, io) => {
    await io.logger.info('Starting AI approvals expiry check');

    // ATOMIC UPDATE: Use UPDATE...WHERE...RETURNING to prevent race conditions
    // This ensures only pending approvals are expired, even if concurrent approval happens
    const expiredResult = await io.runTask('expire-atomically', async () => {
      const now = new Date();

      // Atomic update - only expires approvals that are STILL pending
      // If an approval was approved between check and update, it won't be affected
      const expired = await db
        .update(aiApprovals)
        .set({
          status: 'expired',
          // Increment version for optimistic locking consistency
          version: sql`${aiApprovals.version} + 1`,
        })
        .where(
          and(
            eq(aiApprovals.status, 'pending'), // Critical: status check in WHERE clause
            lt(aiApprovals.expiresAt, now)
          )
        )
        .returning({
          id: aiApprovals.id,
          userId: aiApprovals.userId,
          organizationId: aiApprovals.organizationId,
          action: aiApprovals.action,
          agent: aiApprovals.agent,
        });

      return { approvals: expired, count: expired.length };
    }) as { approvals: ExpiredApprovalInfo[]; count: number };

    const expiredApprovals = expiredResult?.approvals ?? [];
    const expiredCount = expiredResult?.count ?? 0;

    await io.logger.info(`Expired ${expiredCount} approvals atomically`);

    if (expiredCount === 0) {
      return { expiredCount: 0, notificationsSent: 0 };
    }

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
  version: '1.0.1', // Bumped for atomic update fix
  trigger: invokeTrigger(),
  run: async (_payload, io) => {
    await io.logger.info('Manual AI approvals expiry triggered');

    const now = new Date();

    // ATOMIC UPDATE: Use UPDATE...WHERE...RETURNING to prevent race conditions
    const expiredApprovals = await db
      .update(aiApprovals)
      .set({
        status: 'expired',
        version: sql`${aiApprovals.version} + 1`,
      })
      .where(
        and(
          eq(aiApprovals.status, 'pending'), // Critical: status check in WHERE clause
          lt(aiApprovals.expiresAt, now)
        )
      )
      .returning({
        id: aiApprovals.id,
        userId: aiApprovals.userId,
        organizationId: aiApprovals.organizationId,
        action: aiApprovals.action,
        agent: aiApprovals.agent,
      });

    if (expiredApprovals.length === 0) {
      await io.logger.info('No expired approvals found');
      return { expiredCount: 0 };
    }

    const expiredIds = expiredApprovals.map((a) => a.id);
    await io.logger.info(`Expired ${expiredApprovals.length} approvals atomically`);

    return {
      expiredCount: expiredApprovals.length,
      expiredIds,
    };
  },
});
