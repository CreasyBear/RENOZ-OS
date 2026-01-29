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
  sendInvitation,
  cancelInvitation,
  resendInvitation,
  batchSendInvitations,
} from '@/server/functions/users/invitations';
import type {
  SendInvitation,
} from '@/lib/schemas/users';

// Type for batch invitations (defined locally since schema is server-only)
interface BatchInvitationItem {
  email: string;
  role: 'admin' | 'manager' | 'sales' | 'operations' | 'support' | 'viewer';
  personalMessage?: string;
}

interface BatchSendInvitationsInput {
  invitations: BatchInvitationItem[];
}
import { toast } from '../_shared/use-toast';

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
    queryFn: () => getInvitationByToken({ data: { token } }),
    enabled: !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch pending invitations for admin.
 */
export function useInvitations() {
  return useQuery({
    queryKey: queryKeys.users.invitations.lists(),
    queryFn: () => listInvitations({ data: {} }),
    staleTime: 30 * 1000, // 30 seconds
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
    onSuccess: () => {
      // Invalidate any invitation-related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.users.invitations.lists() });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.invitations.lists() });
      toast.success('Invitation sent successfully');
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.invitations.lists() });
      toast.success('Invitation cancelled');
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.invitations.lists() });
      toast.success('Invitation resent');
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.invitations.lists() });
      toast.success('Invitations sent successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to send invitations');
    },
  });
}
