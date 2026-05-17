/**
 * Available Serial Read Hook
 *
 * Used by picking and fulfillment surfaces to show serials that can still be
 * selected for a serialized battery product.
 */
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { resolveReadResult } from '@/lib/read-path-policy';
import { getAvailableSerials } from '@/server/functions/inventory/serial-availability';

export interface UseAvailableSerialsOptions {
  productId: string;
  locationId?: string;
  enabled?: boolean;
}

/**
 * Fetch available serial numbers for a product.
 *
 * Used by the picking workflow to populate serial number selectors for
 * serialized products. Returns serials that are in inventory and not already
 * allocated to another order.
 */
export function useAvailableSerials(options: UseAvailableSerialsOptions) {
  const { productId, locationId, enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.inventory.availableSerials(productId, locationId),
    queryFn: () =>
      resolveReadResult(() => getAvailableSerials({ data: { productId, locationId } }), {
        message: 'Available serials returned no data',
        contractType: 'always-shaped',
        fallbackMessage:
          'Available serials are temporarily unavailable. Please refresh and try again.',
      }),
    enabled: enabled && !!productId,
    staleTime: 10 * 1000,
  });
}
