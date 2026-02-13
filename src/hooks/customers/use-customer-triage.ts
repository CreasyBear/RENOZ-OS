/**
 * Customer Triage Hook
 *
 * Fetches customer triage data (credit holds and low health scores)
 * for the triage section on the customers landing page.
 *
 * @source triage data from getCustomerTriage server function
 */

import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
import { getCustomerTriage } from '@/server/functions/customers/customer-triage';
import type {
  GetCustomerTriageInput,
  CustomerTriageResponse,
} from '@/lib/schemas/customers/customer-triage';

// ============================================================================
// HOOK
// ============================================================================

export interface UseCustomerTriageOptions extends Partial<GetCustomerTriageInput> {
  enabled?: boolean;
}

export function useCustomerTriage(options: UseCustomerTriageOptions = {}) {
  const { enabled = true, ...input } = options;
  const triageFn = useServerFn(getCustomerTriage);

  // Apply defaults from schema
  const queryInput: GetCustomerTriageInput = {
    creditHoldLimit: input.creditHoldLimit ?? 5,
    lowHealthLimit: input.lowHealthLimit ?? 3,
    healthScoreThreshold: input.healthScoreThreshold ?? 50,
  };

  return useQuery<CustomerTriageResponse>({
    queryKey: queryKeys.customers.triage(queryInput),
    queryFn: async () => {
      const result = await triageFn({ data: queryInput });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled,
    staleTime: 30 * 1000, // 30 seconds
  });
}
