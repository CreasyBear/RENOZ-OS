/**
 * Notifications Hooks
 *
 * TanStack Query hooks for the notification center (header bell popover).
 * Fetches only when popover is open (enabled: isOpen).
 *
 * @source notifications from listNotifications server function
 * @see src/server/functions/notifications/list-notifications.ts
 * @see src/components/domain/notifications/notification-center-popover.tsx
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { toast } from '../_shared/use-toast';
import {
  listNotifications,
  markNotificationRead,
} from '@/server/functions/notifications';
import type { ListNotificationsResult } from '@/lib/schemas/notifications';

// ============================================================================
// TYPES
// ============================================================================

export interface UseNotificationsOptions {
  /** Enable/disable the query (e.g. when popover is open) */
  enabled?: boolean;
  /** Max items to fetch (default 20) */
  limit?: number;
}

// ============================================================================
// QUERY HOOK
// ============================================================================

/**
 * Fetch recent notifications for the notification center popover.
 * Only fetches when enabled (popover open) to avoid blocking initial load.
 */
export function useNotifications({
  enabled = false,
  limit = 20,
}: UseNotificationsOptions = {}) {
  return useQuery<ListNotificationsResult>({
    queryKey: queryKeys.notifications.list({ limit }),
    queryFn: async () => {
      const result = await listNotifications({ data: { limit } });
      if (result == null) throw new Error('Notifications query returned no data');
      return result;
    },
    enabled,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// ============================================================================
// MUTATION HOOK
// ============================================================================

/**
 * Mark a notification as read.
 * Invalidates notifications list and count on success.
 */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      markNotificationRead({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to mark notification as read');
    },
  });
}
