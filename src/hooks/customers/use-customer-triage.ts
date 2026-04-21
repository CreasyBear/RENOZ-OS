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
import { normalizeReadQueryError } from '@/lib/read-path-policy';
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
      try {
        return await triageFn({ data: queryInput });
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage: 'Customer triage is temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled,
    staleTime: 30 * 1000, // 30 seconds
  });
}
