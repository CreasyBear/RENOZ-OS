/**
 * Inbox Email Accounts Hooks
 *
 * TanStack Query hooks for managing external email account connections.
 *
 * @see STANDARDS.md - Hook patterns
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { queryKeys } from "@/lib/query-keys";
import {
  listInboxEmailAccounts,
  connectInboxEmailAccount,
  handleInboxEmailAccountCallback,
  syncInboxEmailAccount,
  deleteInboxEmailAccount,
} from "@/server/functions/communications/inbox-accounts";
import type {
  ConnectInboxEmailAccountRequest,
  SyncInboxEmailAccountRequest,
  OAuthCallbackRequest,
} from "@/lib/schemas/communications/inbox-accounts";
import { toast } from "@/lib/toast";
import { getUserFriendlyMessage } from "@/lib/error-handling";
import { QUERY_CONFIG } from "@/lib/constants";

// ============================================================================
// LIST EMAIL ACCOUNTS
// ============================================================================

/**
 * Hook to fetch all connected email accounts.
 */
export function useInboxEmailAccounts(options?: { refetchInterval?: number | false }) {
  const listFn = useServerFn(listInboxEmailAccounts);

  return useQuery({
    queryKey: queryKeys.communications.inboxEmailAccounts(),
    queryFn: async () => {
      const result = await listFn();
      if (result == null) throw new Error('Inbox email accounts returned no data');
      return result;
    },
    staleTime: QUERY_CONFIG.STALE_TIME_SHORT,
    refetchInterval: options?.refetchInterval,
    refetchIntervalInBackground: options?.refetchInterval ? true : false,
  });
}

// ============================================================================
// CONNECT EMAIL ACCOUNT
// ============================================================================

/**
 * Hook to initiate OAuth flow for connecting an email account.
 */
export function useConnectInboxEmailAccount() {
  const connectFn = useServerFn(connectInboxEmailAccount);

  return useMutation({
    mutationFn: (input: ConnectInboxEmailAccountRequest) => connectFn({ data: input }),
    onSuccess: (data) => {
      // Redirect to authorization URL
      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      }
    },
    onError: (error) => {
      toast.error('Failed to connect email account', {
        description: getUserFriendlyMessage(error as Error),
      });
    },
  });
}

// ============================================================================
// OAUTH CALLBACK
// ============================================================================

/**
 * Hook to handle OAuth callback after user authorizes.
 */
export function useHandleInboxEmailAccountCallback() {
  const queryClient = useQueryClient();
  const callbackFn = useServerFn(handleInboxEmailAccountCallback);

  return useMutation({
    mutationFn: (input: OAuthCallbackRequest) => callbackFn({ data: input }),
    onSuccess: () => {
      // Invalidate and refetch email accounts list
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.inboxEmailAccounts(),
      });
    },
  });
}

// ============================================================================
// SYNC EMAIL ACCOUNT
// ============================================================================

/**
 * Hook to manually sync an email account.
 * 
 * Note: Sync status polling is handled by useInboxEmailAccounts with refetchInterval.
 * This mutation only triggers the sync and invalidates queries.
 */
export function useSyncInboxEmailAccount() {
  const queryClient = useQueryClient();
  const syncFn = useServerFn(syncInboxEmailAccount);

  return useMutation({
    mutationFn: (input: SyncInboxEmailAccountRequest) => syncFn({ data: input }),
    onSuccess: () => {
      toast.success('Sync started', {
        description: 'Emails are being synced. This may take a few moments.',
      });
      // Invalidate email accounts list to refresh lastSyncedAt
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.inboxEmailAccounts(),
      });
      // Also invalidate inbox items if we're syncing emails
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.inbox(),
      });
      // Note: Polling is handled by useInboxEmailAccounts hook with refetchInterval
      // when sync is in progress. This follows TanStack Query best practices.
    },
    onError: (error, variables) => {
      toast.error('Sync failed', {
        description: getUserFriendlyMessage(error as Error),
        action: {
          label: 'Retry',
          onClick: () => {
            // Retry sync with same input
            syncFn({ data: variables });
          },
        },
      });
    },
  });
}

// ============================================================================
// DELETE EMAIL ACCOUNT
// ============================================================================

/**
 * Hook to delete an email account connection.
 */
export function useDeleteInboxEmailAccount() {
  const queryClient = useQueryClient();
  const deleteFn = useServerFn(deleteInboxEmailAccount);

  return useMutation({
    mutationFn: (connectionId: string) => deleteFn({ data: { connectionId } }),
    onSuccess: () => {
      // Invalidate email accounts list
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.inboxEmailAccounts(),
      });
    },
  });
}
