/**
 * NotificationCenterPopover
 *
 * Header bell popover with notification list, empty state, and skeleton.
 * Uses align="end", side="bottom" per plan.
 *
 * @see docs/design-system/INBOX-NOTIFICATION-STANDARDS.md
 */

import { useCallback } from 'react';
import { Bell, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { NotificationListItem } from './notification-list-item';
import type { NotificationItem } from '@/lib/schemas/notifications';

// ============================================================================
// SKELETON
// ============================================================================

function NotificationListSkeleton() {
  return (
    <div className="space-y-3 px-4 py-3" aria-label="Loading notifications">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex min-h-[44px] items-center gap-3">
          <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function NotificationEmptyState() {
  return (
    <div
      className="flex flex-col items-center justify-center px-6 py-12 text-center"
      role="status"
      aria-label="No new notifications"
    >
      <Inbox
        className="mb-4 h-12 w-12 text-muted-foreground/40"
        aria-hidden="true"
      />
      <h3 className="text-base font-medium text-foreground">No new notifications</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        You&apos;re all caught up
      </p>
    </div>
  );
}

// ============================================================================
// PROPS
// ============================================================================

export interface NotificationCenterPopoverProps {
  notifications: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  onMarkRead: (id: string) => void;
  /** ID of notification currently being marked read (for double-click protection) */
  markingReadId?: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function NotificationCenterPopover({
  notifications,
  unreadCount,
  isLoading,
  onMarkRead,
  markingReadId,
  isOpen,
  onOpenChange,
}: NotificationCenterPopoverProps) {
  const handleItemClick = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'relative min-h-11 min-w-11 p-2 rounded-lg text-muted-foreground',
            'hover:bg-muted hover:text-foreground transition-colors duration-200',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          )}
          aria-label="Notifications"
          aria-expanded={isOpen}
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
          {unreadCount > 0 && (
            <span
              className={cn(
                'absolute -top-0.5 -right-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-medium text-destructive-foreground'
              )}
              aria-hidden="true"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={8}
        className="w-[380px] p-0 md:w-[400px]"
        aria-label="Notification list"
      >
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Notifications</h3>
        </div>
        <ScrollArea className="max-h-[400px]">
          {isLoading ? (
            <NotificationListSkeleton />
          ) : notifications.length === 0 ? (
            <NotificationEmptyState />
          ) : (
            <ul className="py-2" role="list">
              {notifications.map((item) => (
                <li key={item.id} role="listitem">
                  <NotificationListItem
                    item={item}
                    onMarkRead={onMarkRead}
                    onItemClick={handleItemClick}
                    markingReadId={markingReadId}
                  />
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
