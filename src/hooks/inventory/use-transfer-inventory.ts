import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { transferInventory } from '@/server/functions/inventory/transfers';
import { toast } from '../_shared/use-toast';
import { formatInventoryMutationError } from './_mutation-errors';
import { invalidateInventoryStockMutationQueries } from './_stock-mutation-cache';

import type { StockTransfer } from '@/lib/schemas/inventory';
import type {
  getInventoryItem,
  listInventory,
} from '@/server/functions/inventory/inventory';

type InventoryListResult = Awaited<ReturnType<typeof listInventory>>;
type InventoryDetailResult = Awaited<ReturnType<typeof getInventoryItem>>;

/**
 * Transfer inventory between locations.
 *
 * Transfer writes are row- or serial-scoped on the server. This hook preserves
 * the existing refetch-first cache contract instead of simulating aggregate
 * stock movement across lots, dispositions, or serialized units.
 */
export function useTransferInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: StockTransfer) => transferInventory({ data: params }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.inventory.lists() });
      await queryClient.cancelQueries({ queryKey: queryKeys.inventory.details() });

      const previousLists = queryClient.getQueriesData<InventoryListResult>({
        queryKey: queryKeys.inventory.lists(),
      });
      const previousDetails = queryClient.getQueriesData<InventoryDetailResult>({
        queryKey: queryKeys.inventory.details(),
      });

      // Transfers are row- or serial-scoped. Product/location aggregate math can
      // patch the wrong lot, disposition, or serialized row, so refetch exact
      // server results instead of pretending the cache knows the source row.
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
      toast.error(formatInventoryMutationError(error, 'Failed to transfer inventory'));
    },
    onSuccess: (data, variables) => {
      toast.success('Inventory transferred successfully');

      invalidateInventoryStockMutationQueries(queryClient, {
        productId: variables.productId,
        result: data,
        touchesSerializedInventory: (variables.serialNumbers?.length ?? 0) > 0,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.movementsAll() });
    },
  });
}
