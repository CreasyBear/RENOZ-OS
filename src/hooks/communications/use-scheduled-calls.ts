/**
 * Scheduled Calls Hooks
 *
 * Query and mutation hooks for scheduled calls.
 * Uses centralized query keys for proper cache invalidation.
 *
 * @see DOM-COMMS-004b
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
import type {
  ScheduleCallInput,
  UpdateScheduledCallInput,
  CancelScheduledCallInput,
  RescheduleCallInput,
  CompleteCallInput,
} from '@/lib/schemas/communications/scheduled-calls';
import {
  getScheduledCalls,
  getScheduledCallById,
  scheduleCall,
  updateScheduledCall,
  cancelScheduledCall,
  rescheduleCall,
  completeCall,
} from '@/server/functions/communications/scheduled-calls';

// ============================================================================
// QUERY HOOKS
// ============================================================================

export interface UseScheduledCallsOptions {
  customerId?: string;
  assigneeId?: string;
  status?: 'pending' | 'completed' | 'cancelled' | 'rescheduled';
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
  enabled?: boolean;
}

export function useScheduledCalls(options: UseScheduledCallsOptions = {}) {
  const {
    customerId,
    assigneeId,
    status,
    fromDate,
    toDate,
    limit = 50,
    offset = 0,
    enabled = true
  } = options;

  return useQuery({
    queryKey: queryKeys.communications.scheduledCallsList({ customerId, assigneeId, status }),
    queryFn: () => getScheduledCalls({
      data: { customerId, assigneeId, status, fromDate, toDate, limit, offset }
    }),
    enabled,
    staleTime: 30 * 1000, // 30 seconds - calls list can change frequently
  });
}

export interface UseScheduledCallOptions {
  callId: string;
  enabled?: boolean;
}

export function useScheduledCall(options: UseScheduledCallOptions) {
  const { callId, enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.communications.scheduledCallDetail(callId),
    queryFn: () => getScheduledCallById({ data: { id: callId } }),
    enabled: enabled && !!callId,
    staleTime: 60 * 1000, // 1 minute
  });
}

export interface UseUpcomingCallsOptions {
  assigneeId?: string;
  limit?: number;
  enabled?: boolean;
}

export function useUpcomingCalls(options: UseUpcomingCallsOptions = {}) {
  const { assigneeId, limit = 10, enabled = true } = options;
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  return useQuery({
    queryKey: queryKeys.communications.upcomingCalls({ assigneeId, limit }),
    queryFn: () => getScheduledCalls({
      data: {
        assigneeId,
        status: 'pending',
        fromDate: now,
        toDate: tomorrow,
        limit,
        offset: 0,
      }
    }),
    enabled,
    staleTime: 60 * 1000, // 1 minute - upcoming calls need to stay fresh
    refetchInterval: 5 * 60 * 1000, // Poll every 5 minutes for reminders
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

export function useScheduleCall() {
  const queryClient = useQueryClient();
  const scheduleCallFn = useServerFn(scheduleCall);

  return useMutation({
    mutationFn: (input: ScheduleCallInput) => scheduleCallFn({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.scheduledCalls(),
      });
    },
  });
}

export function useUpdateScheduledCall() {
  const queryClient = useQueryClient();
  const updateCallFn = useServerFn(updateScheduledCall);

  return useMutation({
    mutationFn: (input: UpdateScheduledCallInput) => updateCallFn({ data: input }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.scheduledCalls(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.scheduledCallDetail(variables.id),
      });
    },
  });
}

export function useCancelCall() {
  const queryClient = useQueryClient();
  const cancelCallFn = useServerFn(cancelScheduledCall);

  return useMutation({
    mutationFn: (input: CancelScheduledCallInput) => cancelCallFn({ data: input }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.scheduledCalls(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.scheduledCallDetail(variables.id),
      });
    },
  });
}

export function useRescheduleCall() {
  const queryClient = useQueryClient();
  const rescheduleCallFn = useServerFn(rescheduleCall);

  return useMutation({
    mutationFn: (input: RescheduleCallInput) => rescheduleCallFn({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.scheduledCalls(),
      });
    },
  });
}

export function useCompleteCall() {
  const queryClient = useQueryClient();
  const completeCallFn = useServerFn(completeCall);

  return useMutation({
    mutationFn: (input: CompleteCallInput) => completeCallFn({ data: input }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.scheduledCalls(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.scheduledCallDetail(variables.id),
      });
      // Also invalidate customer activities since completing a call logs an activity
      queryClient.invalidateQueries({
        queryKey: queryKeys.activities.all,
      });
    },
  });
}
