/**
 * Bulk Operation Rollback Hooks
 *
 * TanStack Query hooks for rolling back bulk operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/query-keys';
import {
  isReadQueryError,
  normalizeReadQueryError,
  requireReadResult,
} from '@/lib/read-path-policy';
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
      try {
        const result = await listRecentBulkOperations({
          data: {
            entityType: filters?.entityType,
            hours: filters?.hours ?? 24,
            limit: 10,
          },
        });
        return requireReadResult(result, {
          message: 'Recent bulk operations returned no data',
          contractType: 'always-shaped',
          fallbackMessage:
            'Bulk operation history is temporarily unavailable. Please refresh and try again.',
        });
      } catch (error) {
        if (isReadQueryError(error)) throw error;
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage:
            'Bulk operation history is temporarily unavailable. Please refresh and try again.',
        });
      }
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
