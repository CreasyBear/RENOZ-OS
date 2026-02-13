/**
 * Inventory Availability Hook
 *
 * Hook for checking stock availability for a specific product.
 * Used by inventory context for reservation management.
 *
 * @see _Initiation/_prd/2-domains/inventory/inventory.prd.json
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { listInventory } from '@/server/functions/inventory/inventory';
import type { InventoryWithRelations } from '@/lib/schemas/inventory';

export interface AvailabilityCheck {
  productId: string;
  locationId?: string;
  requestedQty: number;
  availableQty: number;
  reservedQty: number;
  isAvailable: boolean;
  shortfall: number;
}

export interface UseInventoryAvailabilityOptions {
  productId: string;
  quantity?: number;
  locationId?: string;
  enabled?: boolean;
}

/**
 * Check stock availability for a specific product.
 * Returns availability data including total available and reserved quantities.
 */
export function useInventoryAvailability(options: UseInventoryAvailabilityOptions) {
  const { productId, quantity = 1, locationId, enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.inventory.availability(productId, locationId),
    queryFn: async () => {
      const data = await listInventory({
        data: {
          productId,
          ...(locationId && { locationId }),
          page: 1,
          pageSize: 100,
        },
      });

      // Sum available quantities across all locations
      const totalAvailable = (data?.items ?? []).reduce(
        (sum: number, item: InventoryWithRelations) => sum + (item.quantityAvailable ?? 0),
        0
      );
      const totalReserved = (data?.items ?? []).reduce(
        (sum: number, item: InventoryWithRelations) => sum + (item.quantityAllocated ?? 0),
        0
      );

      return {
        productId,
        locationId,
        requestedQty: quantity,
        availableQty: totalAvailable,
        reservedQty: totalReserved,
        isAvailable: totalAvailable >= quantity,
        shortfall: Math.max(0, quantity - totalAvailable),
      } as AvailabilityCheck;
    },
    enabled: enabled && !!productId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Mutation hook for checking inventory availability on-demand.
 * Useful for imperative availability checks (e.g., before reservation).
 */
export function useCheckInventoryAvailability() {
  return useMutation({
    mutationFn: async ({
      productId,
      quantity,
      locationId,
    }: {
      productId: string;
      quantity: number;
      locationId?: string;
    }): Promise<AvailabilityCheck> => {
      const data = await listInventory({
        data: {
          productId,
          ...(locationId && { locationId }),
          page: 1,
          pageSize: 100,
        },
      });

      // Sum available quantities across all locations
      const totalAvailable = (data?.items ?? []).reduce(
        (sum: number, item: InventoryWithRelations) => sum + (item.quantityAvailable ?? 0),
        0
      );
      const totalReserved = (data?.items ?? []).reduce(
        (sum: number, item: InventoryWithRelations) => sum + (item.quantityAllocated ?? 0),
        0
      );

      return {
        productId,
        locationId,
        requestedQty: quantity,
        availableQty: totalAvailable,
        reservedQty: totalReserved,
        isAvailable: totalAvailable >= quantity,
        shortfall: Math.max(0, quantity - totalAvailable),
      };
    },
  });
}

/**
 * Prefetch availability data for a product.
 * Useful for pre-loading availability before user interaction.
 */
export function usePrefetchInventoryAvailability() {
  const queryClient = useQueryClient();

  return (productId: string, locationId?: string) => {
    return queryClient.prefetchQuery({
      queryKey: queryKeys.inventory.availability(productId, locationId),
      queryFn: async () => {
        const data = await listInventory({
          data: {
            productId,
            ...(locationId && { locationId }),
            page: 1,
            pageSize: 100,
          },
        });

        const totalAvailable = (data?.items ?? []).reduce(
          (sum: number, item: InventoryWithRelations) => sum + (item.quantityAvailable ?? 0),
          0
        );
        const totalReserved = (data?.items ?? []).reduce(
          (sum: number, item: InventoryWithRelations) => sum + (item.quantityAllocated ?? 0),
          0
        );

        return {
          productId,
          locationId,
          requestedQty: 1,
          availableQty: totalAvailable,
          reservedQty: totalReserved,
          isAvailable: totalAvailable > 0,
          shortfall: 0,
        } as AvailabilityCheck;
      },
      staleTime: 30 * 1000,
    });
  };
}
