/**
 * Quick Log Hooks
 *
 * Mutation hook for quick logging of calls, notes, and meetings.
 * Uses centralized query keys for proper cache invalidation.
 *
 * @see COMMS-AUTO-003
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { createQuickLog } from '@/lib/server/quick-log';

// ============================================================================
// MUTATION HOOKS
// ============================================================================

export function useCreateQuickLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createQuickLog,
    onSuccess: (_, variables) => {
      // Invalidate activities queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.activities.all,
      });

      // If a call was logged, also invalidate scheduled calls
      if (variables.data.type === 'call') {
        queryClient.invalidateQueries({
          queryKey: queryKeys.communications.scheduledCalls(),
        });
      }

      // Invalidate customer-specific activities if customerId provided
      if (variables.data.customerId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.activities.byCustomer(variables.data.customerId),
        });
      }

      // Invalidate opportunity-specific activities if opportunityId provided
      if (variables.data.opportunityId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.activities.byOpportunity(variables.data.opportunityId),
        });
      }
    },
  });
}
