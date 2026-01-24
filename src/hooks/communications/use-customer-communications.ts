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
    queryFn: () =>
      getCustomerCommunications({
        data: { customerId, limit, offset },
      }),
    enabled: enabled && !!customerId,
    staleTime: 5 * 60 * 1000, // 5 minutes - emails don't change often
  });
}
