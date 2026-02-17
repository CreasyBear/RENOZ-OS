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

// ============================================================================
// MUTATION HOOKS
// ============================================================================

export function useCreateQuickLog() {
  const queryClient = useQueryClient();
  const createQuickLogFn = useServerFn(createQuickLog);

  return useMutation({
    mutationFn: (input: QuickLogInput) => createQuickLogFn({ data: input }),
    onSuccess: (_, variables) => {
      // Invalidate activities queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.activities.all,
      });

      // If a call was logged, also invalidate scheduled calls
      if (variables.type === 'call') {
        queryClient.invalidateQueries({
          queryKey: queryKeys.communications.scheduledCalls(),
        });
      }

      // Invalidate customer-specific activities if customerId provided
      if (variables.customerId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.activities.byCustomer(variables.customerId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.unifiedActivities.entityAudit('customer', variables.customerId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.communications.customerCommunications(variables.customerId),
        });
        // Invalidate order tabs (they show customer activities via relatedCustomerId)
        queryClient.invalidateQueries({
          queryKey: queryKeys.unifiedActivities.entityPrefix('order'),
        });
      }

      // Invalidate opportunity-specific activities if opportunityId provided
      if (variables.opportunityId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.activities.byOpportunity(variables.opportunityId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.unifiedActivities.entityAudit('opportunity', variables.opportunityId),
        });
      }
    },
  });
}
