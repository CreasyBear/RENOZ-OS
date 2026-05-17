import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { normalizeSerial } from '@/lib/serials';
import { receiveInventory } from '@/server/functions/inventory/receiving';
import { toast } from '../_shared/use-toast';
import { formatInventoryMutationError } from './_mutation-errors';
import { invalidateInventoryStockMutationQueries } from './_stock-mutation-cache';

import type { ReceiveInventoryInput } from '@/lib/schemas/inventory';
import type {
  getInventoryItem,
  listInventory,
} from '@/server/functions/inventory/inventory';

type InventoryListResult = Awaited<ReturnType<typeof listInventory>>;
type InventoryDetailResult = Awaited<ReturnType<typeof getInventoryItem>>;

interface ReceivePatchCandidate {
  productId: string;
  locationId: string;
  lotNumber?: string | null;
  serialNumber?: string | null;
}

function normalizeReceiveScopeValue(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeReceiveScopeSerial(value?: string | null): string | null {
  const normalized = normalizeReceiveScopeValue(value);
  return normalized ? normalizeSerial(normalized) : null;
}

function matchesReceiveInventoryScope(
  item: ReceivePatchCandidate,
  variables: ReceiveInventoryInput
): boolean {
  if (
    item.productId !== variables.productId ||
    item.locationId !== variables.locationId
  ) {
    return false;
  }

  const itemSerial = normalizeReceiveScopeSerial(item.serialNumber);
  const receiveSerial = normalizeReceiveScopeSerial(variables.serialNumber);
  if (itemSerial !== receiveSerial) {
    return false;
  }

  const itemLot = normalizeReceiveScopeValue(item.lotNumber);
  const receiveLot = normalizeReceiveScopeValue(variables.lotNumber);
  return itemLot === receiveLot;
}

export function useReceiveInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: ReceiveInventoryInput) => receiveInventory({ data: params }),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.inventory.lists() });
      await queryClient.cancelQueries({ queryKey: queryKeys.inventory.details() });

      const previousLists = queryClient.getQueriesData<InventoryListResult>({
        queryKey: queryKeys.inventory.lists(),
      });
      const previousDetails = queryClient.getQueriesData<InventoryDetailResult>({
        queryKey: queryKeys.inventory.details(),
      });

      queryClient.setQueriesData<InventoryListResult>(
        { queryKey: queryKeys.inventory.lists() },
        (old) => {
          if (!old) return old;
          const items = old.items.map((item) => {
            if (!matchesReceiveInventoryScope(item, variables)) {
              return item;
            }
            const quantityOnHand = (item.quantityOnHand ?? 0) + variables.quantity;
            const quantityAvailable = (item.quantityAvailable ?? 0) + variables.quantity;
            const totalValue =
              item.unitCost !== null && item.unitCost !== undefined
                ? quantityOnHand * Number(item.unitCost)
                : item.totalValue;
            return { ...item, quantityOnHand, quantityAvailable, totalValue };
          });
          return { ...old, items };
        }
      );

      queryClient.setQueriesData<InventoryDetailResult>(
        { queryKey: queryKeys.inventory.details() },
        (old) => {
          if (!old?.item) return old;
          if (!matchesReceiveInventoryScope(old.item, variables)) {
            return old;
          }
          const quantityOnHand = (old.item.quantityOnHand ?? 0) + variables.quantity;
          const quantityAvailable =
            (old.item.quantityAvailable ?? 0) + variables.quantity;
          const totalValue =
            old.item.unitCost !== null && old.item.unitCost !== undefined
              ? quantityOnHand * Number(old.item.unitCost)
              : old.item.totalValue;
          return {
            ...old,
            item: { ...old.item, quantityOnHand, quantityAvailable, totalValue },
          };
        }
      );

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
      toast.error(formatInventoryMutationError(error, 'Failed to receive inventory'));
    },
    onSuccess: () => {
      toast.success('Inventory received successfully');
    },
    onSettled: (data, _error, variables) => {
      invalidateInventoryStockMutationQueries(queryClient, {
        productId: variables.productId,
        result: data,
        touchesSerializedInventory: Boolean(variables.serialNumber),
        includeMovements: true,
      });
    },
  });
}
