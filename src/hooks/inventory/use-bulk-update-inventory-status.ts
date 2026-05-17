import { useMutation, useQueryClient } from '@tanstack/react-query';
import { bulkUpdateStatus } from '@/server/functions/inventory/status-updates';
import { toast } from '../_shared/use-toast';
import { formatInventoryMutationError } from './_mutation-errors';
import { invalidateInventoryStockMutationQueries } from './_stock-mutation-cache';

import type { Inventory } from '@/lib/schemas/inventory';

export interface BulkUpdateInventoryStatusInput {
  inventoryIds: string[];
  status: Inventory['status'];
  reason: string;
}

/**
 * Bulk update inventory disposition status.
 *
 * This path does not optimistically patch status. Status changes can affect
 * serialized lineage, available serials, movements, and product stock summaries,
 * so the cache contract is refetch-first after the server transaction commits.
 */
export function useBulkUpdateInventoryStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: BulkUpdateInventoryStatusInput) => bulkUpdateStatus({ data: params }),
    onSuccess: (data, variables) => {
      const updatedCount = data.updatedCount ?? variables.inventoryIds.length;
      toast.success(
        updatedCount === 1
          ? 'Inventory status updated'
          : `${updatedCount} inventory statuses updated`
      );

      invalidateInventoryStockMutationQueries(queryClient, {
        result: data,
        includeMovements: true,
      });
    },
    onError: (error) => {
      toast.error(
        formatInventoryMutationError(error, 'Unable to update inventory statuses', {
          codeMessages: {
            allocated_inventory_status_change:
              'Release allocations before changing inventory status.',
            workflow_owned_inventory_status:
              'Use allocation or fulfillment workflows for allocated or sold inventory.',
          },
        })
      );
    },
  });
}
