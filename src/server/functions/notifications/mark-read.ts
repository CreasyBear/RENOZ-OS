/**
 * Mark Notification Read Server Function
 *
 * Marks a notification as read for the current user.
 * Verifies ownership (userId) before updating.
 *
 * @source notifications table
 * @see src/hooks/notifications/use-notifications.ts
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { notifications } from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { markNotificationReadInputSchema } from '@/lib/schemas/notifications';

// ============================================================================
// MARK NOTIFICATION READ
// ============================================================================

export const markNotificationRead = createServerFn({ method: 'POST' })
  .inputValidator(markNotificationReadInputSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    const result = await db
      .update(notifications)
      .set({
        readAt: new Date(),
        status: 'read',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(notifications.id, data.id),
          eq(notifications.organizationId, ctx.organizationId),
          eq(notifications.userId, ctx.user.id) // Ownership check
        )
      )
      .returning({ id: notifications.id });

    return { success: result.length > 0 };
  });
