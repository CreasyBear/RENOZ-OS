/**
 * User Invitations Hooks
 *
 * TanStack Query hooks for invitation management.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  getInvitationByToken,
  acceptInvitation,
  listInvitations,
  listInvitationStats,
  sendInvitation,
  cancelInvitation,
  resendInvitation,
  batchSendInvitations,
} from '@/server/functions/users/invitations';
import type {
  SendInvitation,
  BatchInvitationItem,
  BatchSendInvitationsInput,
} from '@/lib/schemas/users';
import { toast } from '../_shared/use-toast';
import { trackInviteSent, trackInviteAccepted, trackInviteResend, trackInviteCancelled } from '@/lib/analytics';

// Re-export for route components
export type { BatchInvitationItem, BatchSendInvitationsInput };

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Hook to fetch invitation details by token.
 * Used for the accept invitation page.
 */
export function useInvitationByToken(token: string) {
  return useQuery({
    queryKey: queryKeys.users.invitations.byToken(token),
    queryFn: async () => {
      const result = await getInvitationByToken({
        data: { token } 
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    retryDelay: 1000,
  });
}

/**
 * Hook to fetch pending invitations for admin.
 */
export function useInvitations() {
  return useQuery({
    queryKey: queryKeys.users.invitations.lists(),
    queryFn: async () => {
      const result = await listInvitations({
        data: {} 
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Filters for invitation list queries
 */
export interface InvitationFilters {
  page?: number;
  pageSize?: number;
  status?: 'pending' | 'accepted' | 'expired' | 'cancelled';
}

/**
 * Hook to fetch invitations with filters (pagination, status).
 * Used for the admin invitations management page.
 */
export function useInvitationsFiltered(filters?: InvitationFilters) {
  return useQuery({
    queryKey: queryKeys.users.invitations.list(filters),
    queryFn: async () => {
      const result = await listInvitations({
        data: filters ?? {} 
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    staleTime: 30 * 1000, // 30 seconds
    retry: 2,
    retryDelay: 1000,
  });
}

/**
 * Hook to fetch org-wide invitation stats.
 */
export function useInvitationStats() {
  return useQuery({
    queryKey: queryKeys.users.invitations.stats(),
    queryFn: async () => {
      const result = await listInvitationStats();
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    staleTime: 30 * 1000, // 30 seconds
    retry: 2,
    retryDelay: 1000,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Hook to accept an invitation and create an account.
 */
export function useAcceptInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      token: string;
      firstName: string;
      lastName: string;
      password: string;
      confirmPassword: string;
    }) => acceptInvitation({ data }),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.invitations.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.invitations.byToken(variables.token) });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.invitations.stats() });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.stats() });
      trackInviteAccepted({ email: result.email, role: 'unknown' });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to accept invitation');
    },
  });
}

/**
 * Hook to send a new invitation.
 */
export function useSendInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SendInvitation) => sendInvitation({ data }),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.invitations.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.invitations.stats() });
      if (result.emailQueued === false) {
        toast.warning(
          'Invitation created but we couldn\'t send the email. Use "Resend invitation" to try again.'
        );
      } else {
        toast.success('Invitation sent. The invitee will receive an email shortly.');
      }
      trackInviteSent({ email: variables.email, role: variables.role });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to send invitation');
    },
  });
}

/**
 * Hook to cancel an invitation.
 */
export function useCancelInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { id: string; reason?: string }) => cancelInvitation({ data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.invitations.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.invitations.stats() });
      toast.success('Invitation cancelled');
      trackInviteCancelled({ id: variables.id });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to cancel invitation');
    },
  });
}

/**
 * Hook to resend an invitation.
 */
export function useResendInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { id: string }) => resendInvitation({ data }),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.invitations.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.invitations.stats() });
      if (result.emailQueued === false) {
        toast.warning('Invitation updated but we couldn\'t send the email. Please try again.');
      } else {
        toast.success('Invitation resent');
      }
      trackInviteResend({ id: variables.id });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to resend invitation');
    },
  });
}

/**
 * Hook to batch send invitations.
 */
export function useBatchSendInvitations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BatchSendInvitationsInput) => batchSendInvitations({ data }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.invitations.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.invitations.stats() });
      if (result.summary.emailQueued === false) {
        toast.warning(
          'Invitations created but we couldn\'t send the emails. Use "Resend invitation" for each to try again.'
        );
      } else {
        toast.success('Invitations sent successfully');
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to send invitations');
    },
  });
}
