/**
 * List Notifications Server Function
 *
 * Returns recent notifications for the current user (last 20, unread-first).
 * Used by the header bell notification center popover.
 *
 * @source notifications table
 * @see src/components/domain/notifications/notification-center-popover.tsx
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, isNull, desc, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { notifications } from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import type {
  ListNotificationsResult,
  NotificationItem,
} from '@/lib/schemas/notifications';
import { listNotificationsInputSchema } from '@/lib/schemas/notifications';

// ============================================================================
// LIST NOTIFICATIONS
// ============================================================================

export const listNotifications = createServerFn({ method: 'GET' })
  .inputValidator(listNotificationsInputSchema)
  .handler(async ({ data }): Promise<ListNotificationsResult> => {
    const ctx = await withAuth();
    const limit = data.limit ?? 20;

    // Fetch notifications for this user in this org
    // Order: unread first (readAt is null), then by createdAt desc
    const rows = await db
      .select({
        id: notifications.id,
        type: notifications.type,
        title: notifications.title,
        message: notifications.message,
        status: notifications.status,
        data: notifications.data,
        createdAt: notifications.createdAt,
        readAt: notifications.readAt,
      })
      .from(notifications)
      .where(
        and(
          eq(notifications.organizationId, ctx.organizationId),
          eq(notifications.userId, ctx.user.id)
        )
      )
      .orderBy(
        // Unread first: readAt null comes before readAt set
        sql`${notifications.readAt} IS NULL DESC`,
        desc(notifications.createdAt)
      )
      .limit(limit);

    const items: NotificationItem[] = rows.map((row) => ({
      id: row.id,
      type: row.type as NotificationItem['type'],
      title: row.title,
      message: row.message,
      status: row.status as NotificationItem['status'],
      data: (row.data as NotificationItem['data']) ?? null,
      createdAt: new Date(row.createdAt),
      readAt: row.readAt ? new Date(row.readAt) : null,
    }));

    // Unread count: readAt is null
    const unreadRows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(
        and(
          eq(notifications.organizationId, ctx.organizationId),
          eq(notifications.userId, ctx.user.id),
          isNull(notifications.readAt)
        )
      );

    const unreadCount = unreadRows[0]?.count ?? 0;

    return {
      notifications: items,
      unreadCount,
    };
  });
