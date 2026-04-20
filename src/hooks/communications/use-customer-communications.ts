/**
 * Customer Communications Hook
 *
 * Fetches communication timeline for a specific customer.
 * Uses centralized query keys for proper cache invalidation.
 *
 * @see COMM-TIMELINE story
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { QUERY_CONFIG } from '@/lib/constants';
import { normalizeReadQueryError } from '@/lib/read-path-policy';
import { getCustomerCommunications } from '@/server/functions/communications/customer-communications';

export interface UseCustomerCommunicationsOptions {
  customerId: string;
  limit?: number;
  offset?: number;
  enabled?: boolean;
}

export function useCustomerCommunications(options: UseCustomerCommunicationsOptions) {
  const { customerId, limit = 50, offset = 0, enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.communications.customerCommunications(customerId),
    queryFn: async () => {
      try {
        return await getCustomerCommunications({
          data: { customerId, limit, offset },
        });
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'detail-not-found',
          fallbackMessage:
            'Customer communications are temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled: enabled && !!customerId,
    staleTime: QUERY_CONFIG.STALE_TIME_LONG,
  });
}
