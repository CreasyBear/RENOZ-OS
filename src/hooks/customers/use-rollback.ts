/**
 * Bulk Operation Rollback Hooks
 *
 * TanStack Query hooks for rolling back bulk operations.
 */

import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/query-keys';
import type { CustomerBulkOperationFilters } from '@/lib/query-keys';
import {
  isReadQueryError,
  normalizeReadQueryError,
  requireReadResult,
} from '@/lib/read-path-policy';
import {
  listRecentBulkOperations,
  rollbackBulkOperation,
} from '@/server/functions/customers/rollback';
import { formatCustomerMutationError } from './_mutation-errors';

function invalidateCustomerAnalyticsFamilies(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: queryKeys.customerAnalytics.kpisAll() });
  queryClient.invalidateQueries({ queryKey: queryKeys.customerAnalytics.trendsAll() });
  queryClient.invalidateQueries({ queryKey: queryKeys.customerAnalytics.segments() });
  queryClient.invalidateQueries({
    queryKey: queryKeys.customerAnalytics.segmentAnalyticsAll(),
  });
  queryClient.invalidateQueries({ queryKey: queryKeys.customerAnalytics.healthDistribution() });
  queryClient.invalidateQueries({ queryKey: queryKeys.customerAnalytics.lifecycleStages() });
  queryClient.invalidateQueries({ queryKey: queryKeys.customerAnalytics.lifecycleCohortsAll() });
  queryClient.invalidateQueries({ queryKey: queryKeys.customerAnalytics.churnMetricsAll() });
  queryClient.invalidateQueries({ queryKey: queryKeys.customerAnalytics.conversionFunnelAll() });
  queryClient.invalidateQueries({ queryKey: queryKeys.customerAnalytics.acquisitionMetricsAll() });
  queryClient.invalidateQueries({ queryKey: queryKeys.customerAnalytics.quickStatsAll() });
  queryClient.invalidateQueries({ queryKey: queryKeys.customerAnalytics.topCustomersAll() });
  queryClient.invalidateQueries({ queryKey: queryKeys.customerAnalytics.valueTiers() });
  queryClient.invalidateQueries({ queryKey: queryKeys.customerAnalytics.valueKpisAll() });
  queryClient.invalidateQueries({
    queryKey: queryKeys.customerAnalytics.profitabilitySegmentsAll(),
  });
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Get recent bulk operations that can be rolled back
 */
export function useRecentBulkOperations(filters?: CustomerBulkOperationFilters) {
  return useQuery({
    queryKey: queryKeys.customers.bulkOperations.recent(filters),
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
      // Rollback can alter list, detail, health, and analytics projections.
      queryClient.invalidateQueries({
        queryKey: queryKeys.customers.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.customers.bulkOperations.recentLists(),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.health.all() });
      invalidateCustomerAnalyticsFamilies(queryClient);

      if (result.restoredCustomerIds.length === 0) {
        queryClient.invalidateQueries({ queryKey: queryKeys.customers.details() });
      } else {
        result.restoredCustomerIds.forEach((customerId) => {
          queryClient.invalidateQueries({ queryKey: queryKeys.customers.detail(customerId) });
          queryClient.invalidateQueries({
            queryKey: queryKeys.customers.health.metrics(customerId),
          });
          queryClient.invalidateQueries({
            queryKey: queryKeys.customers.health.historyLists(customerId),
          });
        });
      }

      toast.success(`Rolled back ${result.restored} customer(s)`);
    },
    onError: (error) => {
      toast.error(formatCustomerMutationError(error, 'Unable to roll back customer bulk operation.'));
    },
  });
}
