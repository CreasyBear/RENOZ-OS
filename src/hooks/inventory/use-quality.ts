/**
 * Quality Inspection Hooks
 *
 * TanStack Query hooks for quality inspection management.
 *
 * @see src/server/functions/inventory/quality.ts
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "../_shared/use-toast";
import {
  listQualityInspections,
  createQualityInspection,
} from "@/server/functions/inventory";

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Fetch quality inspections for an inventory item
 */
export function useQualityInspections(
  inventoryId: string,
  enabled = true
) {
  return useQuery({
    queryKey: queryKeys.inventory.qualityInspections(inventoryId),
    queryFn: async () => {
      const result = await listQualityInspections({
        data: { inventoryId, page: 1, pageSize: 50 },
      
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled: enabled && !!inventoryId,
    staleTime: 60 * 1000,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create a new quality inspection
 */
export function useCreateQualityInspection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof createQualityInspection>[0]["data"]) =>
      createQualityInspection({ data }),
    onSuccess: (_, variables) => {
      toast.success("Quality inspection recorded");
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventory.qualityInspections(variables.inventoryId),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to record inspection");
    },
  });
}
