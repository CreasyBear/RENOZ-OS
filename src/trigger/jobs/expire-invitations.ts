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
import { schedules } from '@trigger.dev/sdk/v3';
import { and, eq, lt } from 'drizzle-orm';
import { db } from '@/lib/db';
import { userInvitations } from 'drizzle/schema';

// ============================================================================
// EXPIRE INVITATIONS TASK
// ============================================================================

/**
 * Task that marks pending invitations as expired if they've passed their expiry date.
 */
export const expireInvitationsTask = schedules.task({
  id: 'expire-old-invitations',
  cron: '0 * * * *',
  run: async () => {
    console.log('Starting invitation expiry check');

    const now = new Date();

    // Find and update all pending invitations that have expired
    const result = await db
      .update(userInvitations)
      .set({ status: 'expired' })
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

