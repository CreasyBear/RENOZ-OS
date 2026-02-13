/**
 * Sessions Hooks
 *
 * TanStack Query hooks for user session management.
 * Provides hooks for listing, terminating, and managing user sessions.
 *
 * @see src/server/functions/users/sessions.ts for server functions
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  listMySessions,
  terminateSession,
  terminateAllOtherSessions,
} from '@/server/functions/users/sessions';
import type { SessionInfo } from '@/lib/schemas/users';
import { toast } from '../_shared/use-toast';

// Re-export SessionInfo type for consumers
export type { SessionInfo };

/**
 * Hook to fetch current user's active sessions.
 *
 * @example
 * const { data: sessions, isLoading } = useMySessions();
 */
export function useMySessions() {
  return useQuery({
    queryKey: queryKeys.users.sessions.list(),
    queryFn: async () => {
      const result = await listMySessions({
        data: {} 
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to terminate a specific session.
 * Invalidates sessions list on success.
 *
 * @example
 * const { mutate: terminateSession } = useTerminateSession();
 * terminateSession({ id: sessionId });
 */
export function useTerminateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { id: string }) => terminateSession({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.sessions.all() });
      toast.success('Session terminated');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to terminate session');
    },
  });
}

/**
 * Hook to terminate all sessions except the current one.
 * Invalidates sessions list on success.
 *
 * @example
 * const { mutate: terminateAll } = useTerminateAllOtherSessions();
 * terminateAll();
 */
export function useTerminateAllOtherSessions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => terminateAllOtherSessions({ data: {} }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.sessions.all() });
      toast.success('All other sessions terminated');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to terminate sessions');
    },
  });
}
