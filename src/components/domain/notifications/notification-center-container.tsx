/**
 * NotificationCenterContainer
 *
 * Container for the notification center popover content.
 * Fetches notifications via useNotifications (lazy when popover closed).
 *
 * @source notifications from useNotifications
 * @see src/hooks/notifications/use-notifications.ts
 */

import { useState, useCallback } from 'react';
import { useNotifications, useMarkNotificationRead } from '@/hooks/notifications';
import { NotificationCenterPopover } from './notification-center-popover';

// ============================================================================
// COMPONENT
// ============================================================================

/** Self-contained notification center (bell + popover). Manages open state internally. */
export function NotificationCenterContainer() {
  const [isOpen, setIsOpen] = useState(false);
  const { data, isLoading } = useNotifications({
    enabled: isOpen,
    limit: 20,
  });
  const markRead = useMarkNotificationRead();

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const handleMarkRead = useCallback((id: string) => {
    markRead.mutate(id);
  }, [markRead]);

  return (
    <NotificationCenterPopover
      notifications={notifications}
      unreadCount={unreadCount}
      isLoading={isLoading}
      onMarkRead={handleMarkRead}
      markingReadId={markRead.isPending ? (markRead.variables as string | undefined) : undefined}
      isOpen={isOpen}
      onOpenChange={setIsOpen}
    />
  );
}
