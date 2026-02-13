/**
 * Scheduled Emails Hooks
 *
 * Query and mutation hooks for scheduled emails.
 * Uses centralized query keys for proper cache invalidation.
 *
 * @see DOM-COMMS-002b
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
import { QUERY_CONFIG } from '@/lib/constants';
import type {
  ScheduleEmailInput,
  UpdateScheduledEmailInput,
  CancelScheduledEmailInput,
} from '@/lib/schemas/communications/scheduled-emails';
import {
  getScheduledEmails,
  getScheduledEmailById,
  scheduleEmail,
  updateScheduledEmail,
  cancelScheduledEmail,
} from '@/server/functions/communications/scheduled-emails';

// ============================================================================
// QUERY HOOKS
// ============================================================================

export interface UseScheduledEmailsOptions {
  status?: 'pending' | 'sent' | 'cancelled';
  customerId?: string;
  search?: string;
  limit?: number;
  offset?: number;
  enabled?: boolean;
}

export function useScheduledEmails(options: UseScheduledEmailsOptions = {}) {
  const { status, customerId, search, limit = 50, offset = 0, enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.communications.scheduledEmailsList({ status, customerId, search }),
    queryFn: async () => {
      const result = await getScheduledEmails({
        data: { status, customerId, search, limit, offset } 
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled,
    staleTime: QUERY_CONFIG.STALE_TIME_SHORT,
  });
}

export interface UseScheduledEmailOptions {
  emailId: string;
  enabled?: boolean;
}

export function useScheduledEmail(options: UseScheduledEmailOptions) {
  const { emailId, enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.communications.scheduledEmailDetail(emailId),
    queryFn: async () => {
      const result = await getScheduledEmailById({
        data: { id: emailId } 
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled: enabled && !!emailId,
    staleTime: QUERY_CONFIG.STALE_TIME_MEDIUM,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

export function useScheduleEmail() {
  const queryClient = useQueryClient();
  const scheduleEmailFn = useServerFn(scheduleEmail);

  return useMutation({
    mutationFn: (input: ScheduleEmailInput) => scheduleEmailFn({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.scheduledEmails(),
      });
    },
  });
}

export function useUpdateScheduledEmail() {
  const queryClient = useQueryClient();
  const updateEmailFn = useServerFn(updateScheduledEmail);

  return useMutation({
    mutationFn: (input: UpdateScheduledEmailInput) => updateEmailFn({ data: input }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.scheduledEmails(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.scheduledEmailDetail(variables.id),
      });
    },
  });
}

export function useCancelScheduledEmail() {
  const queryClient = useQueryClient();
  const cancelEmailFn = useServerFn(cancelScheduledEmail);

  return useMutation({
    mutationFn: (input: CancelScheduledEmailInput) => cancelEmailFn({ data: input }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.scheduledEmails(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.scheduledEmailDetail(variables.id),
      });
    },
  });
}
