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
      const result = await getCustomerCommunications({
        data: { customerId, limit, offset },
      
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled: enabled && !!customerId,
    staleTime: QUERY_CONFIG.STALE_TIME_LONG,
  });
}
