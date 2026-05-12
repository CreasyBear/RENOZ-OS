/**
 * Quick Log Hooks
 *
 * Mutation hook for quick logging of calls, notes, and meetings.
 * Uses centralized query keys for proper cache invalidation.
 *
 * @see COMMS-AUTO-003
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
import type { QuickLogInput } from '@/lib/schemas/communications/quick-log';
import { createQuickLog } from '@/server/functions/communications/quick-log';
import { invalidateCommunicationActivityMutationQueries } from './_activity-cache';

// ============================================================================
// MUTATION HOOKS
// ============================================================================

export function useCreateQuickLog() {
  const queryClient = useQueryClient();
  const createQuickLogFn = useServerFn(createQuickLog);

  return useMutation({
    mutationFn: (input: QuickLogInput) => createQuickLogFn({ data: input }),
    onSuccess: (_, variables) => {
      invalidateCommunicationActivityMutationQueries(queryClient, {
        customerId: variables.customerId,
        opportunityId: variables.opportunityId,
      });

      // If a call was logged, also invalidate scheduled calls
      if (variables.type === 'call') {
        queryClient.invalidateQueries({
          queryKey: queryKeys.communications.scheduledCalls(),
        });
      }
    },
  });
}
