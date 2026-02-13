/**
 * Bulk Operation Rollback Hooks
 *
 * TanStack Query hooks for rolling back bulk operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/query-keys';
import {
  listRecentBulkOperations,
  rollbackBulkOperation,
} from '@/server/functions/customers/rollback';

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Get recent bulk operations that can be rolled back
 */
export function useRecentBulkOperations(
  filters?: {
    entityType?: string;
    hours?: number;
  }
) {
  return useQuery({
    queryKey: [...queryKeys.customers.all, 'bulk-operations', 'recent', filters],
    queryFn: async () => {
      const result = await listRecentBulkOperations({
        data: {
          entityType: filters?.entityType,
          hours: filters?.hours ?? 24,
          limit: 10,
        },
      });
      if (result == null) throw new Error('Recent bulk operations returned no data');
      return result;
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Rollback a bulk operation
 */
export function useRollbackBulkOperation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (auditLogId: string) => {
      return await rollbackBulkOperation({ data: { auditLogId } });
    },
    onSuccess: (result) => {
      // Invalidate customer queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.customers.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.customers.all, 'bulk-operations', 'recent'],
      });
      toast.success(`Rolled back ${result.restored} customer(s)`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to rollback operation');
    },
  });
}
