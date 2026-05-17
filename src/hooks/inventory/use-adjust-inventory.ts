import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { adjustInventory } from '@/server/functions/inventory/adjustments';
import { toast } from '../_shared/use-toast';
import { formatInventoryMutationError } from './_mutation-errors';
import { invalidateInventoryStockMutationQueries } from './_stock-mutation-cache';

import type { StockAdjustment } from '@/lib/schemas/inventory';
import type {
  getInventoryItem,
  listInventory,
} from '@/server/functions/inventory/inventory';

type InventoryListResult = Awaited<ReturnType<typeof listInventory>>;
type InventoryDetailResult = Awaited<ReturnType<typeof getInventoryItem>>;

/**
 * Adjust inventory stock levels.
 *
 * Adjustment writes are row-scoped or single-row product/location scoped on the
 * server. This hook keeps the refetch-first cache contract so the UI does not
 * pretend it can safely patch lots, dispositions, or serialized rows.
 */
export function useAdjustInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: StockAdjustment) => adjustInventory({ data: params }),
    onMutate: async (_variables) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.inventory.lists() });
      await queryClient.cancelQueries({ queryKey: queryKeys.inventory.details() });

      const previousLists = queryClient.getQueriesData<InventoryListResult>({
        queryKey: queryKeys.inventory.lists(),
      });
      const previousDetails = queryClient.getQueriesData<InventoryDetailResult>({
        queryKey: queryKeys.inventory.details(),
      });

      // Adjustment writes are row-scoped or single-row product/location scoped
      // on the server. Let refetch reconcile exact rows instead of patching
      // aggregates across lots, dispositions, or serialized units.
      return { previousLists, previousDetails };
    },
    onError: (error, _variables, context) => {
      if (!context) return;
      context.previousLists.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      context.previousDetails.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      toast.error(formatInventoryMutationError(error, 'Failed to adjust inventory'));
    },
    onSuccess: (data, variables) => {
      toast.success('Inventory adjusted successfully');

      invalidateInventoryStockMutationQueries(queryClient, {
        productId: variables.productId,
        result: data,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.movementsAll() });
    },
  });
}
