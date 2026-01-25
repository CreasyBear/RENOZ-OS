/**
 * Expire Old Invitations Job
 *
 * Scheduled cron job that runs every hour to mark expired invitations.
 * Invitations that have passed their expiresAt date are updated to 'expired' status.
 *
 * This replaces the public server function that was vulnerable to unauthorized calls.
 *
 * @see src/server/functions/users/invitations.ts (original function removed)
 */
import { task, schedules } from '@trigger.dev/sdk/v3';
import { and, eq, lt } from 'drizzle-orm';
import { db } from '@/lib/db';
import { userInvitations } from 'drizzle/schema';

// ============================================================================
// EXPIRE INVITATIONS TASK
// ============================================================================

/**
 * Task that marks pending invitations as expired if they've passed their expiry date.
 */
export const expireInvitationsTask = task({
  id: 'expire-old-invitations',
  run: async () => {
    console.log('Starting invitation expiry check');

    const now = new Date();

    // Find and update all pending invitations that have expired
    const result = await db
      .update(userInvitations)
      .set({
        status: 'expired',
        updatedAt: now,
      })
      .where(
        and(
          eq(userInvitations.status, 'pending'),
          lt(userInvitations.expiresAt, now)
        )
      )
      .returning({ id: userInvitations.id });

    console.log(`Expired ${result.length} invitations`);

    return {
      success: true,
      expiredCount: result.length,
      expiredIds: result.map((r) => r.id),
    };
  },
});

// Schedule the task to run every hour
export const expireInvitationsSchedule = schedules.task({
  id: 'expire-invitations-schedule',
  task: expireInvitationsTask.id,
  cron: '0 * * * *', // Every hour at minute 0
});
